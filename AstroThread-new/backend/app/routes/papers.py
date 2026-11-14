import psycopg
from flask import Blueprint, current_app, jsonify, request

from app.db import get_connection
from app.routes.auth import login_required
from app.services import ai, paper_service

papers_bp = Blueprint("papers", __name__)

NOT_FOUND = {"error": "Paper not found"}
MIN_QUESTION_LENGTH = 3
MAX_QUESTION_LENGTH = 300


@papers_bp.get("/api/papers/<int:paper_id>")
def paper_details(paper_id):
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                paper = paper_service.get_paper(cur, paper_id)
        if paper is None:
            return jsonify(NOT_FOUND), 404

        if paper["method"] is None and paper["abstract"] and ai.is_configured():
            try:
                details = ai.write_paper_details(paper)
            except ai.AIError as error:
                current_app.logger.warning("AI details for paper %s failed: %s", paper_id, error)
            else:
                with get_connection() as conn:
                    with conn.cursor() as cur:
                        paper_service.save_details(cur, paper_id, details)
                        paper = paper_service.get_paper(cur, paper_id)
    except psycopg.Error:
        current_app.logger.exception("Loading paper %s failed", paper_id)
        return jsonify({"error": "Unable to load this paper right now"}), 500

    return jsonify(paper_service.to_details(paper))


@papers_bp.get("/api/papers/<int:paper_id>/related")
def related_papers(paper_id):
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                paper = paper_service.get_paper(cur, paper_id)
                if paper is None:
                    return jsonify(NOT_FOUND), 404
                related = paper_service.get_related(cur, paper)
    except psycopg.Error:
        current_app.logger.exception("Loading papers related to %s failed", paper_id)
        return jsonify({"error": "Unable to load related papers right now"}), 500

    return jsonify({"results": related})


@papers_bp.post("/api/papers/<int:paper_id>/ask")
@login_required
def ask_about_paper(paper_id):
    body = request.get_json(silent=True)
    question = body.get("question") if isinstance(body, dict) else None
    if not isinstance(question, str):
        return jsonify({"error": "Send your question as JSON, like {\"question\": \"...\"}"}), 400

    question = " ".join(question.split())
    if len(question) < MIN_QUESTION_LENGTH:
        return jsonify({"error": "Type a question of at least 3 characters."}), 400
    if len(question) > MAX_QUESTION_LENGTH:
        return jsonify({"error": f"Questions can be at most {MAX_QUESTION_LENGTH} characters."}), 400

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                paper = paper_service.get_paper(cur, paper_id)
    except psycopg.Error:
        current_app.logger.exception("Loading paper %s for a question failed", paper_id)
        return jsonify({"error": "Unable to load this paper right now."}), 500

    if paper is None:
        return jsonify(NOT_FOUND), 404
    if not paper["abstract"]:
        return jsonify({"error": "This paper has no abstract, so the AI can't answer questions about it."}), 422

    try:
        answer = ai.answer_question(paper, question)
    except ai.AIError as error:
        current_app.logger.warning("AI answer for paper %s failed: %s", paper_id, error)
        return jsonify({"error": error.message}), error.status

    return jsonify({"question": question, "answer": answer})
