"""Database queries for the User Profile page and bookmarks.

Every function takes an open cursor, so one request can run several queries
in a single connection and transaction. The API layer (app/api/v1/profile.py
and bookmarks.py) validates input before calling these functions.
"""

# Subscriptions are a "Could" story and not implemented yet, so every account
# is on the Free plan. When Premium is added, read the plan from a
# subscriptions table here instead.
FREE_PLAN = {"name": "Free", "status": "Active", "ai_assistance": "Basic"}

SUPPORTED_LANGUAGES = ("en",)
ACTIVITY_TYPES = ("started_thread", "completed_stage", "read_paper", "viewed_discovery")

# Viewing the same paper or discovery again within this time is not logged
# twice, so refreshing a page does not fill the activity list.
REPEAT_ACTIVITY_HOURS = 24


def iso(value):
    return value.isoformat() if value else None


def initials(name, email):
    """ "Alaa Aldosari" -> "AA"; no name -> first letter of the email."""
    words = (name or "").split()
    if words:
        letters = words[0][0] + (words[-1][0] if len(words) > 1 else "")
    else:
        letters = email[:1]
    return letters.upper()


def progress_json(current_stage, stage_count):
    if stage_count is None:
        return None
    return {"current_stage": current_stage, "stage_count": stage_count}


# ----- Profile header and settings -----

def get_user(cur, user_id):
    cur.execute(
        """
        SELECT id, name, email, role, bio, avatar_url,
               email_notifications, language, created_at
        FROM users
        WHERE id = %s;
        """,
        (user_id,),
    )
    row = cur.fetchone()
    if row is None:
        return None

    return {
        "user": {
            "id": row[0],
            "name": row[1],
            "email": row[2],
            "role": row[3],
            "bio": row[4],
            "avatar_url": row[5],
            "initials": initials(row[1], row[2]),
            "member_since": iso(row[8]),
        },
        "plan": dict(FREE_PLAN),
        "settings": {"email_notifications": row[6], "language": row[7]},
    }


def update_user(cur, user_id, changes):
    """changes: already validated {column: value} for the editable columns."""
    columns = ", ".join(f"{column} = %({column})s" for column in changes)
    cur.execute(
        f"""
        UPDATE users
        SET {columns}, updated_at = CURRENT_TIMESTAMP
        WHERE id = %(user_id)s;
        """,
        {**changes, "user_id": user_id},
    )
    return cur.rowcount == 1


# ----- My Research Journey -----

def get_stats(cur, user_id):
    cur.execute(
        """
        SELECT
            (SELECT COUNT(*) FROM thread_progress WHERE user_id = %(id)s),
            (SELECT COUNT(*) FROM research_threads),
            (SELECT COUNT(DISTINCT paper_id) FROM user_activity
             WHERE user_id = %(id)s AND activity_type = 'read_paper'),
            (SELECT COUNT(DISTINCT paper_id) FROM user_activity
             WHERE user_id = %(id)s AND activity_type = 'read_paper'
               AND created_at >= CURRENT_TIMESTAMP - INTERVAL '7 days'),
            (SELECT COUNT(DISTINCT event_id) FROM user_activity
             WHERE user_id = %(id)s AND activity_type = 'viewed_discovery'),
            (SELECT COUNT(DISTINCT event_id) FROM user_activity
             WHERE user_id = %(id)s AND activity_type = 'viewed_discovery'
               AND created_at >= CURRENT_TIMESTAMP - INTERVAL '7 days'),
            (SELECT COALESCE(SUM(stages_completed), 0) FROM thread_progress
             WHERE user_id = %(id)s),
            (SELECT COALESCE(SUM(stage_count), 0) FROM thread_progress
             WHERE user_id = %(id)s);
        """,
        {"id": user_id},
    )
    row = cur.fetchone()
    return {
        "threads_explored": row[0],
        "threads_available": row[1],
        "papers_read": row[2],
        "papers_read_this_week": row[3],
        "discoveries_viewed": row[4],
        "discoveries_viewed_this_week": row[5],
        "stages_completed": int(row[6]),
        "stages_total": int(row[7]),
    }


# ----- Saved Research Threads (bookmarks) -----

def get_saved_threads(cur, user_id, limit=None):
    cur.execute(
        """
        SELECT t.id, t.title, t.category, t.description,
               p.current_stage, p.stage_count, b.created_at
        FROM bookmarks b
        JOIN research_threads t ON t.id = b.thread_id
        LEFT JOIN thread_progress p
               ON p.user_id = b.user_id AND p.thread_id = b.thread_id
        WHERE b.user_id = %s
        ORDER BY b.created_at DESC, b.id DESC
        LIMIT %s;
        """,
        (user_id, limit),
    )
    return [
        {
            "id": row[0],
            "title": row[1],
            "category": row[2],
            "description": row[3],
            "progress": progress_json(row[4], row[5]),
            "saved_at": iso(row[6]),
        }
        for row in cur.fetchall()
    ]


def count_saved_threads(cur, user_id):
    cur.execute("SELECT COUNT(*) FROM bookmarks WHERE user_id = %s;", (user_id,))
    return cur.fetchone()[0]


def thread_exists(cur, thread_id):
    cur.execute("SELECT 1 FROM research_threads WHERE id = %s;", (thread_id,))
    return cur.fetchone() is not None


