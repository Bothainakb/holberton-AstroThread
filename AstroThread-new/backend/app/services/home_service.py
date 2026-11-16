import json
import re

POPULAR_LIMIT = 3
PAPER_CACHE_DAYS = 7         
MAX_SLUG_LENGTH = 100

NOT_LETTERS_OR_DIGITS = re.compile(r"[^a-z0-9]+")

PAPER_COLUMNS = """
    p.id, p.title, p.authors, p.publication_year, p.abstract, p.url,
    p.cited_by_count, p.venue, p.topic, p.keywords, p.author_list
"""


def slugify(text):
    """'Black  Holes!' -> 'black-holes', so every spelling finds the same topic."""
    return NOT_LETTERS_OR_DIGITS.sub("-", text.lower()).strip("-")[:MAX_SLUG_LENGTH].strip("-")


def display_title(query):
    """'black holes' -> 'Black Holes'; text with capitals ('JWST') is kept as typed."""
    return query.title() if query.islower() else query


def json_list(value):
    """A JSONB list from the database as a Python list of strings."""
    if isinstance(value, str):
        try:
            value = json.loads(value)
        except ValueError:
            return []
    return [item for item in value if isinstance(item, str)] if isinstance(value, list) else []


def row_to_paper(row):
    """One row of PAPER_COLUMNS -> a paper dict."""
    return {
        "id": row[0],
        "title": row[1],
        "authors": row[2],
        "year": row[3],
        "abstract": row[4],
        "url": row[5],
        "cited_by_count": row[6],
        "venue": row[7],
        "topic": row[8],
        "keywords": json_list(row[9]),
        "author_list": json_list(row[10]),
    }


def get_popular_topics(cur):
    """The most searched topics: [{id, label, query}] (the shape the Home page uses)."""
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

    fresh is True when its papers were fetched within PAPER_CACHE_DAYS, so
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
    """The papers stored for a topic, in the order the search found them."""
    cur.execute(
        f"""
        SELECT {PAPER_COLUMNS}
        FROM thread_papers tp
        JOIN research_papers p ON p.id = tp.paper_id
        WHERE tp.thread_id = %s
        ORDER BY tp.rank;
        """,
        (topic_id,),
    )
    return [row_to_paper(row) for row in cur.fetchall()]


def record_search(cur, slug, title):
    """Count one search for the topic, creating it the first time. Returns its id."""
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
    """Store the papers OpenAlex found and make them the topic's results."""
    paper_ids = []
    for paper in papers:
        values = {
            **paper,
            "keywords": json.dumps(paper.get("keywords") or []),
            "author_list": json.dumps(paper.get("author_list") or []),
            "venue": paper.get("venue"),
            "topic": paper.get("topic"),
        }
        cur.execute(
            """
            INSERT INTO research_papers
                (openalex_id, title, authors, publication_year, abstract, url,
                 cited_by_count, venue, topic, keywords, author_list)
            VALUES (%(openalex_id)s, %(title)s, %(authors)s, %(publication_year)s,
                    %(abstract)s, %(url)s, %(cited_by_count)s, %(venue)s, %(topic)s,
                    %(keywords)s::jsonb, %(author_list)s::jsonb)
            ON CONFLICT (openalex_id) DO UPDATE
            SET title = EXCLUDED.title,
                authors = EXCLUDED.authors,
                publication_year = EXCLUDED.publication_year,
                abstract = EXCLUDED.abstract,
                url = EXCLUDED.url,
                cited_by_count = EXCLUDED.cited_by_count,
                venue = EXCLUDED.venue,
                topic = EXCLUDED.topic,
                keywords = EXCLUDED.keywords,
                author_list = EXCLUDED.author_list
            RETURNING id;
            """,
            values,
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


def get_overview(cur, slug):
    """{id, title, overview, generated_at} for a topic, or None if it was never searched.

    overview is None until the AI has written one.
    """
    cur.execute(
        """
        SELECT id, title, overview, to_char(overview_generated_at, 'YYYY-MM-DD"T"HH24:MI:SS')
        FROM research_threads
        WHERE slug = %s;
        """,
        (slug,),
    )
    row = cur.fetchone()
    if row is None:
        return None
    return {"id": row[0], "title": row[1], "overview": row[2], "generated_at": row[3]}


def save_overview(cur, topic_id, overview):
    """Store the AI overview, unless another request stored one first.

    Returns the overview that is now stored (ours, or the one already there).
    """
    cur.execute(
        """
        UPDATE research_threads
        SET overview = %s, overview_generated_at = NOW()
        WHERE id = %s AND overview IS NULL
        RETURNING overview, to_char(overview_generated_at, 'YYYY-MM-DD"T"HH24:MI:SS');
        """,
        (overview, topic_id),
    )
    row = cur.fetchone()
    if row is None:
        cur.execute(
            """SELECT overview, to_char(overview_generated_at, 'YYYY-MM-DD"T"HH24:MI:SS')
               FROM research_threads WHERE id = %s;""",
            (topic_id,),
        )
        row = cur.fetchone()
    return {"overview": row[0], "generated_at": row[1]}
