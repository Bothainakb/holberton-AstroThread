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
        SELECT id, year, title, description
        FROM timeline_events
        WHERE thread_id = %s
        ORDER BY year, id;
        """,
        (thread_id,),
    )
    return [
        {"id": row[0], "year": row[1], "title": row[2], "description": row[3]}
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

            papers, papers_error = _related_papers(conn, cur, thread)

    try:
        nasa_media = search_nasa_images(thread["title"])
        nasa_error = None
    except (requests.RequestException, KeyError, ValueError):
        nasa_media = []
        nasa_error = "NASA images are unavailable right now."

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
    """Return cached papers or fetch and cache papers from OpenAlex."""
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
            """
            INSERT INTO research_papers
                (openalex_id, title, authors, publication_year, summary, url)
            VALUES
                (%(openalex_id)s, %(title)s, %(authors)s,
                 %(publication_year)s, %(summary)s, %(url)s)
            ON CONFLICT (openalex_id)
            DO UPDATE SET title = EXCLUDED.title
            RETURNING id
            """,
            paper,
        )
        paper_id = cur.fetchone()["id"]
        cur.execute(
            """
            INSERT INTO thread_papers (thread_id, paper_id)
            VALUES (%s, %s)
            ON CONFLICT DO NOTHING
            """,
            (thread["id"], paper_id),
        )

    conn.commit()
    cur.execute(PAPERS_SQL, (thread["id"],))
    return cur.fetchall(), None