
MAX_JOURNEY_STEPS = 100

TIME_FORMAT = 'YYYY-MM-DD"T"HH24:MI:SS'


def get_thread(cur, user_id):
    cur.execute(
        f"""
        SELECT topic, to_char(saved_at, '{TIME_FORMAT}')
        FROM saved_topics
        WHERE user_id = %s
        ORDER BY saved_at DESC, id DESC;
        """,
        (user_id,),
    )
    topics = [{"topic": topic, "savedAt": saved_at} for topic, saved_at in cur.fetchall()]

    cur.execute(
        f"""
        SELECT s.step_key, s.step_type, s.query, s.paper_id, p.title, s.topic, s.note,
               to_char(s.created_at, '{TIME_FORMAT}')
        FROM journey_steps s
        LEFT JOIN research_papers p ON p.id = s.paper_id
        WHERE s.user_id = %s
        ORDER BY s.created_at DESC, s.id DESC
        LIMIT %s;
        """,
        (user_id, MAX_JOURNEY_STEPS),
    )
    journey = [to_step(row) for row in cur.fetchall()]

    return {"topics": topics, "journey": journey}


def to_step(row):
    step_key, step_type, query, paper_id, title, topic, note, created_at = row
    step = {"id": step_key, "type": step_type, "at": created_at}

    if step_type == "search":
        step["query"] = query
    else:
        step.update({"paperId": str(paper_id), "title": title or "", "topic": topic or "Other"})

    if note:
        step["note"] = note
    return step


def save_topic(cur, user_id, topic):
    cur.execute(
        """
        INSERT INTO saved_topics (user_id, topic)
        VALUES (%s, %s)
        ON CONFLICT (user_id, (LOWER(topic))) DO NOTHING;
        """,
        (user_id, topic),
    )


def remove_topic(cur, user_id, topic):
    cur.execute(
        "DELETE FROM saved_topics WHERE user_id = %s AND LOWER(topic) = LOWER(%s);",
        (user_id, topic),
    )


def paper_exists(cur, paper_id):
    cur.execute("SELECT 1 FROM research_papers WHERE id = %s;", (paper_id,))
    return cur.fetchone() is not None


def is_repeat(cur, user_id, step):
    cur.execute(
        """
        SELECT step_type, query, paper_id
        FROM journey_steps
        WHERE user_id = %s
        ORDER BY created_at DESC, id DESC
        LIMIT 1;
        """,
        (user_id,),
    )
    last = cur.fetchone()
    if last is None or last[0] != step["type"]:
        return False
    if step["type"] == "search":
        return (last[1] or "").lower() == step["query"].lower()
    return last[2] == step["paperId"]


def add_step(cur, user_id, step):
    if is_repeat(cur, user_id, step):
        return

    cur.execute(
        """
        INSERT INTO journey_steps (user_id, step_key, step_type, query, paper_id, topic)
        VALUES (%s, %s, %s, %s, %s, %s)
        ON CONFLICT (user_id, step_key) DO NOTHING;
        """,
        (user_id, step["id"], step["type"], step.get("query"), step.get("paperId"), step.get("topic")),
    )
    cur.execute(
        """
        DELETE FROM journey_steps
        WHERE user_id = %s AND id NOT IN (
            SELECT id FROM journey_steps
            WHERE user_id = %s
            ORDER BY created_at DESC, id DESC
            LIMIT %s
        );
        """,
        (user_id, user_id, MAX_JOURNEY_STEPS),
    )


def set_note(cur, user_id, step_key, note):
    cur.execute(
        "UPDATE journey_steps SET note = %s WHERE user_id = %s AND step_key = %s RETURNING id;",
        (note or None, user_id, step_key),
    )
    return cur.fetchone() is not None


def remove_step(cur, user_id, step_key):
    cur.execute(
        "DELETE FROM journey_steps WHERE user_id = %s AND step_key = %s RETURNING id;",
        (user_id, step_key),
    )
    return cur.fetchone() is not None
