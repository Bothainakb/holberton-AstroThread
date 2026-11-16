"""Tests for the Owner Dashboard endpoints (app/api/v1/owner_threads.py).

Run from the backend folder:  python -m unittest -v test_owner_threads

The API tests use a fake database and a mocked session lookup, so they need
no PostgreSQL. OwnerDatabaseTests runs the real SQL against the database in
backend/.env inside a transaction that is always rolled back, so nothing is
saved; it is skipped when the database is not reachable or not migrated.
"""
import unittest
from unittest import mock

import psycopg

import app as backend
from app.api.v1 import owner_threads
from app.persistence.database import get_db_connection
from app.services import owner_thread_service as service

OWNER = {"id": 1, "email": "owner@example.test", "role": "owner"}
USER = {"id": 2, "email": "user@example.test", "role": "user"}

THREAD = {
    "id": 7, "slug": "black-holes", "title": "Black Holes", "category": "Astrophysics",
    "description": "From prediction to first image.", "is_featured": False,
    "created_at": "2026-10-28T12:00:00", "updated_at": "2026-10-28T12:00:00",
    "timeline_event_count": 3, "stage_count": 5, "paper_count": 3,
}
EVENT = {
    "id": 4, "thread_id": 7, "year": 2019, "title": "First image of a black hole",
    "description": None, "source_name": None, "source_url": None,
}
VALID_THREAD = {
    "title": "  Black Holes ",
    "category": "Astrophysics",
    "description": "From prediction to first image.",
}
VALID_EVENT = {"year": 2019, "title": " First image of a black hole "}

# Every owner route, with a body that would pass validation.
REQUESTS = [
    ("get", "/api/owner/research-threads", None),
    ("post", "/api/owner/research-threads", VALID_THREAD),
    ("get", "/api/owner/research-threads/7", None),
    ("patch", "/api/owner/research-threads/7", {"is_featured": True}),
    ("delete", "/api/owner/research-threads/7", None),
    ("get", "/api/owner/research-threads/7/timeline-events", None),
    ("post", "/api/owner/research-threads/7/timeline-events", VALID_EVENT),
    ("patch", "/api/owner/timeline-events/4", {"year": 2020}),
    ("delete", "/api/owner/timeline-events/4", None),
]

SERVICE_FUNCTIONS = {
    "list_threads": [THREAD],
    "get_thread": THREAD,
    "title_taken": False,
    "create_thread": THREAD,
    "update_thread": THREAD,
    "delete_thread": True,
    "list_events": [EVENT],
    "get_event": EVENT,
    "event_taken": False,
    "create_event": EVENT,
    "update_event": EVENT,
    "delete_event": True,
}


class OwnerRouteTestCase(unittest.TestCase):
    def setUp(self):
        backend.app.logger.disabled = True
        self.addCleanup(setattr, backend.app.logger, "disabled", False)
        config = mock.patch.dict(backend.app.config, {"SECRET_KEY": "test-secret"})
        config.start()
        self.addCleanup(config.stop)
        self.client = backend.app.test_client()

        def start(patcher):
            self.addCleanup(patcher.stop)
            return patcher.start()

        start(mock.patch.object(
            owner_threads, "get_db_connection", return_value=mock.MagicMock()
        ))
        self.find_user = start(mock.patch.object(backend, "find_user", return_value=OWNER))
        self.service = {
            name: start(mock.patch.object(service, name, return_value=value))
            for name, value in SERVICE_FUNCTIONS.items()
        }

    def sign_in(self, user=OWNER):
        self.find_user.return_value = user
        with self.client.session_transaction() as session:
            session["user_id"] = user["id"]


