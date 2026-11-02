"""Saved research threads and saved research papers (both shown on Profile).

GET    /api/bookmarks              all of the user's saved threads, newest first
POST   /api/bookmarks {thread_id}  save a thread (201, or 200 if already saved)
DELETE /api/bookmarks/<thread_id>  remove it (204, or 404 if it was not saved)

GET    /api/bookmarks/papers                     the user's saved papers, newest first
POST   /api/bookmarks/papers {paper_id | openalex_id, thread_id?}
                                                 save a paper (201, or 200 if already saved)
DELETE /api/bookmarks/papers/<paper_id>          remove it (204, or 404 if it was not saved)

A database paper is saved by its paper_id. An OpenAlex paper is saved by its
openalex_id: the server looks it up on OpenAlex itself (nothing about the paper
is taken from the request) and stores it in research_papers the first time.

Users only ever see and change their own bookmarks: the user id always comes
from the session, never from the request.
"""
import psycopg
from flask import Blueprint, current_app, g, jsonify

from app import login_required
from app.api.v1.helpers import error, read_json_body
from app.persistence.database import get_db_connection
from app.services import openalex_service
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


def is_id(value):
    return isinstance(value, int) and not isinstance(value, bool) and value > 0


@bookmarks_bp.route("/api/bookmarks/papers", methods=["GET"])
@login_required()
def list_paper_bookmarks():
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                papers = profiles.get_saved_papers(cur, g.user["id"])
    except (psycopg.Error, RuntimeError):
        current_app.logger.exception("Loading paper bookmarks failed")
        return error("Unable to load your saved papers", 500)

    return jsonify(papers)


@bookmarks_bp.route("/api/bookmarks/papers", methods=["POST"])
@login_required()
def add_paper_bookmark():
    data = read_json_body()
    if data is None:
        return error("Request body must be a JSON object", 400)

    paper_id = data.get("paper_id")
    openalex_id = data.get("openalex_id")
    thread_id = data.get("thread_id")
    if (paper_id is None) == (openalex_id is None):
        return error("Send either paper_id or openalex_id", 400)
    if paper_id is not None and not is_id(paper_id):
        return error("paper_id must be a positive whole number", 400)
    if openalex_id is not None and not (
        isinstance(openalex_id, str) and openalex_service.OPENALEX_WORK_ID.fullmatch(openalex_id)
    ):
        return error("openalex_id must be an OpenAlex work id", 400)
    if thread_id is not None and not is_id(thread_id):
        return error("thread_id must be a positive whole number", 400)

    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                if thread_id is not None and not profiles.thread_exists(cur, thread_id):
                    return error("Research thread not found", 404)
                if paper_id is not None:
                    if not profiles.paper_exists(cur, paper_id):
                        return error("Research paper not found", 404)
                else:
                    paper_id = profiles.find_openalex_paper(cur, openalex_id)

        # An OpenAlex paper not stored yet: its details come from OpenAlex, not the request.
        new_paper = None
        if paper_id is None:
            try:
                new_paper = openalex_service.fetch_paper(openalex_id)
            except openalex_service.OpenAlexTimeout:
                return error("OpenAlex did not respond in time. Please try again.", 504)
            except openalex_service.OpenAlexUnavailable:
                current_app.logger.exception("OpenAlex lookup for a bookmark failed")
                return error("OpenAlex is unavailable right now. Please try again later.", 502)
            if new_paper is None:
                return error("Research paper not found", 404)

        with get_db_connection() as conn:
            with conn.cursor() as cur:
                if new_paper is not None:
                    paper_id = profiles.store_openalex_paper(cur, new_paper)
                created = profiles.add_paper_bookmark(cur, g.user["id"], paper_id, thread_id)
    except (psycopg.Error, RuntimeError):
        current_app.logger.exception("Saving a paper bookmark failed")
        return error("Unable to save this paper", 500)

    return jsonify({"paper_id": paper_id, "saved": True}), 201 if created else 200


@bookmarks_bp.route("/api/bookmarks/papers/<int:paper_id>", methods=["DELETE"])
@login_required()
def remove_paper_bookmark(paper_id):
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                removed = profiles.remove_paper_bookmark(cur, g.user["id"], paper_id)
    except (psycopg.Error, RuntimeError):
        current_app.logger.exception("Removing a paper bookmark failed")
        return error("Unable to remove this paper", 500)

    if not removed:
        return error("This paper is not in your saved papers", 404)
    return "", 204
