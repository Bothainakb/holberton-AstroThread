"""Email sign-in with one-time codes (there are no passwords).

1. POST /api/auth/request-code {email, purpose}: emails a 6-digit code.
   purpose "login" needs an existing account; "signup" needs a new email.
2. POST /api/auth/verify-code {email, code, name?, remember?}: checks the
   code, creates the account for a sign-up, and starts the session.

The session is an HttpOnly cookie holding only the user id; the role is read
from the database on every request.
"""
import re
from functools import wraps

import psycopg
from flask import Blueprint, current_app, g, jsonify, request, session

from app.persistence.database import get_db_connection
from app.services.auth_service import (
    CODE_LENGTH,
    EmailDeliveryError,
    code_matches,
    generate_code,
    hash_code,
    send_code_email,
)

auth_bp = Blueprint("auth_v1", __name__)

ROLES = ("user", "owner")
PURPOSES = ("login", "signup")
MAX_EMAIL_LENGTH = 254
MAX_NAME_LENGTH = 100
EMAIL_PATTERN = re.compile(r"[^\s@]+@[^\s@]+\.[^\s@]+")
CODE_PATTERN = re.compile(rf"\d{{{CODE_LENGTH}}}")
CODE_MINUTES_VALID = 10
RESEND_WAIT_SECONDS = 60
MAX_CODE_ATTEMPTS = 5


def error(message, status):
    return jsonify({"error": message}), status


def normalize_email(email):
    return email.strip().lower()


def valid_email(email):
    return len(email) <= MAX_EMAIL_LENGTH and EMAIL_PATTERN.fullmatch(email)


def user_to_json(row):
    """Return public user data (id, email, role)."""
    return {"id": row[0], "email": row[1], "role": row[2]}


def find_user(user_id):
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, email, role FROM users WHERE id = %s;",
                (user_id,),
            )
            row = cur.fetchone()

    return user_to_json(row) if row else None


def login_required(role=None):
    """Require a valid session and optionally a specific account role."""

    def decorator(view):
        @wraps(view)
        def wrapper(*args, **kwargs):
            user_id = session.get("user_id")

            if not isinstance(user_id, int):
                return error("Authentication required", 401)

            try:
                user = find_user(user_id)
            except (psycopg.Error, RuntimeError):
                current_app.logger.exception("Session lookup failed")
                return error("Unable to verify your session", 500)

            if user is None:
                session.clear()
                return error("Authentication required", 401)

            if role is not None and user["role"] != role:
                return error(
                    "You do not have permission to access this resource", 403
                )

            g.user = user
            return view(*args, **kwargs)

        return wrapper

    return decorator


def read_json_body():
    data = request.get_json(silent=True)
    return data if isinstance(data, dict) else None


@auth_bp.route("/api/auth/request-code", methods=["POST"])
def request_code():
    if not current_app.secret_key:
        current_app.logger.error("SECRET_KEY is not set, so sign-in is disabled")
        return error("Sign-in is not available right now", 503)

    data = read_json_body()
    if data is None:
        return error("Request body must be a JSON object", 400)

    email = data.get("email")
    purpose = data.get("purpose", "login")

    if purpose not in PURPOSES:
        return error('purpose must be "login" or "signup"', 400)

    if not isinstance(email, str) or not valid_email(normalize_email(email)):
        return error("Enter a valid email address", 400)

    email = normalize_email(email)
    code = generate_code()

    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT 1 FROM users WHERE lower(email) = %s;", (email,)
                )
                has_account = cur.fetchone() is not None

                if purpose == "login" and not has_account:
                    return error(
                        "No account found for this email. "
                        "Create an account first.",
                        404,
                    )
                if purpose == "signup" and has_account:
                    return error(
                        "An account with this email already exists. "
                        "Sign in instead.",
                        409,
                    )

                # One code per email. A new code replaces the old one, but
                # only after RESEND_WAIT_SECONDS, which limits email spam.
                cur.execute(
                    """
                    INSERT INTO login_codes
                        (email, purpose, code_hash, expires_at)
                    VALUES (%(email)s, %(purpose)s, %(code_hash)s,
                            CURRENT_TIMESTAMP + make_interval(mins => %(mins)s))
                    ON CONFLICT (lower(email)) DO UPDATE
                    SET purpose = EXCLUDED.purpose,
                        code_hash = EXCLUDED.code_hash,
                        attempts = 0,
                        expires_at = EXCLUDED.expires_at,
                        created_at = CURRENT_TIMESTAMP
                    WHERE login_codes.created_at
                        < CURRENT_TIMESTAMP - make_interval(secs => %(wait)s)
                    RETURNING id;
                    """,
                    {
                        "email": email,
                        "purpose": purpose,
                        "code_hash": hash_code(code),
                        "mins": CODE_MINUTES_VALID,
                        "wait": RESEND_WAIT_SECONDS,
                    },
                )
                if cur.fetchone() is None:
                    return error(
                        "Please wait a minute before requesting another code.",
                        429,
                    )

                # Sent inside the transaction: if sending fails, the new code
                # is rolled back and the user can try again straight away.
                send_code_email(email, code, CODE_MINUTES_VALID)
    except EmailDeliveryError:
        current_app.logger.exception("Sending the sign-in code failed")
        return error("We couldn't send the code email.", 502)
    except (psycopg.Error, RuntimeError):
        current_app.logger.exception("Creating a sign-in code failed")
        return error("Unable to send a code right now", 500)

    return jsonify({"expires_in_minutes": CODE_MINUTES_VALID})


