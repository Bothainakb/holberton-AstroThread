"""Fallback papers for the Thread Details page ("Related Research Papers").

GET /api/threads/<thread_id>/openalex-papers  the most-cited OpenAlex articles
                                              with the thread's topic in their
                                              title (404 if the thread is
                                              unknown, 502/504 if OpenAlex fails)

GET /api/design-threads/<slug>/openalex-papers  the same, for a design
                                                preview that has no database
                                                record yet (only the slugs in
                                                DESIGN_THREADS; 404 otherwise)

The page asks for these only when the thread has no papers linked in the
database, and labels them as search results. Public like GET /api/threads/<id>.
"""
import psycopg
from flask import Blueprint, current_app, jsonify

from app.api.v1.helpers import error
from app.persistence.database import get_db_connection
from app.services import openalex_service, thread_service
from app.services.design_threads import DESIGN_THREADS

openalex_papers_bp = Blueprint("openalex_papers_v1", __name__)

# Citation rankings change slowly; browsers may reuse an answer for an hour.
CACHE_SECONDS = 3600

# DESIGN_THREADS (app/services/design_threads.py): the design previews that
# may show OpenAlex papers; any other slug is a 404.


def openalex_response(title, label):
    """The JSON answer for one OpenAlex search, or a 502/504 error."""
    try:
        papers = openalex_service.search_thread_papers(title)
    except openalex_service.OpenAlexTimeout:
        current_app.logger.warning("OpenAlex search timed out for %s", label)
        return error("OpenAlex did not respond in time. Please try again.", 504)
    except openalex_service.OpenAlexUnavailable as exc:
        current_app.logger.warning("OpenAlex search failed for %s: %s", label, exc)
        return error("Papers from OpenAlex are unavailable right now. Please try again later.", 502)

    response = jsonify(papers)
    response.headers["Cache-Control"] = f"public, max-age={CACHE_SECONDS}"
    return response


@openalex_papers_bp.route("/api/threads/<int:thread_id>/openalex-papers", methods=["GET"])
def get_thread_openalex_papers(thread_id):
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                thread = thread_service.get_thread(cur, thread_id)
    except (psycopg.Error, RuntimeError):
        current_app.logger.exception("Loading the thread for OpenAlex papers failed")
        return error("Unable to load this research thread", 500)

    if thread is None:
        return error("Research thread not found", 404)

    # The database connection is closed before waiting on OpenAlex.
    return openalex_response(thread["title"], f"thread {thread_id}")


@openalex_papers_bp.route("/api/design-threads/<slug>/openalex-papers", methods=["GET"])
def get_design_thread_openalex_papers(slug):
    title = DESIGN_THREADS.get(slug)
    if title is None:
        return error("Research thread not found", 404)
    return openalex_response(title, f"design thread {slug}")
