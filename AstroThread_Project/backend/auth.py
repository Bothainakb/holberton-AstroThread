"""Authentication endpoints: register, log in and read the current user.

POST /api/auth/register  {"name", "email", "password"} -> 201 {"token", "user"}
POST /api/auth/login     {"email", "password"}         -> 200 {"token", "user"}
GET  /api/auth/me        Authorization: Bearer <token> -> 200 {"user"}

Other features protect their endpoints with the @token_required decorator.
"""
import os
import re
from datetime import datetime, timedelta, timezone
from functools import wraps

import jwt
import psycopg
from flask import Blueprint, current_app, g, jsonify, request
from werkzeug.security import check_password_hash, generate_password_hash

from db import get_db_connection

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

EMAIL_PATTERN = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
MAX_NAME_LENGTH = 100
MAX_EMAIL_LENGTH = 255
MIN_PASSWORD_LENGTH = 8
MAX_PASSWORD_LENGTH = 128
DEFAULT_TOKEN_HOURS = 24
INVALID_LOGIN = "Invalid email or password"

# Checked when an email is not registered, so a failed login takes about as
# long whether or not the account exists.
_DUMMY_HASH = generate_password_hash("not-a-real-password")


# ---------------------------------------------------------------- tokens

def _secret_key():
    secret = os.getenv("JWT_SECRET_KEY")
    if not secret:
        raise RuntimeError(
            "JWT_SECRET_KEY is not set. Check your backend/.env file."
        )
    return secret


def create_token(user_id, role):
    now = datetime.now(timezone.utc)
    hours = int(os.getenv("JWT_EXPIRES_HOURS", DEFAULT_TOKEN_HOURS))
    payload = {
        "sub": str(user_id),
        "role": role,
        "iat": now,
        "exp": now + timedelta(hours=hours),
    }
    return jwt.encode(payload, _secret_key(), algorithm="HS256")


def decode_token(token):
    return jwt.decode(token, _secret_key(), algorithms=["HS256"])


def token_required(view):
    """Rejects requests without a valid token; sets g.user_id and g.user_role."""

    @wraps(view)
    def wrapper(*args, **kwargs):
        scheme, _, token = request.headers.get("Authorization", "").partition(" ")
        if scheme.lower() != "bearer" or not token.strip():
            return jsonify({"error": "Authentication required"}), 401

        try:
            payload = decode_token(token.strip())
            g.user_id = int(payload["sub"])
            g.user_role = payload.get("role")
        except RuntimeError:
            current_app.logger.exception("Token check failed")
            return jsonify({"error": "Authentication is not configured"}), 500
        except (jwt.InvalidTokenError, KeyError, ValueError):
            return jsonify({"error": "Invalid or expired token"}), 401

        return view(*args, **kwargs)

    return wrapper


# ---------------------------------------------------------------- helpers

def _json_body():
    data = request.get_json(silent=True)
    return data if isinstance(data, dict) else None


def _text(data, field):
    value = data.get(field)
    return value if isinstance(value, str) else ""


def _user_json(user_id, name, email, role):
    return {"id": user_id, "name": name, "email": email, "role": role}


def _auth_response(user, status):
    """user is a (id, name, email, role) row."""
    return jsonify({"token": create_token(user[0], user[3]), "user": _user_json(*user)}), status


def _validate_registration(name, email, password):
    fields = {}
    if not name:
        fields["name"] = "Enter your name."
    elif len(name) > MAX_NAME_LENGTH:
        fields["name"] = f"Name must be at most {MAX_NAME_LENGTH} characters."

    if len(email) > MAX_EMAIL_LENGTH or not EMAIL_PATTERN.match(email):
        fields["email"] = "Enter a valid email address."

    if len(password) < MIN_PASSWORD_LENGTH:
        fields["password"] = f"Password must be at least {MIN_PASSWORD_LENGTH} characters."
    elif len(password) > MAX_PASSWORD_LENGTH:
        fields["password"] = f"Password must be at most {MAX_PASSWORD_LENGTH} characters."
    return fields


# ---------------------------------------------------------------- routes

@auth_bp.route("/register", methods=["POST"])
def register():
    data = _json_body()
    if data is None:
        return jsonify({"error": "Request body must be a JSON object"}), 400

    name = _text(data, "name").strip()
    email = _text(data, "email").strip().lower()
    password = _text(data, "password")

    fields = _validate_registration(name, email, password)
    if fields:
        return jsonify({"error": "Please check the highlighted fields", "fields": fields}), 400

    try:
        _secret_key()  # fail before saving anything if tokens can't be created
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # The role is never taken from the request: new accounts are
                # always "user" (the column default), never "owner".
                cur.execute(
                    """
                    INSERT INTO users (name, email, password_hash)
                    VALUES (%s, %s, %s)
                    RETURNING id, name, email, role;
                    """,
                    (name, email, generate_password_hash(password)),
                )
                user = cur.fetchone()
        return _auth_response(user, 201)

    except psycopg.errors.UniqueViolation:
        return jsonify({
            "error": "An account with this email already exists",
            "fields": {"email": "An account with this email already exists."},
        }), 409
    except (psycopg.Error, RuntimeError):
        current_app.logger.exception("Registration failed")
        return jsonify({"error": "Unable to create the account"}), 500


@auth_bp.route("/login", methods=["POST"])
def login():
    data = _json_body()
    if data is None:
        return jsonify({"error": "Request body must be a JSON object"}), 400

    email = _text(data, "email").strip().lower()
    password = _text(data, "password")

    fields = {}
    if not email:
        fields["email"] = "Enter your email."
    if not password:
        fields["password"] = "Enter your password."
    if fields:
        return jsonify({"error": "Please check the highlighted fields", "fields": fields}), 400

    try:
        _secret_key()
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT id, name, email, role, password_hash
                    FROM users
                    WHERE email = %s;
                    """,
                    (email,),
                )
                row = cur.fetchone()

        if row is None:
            check_password_hash(_DUMMY_HASH, password)
            return jsonify({"error": INVALID_LOGIN}), 401
        if not check_password_hash(row[4], password):
            return jsonify({"error": INVALID_LOGIN}), 401

        return _auth_response(row[:4], 200)

    except (psycopg.Error, RuntimeError):
        current_app.logger.exception("Login failed")
        return jsonify({"error": "Unable to sign in right now"}), 500


@auth_bp.route("/me", methods=["GET"])
@token_required
def me():
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT id, name, email, role FROM users WHERE id = %s;",
                    (g.user_id,),
                )
                row = cur.fetchone()
    except (psycopg.Error, RuntimeError):
        current_app.logger.exception("Loading the current user failed")
        return jsonify({"error": "Unable to load the account"}), 500

    if row is None:
        return jsonify({"error": "This account no longer exists"}), 401
    return jsonify({"user": _user_json(*row)})
