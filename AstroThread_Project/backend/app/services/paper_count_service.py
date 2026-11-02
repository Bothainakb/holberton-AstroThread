"""Stored OpenAlex paper counts (migration 012) for threads with no papers in
the database, so GET /api/threads gives every thread card its count at once
instead of each card waiting for an OpenAlex search.

The count is the number of papers the thread's OpenAlex search returned: the
same papers its Thread Details page lists. It is stored whenever that search
runs for the page, and refreshed in the background when the server starts.
"""
import threading

from app.persistence.database import get_db_connection
from app.services import openalex_service

# A stored count older than this is searched again when the server starts.
REFRESH_AFTER_HOURS = 24


def save_openalex_count(cur, thread_id, count):
    cur.execute(
        """
        UPDATE research_threads
        SET openalex_paper_count = %s, openalex_checked_at = CURRENT_TIMESTAMP
        WHERE id = %s;
        """,
        (count, thread_id),
    )


def threads_needing_count(cur):
    """(id, title) of threads with no papers in the database and no recent count."""
    cur.execute(
        """
        SELECT t.id, t.title
        FROM research_threads t
        WHERE NOT EXISTS (SELECT 1 FROM thread_papers tp WHERE tp.thread_id = t.id)
          AND (t.openalex_checked_at IS NULL
               OR t.openalex_checked_at < CURRENT_TIMESTAMP - make_interval(hours => %s))
        ORDER BY t.id;
        """,
        (REFRESH_AFTER_HOURS,),
    )
    return cur.fetchall()


def store_count(thread_id, papers):
    """Stores the count of one OpenAlex search result for a thread."""
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            save_openalex_count(cur, thread_id, len(papers["items"]))


def refresh_openalex_counts(logger=None):
    """Searches OpenAlex for every thread that needs a count and stores it.

    Returns {thread_id: count} for the threads it stored. A thread whose
    search fails keeps its previous count (or none) and is tried next time.
    """
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            threads = threads_needing_count(cur)

    stored = {}
    for thread_id, title in threads:
        try:
            papers = openalex_service.search_thread_papers(title)
        except openalex_service.OpenAlexUnavailable as exc:
            if logger:
                logger.warning("OpenAlex paper count for thread %s not refreshed: %s", thread_id, exc)
            continue
        store_count(thread_id, papers)
        stored[thread_id] = len(papers["items"])
    return stored


def start_background_refresh(logger=None):
    """Runs refresh_openalex_counts in a daemon thread (python app.py only)."""

    def run():
        try:
            stored = refresh_openalex_counts(logger)
            if logger and stored:
                logger.info("Stored OpenAlex paper counts: %s", stored)
        except Exception:  # noqa: BLE001 - a failed refresh must never stop the server
            if logger:
                logger.exception("Refreshing OpenAlex paper counts failed")

    threading.Thread(target=run, name="openalex-paper-counts", daemon=True).start()
