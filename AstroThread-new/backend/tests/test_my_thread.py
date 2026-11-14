import unittest
from unittest import mock

import psycopg

from app import create_app
from app.routes import my_thread
from app.services import my_thread_service

THREAD = {
    "topics": [{"topic": "Black Holes", "savedAt": "2026-11-14T10:00:00"}],
    "journey": [{"id": "1731-abc123", "type": "search", "query": "black holes", "at": "2026-11-14T10:01:00"}],
}


class MyThreadRouteTests(unittest.TestCase):
    def setUp(self):
        app = create_app()
        app.secret_key = "test-secret"
        app.logger.disabled = True
        self.client = app.test_client()
        with self.client.session_transaction() as session:
            session["user_id"] = 5

        patches = {
            "connect": mock.patch.object(my_thread, "get_connection", return_value=mock.MagicMock()),
            "get": mock.patch.object(my_thread_service, "get_thread", return_value=THREAD),
            "save": mock.patch.object(my_thread_service, "save_topic"),
            "unsave": mock.patch.object(my_thread_service, "remove_topic"),
            "exists": mock.patch.object(my_thread_service, "paper_exists", return_value=True),
            "add": mock.patch.object(my_thread_service, "add_step"),
            "note": mock.patch.object(my_thread_service, "set_note", return_value=True),
            "remove": mock.patch.object(my_thread_service, "remove_step", return_value=True),
        }
        for name, patcher in patches.items():
            setattr(self, name, patcher.start())
            self.addCleanup(patcher.stop)

    def test_signed_out_users_get_401_everywhere(self):
        with self.client.session_transaction() as session:
            session.clear()

        requests = (
            ("get", "/api/my-thread", None),
            ("post", "/api/my-thread/topics", {"topic": "Moon"}),
            ("delete", "/api/my-thread/topics/Moon", None),
            ("post", "/api/my-thread/steps", {"id": "a1", "type": "search", "query": "moon"}),
            ("patch", "/api/my-thread/steps/a1", {"note": "hi"}),
            ("delete", "/api/my-thread/steps/a1", None),
        )
        for method, url, body in requests:
            with self.subTest(method=method, url=url):
                response = getattr(self.client, method)(url, json=body)
                self.assertEqual(response.status_code, 401)
        self.connect.assert_not_called()

    def test_get_returns_this_users_thread(self):
        response = self.client.get("/api/my-thread")

        self.assertEqual(response.get_json(), THREAD)
        self.assertEqual(self.get.call_args.args[1], 5)   # the signed-in user's id

    def test_save_and_remove_a_topic(self):
        self.assertEqual(self.client.post("/api/my-thread/topics", json={"topic": "  Black   Holes "}).status_code, 204)
        self.assertEqual(self.save.call_args.args[1:], (5, "Black Holes"))

        self.assertEqual(self.client.delete("/api/my-thread/topics/Black%20Holes").status_code, 204)
        self.assertEqual(self.unsave.call_args.args[1:], (5, "Black Holes"))

    def test_bad_topics_are_400(self):
        for body in ({}, {"topic": "   "}, {"topic": "x" * 101}, {"topic": 5}):
            with self.subTest(body=str(body)[:20]):
                self.assertEqual(self.client.post("/api/my-thread/topics", json=body).status_code, 400)
        self.save.assert_not_called()

    def test_add_a_search_and_a_paper_step(self):
        search = {"id": "1731-abc123", "type": "search", "query": " black  holes "}
        paper = {"id": "1731-def456", "type": "paper", "paperId": "7", "topic": "Black Holes"}

        self.assertEqual(self.client.post("/api/my-thread/steps", json=search).status_code, 204)
        self.assertEqual(self.add.call_args.args[2],
                         {"id": "1731-abc123", "type": "search", "query": "black holes"})

        self.assertEqual(self.client.post("/api/my-thread/steps", json=paper).status_code, 204)
        self.assertEqual(self.add.call_args.args[2],
                         {"id": "1731-def456", "type": "paper", "paperId": 7, "topic": "Black Holes"})

    def test_bad_steps_are_400(self):
        for body in (
            {"id": "has spaces!", "type": "search", "query": "moon"},
            {"id": "a1", "type": "video", "query": "moon"},
            {"id": "a1", "type": "search", "query": ""},
            {"id": "a1", "type": "paper", "paperId": "abc"},
        ):
            with self.subTest(body=body):
                self.assertEqual(self.client.post("/api/my-thread/steps", json=body).status_code, 400)
        self.add.assert_not_called()

    def test_step_for_an_unknown_paper_is_404(self):
        self.exists.return_value = False
        body = {"id": "a1", "type": "paper", "paperId": "999"}

        self.assertEqual(self.client.post("/api/my-thread/steps", json=body).status_code, 404)
        self.add.assert_not_called()

    def test_notes_and_removing_steps(self):
        self.assertEqual(self.client.patch("/api/my-thread/steps/a1", json={"note": " Read later "}).status_code, 204)
        self.assertEqual(self.note.call_args.args[1:], (5, "a1", "Read later"))
        self.assertEqual(self.client.patch("/api/my-thread/steps/a1", json={"note": 5}).status_code, 400)
        self.assertEqual(self.client.delete("/api/my-thread/steps/a1").status_code, 204)

    def test_someone_elses_or_missing_step_is_404(self):
        self.note.return_value = False
        self.remove.return_value = False

        self.assertEqual(self.client.patch("/api/my-thread/steps/zz", json={"note": "x"}).status_code, 404)
        self.assertEqual(self.client.delete("/api/my-thread/steps/zz").status_code, 404)

    def test_database_errors_are_500(self):
        self.connect.side_effect = psycopg.OperationalError("connection refused")

        response = self.client.get("/api/my-thread")

        self.assertEqual(response.status_code, 500)
        self.assertNotIn("connection refused", response.get_data(as_text=True))


class ToStepTests(unittest.TestCase):
    def test_search_and_paper_rows(self):
        search = ("k1", "search", "black holes", None, None, None, None, "2026-11-14T10:00:00")
        paper = ("k2", "paper", None, 7, "Paper A", None, "Great intro", "2026-11-14T10:05:00")

        self.assertEqual(my_thread_service.to_step(search),
                         {"id": "k1", "type": "search", "at": "2026-11-14T10:00:00", "query": "black holes"})
        self.assertEqual(my_thread_service.to_step(paper), {
            "id": "k2", "type": "paper", "at": "2026-11-14T10:05:00",
            "paperId": "7", "title": "Paper A", "topic": "Other", "note": "Great intro",
        })


if __name__ == "__main__":
    unittest.main()
