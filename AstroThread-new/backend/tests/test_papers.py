
import json
import os
import unittest
from io import BytesIO
from unittest import mock

import psycopg

from app import create_app
from app.routes import papers
from app.services import ai, paper_service

PAPER = {
    "id": 7,
    "title": "Black hole explosions?",
    "authors": "Stephen William Hawking",
    "year": 1974,
    "abstract": "Quantum gravitational effects are usually ignored in calculations ...",
    "url": "https://doi.org/10.1038/248030a0",
    "cited_by_count": 5633,
    "venue": "Nature",
    "topic": "Black Holes and Theoretical Physics",
    "keywords": ["Hawking radiation"],
    "author_list": ["Stephen William Hawking"],
    "method": None,
    "main_finding": None,
    "why_it_matters": None,
    "search_topic": "Black Holes",
}
EXPLAINED = {**PAPER, "method": "M.", "main_finding": "F.", "why_it_matters": "W."}
CONFIG = {"AI_API_KEY": "test-key", "AI_MODEL": "test-model"}


class FakeResponse:
    def __init__(self, payload):
        self.body = BytesIO(json.dumps(payload).encode())

    def read(self, size=-1):
        return self.body.read(size)

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False


def ai_answer(text):
    return FakeResponse({"choices": [{"message": {"content": text}}]})


class PaperRouteTests(unittest.TestCase):
    def setUp(self):
        app = create_app()
        app.logger.disabled = True
        self.client = app.test_client()

        patches = {
            "env": mock.patch.dict(os.environ, CONFIG),
            "connect": mock.patch.object(papers, "get_connection", return_value=mock.MagicMock()),
            "get": mock.patch.object(paper_service, "get_paper",
                                     side_effect=[dict(PAPER), dict(EXPLAINED)]),
            "save": mock.patch.object(paper_service, "save_details"),
            "related": mock.patch.object(paper_service, "get_related", return_value=[]),
            "urlopen": mock.patch.object(ai, "urlopen", return_value=ai_answer(
                '```json\n{"method": "M.", "mainFinding": "F.", "whyItMatters": "W."}\n```'
            )),
        }
        for name, patcher in patches.items():
            setattr(self, name, patcher.start())
            self.addCleanup(patcher.stop)

    def test_first_visit_asks_the_ai_and_stores_the_explanations(self):
        response = self.client.get("/api/papers/7")

        self.assertEqual(response.status_code, 200)
        body = response.get_json()
        self.assertEqual(body["id"], "7")
        self.assertEqual(body["authors"], ["Stephen William Hawking"])
        self.assertEqual(body["venue"], "Nature")
        self.assertEqual((body["method"], body["mainFinding"], body["whyItMatters"]),
                         ("M.", "F.", "W."))
        self.assertEqual(self.save.call_args.args[1:], (
            7, {"method": "M.", "main_finding": "F.", "why_it_matters": "W."}))
        sent = json.loads(self.urlopen.call_args.args[0].data)
        self.assertIn("TITLE: Black hole explosions?", sent["messages"][1]["content"])

    def test_stored_explanations_are_reused(self):
        self.get.side_effect = [dict(EXPLAINED)]

        body = self.client.get("/api/papers/7").get_json()

        self.assertEqual(body["method"], "M.")
        self.urlopen.assert_not_called()
        self.save.assert_not_called()

    def test_without_ai_the_paper_is_returned_without_explanations(self):
        self.get.side_effect = [dict(PAPER)]
        with mock.patch.dict(os.environ, {"AI_API_KEY": "", "OPENAI_API_KEY": ""}):
            response = self.client.get("/api/papers/7")

        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.get_json()["method"])
        self.urlopen.assert_not_called()

    def test_paper_without_abstract_is_not_sent_to_the_ai(self):
        self.get.side_effect = [{**PAPER, "abstract": None}]

        response = self.client.get("/api/papers/7")

        self.assertEqual(response.status_code, 200)
        self.urlopen.assert_not_called()

    def test_ai_failure_still_returns_the_paper(self):
        self.get.side_effect = [dict(PAPER)]
        self.urlopen.return_value = ai_answer("Sorry, I can't do JSON today.")

        response = self.client.get("/api/papers/7")

        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.get_json()["mainFinding"])
        self.save.assert_not_called()

    def test_unknown_or_invalid_paper_is_404(self):
        self.get.side_effect = [None]
        self.assertEqual(self.client.get("/api/papers/999").status_code, 404)
        self.assertEqual(self.client.get("/api/papers/sample-kerr").status_code, 404)

    def test_related_papers(self):
        self.get.side_effect = [dict(EXPLAINED)]
        self.related.return_value = [{"id": "8", "title": "Other"}]

        response = self.client.get("/api/papers/7/related")

        self.assertEqual(response.get_json(), {"results": [{"id": "8", "title": "Other"}]})

    def test_related_for_unknown_paper_is_404(self):
        self.get.side_effect = [None]
        self.assertEqual(self.client.get("/api/papers/999/related").status_code, 404)

    def test_database_errors_are_500(self):
        self.connect.side_effect = psycopg.OperationalError("connection refused")

        for url in ("/api/papers/7", "/api/papers/7/related"):
            with self.subTest(url=url):
                response = self.client.get(url)
                self.assertEqual(response.status_code, 500)
                self.assertNotIn("connection refused", response.get_data(as_text=True))


class PaperDetailsAITests(unittest.TestCase):
    def ask(self, text):
        with mock.patch.dict(os.environ, CONFIG), \
                mock.patch.object(ai, "urlopen", return_value=ai_answer(text)):
            return ai.write_paper_details(PAPER)

    def test_reads_plain_or_fenced_json(self):
        for text in ('{"method": "M", "mainFinding": "F", "whyItMatters": "W"}',
                     'Here you go:\n```json\n{"method": "M", "mainFinding": "F", '
                     '"whyItMatters": "W"}\n```'):
            with self.subTest(text=text[:20]):
                self.assertEqual(self.ask(text),
                                 {"method": "M", "main_finding": "F", "why_it_matters": "W"})

    def test_bad_answers_raise(self):
        for text in ("no json here", '{"method": "M"}', '{"method": "", "mainFinding": "F", '
                     '"whyItMatters": "W"}', "[1, 2]"):
            with self.subTest(text=text), self.assertRaises(ai.AIError):
                self.ask(text)


if __name__ == "__main__":
    unittest.main()
