"""User Profile page (Figma "08-Profile"). All routes need a signed-in user.

GET   /api/profile                       everything the Profile page shows
PATCH /api/profile                       Edit Profile and Account Settings
PUT   /api/profile/progress/<thread_id>  stage progress from Thread Details
POST  /api/profile/activity              "read a paper" / "viewed a discovery"

Log Out uses the existing POST /api/auth/logout. There is no Change Password
endpoint because sign-in uses emailed codes, not passwords.
"""
import re

import psycopg
from flask import Blueprint, current_app, g, jsonify

from app.api.v1.auth import MAX_NAME_LENGTH, error, login_required, read_json_body
from app.persistence.database import get_db_connection
from app.services import profile_service as profiles

profile_bp = Blueprint("profile_v1", __name__)

SAVED_THREADS_ON_PROFILE = 3
RECENT_THREADS_ON_PROFILE = 3
ACTIVITY_ON_PROFILE = 4
MAX_BIO_LENGTH = 300
MAX_AVATAR_URL_LENGTH = 500
MAX_STAGES = 50
URL_PATTERN = re.compile(r"https?://\S+")


def is_int(value):
    # bool is a subclass of int in Python, so reject True/False explicitly.
    return isinstance(value, int) and not isinstance(value, bool)


@profile_bp.route("/api/profile", methods=["GET"])
@login_required()
def get_profile():
    user_id = g.user["id"]
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                profile = profiles.get_user(cur, user_id)
                if profile is None:
                    return error("Authentication required", 401)
                profile["stats"] = profiles.get_stats(cur, user_id)
                profile["saved_threads"] = {
                    "count": profiles.count_saved_threads(cur, user_id),
                    "items": profiles.get_saved_threads(
                        cur, user_id, SAVED_THREADS_ON_PROFILE
                    ),
                }
                profile["recently_explored"] = profiles.get_recent_threads(
                    cur, user_id, RECENT_THREADS_ON_PROFILE
                )
                profile["activity"] = profiles.get_activity(
                    cur, user_id, ACTIVITY_ON_PROFILE
                )
    except (psycopg.Error, RuntimeError):
        current_app.logger.exception("Loading the profile failed")
        return error("Unable to load your profile", 500)

    return jsonify(profile)


def validate_profile_changes(data):
    """Returns (changes, None) or (None, error message)."""
    allowed = {"name", "bio", "avatar_url", "email_notifications", "language"}
    unknown = sorted(set(data) - allowed)
    if unknown:
        return None, f"These fields cannot be changed here: {', '.join(unknown)}"
    if not data:
        return None, "Nothing to update"

    changes = {}

    if "name" in data:
        name = data["name"]
        if not isinstance(name, str) or not name.strip():
            return None, "Name cannot be empty"
        if len(name.strip()) > MAX_NAME_LENGTH:
            return None, f"Name must be at most {MAX_NAME_LENGTH} characters"
        changes["name"] = name.strip()

    if "bio" in data:
        bio = data["bio"]
        if bio is not None and not isinstance(bio, str):
            return None, "Description must be text"
        bio = (bio or "").strip()
        if len(bio) > MAX_BIO_LENGTH:
            return None, f"Description must be at most {MAX_BIO_LENGTH} characters"
        changes["bio"] = bio or None

    if "avatar_url" in data:
        url = data["avatar_url"]
        if url is not None and not isinstance(url, str):
            return None, "Avatar must be a link"
        url = (url or "").strip()
        if url and (
            len(url) > MAX_AVATAR_URL_LENGTH or not URL_PATTERN.fullmatch(url)
        ):
            return None, "Avatar must be an http(s) link"
        changes["avatar_url"] = url or None

    if "email_notifications" in data:
        if not isinstance(data["email_notifications"], bool):
            return None, "email_notifications must be true or false"
        changes["email_notifications"] = data["email_notifications"]

    if "language" in data:
        if data["language"] not in profiles.SUPPORTED_LANGUAGES:
            return None, "This language is not supported yet"
        changes["language"] = data["language"]

    return changes, None


