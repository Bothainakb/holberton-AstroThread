"""Thread Details page (Figma "03-research-thread-details").

GET /api/threads/<thread_id>  the thread, its timeline, latest development,
                              charts and related papers (404 if unknown)

Public like GET /api/threads: research content needs no sign-in. Saving a
thread or progress stays behind login_required (bookmarks.py, profile.py).
"""
import psycopg
from flask import Blueprint, current_app, jsonify

from app.api.v1.helpers import error
from app.persistence.database import get_db_connection
from app.services import thread_service

thread_details_bp = Blueprint("thread_details_v1", __name__)


@thread_details_bp.route("/api/threads/<int:thread_id>", methods=["GET"])
def get_thread_details(thread_id):
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                details = thread_service.get_thread_details(cur, thread_id)
    except (psycopg.Error, RuntimeError):
        current_app.logger.exception("Loading thread details failed")
        return error("Unable to load this research thread", 500)

    if details is None:
        return error("Research thread not found", 404)
    return jsonify(details)
