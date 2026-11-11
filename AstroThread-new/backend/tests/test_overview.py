import json
import os
import socket
import unittest
from io import BytesIO
from unittest import mock
from urllib.error import HTTPError, URLError

import psycopg

from app import create_app
from app.routes import topics
from app.services import ai, home_service

PAPERS = [{
    "title": "From Newton's Moon to Einstein's Moon",
    "authors": "Kenneth L. Nordtvedt Jr",
    "year": 1996,
    "abstract": "Three centuries ago Isaac Newton ...",
    "url": "https://doi.org/10.1063/1.881656",
    "cited_by_count": 143,
}]
NEW_TOPIC = {"id": 4, "title": "Moon", "overview": None, "generated_at": None}
CONFIG = {
    # The test settings. The AI_* names are emptied so that real settings
    # from .env or Codespaces secrets can't replace the test ones.
    "AI_API_URL": "",
    "AI_API_KEY": "",
    "AI_MODEL": "",
    "OPENAI_API_KEY": "test-key",
    "OPENAI_MODEL": "test-model",
}


class FakeResponse:
    def __init__(self, payload):
        self.body = BytesIO(payload if isinstance(payload, bytes) else json.dumps(payload).encode())

    def read(self, size=-1):
        return self.body.read(size)

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False


def openai_answer(text):
    return {"choices": [{"message": {"role": "assistant", "content": text}}]}


class OverviewRouteTests(unittest.TestCase):
    def setUp(self):
        app = create_app()
        app.logger.disabled = True
        self.client = app.test_client()

        patches = {
            "env": mock.patch.dict(os.environ, CONFIG),
            "connect": mock.patch.object(topics, "get_connection", return_value=mock.MagicMock()),
            "topic": mock.patch.object(home_service, "get_overview", return_value=dict(NEW_TOPIC)),
            "papers": mock.patch.object(home_service, "get_topic_papers", return_value=PAPERS),
            "save": mock.patch.object(
                home_service, "save_overview",
                return_value={"overview": "The Moon is...", "generated_at": "2026-11-07T12:00:00"},
            ),
            "urlopen": mock.patch.object(
                ai, "urlopen", return_value=FakeResponse(openai_answer("  The Moon is...  "))
            ),
        }
        for name, patcher in patches.items():
            setattr(self, name, patcher.start())
            self.addCleanup(patcher.stop)

    def test_first_request_writes_and_stores_the_overview(self):
        response = self.client.get("/api/topics/moon/overview")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json(), {
            "slug": "moon",
            "title": "Moon",
            "overview": "The Moon is...",
            "generated_at": "2026-11-07T12:00:00",
        })
        self.assertEqual(self.save.call_args.args[1:], (4, "The Moon is..."))

        request = self.urlopen.call_args.args[0]
        sent = json.loads(request.data)
        self.assertEqual(sent["model"], "test-model")
        self.assertIn("TOPIC: Moon", sent["messages"][1]["content"])
        self.assertIn("From Newton's Moon to Einstein's Moon", sent["messages"][1]["content"])
        self.assertEqual(request.get_header("Authorization"), "Bearer test-key")

    def test_stored_overview_is_reused_without_asking_the_ai(self):
        self.topic.return_value = {**NEW_TOPIC, "overview": "Stored text", "generated_at": "2026-11-01T00:00:00"}

        response = self.client.get("/api/topics/moon/overview")

        self.assertEqual(response.get_json()["overview"], "Stored text")
        self.urlopen.assert_not_called()
        self.save.assert_not_called()

    def test_unknown_topic_or_bad_slug_is_404(self):
        self.topic.return_value = None
        for url in ("/api/topics/never-searched/overview", "/api/topics/Bad_Slug/overview",
                    "/api/topics/" + "a" * 101 + "/overview"):
            with self.subTest(url=url[:40]):
                self.assertEqual(self.client.get(url).status_code, 404)
        self.urlopen.assert_not_called()

    def test_topic_without_papers_is_404(self):
        self.papers.return_value = []

        response = self.client.get("/api/topics/moon/overview")

        self.assertEqual(response.status_code, 404)
        self.urlopen.assert_not_called()

    def test_no_key_is_503_and_nothing_is_stored(self):
        with mock.patch.dict(os.environ, {"OPENAI_API_KEY": ""}):
            response = self.client.get("/api/topics/moon/overview")

        self.assertEqual(response.status_code, 503)
        self.urlopen.assert_not_called()
        self.save.assert_not_called()

    def test_ai_failures_are_reported_and_nothing_is_stored(self):
        for failure, status in (
            (socket.timeout(), 504),
            (URLError(TimeoutError()), 504),
            (URLError("no route"), 502),
            (HTTPError("u", 401, "Unauthorized", {}, None), 502),
            (HTTPError("u", 429, "Too Many Requests", {}, None), 502),
        ):
            with self.subTest(failure=failure):
                self.urlopen.side_effect = failure
                response = self.client.get("/api/topics/moon/overview")
                self.assertEqual(response.status_code, status)
                self.assertNotIn("test-key", response.get_data(as_text=True))
        self.save.assert_not_called()

    def test_unexpected_ai_responses_are_502(self):
        for payload in (b"not json", {"choices": []}, openai_answer(""), openai_answer(None)):
            with self.subTest(payload=payload):
                self.urlopen.side_effect = None
                self.urlopen.return_value = FakeResponse(payload)
                self.assertEqual(self.client.get("/api/topics/moon/overview").status_code, 502)

    def test_database_errors_are_500(self):
        self.connect.side_effect = psycopg.OperationalError("connection refused")

        response = self.client.get("/api/topics/moon/overview")

        self.assertEqual(response.status_code, 500)
        self.assertNotIn("connection refused", response.get_data(as_text=True))


class BuildContextTests(unittest.TestCase):
    def test_lists_the_topic_and_its_papers(self):
        text = ai.build_context("Moon", PAPERS + [{"title": "No details", "authors": None,
                                                   "year": None, "abstract": None}])

        self.assertEqual(text.splitlines()[:5], [
            "TOPIC: Moon",
            "",
            "PAPERS:",
            "1. From Newton's Moon to Einstein's Moon (Kenneth L. Nordtvedt Jr, 1996)",
            "   Abstract: Three centuries ago Isaac Newton ...",
        ])
        self.assertIn("2. No details", text)


if __name__ == "__main__":
    unittest.main()