@profile_bp.route("/api/profile", methods=["PATCH"])
@login_required()
def update_profile():
    data = read_json_body()
    if data is None:
        return error("Request body must be a JSON object", 400)

    changes, message = validate_profile_changes(data)
    if message:
        return error(message, 400)

    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                profiles.update_user(cur, g.user["id"], changes)
                profile = profiles.get_user(cur, g.user["id"])
    except (psycopg.Error, RuntimeError):
        current_app.logger.exception("Updating the profile failed")
        return error("Unable to update your profile", 500)

    if profile is None:
        return error("Authentication required", 401)
    return jsonify(profile)


@profile_bp.route("/api/profile/progress/<int:thread_id>", methods=["PUT"])
@login_required()
def save_progress(thread_id):
    data = read_json_body()
    if data is None:
        return error("Request body must be a JSON object", 400)

    stage_count = data.get("stage_count")
    current_stage = data.get("current_stage")
    completed_stage = data.get("completed_stage")

    if not is_int(stage_count) or not 1 <= stage_count <= MAX_STAGES:
        return error(f"stage_count must be a whole number from 1 to {MAX_STAGES}", 400)
    if not is_int(current_stage) or not 1 <= current_stage <= stage_count:
        return error("current_stage must be between 1 and stage_count", 400)
    if completed_stage is not None and (
        not is_int(completed_stage) or not 0 <= completed_stage <= stage_count
    ):
        return error("completed_stage must be between 0 and stage_count", 400)

    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                if not profiles.thread_exists(cur, thread_id):
                    return error("Research thread not found", 404)
                progress = profiles.save_progress(
                    cur, g.user["id"], thread_id,
                    current_stage, stage_count, completed_stage,
                )
    except (psycopg.Error, RuntimeError):
        current_app.logger.exception("Saving thread progress failed")
        return error("Unable to save your progress", 500)

    return jsonify(progress), 201 if progress["started"] else 200


@profile_bp.route("/api/profile/activity", methods=["POST"])
@login_required()
def record_activity():
    """Body: {"type": "read_paper", "paper_id": 3, "thread_id": 1 (optional)}
    or {"type": "viewed_discovery", "event_id": 7}.
    Thread starts and completed stages are logged by the progress route."""
    data = read_json_body()
    if data is None:
        return error("Request body must be a JSON object", 400)

    activity_type = data.get("type")
    user_id = g.user["id"]

    if activity_type == "read_paper":
        paper_id, thread_id = data.get("paper_id"), data.get("thread_id")
        if not is_int(paper_id):
            return error("paper_id is required", 400)
        if thread_id is not None and not is_int(thread_id):
            return error("thread_id must be a number", 400)
    elif activity_type == "viewed_discovery":
        event_id = data.get("event_id")
        if not is_int(event_id):
            return error("event_id is required", 400)
    else:
        return error('type must be "read_paper" or "viewed_discovery"', 400)

    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                if activity_type == "read_paper":
                    if not profiles.paper_exists(cur, paper_id):
                        return error("Research paper not found", 404)
                    if thread_id is not None and not profiles.thread_exists(cur, thread_id):
                        return error("Research thread not found", 404)
                    if profiles.recently_logged(
                        cur, user_id, activity_type, "paper_id", paper_id
                    ):
                        return jsonify({"logged": False})
                    profiles.log_activity(
                        cur, user_id, activity_type,
                        thread_id=thread_id, paper_id=paper_id,
                    )
                else:
                    thread_id = profiles.discovery_thread(cur, event_id)
                    if thread_id is None:
                        return error("Discovery not found", 404)
                    if profiles.recently_logged(
                        cur, user_id, activity_type, "event_id", event_id
                    ):
                        return jsonify({"logged": False})
                    profiles.log_activity(
                        cur, user_id, activity_type,
                        thread_id=thread_id, event_id=event_id,
                    )
    except (psycopg.Error, RuntimeError):
        current_app.logger.exception("Recording activity failed")
        return error("Unable to record this activity", 500)

    return jsonify({"logged": True}), 201
