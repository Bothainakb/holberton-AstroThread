import re

import psycopg
from flask import Blueprint, current_app, jsonify

from app.db import get_connection
from app.services import ai, home_service

topics_bp = Blueprint("topics", __name__)

SLUG_PATTERN = re.compile(r"[a-z0-9]+(?:-[a-z0-9]+)*")


@topics_bp.get("/api/topics/<slug>/overview")
def topic_overview(slug):
    if len(slug) > home_service.MAX_SLUG_LENGTH or not SLUG_PATTERN.fullmatch(slug):
        return jsonify({"error": "Topic not found"}), 404

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                topic = home_service.get_overview(cur, slug)
                if topic is None:
                    return jsonify({"error": "Topic not found"}), 404
                if topic["overview"]:
                    return jsonify(overview_json(slug, topic))
                papers = home_service.get_topic_papers(cur, topic["id"])

        if not papers:
            return jsonify({"error": "This topic has no papers to summarize yet"}), 404

        try:
            text = ai.write_overview(topic["title"], papers)
        except ai.AIError as error:
            current_app.logger.warning("AI overview for %s failed: %s", slug, error)
            return jsonify({"error": error.message}), error.status

        with get_connection() as conn:
            with conn.cursor() as cur:
                topic.update(home_service.save_overview(cur, topic["id"], text))
    except psycopg.Error:
        current_app.logger.exception("Loading the overview for %s failed", slug)
        return jsonify({"error": "Unable to load the overview right now"}), 500

    return jsonify(overview_json(slug, topic))


def overview_json(slug, topic):
    return {
        "slug": slug,
        "title": topic["title"],
        "overview": topic["overview"],
        "generated_at": topic["generated_at"],
    }
