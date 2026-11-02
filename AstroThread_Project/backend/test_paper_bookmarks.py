"""Tests for saved research papers (paper routes in app/api/v1/bookmarks.py) and
the OpenAlex single-paper lookup they use (openalex_service.fetch_paper).

Run from the backend folder:  python -m unittest -v test_paper_bookmarks
The database is a fake, the signed-in user comes from a mocked session lookup
and OpenAlex is never contacted, so these tests need no PostgreSQL or network.
"""
import json
import unittest
from unittest import mock
from urllib.error import HTTPError

import psycopg

import app as backend
from app.api.v1 import bookmarks
from app.services import openalex_service, profile_service

USER = {"id": 7, "name": "Test", "email": "test@example.test", "role": "user"}
OPENALEX_ID = "https://openalex.org/W2101234009"
PAPER = {
    "openalex_id": OPENALEX_ID,
    "title": "The Structure of Cold Dark Matter Halos",
    "authors": "Julio F. Navarro, Carlos S. Frenk, Simon D. M. White",
    "year": 1996,
    "url": "https://doi.org/10.1086/177173",
    "summary": None,
}
SAVED = [{
    "paper_id": 4, "openalex_id": OPENALEX_ID, "title": PAPER["title"], "authors": PAPER["authors"],
    "year": 1996, "url": PAPER["url"], "thread": {"id": 207, "slug": "dark-matter", "title": "Dark Matter"},
    "saved_at": "2026-11-02T00:00:00",
}]


class PaperBookmarkRouteTests(unittest.TestCase):
    def setUp(self):
        backend.app.logger.disabled = True
        self.addCleanup(setattr, backend.app.logger, "disabled", False)
        self.client = backend.app.test_client()

        patches = {
            "connect": mock.patch.object(bookmarks, "get_db_connection", return_value=mock.MagicMock()),
            "find_user": mock.patch.object(backend, "find_user", return_value=USER),
            "saved": mock.patch.object(profile_service, "get_saved_papers", return_value=SAVED),
            "thread_exists": mock.patch.object(profile_service, "thread_exists", return_value=True),
            "paper_exists": mock.patch.object(profile_service, "paper_exists", return_value=True),
            "find_openalex": mock.patch.object(profile_service, "find_openalex_paper", return_value=None),
            "store": mock.patch.object(profile_service, "store_openalex_paper", return_value=4),
            "add": mock.patch.object(profile_service, "add_paper_bookmark", return_value=True),
            "remove": mock.patch.object(profile_service, "remove_paper_bookmark", return_value=True),
            "fetch": mock.patch.object(openalex_service, "fetch_paper", return_value=PAPER),
        }
        for name, patcher in patches.items():
            setattr(self, name, patcher.start())
            self.addCleanup(patcher.stop)

    def sign_in(self):
        with self.client.session_transaction() as session:
            session["user_id"] = USER["id"]

    def test_signed_out_requests_are_401_and_touch_no_data(self):
        for method, path, body in (
            ("get", "/api/bookmarks/papers", None),
            ("post", "/api/bookmarks/papers", {"paper_id": 1}),
            ("delete", "/api/bookmarks/papers/1", None),
        ):
            with self.subTest(method=method):
                response = getattr(self.client, method)(path, json=body)
                self.assertEqual(response.status_code, 401)
        self.add.assert_not_called()
        self.remove.assert_not_called()
        self.saved.assert_not_called()

    def test_lists_only_the_session_users_papers(self):
        self.sign_in()
        response = self.client.get("/api/bookmarks/papers")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json(), SAVED)
        self.assertEqual(self.saved.call_args.args[1], USER["id"])

    def test_saves_a_database_paper_and_again_is_not_a_duplicate(self):
        self.sign_in()
        response = self.client.post("/api/bookmarks/papers", json={"paper_id": 1, "thread_id": 1})
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.get_json(), {"paper_id": 1, "saved": True})
        self.assertEqual(self.add.call_args.args[1:], (USER["id"], 1, 1))
        self.fetch.assert_not_called()

        self.add.return_value = False
        again = self.client.post("/api/bookmarks/papers", json={"paper_id": 1})
        self.assertEqual(again.status_code, 200)

    def test_saves_an_openalex_paper_with_details_from_openalex_not_the_request(self):
        self.sign_in()
        response = self.client.post(
            "/api/bookmarks/papers",
            json={"openalex_id": OPENALEX_ID, "thread_id": 207, "title": "Injected title", "url": "https://evil.example"},
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.get_json(), {"paper_id": 4, "saved": True})
        self.fetch.assert_called_once_with(OPENALEX_ID)
        self.assertEqual(self.store.call_args.args[1], PAPER)
        self.assertEqual(self.add.call_args.args[1:], (USER["id"], 4, 207))

    def test_an_openalex_paper_already_stored_is_not_looked_up_again(self):
        self.sign_in()
        self.find_openalex.return_value = 4
        response = self.client.post("/api/bookmarks/papers", json={"openalex_id": OPENALEX_ID})
        self.assertEqual(response.status_code, 201)
        self.fetch.assert_not_called()
        self.store.assert_not_called()
        self.assertEqual(self.add.call_args.args[1:], (USER["id"], 4, None))

    def test_rejects_bad_input(self):
        self.sign_in()
        for body in (
            {},
            {"paper_id": 1, "openalex_id": OPENALEX_ID},
            {"paper_id": "1"},
            {"paper_id": True},
            {"paper_id": 0},
            {"openalex_id": "W2101234009"},
            {"openalex_id": "https://evil.example/W1"},
            {"paper_id": 1, "thread_id": "x"},
        ):
            with self.subTest(body=body):
                self.assertEqual(self.client.post("/api/bookmarks/papers", json=body).status_code, 400)
        self.assertEqual(self.client.post("/api/bookmarks/papers", data="x").status_code, 400)
        self.add.assert_not_called()

    def test_unknown_paper_or_thread_is_404(self):
        self.sign_in()
        self.paper_exists.return_value = False
        self.assertEqual(self.client.post("/api/bookmarks/papers", json={"paper_id": 99}).status_code, 404)
        self.paper_exists.return_value = True
        self.thread_exists.return_value = False
        self.assertEqual(
            self.client.post("/api/bookmarks/papers", json={"paper_id": 1, "thread_id": 99}).status_code, 404
        )
        self.thread_exists.return_value = True
        self.fetch.return_value = None
        self.assertEqual(self.client.post("/api/bookmarks/papers", json={"openalex_id": OPENALEX_ID}).status_code, 404)
        self.add.assert_not_called()

    def test_openalex_problems_are_reported_without_saving(self):
        self.sign_in()
        for exc, status in (
            (openalex_service.OpenAlexTimeout("slow"), 504),
            (openalex_service.OpenAlexUnavailable("down"), 502),
        ):
            with self.subTest(status=status):
                self.fetch.side_effect = exc
                self.assertEqual(
                    self.client.post("/api/bookmarks/papers", json={"openalex_id": OPENALEX_ID}).status_code, status
                )
        self.add.assert_not_called()

    def test_removes_only_the_session_users_bookmark(self):
        self.sign_in()
        self.assertEqual(self.client.delete("/api/bookmarks/papers/4").status_code, 204)
        self.assertEqual(self.remove.call_args.args[1:], (USER["id"], 4))
        self.remove.return_value = False
        self.assertEqual(self.client.delete("/api/bookmarks/papers/4").status_code, 404)

    def test_database_errors_are_500(self):
        self.sign_in()
        self.saved.side_effect = psycopg.OperationalError("down")
        self.assertEqual(self.client.get("/api/bookmarks/papers").status_code, 500)
        self.add.side_effect = psycopg.OperationalError("down")
        self.assertEqual(self.client.post("/api/bookmarks/papers", json={"paper_id": 1}).status_code, 500)


