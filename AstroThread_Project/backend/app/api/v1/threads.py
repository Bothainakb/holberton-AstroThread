
import psycopg
from flask import Blueprint, current_app, jsonify, request

from app.persistence.database import get_db_connection

threads_bp = Blueprint("threads_v1", __name__)

REGEX_SPECIAL_CHARS = set("\\.^$*+?()[]{}|")
MAX_QUERY_LENGTH = 100


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


# One thread and its timeline and charts: used by the Home page ("Latest
# Discoveries" timeline and chart) and by the Thread Details page.


def thread_not_found():
    return jsonify({"error": "Research thread not found"}), 404


def thread_exists(cur, thread_id):
    cur.execute("SELECT 1 FROM research_threads WHERE id = %s;", (thread_id,))
    return cur.fetchone() is not None


@threads_bp.route("/api/threads/<int:thread_id>", methods=["GET"])
def get_thread(thread_id):
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT t.id, t.title, t.category, t.description,
                           t.is_featured, t.updated_at,
                           COUNT(tp.paper_id) AS paper_count
                    FROM research_threads t
                    LEFT JOIN thread_papers tp ON tp.thread_id = t.id
                    WHERE t.id = %s
                    GROUP BY t.id;
                    """,
                    (thread_id,),
                )
                row = cur.fetchone()
    except (psycopg.Error, RuntimeError):
        current_app.logger.exception("Loading a research thread failed")
        return jsonify({"error": "Unable to retrieve the research thread"}), 500

    if row is None:
        return thread_not_found()

    return jsonify({
        "id": row[0],
        "title": row[1],
        "category": row[2],
        "description": row[3],
        "is_featured": row[4],
        "updated_at": row[5].isoformat() if row[5] else None,
        "paper_count": row[6],
    })


@threads_bp.route("/api/threads/<int:thread_id>/timeline", methods=["GET"])
def get_thread_timeline(thread_id):
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                if not thread_exists(cur, thread_id):
                    return thread_not_found()
                cur.execute(
                    """
                    SELECT id, year, title, description
                    FROM timeline_events
                    WHERE thread_id = %s
                    ORDER BY year, id;
                    """,
                    (thread_id,),
                )
                rows = cur.fetchall()
    except (psycopg.Error, RuntimeError):
        current_app.logger.exception("Loading a thread timeline failed")
        return jsonify({"error": "Unable to retrieve the timeline"}), 500

    return jsonify([
        {"id": row[0], "year": row[1], "title": row[2], "description": row[3]}
        for row in rows
    ])


@threads_bp.route("/api/threads/<int:thread_id>/charts", methods=["GET"])
def get_thread_charts(thread_id):
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                if not thread_exists(cur, thread_id):
                    return thread_not_found()
                cur.execute(
                    """
                    SELECT id, title, chart_type, note, dataset
                    FROM chart_data
                    WHERE thread_id = %s
                    ORDER BY id;
                    """,
                    (thread_id,),
                )
                rows = cur.fetchall()
    except (psycopg.Error, RuntimeError):
        current_app.logger.exception("Loading thread charts failed")
        return jsonify({"error": "Unable to retrieve the charts"}), 500

    # psycopg turns the JSONB "dataset" column into a Python list already.
    return jsonify([
        {
            "id": row[0],
            "title": row[1],
            "chart_type": row[2],
            "note": row[3],
            "points": row[4],
        }
        for row in rows
    ])
