"""Research thread list SQL and the slug-based details route.

GET /api/threads itself is defined in app/__init__.py (it uses THREAD_LIST_SQL
and thread_to_json from here), so it is registered only once.
GET /api/threads/<slug>  e.g. /api/threads/black-holes (404 if unknown)
"""
import psycopg
from flask import Blueprint, current_app, jsonify

from app.services.thread_service import get_thread_details_by_slug

threads_bp = Blueprint("threads_v1", __name__)

# totalStages: the thread's rows in thread_stages. completedStages: how many of
# them the signed-in user has completed (thread_progress), 0 for visitors.
THREAD_LIST_SQL = """
    SELECT t.id, t.slug, t.title, t.category, t.description, t.created_at,
           (SELECT COUNT(*) FROM thread_papers tp WHERE tp.thread_id = t.id) AS paper_count,
           s.stage_count,
           COALESCE(
               (SELECT LEAST(p.stages_completed, s.stage_count)
                FROM thread_progress p
                WHERE p.thread_id = t.id AND p.user_id = %(user_id)s),
               0
           ) AS stages_completed
    FROM research_threads t
    CROSS JOIN LATERAL (
        SELECT COUNT(*) AS stage_count FROM thread_stages ts WHERE ts.thread_id = t.id
    ) AS s
    {where}
    ORDER BY t.created_at DESC, t.id
"""

SEARCH_WHERE = """
    WHERE t.title ~* %(pattern)s
       OR t.category ~* %(pattern)s
       OR t.description ~* %(pattern)s
"""


def thread_to_json(row):
    return {
        "id": row[0],
        "slug": row[1],
        "title": row[2],
        "category": row[3],
        "description": row[4],
        "updatedAt": row[5].isoformat() if row[5] else None,
        "paperCount": row[6],
        "completedStages": row[8],
        "totalStages": row[7],
    }


@threads_bp.route("/api/threads/<slug>", methods=["GET"])
def get_thread(slug):
    """Return details for a research thread by slug."""
    try:
        details = get_thread_details_by_slug(slug)
    except (psycopg.Error, RuntimeError):
        current_app.logger.exception("Thread details query failed")
        return jsonify({"error": "Unable to retrieve this research thread"}), 500

    if details is None:
        return jsonify({"error": "Research thread not found"}), 404

    return jsonify(details)
