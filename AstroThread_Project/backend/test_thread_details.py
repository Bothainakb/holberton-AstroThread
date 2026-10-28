"""Tests for the Thread Details API (GET /api/threads/<id>).

Run from the backend folder:  python -m unittest -v test_thread_details
The API tests use a fake database. ThreadDetailsDatabaseTests runs the real SQL
against the database in backend/.env inside a transaction that is always
rolled back, so nothing is saved; it is skipped if the database is not
reachable or migration 004 has not been applied. MigrationSeedTests runs all
migrations in a temporary schema inside a rolled-back transaction.
"""
import unittest
import uuid
from pathlib import Path
from unittest import mock

import psycopg

import app as backend
from app.api.v1 import thread_details
from app.persistence.database import get_db_connection
from app.services import thread_service

DETAILS = {
    "thread": {"id": 1, "title": "Black Holes", "category": "Astrophysics", "description": "..."},
    "timeline": [{"id": 1, "year": 1916, "title": "Schwarzschild solution", "description": "..."}],
    "latest": {"id": 1, "year": 1916, "title": "Schwarzschild solution", "description": "..."},
    "charts": [],
    "papers": [],
}


class ThreadDetailsApiTests(unittest.TestCase):
    """Fake database; thread_service.get_thread_details is mocked."""

    def setUp(self):
        backend.app.logger.disabled = True
        self.addCleanup(setattr, backend.app.logger, "disabled", False)
        self.client = backend.app.test_client()

        patcher = mock.patch.object(
            thread_details, "get_db_connection", return_value=mock.MagicMock()
        )
        patcher.start()
        self.addCleanup(patcher.stop)
        service = mock.patch.object(thread_service, "get_thread_details", return_value=DETAILS)
        self.get_details = service.start()
        self.addCleanup(service.stop)

    def test_public_without_a_session(self):
        response = self.client.get("/api/threads/1")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json(), DETAILS)
        self.assertEqual(self.get_details.call_args.args[1], 1)

    def test_unknown_thread_returns_json_404(self):
        self.get_details.return_value = None

        response = self.client.get("/api/threads/999")

        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.get_json(), {"error": "Research thread not found"})

    def test_non_numeric_id_is_not_routed(self):
        self.assertEqual(self.client.get("/api/threads/black-holes").status_code, 404)
        self.get_details.assert_not_called()

    def test_database_error_returns_json_500(self):
        self.get_details.side_effect = psycopg.OperationalError("connection lost")

        response = self.client.get("/api/threads/1")

        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.get_json(), {"error": "Unable to load this research thread"})

    def test_only_get_is_allowed(self):
        for method in ("post", "put", "patch", "delete"):
            with self.subTest(method=method):
                self.assertEqual(getattr(self.client, method)("/api/threads/1").status_code, 405)

    def test_thread_list_route_still_works(self):
        rules = {rule.rule for rule in backend.app.url_map.iter_rules()}
        self.assertIn("/api/threads", rules)
        self.assertIn("/api/threads/<int:thread_id>", rules)


