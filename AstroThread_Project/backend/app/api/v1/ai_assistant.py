"""AI Research Assistant (Technical Documentation, section 4.3).

POST /api/ai/explain {question, paper_id | thread_id}
    Explains a research paper (or a whole research thread) in plain English.
    200 {answer, context: {type, id, title}, usage: {used, limit, remaining}}
    400 invalid body, 401 signed out, 404 unknown paper/thread,
    429 daily limit reached, 502/504 the AI failed, 503 AI not configured

GET /api/ai/usage
    Today's usage for the signed-in user: {used, limit, remaining}

Signed-in users only. The user id always comes from the session. A question
only counts toward the daily limit when the AI actually answered it.
"""
import psycopg
from flask import Blueprint, current_app, g, jsonify

from app import login_required
from app.api.v1.helpers import error, read_json_body
from app.persistence.database import get_db_connection
from app.services import ai_service

ai_assistant_bp = Blueprint("ai_assistant_v1", __name__)

MAX_QUESTION_LENGTH = 500


def read_id(data, key):
    """data[key] if it is a positive int (not a bool), None if absent, False if invalid."""
    value = data.get(key)
    if value is None:
        return None
    if isinstance(value, bool) or not isinstance(value, int) or value < 1:
        return False
    return value


@ai_assistant_bp.route("/api/ai/explain", methods=["POST"])
@login_required()
def explain():
    data = read_json_body()
    if data is None:
        return error("Request body must be a JSON object", 400)

    question = data.get("question")
    if not isinstance(question, str) or not question.strip():
        return error("Please type a question", 400)
    question = question.strip()
    if len(question) > MAX_QUESTION_LENGTH:
        return error(f"Questions can be at most {MAX_QUESTION_LENGTH} characters", 400)

    paper_id = read_id(data, "paper_id")
    thread_id = read_id(data, "thread_id")
    if paper_id is False or thread_id is False:
        return error("paper_id and thread_id must be positive numbers", 400)
    if paper_id is None and thread_id is None:
        return error("Choose a research paper or thread to ask about", 400)

    user_id = g.user["id"]
    limit = ai_service.daily_limit()

    # 1. Load the context and count the question (the connection is closed
    #    before waiting on the AI).
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                found = (
                    ai_service.paper_context(cur, paper_id)
                    if paper_id is not None
                    else ai_service.thread_context(cur, thread_id)
                )
                if found is None:
                    what = "Research paper" if paper_id is not None else "Research thread"
                    return error(f"{what} not found", 404)

                used = ai_service.reserve_question(cur, user_id, limit)
    except (psycopg.Error, RuntimeError):
        current_app.logger.exception("Preparing an AI question failed")
        return error("Unable to ask the AI assistant right now", 500)

    if used is None:
        return jsonify({
            "error": "You have used all of today's AI questions. Please come back tomorrow.",
            "usage": ai_service.usage_json(limit, limit),
        }), 429

    context, summary = found

    # 2. Ask the AI; give the question back if it could not answer.
    try:
        answer = ai_service.explain(question, context)
    except ai_service.AIError as ai_error:
        current_app.logger.warning("AI assistant failed: %r", ai_error.__cause__ or ai_error)
        try:
            with get_db_connection() as conn:
                with conn.cursor() as cur:
                    ai_service.refund_question(cur, user_id)
        except (psycopg.Error, RuntimeError):
            current_app.logger.exception("Refunding an AI question failed")
        return error(ai_error.message, ai_error.status)

    return jsonify({
        "answer": answer,
        "context": summary,
        "usage": ai_service.usage_json(used, limit),
    })


@ai_assistant_bp.route("/api/ai/usage", methods=["GET"])
@login_required()
def usage():
    limit = ai_service.daily_limit()
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                used = ai_service.questions_used_today(cur, g.user["id"])
    except (psycopg.Error, RuntimeError):
        current_app.logger.exception("Loading AI usage failed")
        return error("Unable to load your AI usage", 500)

    return jsonify(ai_service.usage_json(min(used, limit), limit))
