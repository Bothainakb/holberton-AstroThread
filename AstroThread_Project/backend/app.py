
import os
import re
from datetime import timedelta
from functools import wraps

import psycopg
from dotenv import load_dotenv
from flask import Flask, g, jsonify, request, session
from flask_cors import CORS
from werkzeug.security import check_password_hash, generate_password_hash

load_dotenv()

app = Flask(__name__)

app.config["SECRET_KEY"] = os.getenv("SECRET_KEY") or None
app.config.update(
    SESSION_COOKIE_NAME="astrothread_session",
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
    SESSION_COOKIE_SECURE=os.getenv("SESSION_COOKIE_SECURE", "").lower() == "true",
    PERMANENT_SESSION_LIFETIME=timedelta(days=7),
)

CORS(app)

from app.api.v1.static import static_bp
from app.api.v1.threads import threads_bp

app.register_blueprint(static_bp)
app.register_blueprint(threads_bp)


def get_db_connection():
    password = os.getenv("DB_PASSWORD")
    if not password:
        raise RuntimeError(
            "DB_PASSWORD is not set. Check your backend/.env file."
        )

    return psycopg.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=os.getenv("DB_PORT", "5432"),
        dbname=os.getenv("DB_NAME", "astrothread_db"),
        user=os.getenv("DB_USER", "postgres"),
        password=password,
    )


# Authentication
ROLES = ("user", "owner")
MAX_EMAIL_LENGTH = 254
MAX_PASSWORD_LENGTH = 1024
INVALID_CREDENTIALS = "Invalid email or password"
EMAIL_PATTERN = re.compile(r"[^\s@]+@[^\s@]+\.[^\s@]+")
DUMMY_PASSWORD_HASH = generate_password_hash("astrothread-no-such-account")


def normalize_email(email):
    return email.strip().lower()


def user_to_json(row):
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
    def decorator(view):
        @wraps(view)
        def wrapper(*args, **kwargs):
            user_id = session.get("user_id")

            if not isinstance(user_id, int):
                return jsonify({"error": "Authentication required"}), 401

            try:
                user = find_user(user_id)
            except (psycopg.Error, RuntimeError):
                app.logger.exception("Session lookup failed")
                return jsonify(
                    {"error": "Unable to verify your session"}
                ), 500

            if user is None:
                session.clear()
                return jsonify({"error": "Authentication required"}), 401

            if role is not None and user["role"] != role:
                return jsonify(
                    {"error": "You do not have permission to access this resource"}
                ), 403

            g.user = user
            return view(*args, **kwargs)

        return wrapper

    return decorator


@app.route("/api/auth/login", methods=["POST"])
def login():
    if not app.secret_key:
        app.logger.error("SECRET_KEY is not set, so sign-in is disabled")
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
        return jsonify({"error": "Email and password are required"}), 400

    if len(email) > MAX_EMAIL_LENGTH or len(password) > MAX_PASSWORD_LENGTH:
        return jsonify({"error": "Email or password is too long"}), 400

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
    app.run(debug=True, use_reloader=False, port=5000)