class ThreadDetailsDatabaseTests(unittest.TestCase):
    """Runs the real SQL in a transaction that is rolled back afterwards."""

    def setUp(self):
        try:
            self.conn = get_db_connection()
        except (psycopg.Error, RuntimeError) as exc:
            self.skipTest(f"database not available: {exc}")
        self.addCleanup(self.conn.close)
        self.addCleanup(self.conn.rollback)
        self.cur = self.conn.cursor()
        self.cur.execute("SELECT to_regclass('thread_papers'), to_regclass('chart_data');")
        if None in self.cur.fetchone():
            self.skipTest("run python manage.py migrate first")

        self.cur.execute(
            "INSERT INTO research_threads (title, category, description) "
            "VALUES ('Details Test Thread', 'Physics', 'Test description') RETURNING id;"
        )
        self.thread_id = self.cur.fetchone()[0]

    def test_unknown_thread_is_none(self):
        self.cur.execute("SELECT COALESCE(MAX(id), 0) + 1000 FROM research_threads;")
        self.assertIsNone(thread_service.get_thread_details(self.cur, self.cur.fetchone()[0]))

    def test_new_thread_has_empty_sections(self):
        details = thread_service.get_thread_details(self.cur, self.thread_id)

        self.assertEqual(details["thread"]["title"], "Details Test Thread")
        self.assertEqual(details["thread"]["description"], "Test description")
        self.assertEqual(
            (details["timeline"], details["latest"], details["charts"], details["papers"]),
            ([], None, [], []),
        )

    def test_timeline_papers_and_charts(self):
        self.cur.execute(
            "INSERT INTO timeline_events (thread_id, year, title, description) VALUES "
            "(%(t)s, 2019, 'Later event', 'b'), (%(t)s, 1916, 'Earlier event', 'a');",
            {"t": self.thread_id},
        )
        self.cur.execute(
            "INSERT INTO research_papers (title, authors, publication_year, url) "
            "VALUES ('Details test paper', 'A. Author', 1965, 'https://doi.org/10.0/test') RETURNING id;"
        )
        paper_id = self.cur.fetchone()[0]
        self.cur.execute(
            "INSERT INTO thread_papers (thread_id, paper_id, is_illustrative) VALUES (%s, %s, TRUE);",
            (self.thread_id, paper_id),
        )
        self.cur.execute(
            "INSERT INTO chart_data (thread_id, title, note, dataset) "
            "VALUES (%s, 'Test chart', 'Test note', '{\"points\": []}');",
            (self.thread_id,),
        )

        details = thread_service.get_thread_details(self.cur, self.thread_id)

        self.assertEqual([e["year"] for e in details["timeline"]], [1916, 2019])
        self.assertEqual(details["latest"]["title"], "Later event")
        self.assertEqual(
            details["papers"],
            [{
                "id": paper_id, "title": "Details test paper", "authors": "A. Author",
                "year": 1965, "url": "https://doi.org/10.0/test", "illustrative": True,
            }],
        )
        self.assertEqual(details["charts"][0]["dataset"], {"points": []})

    def test_duplicate_timeline_event_is_rejected(self):
        # Migration 005 relies on this index to stay re-runnable.
        insert = (
            "INSERT INTO timeline_events (thread_id, year, title) VALUES (%s, 2000, 'Same') "
            "ON CONFLICT (thread_id, year, title) DO NOTHING;"
        )
        self.cur.execute(insert, (self.thread_id,))
        self.cur.execute(insert, (self.thread_id,))
        self.cur.execute("SELECT count(*) FROM timeline_events WHERE thread_id = %s;", (self.thread_id,))
        self.assertEqual(self.cur.fetchone()[0], 1)


MIGRATIONS = sorted((Path(__file__).parent / "migrations").glob("*.sql"))
SEEDED_PAPERS = [
    ("On the Gravitational Field of a Mass Point According to Einstein's Theory", 1916),
    ("Gravitational Collapse and Space-Time Singularities", 1965),
    ("First M87 Event Horizon Telescope Results. I. The Shadow of the Supermassive Black Hole", 2019),
]