class AccessTests(OwnerRouteTestCase):
    def test_signed_out_requests_get_401(self):
        for method, url, body in REQUESTS:
            with self.subTest(method=method, url=url):
                response = getattr(self.client, method)(url, json=body)
                self.assertEqual(response.status_code, 401)
                self.assertEqual(response.get_json(), {"error": "Authentication required"})

    def test_regular_users_get_403_and_nothing_is_read_or_changed(self):
        self.sign_in(USER)
        for method, url, body in REQUESTS:
            with self.subTest(method=method, url=url):
                response = getattr(self.client, method)(url, json=body)
                self.assertEqual(response.status_code, 403)
        for name, function in self.service.items():
            function.assert_not_called()

    def test_owners_can_use_every_route(self):
        self.sign_in()
        for method, url, body in REQUESTS:
            with self.subTest(method=method, url=url):
                response = getattr(self.client, method)(url, json=body)
                self.assertIn(response.status_code, (200, 201, 204))

    def test_public_thread_routes_are_unchanged(self):
        with mock.patch.object(backend, "get_db_connection") as db:
            db.return_value.__enter__.return_value.cursor.return_value \
                .__enter__.return_value.fetchall.return_value = []
            response = self.client.get("/api/threads")
        self.assertEqual(response.status_code, 200)


class ThreadTests(OwnerRouteTestCase):
    def setUp(self):
        super().setUp()
        self.sign_in()

    def test_lists_threads(self):
        response = self.client.get("/api/owner/research-threads")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json(), [THREAD])

    def test_creates_a_thread_with_trimmed_fields(self):
        response = self.client.post("/api/owner/research-threads", json=VALID_THREAD)

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.get_json(), THREAD)
        fields = self.service["create_thread"].call_args.args[1]
        self.assertEqual(fields["title"], "Black Holes")
        self.assertNotIn("is_featured", fields)

    def test_invalid_thread_bodies_get_400(self):
        cases = [
            ({"category": "A", "description": "B"}, "title is required"),
            ({**VALID_THREAD, "title": "   "}, "title must be non-empty text"),
            ({**VALID_THREAD, "category": 5}, "category must be non-empty text"),
            ({**VALID_THREAD, "title": "x" * 151}, "title must be at most 150 characters"),
            ({**VALID_THREAD, "is_featured": "yes"}, "is_featured must be true or false"),
            ({**VALID_THREAD, "slug": "x"}, "These fields cannot be set here: slug"),
        ]
        for body, message in cases:
            with self.subTest(message=message):
                response = self.client.post("/api/owner/research-threads", json=body)
                self.assertEqual(response.status_code, 400)
                self.assertEqual(response.get_json(), {"error": message})
        self.service["create_thread"].assert_not_called()

    def test_non_object_body_gets_400(self):
        response = self.client.post("/api/owner/research-threads", json=["not", "an", "object"])
        self.assertEqual(response.status_code, 400)

    def test_duplicate_title_gets_409(self):
        self.service["title_taken"].return_value = True
        response = self.client.post("/api/owner/research-threads", json=VALID_THREAD)
        self.assertEqual(response.status_code, 409)
        self.service["create_thread"].assert_not_called()

    def test_unique_violation_race_gets_409(self):
        self.service["create_thread"].side_effect = psycopg.errors.UniqueViolation("dup")
        response = self.client.post("/api/owner/research-threads", json=VALID_THREAD)
        self.assertEqual(response.status_code, 409)

    def test_database_error_gets_json_500(self):
        self.service["create_thread"].side_effect = psycopg.OperationalError("down")
        response = self.client.post("/api/owner/research-threads", json=VALID_THREAD)
        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.get_json(), {"error": "Unable to create the research thread"})

    def test_updates_only_the_sent_fields(self):
        response = self.client.patch("/api/owner/research-threads/7", json={"is_featured": True})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            self.service["update_thread"].call_args.args[1:], (7, {"is_featured": True})
        )
        self.service["title_taken"].assert_not_called()

    def test_renaming_checks_other_threads_titles(self):
        self.client.patch("/api/owner/research-threads/7", json={"title": "Dark Matter"})
        self.service["title_taken"].assert_called_once_with(mock.ANY, "Dark Matter", exclude_id=7)

    def test_empty_patch_gets_400(self):
        response = self.client.patch("/api/owner/research-threads/7", json={})
        self.assertEqual(response.status_code, 400)

    def test_missing_thread_gets_404(self):
        self.service["get_thread"].return_value = None
        self.service["update_thread"].return_value = None
        self.service["delete_thread"].return_value = False
        for method, url, body in (
            ("get", "/api/owner/research-threads/99", None),
            ("patch", "/api/owner/research-threads/99", {"category": "Physics"}),
            ("delete", "/api/owner/research-threads/99", None),
            ("get", "/api/owner/research-threads/99/timeline-events", None),
            ("post", "/api/owner/research-threads/99/timeline-events", VALID_EVENT),
        ):
            with self.subTest(method=method, url=url):
                response = getattr(self.client, method)(url, json=body)
                self.assertEqual(response.status_code, 404)
                self.assertEqual(response.get_json(), {"error": "Research thread not found"})

    def test_delete_returns_204(self):
        response = self.client.delete("/api/owner/research-threads/7")
        self.assertEqual(response.status_code, 204)
        self.assertEqual(response.data, b"")


