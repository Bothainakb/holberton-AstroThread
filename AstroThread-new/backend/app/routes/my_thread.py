import re

import psycopg
from flask import Blueprint, current_app, jsonify, request, session

from app.db import get_connection
from app.routes.auth import error, login_required
from app.services import my_thread_service

my_thread_bp = Blueprint("my_thread", __name__)

STEP_KEY_PATTERN = re.compile(r"[A-Za-z0-9-]{1,40}")
MAX_TOPIC_LENGTH = 100
MAX_QUERY_LENGTH = 100
MAX_PAPER_TOPIC_LENGTH = 200
MAX_NOTE_LENGTH = 500


def clean(value):
    return " ".join(value.split()) if isinstance(value, str) else ""


def run(work, failure_message):
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                return work(cur, session["user_id"])
    except psycopg.Error:
        current_app.logger.exception(failure_message)
        return error("Unable to update My Thread right now. Please try again.", 500)


@my_thread_bp.get("/api/my-thread")
@login_required
def get_my_thread():
    return run(lambda cur, user_id: jsonify(my_thread_service.get_thread(cur, user_id)),
               "Loading My Thread failed")


@my_thread_bp.post("/api/my-thread/topics")
@login_required
def save_topic():
    data = request.get_json(silent=True) or {}
    topic = clean(data.get("topic"))
    if not topic or len(topic) > MAX_TOPIC_LENGTH:
        return error(f"A topic needs 1 to {MAX_TOPIC_LENGTH} characters.", 400)

    def work(cur, user_id):
        my_thread_service.save_topic(cur, user_id, topic)
        return "", 204

    return run(work, "Saving a topic failed")


@my_thread_bp.delete("/api/my-thread/topics/<path:topic>")
@login_required
def remove_topic(topic):
    def work(cur, user_id):
        my_thread_service.remove_topic(cur, user_id, clean(topic))
        return "", 204

    return run(work, "Removing a topic failed")


def read_step(data):
    """The new step from the request body, or (None, message) if it isn't valid."""
    key = data.get("id")
    if not isinstance(key, str) or not STEP_KEY_PATTERN.fullmatch(key):
        return None, "Each step needs a short id made of letters, numbers and dashes."

    if data.get("type") == "search":
        query = clean(data.get("query"))
        if not query or len(query) > MAX_QUERY_LENGTH:
            return None, f"A search needs 1 to {MAX_QUERY_LENGTH} characters."
        return {"id": key, "type": "search", "query": query}, None

    if data.get("type") == "paper":
        paper_id = str(data.get("paperId", ""))
        if not paper_id.isdigit():
            return None, "A paper step needs the paper's id."
        topic = clean(data.get("topic"))[:MAX_PAPER_TOPIC_LENGTH] or None
        return {"id": key, "type": "paper", "paperId": int(paper_id), "topic": topic}, None

    return None, "A step must be a search or a paper."


@my_thread_bp.post("/api/my-thread/steps")
@login_required
def add_step():
    step, problem = read_step(request.get_json(silent=True) or {})
    if problem:
        return error(problem, 400)

    def work(cur, user_id):
        if step["type"] == "paper" and not my_thread_service.paper_exists(cur, step["paperId"]):
            return error("Paper not found.", 404)
        my_thread_service.add_step(cur, user_id, step)
        return "", 204

    return run(work, "Adding a journey step failed")


@my_thread_bp.patch("/api/my-thread/steps/<step_key>")
@login_required
def set_note(step_key):
    note = (request.get_json(silent=True) or {}).get("note", "")
    if not isinstance(note, str):
        return error("A note must be text.", 400)
    note = note.strip()[:MAX_NOTE_LENGTH]

    def work(cur, user_id):
        if not my_thread_service.set_note(cur, user_id, step_key, note):
            return error("Step not found.", 404)
        return "", 204

    return run(work, "Saving a note failed")


@my_thread_bp.delete("/api/my-thread/steps/<step_key>")
@login_required
def remove_step(step_key):
    def work(cur, user_id):
        if not my_thread_service.remove_step(cur, user_id, step_key):
            return error("Step not found.", 404)
        return "", 204

    return run(work, "Removing a journey step failed")