@auth_bp.route("/api/auth/verify-code", methods=["POST"])
def verify_code():
    if not current_app.secret_key:
        current_app.logger.error("SECRET_KEY is not set, so sign-in is disabled")
        return error("Sign-in is not available right now", 503)

    data = read_json_body()
    if data is None:
        return error("Request body must be a JSON object", 400)

    email = data.get("email")
    code = data.get("code")
    name = data.get("name")

    if not isinstance(email, str) or not valid_email(normalize_email(email)):
        return error("Enter a valid email address", 400)

    if not isinstance(code, str) or not CODE_PATTERN.fullmatch(code.strip()):
        return error(f"Enter the {CODE_LENGTH}-digit code from the email", 400)

    if name is not None and not isinstance(name, str):
        return error("Name must be text", 400)

    email = normalize_email(email)
    code = code.strip()
    name = name.strip() if name else ""

    if len(name) > MAX_NAME_LENGTH:
        return error(f"Name must be at most {MAX_NAME_LENGTH} characters", 400)

    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT id, purpose, code_hash, attempts
                    FROM login_codes
                    WHERE lower(email) = %s
                      AND expires_at > CURRENT_TIMESTAMP
                    FOR UPDATE;
                    """,
                    (email,),
                )
                row = cur.fetchone()

                if row is None:
                    return error(
                        "This code has expired or was already used. "
                        "Request a new one.",
                        400,
                    )

                code_id, purpose, code_hash, attempts = row

                if not code_matches(code_hash, code):
                    # Guessing is limited to MAX_CODE_ATTEMPTS per code.
                    if attempts + 1 >= MAX_CODE_ATTEMPTS:
                        cur.execute(
                            "DELETE FROM login_codes WHERE id = %s;", (code_id,)
                        )
                        return error(
                            "Too many wrong codes. Request a new one.", 429
                        )
                    cur.execute(
                        "UPDATE login_codes SET attempts = attempts + 1 "
                        "WHERE id = %s;",
                        (code_id,),
                    )
                    return error(
                        "That code is not correct. Please try again.", 401
                    )

                # Each code works once.
                cur.execute("DELETE FROM login_codes WHERE id = %s;", (code_id,))

                user = None
                if purpose == "signup":
                    # New accounts are always "user"; owners are promoted
                    # with manage.py set-role.
                    cur.execute(
                        """
                        INSERT INTO users (name, email, role)
                        VALUES (%s, %s, 'user')
                        ON CONFLICT (lower(email)) DO NOTHING
                        RETURNING id, email, role;
                        """,
                        (name or None, email),
                    )
                    user = cur.fetchone()

                if user is None:
                    cur.execute(
                        "SELECT id, email, role FROM users "
                        "WHERE lower(email) = %s;",
                        (email,),
                    )
                    user = cur.fetchone()
    except (psycopg.Error, RuntimeError):
        current_app.logger.exception("Verifying a sign-in code failed")
        return error("Unable to sign in right now", 500)

    if user is None:
        return error("No account found for this email.", 404)

    session.clear()
    session["user_id"] = user[0]
    session.permanent = data.get("remember") is True

    created = purpose == "signup"
    return jsonify({"user": user_to_json(user)}), 201 if created else 200


@auth_bp.route("/api/auth/logout", methods=["POST"])
def logout():
    if current_app.secret_key:
        session.clear()

    return "", 204


@auth_bp.route("/api/auth/me", methods=["GET"])
@login_required()
def current_user():
    return jsonify({"user": g.user})
