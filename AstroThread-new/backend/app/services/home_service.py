import re

POPULAR_LIMIT = 3
PAPER_CACHE_DAYS = 7          
MAX_SLUG_LENGTH = 100

NOT_LETTERS_OR_DIGITS = re.compile(r"[^a-z0-9]+")


def slugify(text):
    return NOT_LETTERS_OR_DIGITS.sub("-", text.lower()).strip("-")[:MAX_SLUG_LENGTH].strip("-")


def display_title(query):
    return query.title() if query.islower() else query


def get_popular_topics(cur):
    cur.execute(
        """
        SELECT slug, title
        FROM research_threads
        WHERE search_count > 0
        ORDER BY search_count DESC, last_searched_at DESC
        LIMIT %s;
        """,
        (POPULAR_LIMIT,),
    )
    return [{"id": slug, "label": title, "query": title} for slug, title in cur.fetchall()]


def find_topic(cur, slug):
    """{id, slug, title, fresh} for a topic searched before, or None.

     True when its papers were fetched within PAPER_CACHE_DAYS, so
    OpenAlex does not need to be asked again.
    """
    cur.execute(
        """
        SELECT id, slug, title,
               papers_fetched_at > NOW() - make_interval(days => %s) AS fresh
        FROM research_threads
        WHERE slug = %s;
        """,
        (PAPER_CACHE_DAYS, slug),
    )
    row = cur.fetchone()
    if row is None:
        return None
    return {"id": row[0], "slug": row[1], "title": row[2], "fresh": bool(row[3])}


def get_topic_papers(cur, topic_id):
    cur.execute(
        """
        SELECT p.title, p.authors, p.publication_year, p.abstract, p.url, p.cited_by_count
        FROM thread_papers tp
        JOIN research_papers p ON p.id = tp.paper_id
        WHERE tp.thread_id = %s
        ORDER BY tp.rank;
        """,
        (topic_id,),
    )
    return [
        {
            "title": row[0],
            "authors": row[1],
            "year": row[2],
            "abstract": row[3],
            "url": row[4],
            "cited_by_count": row[5],
        }
        for row in cur.fetchall()
    ]


def record_search(cur, slug, title):
    cur.execute(
        """
        INSERT INTO research_threads (slug, title, search_count, last_searched_at)
        VALUES (%s, %s, 1, NOW())
        ON CONFLICT (slug) DO UPDATE
        SET search_count = research_threads.search_count + 1,
            last_searched_at = NOW()
        RETURNING id;
        """,
        (slug, title),
    )
    return cur.fetchone()[0]


def save_papers(cur, topic_id, papers):
    paper_ids = []
    for paper in papers:
        cur.execute(
            """
            INSERT INTO research_papers
                (openalex_id, title, authors, publication_year, abstract, url, cited_by_count)
            VALUES (%(openalex_id)s, %(title)s, %(authors)s, %(publication_year)s,
                    %(abstract)s, %(url)s, %(cited_by_count)s)
            ON CONFLICT (openalex_id) DO UPDATE
            SET title = EXCLUDED.title,
                authors = EXCLUDED.authors,
                publication_year = EXCLUDED.publication_year,
                abstract = EXCLUDED.abstract,
                url = EXCLUDED.url,
                cited_by_count = EXCLUDED.cited_by_count
            RETURNING id;
            """,
            paper,
        )
        paper_ids.append(cur.fetchone()[0])

    cur.execute("DELETE FROM thread_papers WHERE thread_id = %s;", (topic_id,))
    for rank, paper_id in enumerate(dict.fromkeys(paper_ids), start=1):
        cur.execute(
            "INSERT INTO thread_papers (thread_id, paper_id, rank) VALUES (%s, %s, %s);",
            (topic_id, paper_id, rank),
        )
    cur.execute(
        "UPDATE research_threads SET papers_fetched_at = NOW() WHERE id = %s;",
        (topic_id,),
    )