class MigrationSeedTests(unittest.TestCase):
    """Runs every migration in an empty, temporary schema inside a transaction
    that is rolled back, so the real tables are never touched."""

    def setUp(self):
        try:
            self.conn = get_db_connection()
        except (psycopg.Error, RuntimeError) as exc:
            self.skipTest(f"database not available: {exc}")
        self.addCleanup(self.conn.close)
        self.addCleanup(self.conn.rollback)
        schema = f"migration_test_{uuid.uuid4().hex[:12]}"
        self.conn.execute(f"CREATE SCHEMA {schema};")
        self.conn.execute(f"SET LOCAL search_path TO {schema};")

    def migrate(self):
        for path in MIGRATIONS:
            self.conn.execute(path.read_text(encoding="utf-8"))

    def count(self, table, where="TRUE", params=()):
        return self.conn.execute(f"SELECT count(*) FROM {table} WHERE {where};", params).fetchone()[0]

    def add_thread(self, title):
        return self.conn.execute(
            "INSERT INTO research_threads (title, category, description) "
            "VALUES (%s, 'Astrophysics', 'Test') RETURNING id;",
            (title,),
        ).fetchone()[0]

    def test_without_black_holes_nothing_is_added(self):
        self.migrate()
        self.add_thread("Exoplanets")
        self.migrate()

        self.assertEqual(
            [self.count(t) for t in ("timeline_events", "research_papers", "thread_papers", "chart_data")],
            [0, 0, 0, 0],
        )

    def test_seed_attaches_to_one_thread_and_reruns_safely(self):
        self.migrate()
        first = self.add_thread("Black Holes")
        second = self.add_thread("Black Holes")  # titles are not unique
        # Same title, different year: a different paper that must not be linked.
        other = self.conn.execute(
            "INSERT INTO research_papers (title, publication_year) VALUES (%s, 2000) RETURNING id;",
            (SEEDED_PAPERS[1][0],),
        ).fetchone()[0]

        self.migrate()
        after_first_run = [self.count(t) for t in ("timeline_events", "research_papers", "thread_papers")]
        self.migrate()

        self.assertEqual(
            [self.count(t) for t in ("timeline_events", "research_papers", "thread_papers")],
            after_first_run,
        )
        self.assertEqual(after_first_run, [3, 4, 3])
        self.assertEqual(self.count("timeline_events", "thread_id = %s", (first,)), 3)
        self.assertEqual(self.count("thread_papers", "thread_id = %s", (second,)), 0)
        self.assertEqual(self.count("thread_papers", "paper_id = %s", (other,)), 0)
        linked = self.conn.execute(
            "SELECT p.title, p.publication_year, tp.is_illustrative FROM thread_papers tp "
            "JOIN research_papers p ON p.id = tp.paper_id ORDER BY p.publication_year;"
        ).fetchall()
        self.assertEqual(linked, [(title, year, True) for title, year in SEEDED_PAPERS])
        self.assertEqual(self.count("chart_data"), 0)

    def test_users_and_password_hash_are_untouched(self):
        self.migrate()
        user = self.conn.execute(
            "INSERT INTO users (name, email, password_hash) "
            "VALUES ('Migration Test', 'migration-test@astrothread.invalid', 'hash') "
            "RETURNING id, name, email, password_hash, role, created_at, updated_at;"
        ).fetchone()

        self.migrate()
        self.migrate()

        self.assertEqual(
            self.conn.execute(
                "SELECT id, name, email, password_hash, role, created_at, updated_at "
                "FROM users WHERE id = %s;",
                (user[0],),
            ).fetchone(),
            user,
        )
        self.assertEqual(
            self.conn.execute(
                "SELECT is_nullable FROM information_schema.columns WHERE table_schema = "
                "current_schema() AND table_name = 'users' AND column_name = 'password_hash';"
            ).fetchone()[0],
            "NO",
        )


class SeededBlackHolesTests(unittest.TestCase):
    """Checks migration 005 on the real database (read-only)."""

    def setUp(self):
        try:
            self.conn = get_db_connection()
        except (psycopg.Error, RuntimeError) as exc:
            self.skipTest(f"database not available: {exc}")
        self.addCleanup(self.conn.close)
        self.conn.read_only = True
        cur = self.conn.cursor()
        cur.execute("SELECT id FROM research_threads WHERE title = 'Black Holes';")
        row = cur.fetchone()
        cur.execute("SELECT to_regclass('thread_papers');")
        if row is None or cur.fetchone()[0] is None:
            self.skipTest("Black Holes thread or migration 004/005 not present")
        self.details = thread_service.get_thread_details(cur, row[0])

    def test_seeded_content(self):
        self.assertEqual([e["year"] for e in self.details["timeline"]], [1916, 1965, 2019])
        self.assertEqual(self.details["latest"]["year"], 2019)
        self.assertEqual([p["year"] for p in self.details["papers"]], [1916, 1965, 2019])
        self.assertTrue(all(p["illustrative"] for p in self.details["papers"]))



if __name__ == "__main__":
    unittest.main()
