
import psycopg
from flask import Blueprint, current_app, jsonify, request

from app.db import get_connection
from app.services import home_service, openalex, paper_service

home_bp = Blueprint("home", __name__)

MIN_QUERY_LENGTH = 2
MAX_QUERY_LENGTH = 100


@home_bp.get("/api/health")
def health():
    return jsonify({"status": "ok"})


@home_bp.get("/api/topics/popular")
def popular_topics():
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                topics = home_service.get_popular_topics(cur)
    except psycopg.Error:
        current_app.logger.exception("Loading popular topics failed")
        return jsonify({"error": "Unable to load popular topics"}), 500

    return jsonify(topics)


@home_bp.get("/api/search")
def search():
    query = " ".join(request.args.get("q", "").split())  

    if len(query) < MIN_QUERY_LENGTH:
        return jsonify({"error": "Type at least 2 characters to search"}), 400
    if len(query) > MAX_QUERY_LENGTH:
        return jsonify({"error": f"Searches can be at most {MAX_QUERY_LENGTH} characters"}), 400

    slug = home_service.slugify(query)
    if not slug:
        return jsonify({"error": "Search with letters or numbers"}), 400

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                topic = home_service.find_topic(cur, slug)
                cached = home_service.get_topic_papers(cur, topic["id"]) if topic else []

        found = None
        if not (topic and topic["fresh"] and cached):
            try:
                found = openalex.search_papers(query)
            except openalex.OpenAlexError as error:
                current_app.logger.warning("OpenAlex search failed: %s", error)
                if not cached:
                    return jsonify({"error": error.message}), error.status

        if not found and not cached and topic is None:
            return jsonify({"query": query, "topic": None, "results": []})

        title = topic["title"] if topic else home_service.display_title(query)
        with get_connection() as conn:
            with conn.cursor() as cur:
                topic_id = home_service.record_search(cur, slug, title)
                if found:
                    home_service.save_papers(cur, topic_id, found)
                papers = home_service.get_topic_papers(cur, topic_id)
    except psycopg.Error:
        current_app.logger.exception("Search failed")
        return jsonify({"error": "Unable to search right now"}), 500

    return jsonify({
        "query": query,
        "topic": {"slug": slug, "title": title},
        "results": [paper_service.to_summary(paper, title) for paper in papers],
    })
