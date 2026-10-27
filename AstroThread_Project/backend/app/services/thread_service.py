import requests
from psycopg.rows import dict_row

from app.persistence.database import get_db_connection
from app.services.external_apis import search_nasa_images, search_openalex_papers

PAPERS_SQL = """
    SELECT p.publication_year AS year, p.title, p.authors, p.summary, p.url
    FROM research_papers p
    JOIN thread_papers tp ON tp.paper_id = p.id
    WHERE tp.thread_id = %s
    ORDER BY p.publication_year
"""


def get_thread_details(slug):
    """Everything the Thread Details page needs, or None if the slug doesn't exist."""
    with get_db_connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """SELECT id, slug, title, category, description, headline, intro, evidence
                   FROM research_threads WHERE slug = %s""",
                (slug,),
            )
            thread = cur.fetchone()
            if thread is None:
                return None

            cur.execute(
                """SELECT icon, title, summary, paragraphs, facts
                   FROM thread_stages WHERE thread_id = %s ORDER BY position""",
                (thread["id"],),
            )
            stages = [
                {
                    "icon": s["icon"],
                    "title": s["title"],
                    "summary": s["summary"],
                    "content": (
                        {"paragraphs": s["paragraphs"], "facts": s["facts"]}
                        if s["paragraphs"] else None
                    ),
                }
                for s in cur.fetchall()
            ]

            cur.execute(
                """SELECT event_date, title, text FROM latest_developments
                   WHERE thread_id = %s ORDER BY event_date DESC LIMIT 1""",
                (thread["id"],),
            )
            latest = cur.fetchone()
            if latest:
                latest["date"] = latest.pop("event_date").isoformat()

            papers, papers_error = _related_papers(conn, cur, thread)

    try:
        nasa_media, nasa_error = search_nasa_images(thread["title"]), None
    except (requests.RequestException, KeyError, ValueError):
        nasa_media, nasa_error = [], "NASA images are unavailable right now."

    return {
        "threadId": thread["slug"],
        "title": thread["title"],
        "headline": thread["headline"] or thread["title"],
        "intro": thread["intro"] or thread["description"],
        "categories": [thread["category"]],
        "stages": stages,
        "papers": papers,
        "papersError": papers_error,
        "evidence": thread["evidence"],
        "nasa": {"media": nasa_media, "error": nasa_error},
        "latest": latest,
    }


def _related_papers(conn, cur, thread):
    """Return cached papers; on first visit, fetch them from OpenAlex and cache them."""
    cur.execute(PAPERS_SQL, (thread["id"],))
    saved = cur.fetchall()
    if saved:
        return saved, None

    try:
        found = search_openalex_papers(thread["title"])
    except (requests.RequestException, ValueError):
        return [], "Related papers are unavailable right now."

    for paper in found:
        cur.execute(
            """INSERT INTO research_papers
                   (openalex_id, title, authors, publication_year, summary, url)
               VALUES (%(openalex_id)s, %(title)s, %(authors)s,
                       %(publication_year)s, %(summary)s, %(url)s)
               ON CONFLICT (openalex_id) DO UPDATE SET title = EXCLUDED.title
               RETURNING id""",
            paper,
        )
        cur.execute(
            "INSERT INTO thread_papers (thread_id, paper_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
            (thread["id"], cur.fetchone()["id"]),
        )
    conn.commit()
    cur.execute(PAPERS_SQL, (thread["id"],))
    return cur.fetchall(), None
