"""Owner Dashboard (Figma "11-Owner-Dashboard"): owner-only content management.

Paths follow "Internal APIs" (5.1) in AstroThread-Technical-Documentation.md.

Research threads tab
GET    /api/owner/research-threads           every thread, newest update first
POST   /api/owner/research-threads           create a thread                 201
GET    /api/owner/research-threads/<id>      one thread (to fill the edit form)
PATCH  /api/owner/research-threads/<id>      change some of its fields       200
DELETE /api/owner/research-threads/<id>      delete it and its content       204

Timeline events tab
GET    /api/owner/research-threads/<id>/timeline-events    a thread's events
POST   /api/owner/research-threads/<id>/timeline-events    add one          201
PATCH  /api/owner/timeline-events/<event_id>               edit one         200
DELETE /api/owner/timeline-events/<event_id>               delete one       204

Thread body: title, category, description (the form's "Summary") and
is_featured. POST needs the three text fields; PATCH takes any of them.
Event body: year, title (required on POST), description, source_name,
source_url (optional; null clears them).

Signed-out requests get 401 and signed-in users who are not owners get 403.
The role is read from the database on every request (login_required), never
from the request. Owners are promoted with:  python manage.py set-role EMAIL owner
"""
import re

import psycopg
from flask import Blueprint, current_app, jsonify

from app import login_required
from app.api.v1.helpers import error, read_json_body
from app.persistence.database import get_db_connection
from app.services import owner_thread_service as owner

owner_threads_bp = Blueprint("owner_threads_v1", __name__)

# research_threads.title is VARCHAR(255) and category VARCHAR(100); the title
# limit is kept lower so it still fits the slug and the dashboard table.
THREAD_TEXT_LIMITS = {"title": 150, "category": 100, "description": 5000}
# timeline_events: title VARCHAR(150), source_name VARCHAR(200).
EVENT_TEXT_LIMITS = {"title": 150, "description": 2000, "source_name": 200}
MAX_URL_LENGTH = 500
URL_PATTERN = re.compile(r"https?://\S+")
# Covers ancient observations as well as next year's planned missions.
MIN_YEAR, MAX_YEAR = -3000, 2100

THREAD_NOT_FOUND = "Research thread not found"
EVENT_NOT_FOUND = "Timeline event not found"
TITLE_TAKEN = "A research thread with this title already exists"
EVENT_TAKEN = "This thread already has an event with this year and title"


def is_int(value):
    # bool is a subclass of int in Python, so reject True/False explicitly.
    return isinstance(value, int) and not isinstance(value, bool)


def unknown_fields(data, allowed):
    unknown = sorted(set(data) - set(allowed))
    if unknown:
        return f"These fields cannot be set here: {', '.join(unknown)}"
    return None


def validate_thread(data, partial):
    """Returns (fields, None) with trimmed values, or (None, error message)."""
    message = unknown_fields(data, owner.THREAD_FIELDS)
    if message:
        return None, message

    fields = {}
    for name, limit in THREAD_TEXT_LIMITS.items():
        if name not in data:
            if not partial:
                return None, f"{name} is required"
            continue
        value = data[name]
        if not isinstance(value, str) or not value.strip():
            return None, f"{name} must be non-empty text"
        value = value.strip()
        if len(value) > limit:
            return None, f"{name} must be at most {limit} characters"
        fields[name] = value

    if "is_featured" in data:
        if not isinstance(data["is_featured"], bool):
            return None, "is_featured must be true or false"
        fields["is_featured"] = data["is_featured"]

    if partial and not fields:
        return None, "Send at least one of: title, category, description, is_featured"
    return fields, None


def validate_event(data, partial):
    """Returns (fields, None) with trimmed values, or (None, error message)."""
    message = unknown_fields(data, owner.EVENT_FIELDS)
    if message:
        return None, message

    fields = {}

    if "year" in data:
        year = data["year"]
        if not is_int(year) or not MIN_YEAR <= year <= MAX_YEAR:
            return None, f"year must be a whole number from {MIN_YEAR} to {MAX_YEAR}"
        fields["year"] = year
    elif not partial:
        return None, "year is required"

    if "title" in data:
        title = data["title"]
        if not isinstance(title, str) or not title.strip():
            return None, "title must be non-empty text"
        fields["title"] = title.strip()
    elif not partial:
        return None, "title is required"

    # Optional text: null or "" clears it.
    for name in ("description", "source_name"):
        if name in data:
            value = data[name]
            if value is not None and not isinstance(value, str):
                return None, f"{name} must be text"
            fields[name] = (value or "").strip() or None

    for name, limit in EVENT_TEXT_LIMITS.items():
        if fields.get(name) and len(fields[name]) > limit:
            return None, f"{name} must be at most {limit} characters"

    if "source_url" in data:
        url = data["source_url"]
        if url is not None and not isinstance(url, str):
            return None, "source_url must be a link"
        url = (url or "").strip()
        if url and (len(url) > MAX_URL_LENGTH or not URL_PATTERN.fullmatch(url)):
            return None, "source_url must be an http(s) link"
        fields["source_url"] = url or None

    if partial and not fields:
        return None, "Send at least one of: " + ", ".join(owner.EVENT_FIELDS)
    return fields, None


# ----- Research threads -----

@owner_threads_bp.route("/api/owner/research-threads", methods=["GET"])
@login_required(role="owner")
def list_threads():
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                threads = owner.list_threads(cur)
    except (psycopg.Error, RuntimeError):
        current_app.logger.exception("Loading owner threads failed")
        return error("Unable to load the research threads", 500)
    return jsonify(threads)


