
SEARCH_LIMIT = 20


def get_popular_topics(cur):
    cur.execute(
        """
        SELECT slug, title
        FROM research_threads
        WHERE popular_rank IS NOT NULL
        ORDER BY popular_rank;
        """
    )
    return [
        {"id": slug, "label": title, "query": title}
        for slug, title in cur.fetchall()
    ]


def like_pattern(text):
    escaped = text.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    return f"%{escaped}%"


def search_threads(cur, query):
    cur.execute(
        {"pattern": like_pattern(query), "limit": SEARCH_LIMIT},
    )
    return [
        {"id": row[0], "slug": row[1], "title": row[2], "category": row[3], "description": row[4]}
        for row in cur.fetchall()
    ]


def search_papers(cur, query):
    cur.execute(
        {"pattern": like_pattern(query), "limit": SEARCH_LIMIT},
    )
    return [
        {
            "id": row[0],
            "title": row[1],
            "authors": row[2],
            "year": row[3],
            "url": row[4],
            "thread_slug": row[5],
        }
        for row in cur.fetchall()
    ]
