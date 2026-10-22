
import os
import re
from datetime import timedelta
from functools import wraps

import psycopg
from app.persistence.database import get_db_connection as _get_db_connection
from dotenv import load_dotenv
from flask import Flask, g, jsonify, request, session
from flask_cors import CORS
from werkzeug.security import check_password_hash, generate_password_hash

load_dotenv()

app = Flask(__name__)

# Signs the session cookie. Without it, login is refused.
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY") or None
app.config.update(
    SESSION_COOKIE_NAME="astrothread_session",
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
    SESSION_COOKIE_SECURE=os.getenv(
        "SESSION_COOKIE_SECURE", ""
    ).lower() == "true",
    PERMANENT_SESSION_LIFETIME=timedelta(days=7),
)

CORS(app)


def get_db_connection():
    return _get_db_connection()


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


REGEX_SPECIAL_CHARS = set("\\.^$*+?()[]{}|")


def word_start_pattern(text):
    """Match text literally at the start of a word in PostgreSQL."""
    escaped = "".join(
        f"\\{char}" if char in REGEX_SPECIAL_CHARS else char
        for char in text
    )
    first = text[:1]
    return rf"\m{escaped}" if first.isalnum() or first == "_" else escaped


MAX_QUERY_LENGTH = 100


@app.route("/api/threads", methods=["GET"])
def get_threads():
    query = request.args.get("q", "").strip()

    if len(query) > MAX_QUERY_LENGTH:
        return jsonify(
            {
                "error": (
                    f"Search query must be at most "
                    f"{MAX_QUERY_LENGTH} characters"
                )
            }
        ), 400

    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                if query:
                    pattern = word_start_pattern(query)
                    cur.execute(
                        """
                        SELECT id, title, category, description
                        FROM research_threads
                        WHERE title ~* %(pattern)s
                           OR category ~* %(pattern)s
                           OR description ~* %(pattern)s
                        ORDER BY id;
                        """,
                        {"pattern": pattern},
                    )
                else:
                    cur.execute(
                        """
                        SELECT id, title, category, description
                        FROM research_threads
                        ORDER BY id;
                        """
                    )

                rows = cur.fetchall()

        threads = [
            {
                "id": row[0],
                "title": row[1],
                "category": row[2],
                "description": row[3],
            }
            for row in rows
        ]

        return jsonify(threads)

    except (psycopg.Error, RuntimeError):
        app.logger.exception("Database query failed")
        return jsonify(
            {"error": "Unable to retrieve research threads"}
        ), 500


# Authentication configuration
ROLES = ("user", "owner")
MAX_EMAIL_LENGTH = 254
MIN_PASSWORD_LENGTH = 8
MAX_PASSWORD_LENGTH = 1024
MAX_NAME_LENGTH = 100
INVALID_CREDENTIALS = "Invalid email or password"
EMAIL_PATTERN = re.compile(r"[^\s@]+@[^\s@]+\.[^\s@]+")

DUMMY_PASSWORD_HASH = generate_password_hash(
    "astrothread-no-such-account"
)


def normalize_email(email):
    return email.strip().lower()


def user_to_json(row):
    """Return public user data without the password hash."""
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
                return jsonify(
                    {"error": "Authentication required"}
                ), 401

            try:
                user = find_user(user_id)
            except (psycopg.Error, RuntimeError):
                app.logger.exception("Session lookup failed")
                return jsonify(
                    {"error": "Unable to verify your session"}
                ), 500

            if user is None:
                session.clear()
                return jsonify(
                    {"error": "Authentication required"}
                ), 401

            if role is not None and user["role"] != role:
                return jsonify(
                    {
                        "error": (
                            "You do not have permission to access "
                            "this resource"
                        )
                    }
                ), 403

            g.user = user
            return view(*args, **kwargs)

        return wrapper

    return decorator