class FetchPaperTests(unittest.TestCase):
    """openalex_service.fetch_paper: one work by id, through the same safe helpers."""

    def respond(self, body):
        response = mock.MagicMock()
        response.__enter__.return_value.read.return_value = json.dumps(body).encode()
        return response

    def test_returns_the_paper_with_a_safe_link(self):
        work = {"id": OPENALEX_ID, "display_name": PAPER["title"], "publication_year": 1996,
                "doi": "https://doi.org/10.1086/177173", "authorships": []}
        with mock.patch.object(openalex_service, "urlopen", return_value=self.respond(work)) as urlopen:
            paper = openalex_service.fetch_paper(OPENALEX_ID)
        self.assertEqual(paper["openalex_id"], OPENALEX_ID)
        self.assertEqual(paper["url"], "https://doi.org/10.1086/177173")
        self.assertIn("/works/W2101234009?", urlopen.call_args.args[0].full_url)

    def test_rejects_other_ids_without_contacting_openalex(self):
        with mock.patch.object(openalex_service, "urlopen") as urlopen:
            for value in ("W2101234009", "https://evil.example/W1", "https://openalex.org/W1/../x", None, 5):
                self.assertIsNone(openalex_service.fetch_paper(value))
        urlopen.assert_not_called()

    def test_missing_or_merged_works_give_none(self):
        missing = HTTPError("url", 404, "Not Found", {}, None)
        with mock.patch.object(openalex_service, "urlopen", side_effect=missing):
            self.assertIsNone(openalex_service.fetch_paper(OPENALEX_ID))
        merged = {"id": "https://openalex.org/W1", "display_name": "Other", "doi": "https://doi.org/10.1/x"}
        with mock.patch.object(openalex_service, "urlopen", return_value=self.respond(merged)):
            self.assertIsNone(openalex_service.fetch_paper(OPENALEX_ID))

    def test_other_http_errors_mean_unavailable(self):
        with mock.patch.object(openalex_service, "urlopen", side_effect=HTTPError("url", 500, "x", {}, None)):
            with self.assertRaises(openalex_service.OpenAlexUnavailable):
                openalex_service.fetch_paper(OPENALEX_ID)


if __name__ == "__main__":
    unittest.main()
