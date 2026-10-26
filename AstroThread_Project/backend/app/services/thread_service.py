
import requests
from psycopg2.extras import RealDictCursor

from db import get_connection
from services.external_apis import search_nasa_images, search_openalex_papers


def _topic(title):
    # "Black Holes: From Theory to Observation" -> "Black Holes"
    return title.split(":")[0].strip()


def get_thread_details(thread_id):
    """Everything the Thread Details page needs, or None if the thread doesn't exist."""
    conn = get_connection()
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)

        cur.execute("SELECT id, title, category, summary FROM research_threads WHERE id = %s", (thread_id,))
        thread = cur.fetchone()
        if thread is None:
            return None

        cur.execute(
            "SELECT id, year, title, description FROM timeline_events WHERE thread_id = %s ORDER BY year",
            (thread_id,),
        )
        stages = cur.fetchall()

        cur.execute("SELECT id, title, chart_type, dataset FROM chart_data WHERE thread_id = %s", (thread_id,))
        charts = cur.fetchall()

        papers, papers_error = _related_papers(cur, conn, thread)

        try:
            nasa, nasa_error = search_nasa_images(_topic(thread["title"])), None
        except requests.RequestException:
            nasa, nasa_error = [], "NASA images are unavailable right now."

        return {
            "thread": thread,
            "stages": stages,                          # timeline, oldest first
            "latest": stages[-1] if stages else None,  # "Latest Developments" section
            "charts": charts,
            "papers": papers, "papers_error": papers_error,
            "nasa": nasa, "nasa_error": nasa_error,
        }
    finally:
        conn.close()


def _related_papers(cur, conn, thread):
    """Read saved papers; the first time, fetch them from OpenAlex and save them."""
    sql = """SELECT p.id, p.title, p.authors, p.publication_year, p.url
             FROM research_papers p JOIN thread_papers tp ON tp.paper_id = p.id
             WHERE tp.thread_id = %s ORDER BY p.publication_year"""
    cur.execute(sql, (thread["id"],))
    saved = cur.fetchall()
    if saved:
        return saved, None

    try:
        found = search_openalex_papers(_topic(thread["title"]))
    except requests.RequestException:
        return [], "Related papers are unavailable right now."

    for p in found:
        cur.execute(
            """INSERT INTO research_papers (openalex_id, title, authors, publication_year, url)
               VALUES (%(openalex_id)s, %(title)s, %(authors)s, %(publication_year)s, %(url)s)
               ON CONFLICT (openalex_id) DO UPDATE SET title = EXCLUDED.title
               RETURNING id""",
            p,
        )
        paper_id = cur.fetchone()["id"]
        cur.execute(
            "INSERT INTO thread_papers (thread_id, paper_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
            (thread["id"], paper_id),
        )
    conn.commit()
    cur.execute(sql, (thread["id"],))
    return cur.fetchall(), None
