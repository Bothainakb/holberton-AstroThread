
import os
from datetime import timedelta

import psycopg
from app.persistence.database import get_db_connection as _get_db_connection
from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS

load_dotenv()

app = Flask(__name__)

# Signs the session cookie. Without it, sign-in is refused.
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


# Sign-in with email codes: app/api/v1/auth.py
from app.api.v1.auth import auth_bp  # noqa: E402

app.register_blueprint(auth_bp)


if __name__ == "__main__":
    app.run(
        debug=True,
        use_reloader=False,
        port=5000,
    )
