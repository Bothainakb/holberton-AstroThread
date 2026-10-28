import psycopg
from flask import Blueprint, current_app, jsonify, request

from app.persistence.database import get_db_connection
from app.services.thread_service import get_thread_details

threads_bp = Blueprint("threads_v1", __name__)

REGEX_SPECIAL_CHARS = set("\\.^$*+?()[]{}|")
MAX_QUERY_LENGTH = 100
TOTAL_STAGES = 5

# One query for the list and the search; {where} is only ever "" or SEARCH_WHERE,
# never user input. The search text itself is always passed as %(pattern)s.
THREAD_LIST_SQL = """
    SELECT t.id, t.slug, t.title, t.category, t.description, t.created_at,
           (SELECT COUNT(*) FROM thread_papers tp WHERE tp.thread_id = t.id) AS paper_count,
           (SELECT COUNT(*) FROM thread_stages ts WHERE ts.thread_id = t.id) AS stage_count
    FROM research_threads t
    {where}
    ORDER BY t.created_at DESC, t.id
"""

SEARCH_WHERE = """
    WHERE t.title ~* %(pattern)s
       OR t.category ~* %(pattern)s
       OR t.description ~* %(pattern)s
"""


def word_start_pattern(text):
    """Match text literally at the start of a PostgreSQL word."""
    escaped = "".join(
        f"\\{char}" if char in REGEX_SPECIAL_CHARS else char
        for char in text
    )
    first = text[:1]
    return rf"\m{escaped}" if first.isalnum() or first == "_" else escaped


def thread_to_json(row):
    return {
        "id": row[0],
        "slug": row[1],
        "title": row[2],
        "category": row[3],
        "description": row[4],
        "updatedAt": row[5].isoformat() if row[5] else None,
        "paperCount": row[6],
        "completedStages": row[7],
        "totalStages": TOTAL_STAGES,
    }


@threads_bp.route("/api/threads", methods=["GET"])
def get_threads():
    """All research threads, newest first; ?q= searches title, category and description."""
    query = request.args.get("q", "").strip()

    if len(query) > MAX_QUERY_LENGTH:
        return jsonify(
            {"error": f"Search query must be at most {MAX_QUERY_LENGTH} characters"}
        ), 400

    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                if query:
                    cur.execute(
                        THREAD_LIST_SQL.format(where=SEARCH_WHERE),
                        {"pattern": word_start_pattern(query)},
                    )
                else:
                    cur.execute(THREAD_LIST_SQL.format(where=""))
                rows = cur.fetchall()

        return jsonify([thread_to_json(row) for row in rows])

    except (psycopg.Error, RuntimeError):
        current_app.logger.exception("Database query failed")
        return jsonify({"error": "Unable to retrieve research threads"}), 500


@threads_bp.route("/api/threads/<slug>", methods=["GET"])
def get_thread(slug):
    """Everything the Thread Details page needs for one thread."""
    try:
        details = get_thread_details(slug)
    except (psycopg.Error, RuntimeError):
        current_app.logger.exception("Thread details query failed")
        return jsonify({"error": "Unable to retrieve this research thread"}), 500

    if details is None:
        return jsonify({"error": "Research thread not found"}), 404
    return jsonify(details)
