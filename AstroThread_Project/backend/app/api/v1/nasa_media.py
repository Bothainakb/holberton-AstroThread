"""NASA media for the Thread Details page ("Images and data from NASA").

GET /api/threads/<thread_id>/nasa-media  NASA images about the thread's topic
                                         (404 if the thread is unknown,
                                         502/504 if NASA fails)

Public like GET /api/threads/<id>. Kept apart from that route so a slow NASA
answer never delays the rest of the page.
"""
import psycopg
from flask import Blueprint, current_app, jsonify

from app.api.v1.helpers import error
from app.persistence.database import get_db_connection
from app.services import nasa_service, thread_service

nasa_media_bp = Blueprint("nasa_media_v1", __name__)

# NASA's library changes rarely; browsers may reuse an answer for 10 minutes.
CACHE_SECONDS = 600


@nasa_media_bp.route("/api/threads/<int:thread_id>/nasa-media", methods=["GET"])
def get_thread_nasa_media(thread_id):
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                thread = thread_service.get_thread(cur, thread_id)
    except (psycopg.Error, RuntimeError):
        current_app.logger.exception("Loading the thread for NASA media failed")
        return error("Unable to load this research thread", 500)

    if thread is None:
        return error("Research thread not found", 404)

    # The database connection is closed before waiting on NASA.
    try:
        media = nasa_service.search_thread_media(thread["title"])
    except nasa_service.NasaTimeout:
        current_app.logger.warning("NASA image search timed out for thread %s", thread_id)
        return error("NASA did not respond in time. Please try again.", 504)
    except nasa_service.NasaUnavailable as exc:
        current_app.logger.warning("NASA image search failed for thread %s: %s", thread_id, exc)
        return error("NASA images are unavailable right now. Please try again later.", 502)

    response = jsonify(media)
    response.headers["Cache-Control"] = f"public, max-age={CACHE_SECONDS}"
    return response