@app.route("/api/auth/login", methods=["POST"])
def login():
    if not app.secret_key:
        app.logger.error(
            "SECRET_KEY is not set, so sign-in is disabled"
        )
        return jsonify(
            {"error": "Sign-in is not available right now"}
        ), 503

    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify(
            {"error": "Request body must be a JSON object"}
        ), 400

    email = data.get("email")
    password = data.get("password")

    if (
        not isinstance(email, str)
        or not isinstance(password, str)
        or not email.strip()
        or not password
    ):
        return jsonify(
            {"error": "Email and password are required"}
        ), 400

    if (
        len(email) > MAX_EMAIL_LENGTH
        or len(password) > MAX_PASSWORD_LENGTH
    ):
        return jsonify(
            {"error": "Email or password is too long"}
        ), 400

    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT id, email, role, password_hash
                    FROM users
                    WHERE lower(email) = %s;
                    """,
                    (normalize_email(email),),
                )
                row = cur.fetchone()

    except (psycopg.Error, RuntimeError):
        app.logger.exception("Login query failed")
        return jsonify(
            {"error": "Unable to sign in right now"}
        ), 500

    password_hash = row[3] if row else DUMMY_PASSWORD_HASH

    if not check_password_hash(password_hash, password) or row is None:
        return jsonify({"error": INVALID_CREDENTIALS}), 401

    session.clear()
    session["user_id"] = row[0]
    session.permanent = data.get("remember") is True

    return jsonify({"user": user_to_json(row)})


@app.route("/api/auth/register", methods=["POST"])
def register():
    """Creates a standard User account and signs it in.

    The role is always "user": owners are promoted with manage.py set-role.
    """
    if not app.secret_key:
        app.logger.error("SECRET_KEY is not set, so sign-up is disabled")
        return jsonify(
            {"error": "Sign-up is not available right now"}
        ), 503

    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify(
            {"error": "Request body must be a JSON object"}
        ), 400

    email = data.get("email")
    password = data.get("password")
    name = data.get("name")

    if not isinstance(email, str) or not isinstance(password, str):
        return jsonify({"error": "Email and password are required"}), 400

    if name is not None and not isinstance(name, str):
        return jsonify({"error": "Name must be text"}), 400

    email = normalize_email(email)
    name = name.strip() if name else ""

    if len(email) > MAX_EMAIL_LENGTH or not EMAIL_PATTERN.fullmatch(email):
        return jsonify({"error": "Enter a valid email address"}), 400

    if not MIN_PASSWORD_LENGTH <= len(password) <= MAX_PASSWORD_LENGTH:
        return jsonify(
            {
                "error": (
                    f"Password must be {MIN_PASSWORD_LENGTH}-"
                    f"{MAX_PASSWORD_LENGTH} characters"
                )
            }
        ), 400

    if len(name) > MAX_NAME_LENGTH:
        return jsonify(
            {"error": f"Name must be at most {MAX_NAME_LENGTH} characters"}
        ), 400

    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO users (name, email, password_hash, role)
                    VALUES (%s, %s, %s, 'user')
                    ON CONFLICT (lower(email)) DO NOTHING
                    RETURNING id, email, role;
                    """,
                    (name or None, email, generate_password_hash(password)),
                )
                row = cur.fetchone()
    except (psycopg.Error, RuntimeError):
        app.logger.exception("Sign-up query failed")
        return jsonify(
            {"error": "Unable to create your account right now"}
        ), 500

    if row is None:
        return jsonify(
            {"error": "An account with this email already exists"}
        ), 409

    session.clear()
    session["user_id"] = row[0]

    return jsonify({"user": user_to_json(row)}), 201


@app.route("/api/auth/logout", methods=["POST"])
def logout():
    if app.secret_key:
        session.clear()

    return "", 204


@app.route("/api/auth/me", methods=["GET"])
@login_required()
def current_user():
    return jsonify({"user": g.user})


if __name__ == "__main__":
    app.run(
        debug=True,
        use_reloader=False,
        port=5000,
    )
