"""Saved research threads ("Saved Research Threads" on the Profile page).

GET    /api/bookmarks              all of the user's saved threads, newest first
POST   /api/bookmarks {thread_id}  save a thread (201, or 200 if already saved)
DELETE /api/bookmarks/<thread_id>  remove it (204, or 404 if it was not saved)

Users only ever see and change their own bookmarks: the user id always comes
from the session, never from the request.
"""
import psycopg
from flask import Blueprint, current_app, g, jsonify

from app.api.v1.auth import error, login_required, read_json_body
from app.persistence.database import get_db_connection
from app.services import profile_service as profiles

bookmarks_bp = Blueprint("bookmarks_v1", __name__)


@bookmarks_bp.route("/api/bookmarks", methods=["GET"])
@login_required()
def list_bookmarks():
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                threads = profiles.get_saved_threads(cur, g.user["id"])
    except (psycopg.Error, RuntimeError):
        current_app.logger.exception("Loading bookmarks failed")
        return error("Unable to load your saved threads", 500)

    return jsonify(threads)


@bookmarks_bp.route("/api/bookmarks", methods=["POST"])
@login_required()
def add_bookmark():
    data = read_json_body()
    if data is None:
        return error("Request body must be a JSON object", 400)

    thread_id = data.get("thread_id")
    if not isinstance(thread_id, int) or isinstance(thread_id, bool):
        return error("thread_id is required", 400)

    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                if not profiles.thread_exists(cur, thread_id):
                    return error("Research thread not found", 404)
                created = profiles.add_bookmark(cur, g.user["id"], thread_id)
    except (psycopg.Error, RuntimeError):
        current_app.logger.exception("Saving a bookmark failed")
        return error("Unable to save this thread", 500)

    return jsonify({"thread_id": thread_id, "saved": True}), 201 if created else 200


@bookmarks_bp.route("/api/bookmarks/<int:thread_id>", methods=["DELETE"])
@login_required()
def remove_bookmark(thread_id):
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                removed = profiles.remove_bookmark(cur, g.user["id"], thread_id)
    except (psycopg.Error, RuntimeError):
        current_app.logger.exception("Removing a bookmark failed")
        return error("Unable to remove this thread", 500)

    if not removed:
        return error("This thread is not in your saved threads", 404)
    return "", 204