class TimelineEventTests(OwnerRouteTestCase):
    def setUp(self):
        super().setUp()
        self.sign_in()

    def test_lists_a_threads_events(self):
        response = self.client.get("/api/owner/research-threads/7/timeline-events")
        self.assertEqual(response.get_json(), [EVENT])
        self.assertEqual(self.service["list_events"].call_args.args[1], 7)

    def test_creates_an_event_with_trimmed_fields(self):
        body = {**VALID_EVENT, "source_name": "  ", "source_url": "https://eventhorizontelescope.org"}
        response = self.client.post("/api/owner/research-threads/7/timeline-events", json=body)

        self.assertEqual(response.status_code, 201)
        thread_id, fields = self.service["create_event"].call_args.args[1:]
        self.assertEqual(thread_id, 7)
        self.assertEqual(fields, {
            "year": 2019, "title": "First image of a black hole",
            "source_name": None, "source_url": "https://eventhorizontelescope.org",
        })

    def test_invalid_event_bodies_get_400(self):
        cases = [
            ({"title": "X"}, "year is required"),
            ({"year": 2019}, "title is required"),
            ({**VALID_EVENT, "year": "2019"}, "year must be a whole number from -3000 to 2100"),
            ({**VALID_EVENT, "year": True}, "year must be a whole number from -3000 to 2100"),
            ({**VALID_EVENT, "year": 3000}, "year must be a whole number from -3000 to 2100"),
            ({**VALID_EVENT, "title": "x" * 151}, "title must be at most 150 characters"),
            ({**VALID_EVENT, "source_url": "javascript:alert(1)"}, "source_url must be an http(s) link"),
            ({**VALID_EVENT, "thread_id": 9}, "These fields cannot be set here: thread_id"),
        ]
        for body, message in cases:
            with self.subTest(message=message):
                response = self.client.post(
                    "/api/owner/research-threads/7/timeline-events", json=body
                )
                self.assertEqual(response.status_code, 400)
                self.assertEqual(response.get_json(), {"error": message})
        self.service["create_event"].assert_not_called()

    def test_duplicate_event_gets_409(self):
        self.service["event_taken"].return_value = True
        response = self.client.post("/api/owner/research-threads/7/timeline-events", json=VALID_EVENT)
        self.assertEqual(response.status_code, 409)
        self.service["create_event"].assert_not_called()

    def test_update_checks_duplicates_with_the_merged_values(self):
        response = self.client.patch("/api/owner/timeline-events/4", json={"year": 2020})
        self.assertEqual(response.status_code, 200)
        self.service["event_taken"].assert_called_once_with(
            mock.ANY, 7, 2020, "First image of a black hole", exclude_id=4
        )
        self.assertEqual(self.service["update_event"].call_args.args[1:], (4, {"year": 2020}))

    def test_changing_only_the_description_skips_the_duplicate_check(self):
        self.client.patch("/api/owner/timeline-events/4", json={"description": None})
        self.service["event_taken"].assert_not_called()

    def test_missing_event_gets_404(self):
        self.service["get_event"].return_value = None
        self.service["delete_event"].return_value = False
        for method, body in (("patch", {"year": 2020}), ("delete", None)):
            with self.subTest(method=method):
                response = getattr(self.client, method)("/api/owner/timeline-events/99", json=body)
                self.assertEqual(response.status_code, 404)
                self.assertEqual(response.get_json(), {"error": "Timeline event not found"})


