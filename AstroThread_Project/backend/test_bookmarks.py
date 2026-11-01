"""Tests for saved research threads (app/api/v1/bookmarks.py).

Run from the backend folder:  python -m unittest -v test_bookmarks
The database is a fake and the signed-in user comes from a mocked session
lookup, so these tests need no PostgreSQL. The browser flow (save, remove,
refresh, ownership between two accounts) was checked separately against the
real database.
"""
import unittest
from unittest import mock

import psycopg

import app as backend
from app.api.v1 import bookmarks
from app.services import profile_service

USER = {"id": 7, "name": "Test", "email": "test@example.test", "role": "user"}
SAVED = [{"id": 2, "title": "Gravitational Waves", "category": "Physics",
          "description": "...", "progress": None, "saved_at": "2026-10-29T00:00:00"}]


class BookmarkRouteTests(unittest.TestCase):
    def setUp(self):
        backend.app.logger.disabled = True
        self.addCleanup(setattr, backend.app.logger, "disabled", False)
        self.client = backend.app.test_client()

        patches = {
            "connect": mock.patch.object(bookmarks, "get_db_connection", return_value=mock.MagicMock()),
            "find_user": mock.patch.object(backend, "find_user", return_value=USER),
            "saved": mock.patch.object(profile_service, "get_saved_threads", return_value=SAVED),
            "exists": mock.patch.object(profile_service, "thread_exists", return_value=True),
            "add": mock.patch.object(profile_service, "add_bookmark", return_value=True),
            "remove": mock.patch.object(profile_service, "remove_bookmark", return_value=True),
        }
        for name, patcher in patches.items():
            setattr(self, name, patcher.start())
            self.addCleanup(patcher.stop)

    def sign_in(self, user_id=USER["id"]):
        with self.client.session_transaction() as session:
            session["user_id"] = user_id

    def test_signed_out_requests_are_401_and_touch_no_data(self):
        for method, path, body in (
            ("get", "/api/bookmarks", None),
            ("post", "/api/bookmarks", {"thread_id": 2}),
            ("delete", "/api/bookmarks/2", None),
        ):
            with self.subTest(method=method):
                response = getattr(self.client, method)(path, json=body)
                self.assertEqual(response.status_code, 401)
                self.assertEqual(response.get_json(), {"error": "Authentication required"})
        self.add.assert_not_called()
        self.remove.assert_not_called()
        self.saved.assert_not_called()

    def test_lists_only_the_session_users_bookmarks(self):
        self.sign_in()

        response = self.client.get("/api/bookmarks")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json(), SAVED)
        self.assertEqual(self.saved.call_args.args[1], USER["id"])

    def test_save_uses_the_session_user_not_the_request(self):
        self.sign_in()

        response = self.client.post("/api/bookmarks", json={"thread_id": 2, "user_id": 999})

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.get_json(), {"thread_id": 2, "saved": True})
        self.assertEqual(self.add.call_args.args[1:], (USER["id"], 2))

    def test_saving_twice_is_200_not_a_duplicate(self):
        self.sign_in()
        self.add.return_value = False  # ON CONFLICT DO NOTHING inserted no row

        response = self.client.post("/api/bookmarks", json={"thread_id": 2})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json(), {"thread_id": 2, "saved": True})

    def test_unknown_thread_is_404(self):
        self.sign_in()
        self.exists.return_value = False

        response = self.client.post("/api/bookmarks", json={"thread_id": 999})

        self.assertEqual(response.status_code, 404)
        self.add.assert_not_called()

    def test_invalid_bodies_are_400(self):
        self.sign_in()
        for body in ({}, {"thread_id": "2"}, {"thread_id": True}, {"thread_id": None}, ["2"]):
            with self.subTest(body=body):
                response = self.client.post("/api/bookmarks", json=body)
                self.assertEqual(response.status_code, 400)
        self.add.assert_not_called()

    def test_remove_uses_the_session_user(self):
        self.sign_in()

        response = self.client.delete("/api/bookmarks/2")

        self.assertEqual(response.status_code, 204)
        self.assertEqual(self.remove.call_args.args[1:], (USER["id"], 2))

    def test_removing_a_bookmark_the_user_does_not_have_is_404(self):
        # Another user's bookmark: the DELETE is scoped to the session user,
        # so nothing matches and nothing is removed.
        self.sign_in()
        self.remove.return_value = False

        response = self.client.delete("/api/bookmarks/1")

        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.get_json(), {"error": "This thread is not in your saved threads"})

    def test_database_errors_are_500(self):
        self.sign_in()
        self.connect.side_effect = psycopg.OperationalError("connection lost")

        self.assertEqual(self.client.get("/api/bookmarks").status_code, 500)
        self.assertEqual(self.client.post("/api/bookmarks", json={"thread_id": 2}).status_code, 500)
        self.assertEqual(self.client.delete("/api/bookmarks/2").status_code, 500)


class BookmarkQueryTests(unittest.TestCase):
    """The SQL in profile_service is scoped to the user and avoids duplicates."""

    def test_add_uses_on_conflict_with_the_user_and_thread(self):
        cur = mock.MagicMock()
        cur.fetchone.return_value = None

        created = profile_service.add_bookmark(cur, 7, 2)

        sql, params = cur.execute.call_args.args
        self.assertIn("ON CONFLICT (user_id, thread_id) DO NOTHING", sql)
        self.assertEqual(params, (7, 2))
        self.assertFalse(created)

    def test_remove_deletes_only_the_users_row(self):
        cur = mock.MagicMock()
        cur.rowcount = 0

        removed = profile_service.remove_bookmark(cur, 7, 1)

        sql, params = cur.execute.call_args.args
        self.assertIn("WHERE user_id = %s AND thread_id = %s", sql)
        self.assertEqual(params, (7, 1))
        self.assertFalse(removed)


if __name__ == "__main__":
    unittest.main()