@owner_threads_bp.route("/api/owner/research-threads", methods=["POST"])
@login_required(role="owner")
def create_thread():
    data = read_json_body()
    if data is None:
        return error("Request body must be a JSON object", 400)
    fields, message = validate_thread(data, partial=False)
    if message:
        return error(message, 400)

    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                if owner.title_taken(cur, fields["title"]):
                    return error(TITLE_TAKEN, 409)
                thread = owner.create_thread(cur, fields)
    except psycopg.errors.UniqueViolation:
        # Another request created the same slug at the same moment.
        return error(TITLE_TAKEN, 409)
    except (psycopg.Error, RuntimeError):
        current_app.logger.exception("Creating a research thread failed")
        return error("Unable to create the research thread", 500)
    return jsonify(thread), 201


@owner_threads_bp.route("/api/owner/research-threads/<int:thread_id>", methods=["GET"])
@login_required(role="owner")
def get_thread(thread_id):
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                thread = owner.get_thread(cur, thread_id)
    except (psycopg.Error, RuntimeError):
        current_app.logger.exception("Loading an owner thread failed")
        return error("Unable to load the research thread", 500)
    if thread is None:
        return error(THREAD_NOT_FOUND, 404)
    return jsonify(thread)


@owner_threads_bp.route("/api/owner/research-threads/<int:thread_id>", methods=["PATCH"])
@login_required(role="owner")
def update_thread(thread_id):
    data = read_json_body()
    if data is None:
        return error("Request body must be a JSON object", 400)
    changes, message = validate_thread(data, partial=True)
    if message:
        return error(message, 400)

    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                if "title" in changes and owner.title_taken(
                    cur, changes["title"], exclude_id=thread_id
                ):
                    return error(TITLE_TAKEN, 409)
                thread = owner.update_thread(cur, thread_id, changes)
    except (psycopg.Error, RuntimeError):
        current_app.logger.exception("Updating a research thread failed")
        return error("Unable to update the research thread", 500)
    if thread is None:
        return error(THREAD_NOT_FOUND, 404)
    return jsonify(thread)


@owner_threads_bp.route("/api/owner/research-threads/<int:thread_id>", methods=["DELETE"])
@login_required(role="owner")
def delete_thread(thread_id):
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                deleted = owner.delete_thread(cur, thread_id)
    except (psycopg.Error, RuntimeError):
        current_app.logger.exception("Deleting a research thread failed")
        return error("Unable to delete the research thread", 500)
    if not deleted:
        return error(THREAD_NOT_FOUND, 404)
    return "", 204


# ----- Timeline events -----

@owner_threads_bp.route(
    "/api/owner/research-threads/<int:thread_id>/timeline-events", methods=["GET"]
)
@login_required(role="owner")
def list_events(thread_id):
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                if owner.get_thread(cur, thread_id) is None:
                    return error(THREAD_NOT_FOUND, 404)
                events = owner.list_events(cur, thread_id)
    except (psycopg.Error, RuntimeError):
        current_app.logger.exception("Loading timeline events failed")
        return error("Unable to load the timeline events", 500)
    return jsonify(events)


@owner_threads_bp.route(
    "/api/owner/research-threads/<int:thread_id>/timeline-events", methods=["POST"]
)
@login_required(role="owner")
def create_event(thread_id):
    data = read_json_body()
    if data is None:
        return error("Request body must be a JSON object", 400)
    fields, message = validate_event(data, partial=False)
    if message:
        return error(message, 400)

    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                if owner.get_thread(cur, thread_id) is None:
                    return error(THREAD_NOT_FOUND, 404)
                if owner.event_taken(cur, thread_id, fields["year"], fields["title"]):
                    return error(EVENT_TAKEN, 409)
                event = owner.create_event(cur, thread_id, fields)
    except psycopg.errors.UniqueViolation:
        return error(EVENT_TAKEN, 409)
    except (psycopg.Error, RuntimeError):
        current_app.logger.exception("Creating a timeline event failed")
        return error("Unable to create the timeline event", 500)
    return jsonify(event), 201


@owner_threads_bp.route("/api/owner/timeline-events/<int:event_id>", methods=["PATCH"])
@login_required(role="owner")
def update_event(event_id):
    data = read_json_body()
    if data is None:
        return error("Request body must be a JSON object", 400)
    changes, message = validate_event(data, partial=True)
    if message:
        return error(message, 400)

    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                current = owner.get_event(cur, event_id)
                if current is None:
                    return error(EVENT_NOT_FOUND, 404)
                year = changes.get("year", current["year"])
                title = changes.get("title", current["title"])
                if ("year" in changes or "title" in changes) and owner.event_taken(
                    cur, current["thread_id"], year, title, exclude_id=event_id
                ):
                    return error(EVENT_TAKEN, 409)
                event = owner.update_event(cur, event_id, changes)
    except psycopg.errors.UniqueViolation:
        return error(EVENT_TAKEN, 409)
    except (psycopg.Error, RuntimeError):
        current_app.logger.exception("Updating a timeline event failed")
        return error("Unable to update the timeline event", 500)
    if event is None:
        return error(EVENT_NOT_FOUND, 404)
    return jsonify(event)


@owner_threads_bp.route("/api/owner/timeline-events/<int:event_id>", methods=["DELETE"])
@login_required(role="owner")
def delete_event(event_id):
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                deleted = owner.delete_event(cur, event_id)
    except (psycopg.Error, RuntimeError):
        current_app.logger.exception("Deleting a timeline event failed")
        return error("Unable to delete the timeline event", 500)
    if not deleted:
        return error(EVENT_NOT_FOUND, 404)
    return "", 204
