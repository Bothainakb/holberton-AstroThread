"""Database queries for the Owner Dashboard: research threads and their
timeline events (the dashboard's two tabs).

Every function takes an open cursor, like profile_service.py. The API layer
(app/api/v1/owner_threads.py) checks the owner role and validates input
before calling these functions, and column names in the SQL below always
come from the constants in this file, never from a request.
"""
import re

# Thread columns an owner may set. slug is created once from the title and
# then kept, so links to a thread keep working after it is renamed.
THREAD_FIELDS = ("title", "category", "description", "is_featured")
EVENT_FIELDS = ("year", "title", "description", "source_name", "source_url")

MAX_SLUG_LENGTH = 90

THREAD_LIST_SQL = """
    SELECT t.id, t.slug, t.title, t.category, t.description, t.is_featured,
           t.created_at, t.updated_at,
           (SELECT COUNT(*) FROM timeline_events e WHERE e.thread_id = t.id),
           (SELECT COUNT(*) FROM thread_stages s WHERE s.thread_id = t.id),
           (SELECT COUNT(*) FROM thread_papers p WHERE p.thread_id = t.id)
    FROM research_threads t
"""

EVENT_COLUMNS = "id, thread_id, year, title, description, source_name, source_url"


def iso(value):
    return value.isoformat() if value else None


def thread_to_json(row):
    return {
        "id": row[0],
        "slug": row[1],
        "title": row[2],
        "category": row[3],
        "description": row[4],
        "is_featured": row[5],
        "created_at": iso(row[6]),
        "updated_at": iso(row[7]),
        "timeline_event_count": row[8],
        "stage_count": row[9],
        "paper_count": row[10],
    }


def event_to_json(row):
    return {
        "id": row[0],
        "thread_id": row[1],
        "year": row[2],
        "title": row[3],
        "description": row[4],
        "source_name": row[5],
        "source_url": row[6],
    }


# ----- Research threads -----

def list_threads(cur):
    """Every thread, most recently updated first (the dashboard table)."""
    cur.execute(THREAD_LIST_SQL + " ORDER BY t.updated_at DESC, t.id DESC;")
    return [thread_to_json(row) for row in cur.fetchall()]


def get_thread(cur, thread_id):
    cur.execute(THREAD_LIST_SQL + " WHERE t.id = %s;", (thread_id,))
    row = cur.fetchone()
    return thread_to_json(row) if row else None


def title_taken(cur, title, exclude_id=None):
    """Titles are compared without case or surrounding spaces."""
    cur.execute(
        """
        SELECT 1 FROM research_threads
        WHERE lower(trim(title)) = lower(trim(%s))
          AND (%s::int IS NULL OR id <> %s);
        """,
        (title, exclude_id, exclude_id),
    )
    return cur.fetchone() is not None


def slugify(title):
    """"Black Holes: From Theory" -> "black-holes-from-theory"."""
    slug = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")
    return slug[:MAX_SLUG_LENGTH].rstrip("-") or "thread"


def unique_slug(cur, title):
    """slugify(title), with -2, -3, ... added if another thread has it."""
    base = slugify(title)
    cur.execute(
        "SELECT slug FROM research_threads WHERE slug = %s OR slug LIKE %s;",
        (base, base + "-%"),
    )
    taken = {row[0] for row in cur.fetchall()}
    slug, number = base, 2
    while slug in taken:
        slug = f"{base}-{number}"
        number += 1
    return slug


def create_thread(cur, fields):
    cur.execute(
        """
        INSERT INTO research_threads
            (title, category, description, is_featured, slug, created_at, updated_at)
        VALUES (%(title)s, %(category)s, %(description)s, %(is_featured)s, %(slug)s,
                CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING id;
        """,
        {"is_featured": False, **fields, "slug": unique_slug(cur, fields["title"])},
    )
    return get_thread(cur, cur.fetchone()[0])


def update_thread(cur, thread_id, changes):
    """Apply only the given fields. Returns None if the thread does not exist."""
    columns = [name for name in THREAD_FIELDS if name in changes]
    assignments = "".join(f"{name} = %({name})s, " for name in columns)
    cur.execute(
        f"""
        UPDATE research_threads
        SET {assignments}updated_at = CURRENT_TIMESTAMP
        WHERE id = %(id)s
        RETURNING id;
        """,
        {**{name: changes[name] for name in columns}, "id": thread_id},
    )
    if cur.fetchone() is None:
        return None
    return get_thread(cur, thread_id)


def delete_thread(cur, thread_id):
    """Delete a thread. Its stages, timeline events, charts, paper links,
    bookmarks and progress go with it (ON DELETE CASCADE); the papers
    themselves stay, since other threads may use them."""
    cur.execute("DELETE FROM research_threads WHERE id = %s RETURNING id;", (thread_id,))
    return cur.fetchone() is not None


def touch_thread(cur, thread_id):
    """Editing a thread's timeline also counts as updating the thread."""
    cur.execute(
        "UPDATE research_threads SET updated_at = CURRENT_TIMESTAMP WHERE id = %s;",
        (thread_id,),
    )


# ----- Timeline events -----

def list_events(cur, thread_id):
    cur.execute(
        f"""
        SELECT {EVENT_COLUMNS} FROM timeline_events
        WHERE thread_id = %s
        ORDER BY year, id;
        """,
        (thread_id,),
    )
    return [event_to_json(row) for row in cur.fetchall()]


def get_event(cur, event_id):
    cur.execute(f"SELECT {EVENT_COLUMNS} FROM timeline_events WHERE id = %s;", (event_id,))
    row = cur.fetchone()
    return event_to_json(row) if row else None


def event_taken(cur, thread_id, year, title, exclude_id=None):
    """A thread cannot have two events with the same year and title
    (the timeline_events_unique_event index)."""
    cur.execute(
        """
        SELECT 1 FROM timeline_events
        WHERE thread_id = %s AND year = %s AND title = %s
          AND (%s::int IS NULL OR id <> %s);
        """,
        (thread_id, year, title, exclude_id, exclude_id),
    )
    return cur.fetchone() is not None


def create_event(cur, thread_id, fields):
    values = {name: fields.get(name) for name in EVENT_FIELDS}
    cur.execute(
        f"""
        INSERT INTO timeline_events (thread_id, {", ".join(EVENT_FIELDS)})
        VALUES (%(thread_id)s, {", ".join(f"%({name})s" for name in EVENT_FIELDS)})
        RETURNING {EVENT_COLUMNS};
        """,
        {**values, "thread_id": thread_id},
    )
    event = event_to_json(cur.fetchone())
    touch_thread(cur, thread_id)
    return event


def update_event(cur, event_id, changes):
    """Apply only the given fields. Returns None if the event does not exist."""
    columns = [name for name in EVENT_FIELDS if name in changes]
    assignments = ", ".join(f"{name} = %({name})s" for name in columns)
    cur.execute(
        f"""
        UPDATE timeline_events
        SET {assignments}
        WHERE id = %(id)s
        RETURNING {EVENT_COLUMNS};
        """,
        {**{name: changes[name] for name in columns}, "id": event_id},
    )
    row = cur.fetchone()
    if row is None:
        return None
    event = event_to_json(row)
    touch_thread(cur, event["thread_id"])
    return event


def delete_event(cur, event_id):
    """Removes the event (and the "viewed a discovery" activity that points
    at it). Returns False if it did not exist."""
    cur.execute(
        "DELETE FROM timeline_events WHERE id = %s RETURNING thread_id;", (event_id,)
    )
    row = cur.fetchone()
    if row is None:
        return False
    touch_thread(cur, row[0])
    return True
