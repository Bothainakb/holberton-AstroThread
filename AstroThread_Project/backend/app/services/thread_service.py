from psycopg.rows import dict_row

from app.persistence.database import get_db_connection
from app.services import nasa_service, openalex_service


PAPERS_SQL = """
    SELECT p.publication_year AS year,
           p.title,
           p.authors,
           p.abstract AS summary,
           p.url
    FROM research_papers p
    JOIN thread_papers tp ON tp.paper_id = p.id
    WHERE tp.thread_id = %s
    ORDER BY p.publication_year
"""


def get_thread(cur, thread_id):
    cur.execute(
        "SELECT id, title, category, description FROM research_threads WHERE id = %s;",
        (thread_id,),
    )
    row = cur.fetchone()
    if row is None:
        return None
    return {
        "id": row[0],
        "title": row[1],
        "category": row[2],
        "description": row[3],
    }


def get_timeline(cur, thread_id):
    cur.execute(
        """
        SELECT id, year, title, description, source_name, source_url
        FROM timeline_events
        WHERE thread_id = %s
        ORDER BY year, id;
        """,
        (thread_id,),
    )
    return [
        {
            "id": row[0],
            "year": row[1],
            "title": row[2],
            "description": row[3],
            "source_name": row[4],
            "source_url": row[5],
        }
        for row in cur.fetchall()
    ]


def get_charts(cur, thread_id):
    cur.execute(
        """
        SELECT id, title, chart_type, note, dataset
        FROM chart_data
        WHERE thread_id = %s
        ORDER BY id;
        """,
        (thread_id,),
    )
    return [
        {
            "id": row[0],
            "title": row[1],
            "chart_type": row[2],
            "note": row[3],
            "dataset": row[4],
        }
        for row in cur.fetchall()
    ]


def get_stages(cur, thread_id):
    """The thread's research stages in order (position 1-5)."""
    cur.execute(
        """
        SELECT position, icon, title, summary, paragraphs, facts
        FROM thread_stages
        WHERE thread_id = %s
        ORDER BY position;
        """,
        (thread_id,),
    )
    return [
        {
            "position": row[0],
            "icon": row[1],
            "title": row[2],
            "summary": row[3],
            "paragraphs": row[4],
            "facts": row[5],
        }
        for row in cur.fetchall()
    ]


def get_developments(cur, thread_id):
    """The thread's latest developments, newest first, with their sources."""
    cur.execute(
        """
        SELECT id, event_date, title, text, source_name, source_url
        FROM latest_developments
        WHERE thread_id = %s
        ORDER BY event_date DESC, id DESC;
        """,
        (thread_id,),
    )
    return [
        {
            "id": row[0],
            "date": row[1].isoformat(),
            "title": row[2],
            "text": row[3],
            "source_name": row[4],
            "source_url": row[5],
        }
        for row in cur.fetchall()
    ]


def get_papers(cur, thread_id):
    cur.execute(
        """
        SELECT p.id, p.title, p.authors, p.publication_year, p.url, tp.is_illustrative
        FROM thread_papers tp
        JOIN research_papers p ON p.id = tp.paper_id
        WHERE tp.thread_id = %s
        ORDER BY p.publication_year NULLS LAST, p.id;
        """,
        (thread_id,),
    )
    return [
        {
            "id": row[0],
            "title": row[1],
            "authors": row[2],
            "year": row[3],
            "url": row[4],
            "illustrative": row[5],
        }
        for row in cur.fetchall()
    ]


def get_thread_details(cur, thread_id):
    """Return database-backed details for a thread ID."""
    thread = get_thread(cur, thread_id)
    if thread is None:
        return None

    timeline = get_timeline(cur, thread_id)
    return {
        "thread": thread,
        "timeline": timeline,
        "latest": timeline[-1] if timeline else None,
        "stages": get_stages(cur, thread_id),
        "developments": get_developments(cur, thread_id),
        "charts": get_charts(cur, thread_id),
        "papers": get_papers(cur, thread_id),
    }


def get_thread_details_by_slug(slug):
    """Return legacy Thread Details data for a thread slug."""
    with get_db_connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                SELECT id, slug, title, category, description, headline, intro, evidence
                FROM research_threads
                WHERE slug = %s
                """,
                (slug,),
            )
            thread = cur.fetchone()
            if thread is None:
                return None

            cur.execute(
                """
                SELECT icon, title, summary, paragraphs, facts
                FROM thread_stages
                WHERE thread_id = %s
                ORDER BY position
                """,
                (thread["id"],),
            )
            stages = [
                {
                    "icon": stage["icon"],
                    "title": stage["title"],
                    "summary": stage["summary"],
                    "content": (
                        {
                            "paragraphs": stage["paragraphs"],
                            "facts": stage["facts"],
                        }
                        if stage["paragraphs"]
                        else None
                    ),
                }
                for stage in cur.fetchall()
            ]

            cur.execute(
                """
                SELECT event_date, title, text
                FROM latest_developments
                WHERE thread_id = %s
                ORDER BY event_date DESC
                LIMIT 1
                """,
                (thread["id"],),
            )
            latest = cur.fetchone()
            if latest:
                latest["date"] = latest.pop("event_date").isoformat()

            cur.execute(PAPERS_SQL, (thread["id"],))
            saved_papers = cur.fetchall()

    # The database connection is closed before waiting on OpenAlex or NASA.
    papers, papers_error = _related_papers(thread, saved_papers)
    nasa_media, nasa_error = _nasa_media(thread)

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


def _related_papers(thread, saved):
    """The thread's saved papers, else the filtered OpenAlex search that
    GET /api/threads/<id>/openalex-papers uses. Search results are never
    written to the database: a GET must not change data."""
    if saved:
        return saved, None

    try:
        found = openalex_service.search_thread_papers(thread["title"])["items"]
    except openalex_service.OpenAlexUnavailable:
        return [], "Related papers are unavailable right now."

    return [
        {
            "year": paper["year"],
            "title": paper["title"],
            "authors": paper["authors"],
            "summary": paper["summary"],
            "url": paper["url"],
        }
        for paper in found
    ], None


def _nasa_media(thread):
    """On-topic NASA images, from the same search as GET /api/threads/<id>/nasa-media."""
    try:
        items = nasa_service.search_thread_media(thread["title"])["items"]
    except nasa_service.NasaUnavailable:
        return [], "NASA images are unavailable right now."

    return [
        {"title": item["title"], "description": item["description"] or "", "imageUrl": item["image_url"]}
        for item in items
    ], None
