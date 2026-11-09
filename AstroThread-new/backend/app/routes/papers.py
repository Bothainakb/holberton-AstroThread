
import psycopg
from flask import Blueprint, current_app, jsonify

from app.db import get_connection
from app.services import ai, paper_service

papers_bp = Blueprint("papers", __name__)

NOT_FOUND = {"error": "Paper not found"}


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