def add_bookmark(cur, user_id, thread_id):
    """True if a new bookmark was created, False if it already existed."""
    cur.execute(
        """
        INSERT INTO bookmarks (user_id, thread_id)
        VALUES (%s, %s)
        ON CONFLICT (user_id, thread_id) DO NOTHING
        RETURNING id;
        """,
        (user_id, thread_id),
    )
    return cur.fetchone() is not None


def remove_bookmark(cur, user_id, thread_id):
    cur.execute(
        "DELETE FROM bookmarks WHERE user_id = %s AND thread_id = %s;",
        (user_id, thread_id),
    )
    return cur.rowcount == 1


# ----- Recently Explored -----

def get_recent_threads(cur, user_id, limit):
    cur.execute(
        """
        SELECT t.id, t.title, t.category,
               p.current_stage, p.stage_count, p.last_viewed_at
        FROM thread_progress p
        JOIN research_threads t ON t.id = p.thread_id
        WHERE p.user_id = %s
        ORDER BY p.last_viewed_at DESC
        LIMIT %s;
        """,
        (user_id, limit),
    )
    return [
        {
            "id": row[0],
            "title": row[1],
            "category": row[2],
            "progress": progress_json(row[3], row[4]),
            "last_viewed_at": iso(row[5]),
        }
        for row in cur.fetchall()
    ]


# ----- Research Activity -----

def get_activity(cur, user_id, limit):
    cur.execute(
        """
        SELECT a.id, a.activity_type, a.stage_number, a.created_at,
               t.id, t.title, p.id, p.title, e.id, e.title
        FROM user_activity a
        LEFT JOIN research_threads t ON t.id = a.thread_id
        LEFT JOIN research_papers p ON p.id = a.paper_id
        LEFT JOIN timeline_events e ON e.id = a.event_id
        WHERE a.user_id = %s
        ORDER BY a.created_at DESC, a.id DESC
        LIMIT %s;
        """,
        (user_id, limit),
    )

    def item(item_id, title):
        return {"id": item_id, "title": title} if item_id is not None else None

    return [
        {
            "id": row[0],
            "type": row[1],
            "stage_number": row[2],
            "created_at": iso(row[3]),
            "thread": item(row[4], row[5]),
            "paper": item(row[6], row[7]),
            "discovery": item(row[8], row[9]),
        }
        for row in cur.fetchall()
    ]


def log_activity(cur, user_id, activity_type, thread_id=None, paper_id=None,
                 event_id=None, stage_number=None):
    cur.execute(
        """
        INSERT INTO user_activity
            (user_id, activity_type, thread_id, paper_id, event_id, stage_number)
        VALUES (%s, %s, %s, %s, %s, %s);
        """,
        (user_id, activity_type, thread_id, paper_id, event_id, stage_number),
    )


def recently_logged(cur, user_id, activity_type, column, target_id):
    """Was this paper/discovery already logged in the last REPEAT_ACTIVITY_HOURS?"""
    cur.execute(
        f"""
        SELECT 1 FROM user_activity
        WHERE user_id = %s AND activity_type = %s AND {column} = %s
          AND created_at >= CURRENT_TIMESTAMP - make_interval(hours => %s)
        LIMIT 1;
        """,
        (user_id, activity_type, target_id, REPEAT_ACTIVITY_HOURS),
    )
    return cur.fetchone() is not None


def paper_exists(cur, paper_id):
    cur.execute("SELECT 1 FROM research_papers WHERE id = %s;", (paper_id,))
    return cur.fetchone() is not None


def discovery_thread(cur, event_id):
    """The thread id of a timeline event, or None if the event does not exist."""
    cur.execute("SELECT thread_id FROM timeline_events WHERE id = %s;", (event_id,))
    row = cur.fetchone()
    return row[0] if row else None


# ----- Stage progress (sent by the Thread Details page) -----

def save_progress(cur, user_id, thread_id, current_stage, stage_count,
                  completed_stage=None):
    """Create or update the user's progress in a thread.

    completed_stage (optional) means stages 1..completed_stage are done.
    Progress never goes backwards. Logs "started_thread" the first time and
    "completed_stage" whenever the completed count goes up.
    """
    cur.execute(
        """
        SELECT stages_completed FROM thread_progress
        WHERE user_id = %s AND thread_id = %s
        FOR UPDATE;
        """,
        (user_id, thread_id),
    )
    row = cur.fetchone()
    is_new = row is None
    before = 0 if is_new else min(row[0], stage_count)
    after = max(before, completed_stage or 0)

    if is_new:
        cur.execute(
            """
            INSERT INTO thread_progress
                (user_id, thread_id, current_stage, stages_completed, stage_count)
            VALUES (%s, %s, %s, %s, %s);
            """,
            (user_id, thread_id, current_stage, after, stage_count),
        )
        log_activity(cur, user_id, "started_thread", thread_id=thread_id)
    else:
        cur.execute(
            """
            UPDATE thread_progress
            SET current_stage = %s, stages_completed = %s, stage_count = %s,
                last_viewed_at = CURRENT_TIMESTAMP
            WHERE user_id = %s AND thread_id = %s;
            """,
            (current_stage, after, stage_count, user_id, thread_id),
        )

    if after > before:
        log_activity(
            cur, user_id, "completed_stage", thread_id=thread_id, stage_number=after
        )

    return {
        "thread_id": thread_id,
        "current_stage": current_stage,
        "stages_completed": after,
        "stage_count": stage_count,
        "started": is_new,
    }
