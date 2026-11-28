
MAX_RECENT_SEARCHES = 5


def get_searches(cur, user_id):
    cur.execute(
        """
        SELECT query
        FROM recent_searches
        WHERE user_id = %s
        ORDER BY searched_at DESC, id DESC
        LIMIT %s;
        """,
        (user_id, MAX_RECENT_SEARCHES),
    )
    return [row[0] for row in cur.fetchall()]


def add_search(cur, user_id, query):
    cur.execute(
        """
        INSERT INTO recent_searches (user_id, query)
        VALUES (%s, %s)
        ON CONFLICT (user_id, LOWER(query)) DO UPDATE
        SET query = EXCLUDED.query,
            searched_at = CURRENT_TIMESTAMP;
        """,
        (user_id, query),
    )
    cur.execute(
        """
        DELETE FROM recent_searches
        WHERE user_id = %s
          AND id NOT IN (
              SELECT id
              FROM recent_searches
              WHERE user_id = %s
              ORDER BY searched_at DESC, id DESC
              LIMIT %s
          );
        """,
        (user_id, user_id, MAX_RECENT_SEARCHES),
    )


def remove_search(cur, user_id, query):
    cur.execute(
        "DELETE FROM recent_searches WHERE user_id = %s AND LOWER(query) = LOWER(%s);",
        (user_id, query),
    )


def clear_searches(cur, user_id):
    cur.execute("DELETE FROM recent_searches WHERE user_id = %s;", (user_id,))