class SlugTests(unittest.TestCase):
    def test_slugify(self):
        self.assertEqual(service.slugify("Black Holes: From Theory!"), "black-holes-from-theory")
        self.assertEqual(service.slugify("  ???  "), "thread")
        self.assertLessEqual(len(service.slugify("word " * 50)), service.MAX_SLUG_LENGTH)

    def test_unique_slug_adds_a_number(self):
        cur = mock.MagicMock()
        cur.fetchall.return_value = [("dark-matter",), ("dark-matter-2",)]
        self.assertEqual(service.unique_slug(cur, "Dark Matter"), "dark-matter-3")


class OwnerDatabaseTests(unittest.TestCase):
    """Runs the real SQL in a transaction that is rolled back afterwards."""

    def setUp(self):
        try:
            self.conn = get_db_connection()
        except (psycopg.Error, RuntimeError) as exc:
            self.skipTest(f"database not available: {exc}")
        self.addCleanup(self.conn.close)
        self.addCleanup(self.conn.rollback)
        self.cur = self.conn.cursor()
        self.cur.execute(
            "SELECT 1 FROM information_schema.columns "
            "WHERE table_name = 'research_threads' AND column_name = 'is_featured';"
        )
        if self.cur.fetchone() is None:
            self.skipTest("run python manage.py migrate first (migration 010)")

    def test_thread_and_timeline_flow(self):
        thread = service.create_thread(self.cur, {
            "title": "Owner Test Thread", "category": "Physics", "description": "Test",
        })
        self.assertFalse(thread["is_featured"])
        self.assertEqual(thread["slug"], "owner-test-thread")
        self.assertEqual(thread["timeline_event_count"], 0)
        self.assertTrue(service.title_taken(self.cur, " owner test THREAD "))
        self.assertFalse(service.title_taken(self.cur, "Owner Test Thread", exclude_id=thread["id"]))
        self.assertIn(thread["id"], [item["id"] for item in service.list_threads(self.cur)])

        event = service.create_event(self.cur, thread["id"], {"year": 2020, "title": "Test event"})
        self.assertTrue(service.event_taken(self.cur, thread["id"], 2020, "Test event"))
        self.assertFalse(service.event_taken(
            self.cur, thread["id"], 2020, "Test event", exclude_id=event["id"]
        ))
        moved = service.update_event(self.cur, event["id"], {"year": 2021, "source_url": None})
        self.assertEqual((moved["year"], moved["title"]), (2021, "Test event"))
        self.assertEqual(len(service.list_events(self.cur, thread["id"])), 1)

        updated = service.update_thread(
            self.cur, thread["id"], {"is_featured": True, "title": "Renamed Thread"}
        )
        self.assertTrue(updated["is_featured"])
        self.assertEqual(updated["slug"], "owner-test-thread")  # links keep working
        self.assertEqual(updated["timeline_event_count"], 1)

        self.assertTrue(service.delete_event(self.cur, event["id"]))
        self.assertFalse(service.delete_event(self.cur, event["id"]))
        service.create_event(self.cur, thread["id"], {"year": 1916, "title": "Cascades"})

        self.assertTrue(service.delete_thread(self.cur, thread["id"]))
        self.assertFalse(service.delete_thread(self.cur, thread["id"]))
        self.assertIsNone(service.update_thread(self.cur, thread["id"], {"title": "X"}))
        self.assertEqual(service.list_events(self.cur, thread["id"]), [])


if __name__ == "__main__":
    unittest.main()
