
import psycopg
from flask import Blueprint, current_app, jsonify, request
from app.services.thread_service import get_thread_details
from app.persistence.database import get_db_connection

threads_bp = Blueprint("threads_v1", __name__)

REGEX_SPECIAL_CHARS = set("\\.^$*+?()[]{}|")
MAX_QUERY_LENGTH = 100



@threads_bp.route("/api/threads/<slug>", methods=["GET"])
def get_thread(slug):
    try:
        details = get_thread_details(slug)
    except (psycopg.Error, RuntimeError):
        current_app.logger.exception("Thread details query failed")
        return jsonify({"error": "Unable to retrieve this research thread"}), 500

    if details is None:
        return jsonify({"error": "Research thread not found"}), 404
    return jsonify(details)
def word_start_pattern(text):
    """Match text literally at the start of a PostgreSQL word."""
    escaped = "".join(
        f"\\{char}" if char in REGEX_SPECIAL_CHARS else char
        for char in text
    )
    first = text[:1]
    return rf"\m{escaped}" if first.isalnum() or first == "_" else escaped


@threads_bp.route("/api/threads", methods=["GET"])
def get_threads():
    query = request.args.get("q", "").strip()

    if len(query) > MAX_QUERY_LENGTH:
        return jsonify(
            {"error": f"Search query must be at most {MAX_QUERY_LENGTH} characters"}
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

        return jsonify([
            {
                "id": row[0],
                "title": row[1],
                "category": row[2],
                "description": row[3],
            }
            for row in rows
        ])

    except (psycopg.Error, RuntimeError):
        current_app.logger.exception("Database query failed")
        return jsonify(
            {"error": "Unable to retrieve research threads"}
        ), 500
