import json
import os
import socket
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
    "abstract": "Quantum gravitational effects are usually ignored in calculations ...",
}
# Real AI settings from .env or Codespaces secrets must not leak into the tests.
CONFIG = {"AI_API_URL": "", "AI_API_KEY": "test-key", "AI_MODEL": "test-model"}


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


class AskRouteTests(unittest.TestCase):
    def setUp(self):
        app = create_app()
        app.secret_key = "test-secret"
        app.logger.disabled = True
        self.client = app.test_client()
        with self.client.session_transaction() as session:
            session["user_id"] = 5   # the assistant is only for signed-in users

        patches = {
            "env": mock.patch.dict(os.environ, CONFIG),
            "connect": mock.patch.object(papers, "get_connection", return_value=mock.MagicMock()),
            "get": mock.patch.object(paper_service, "get_paper", return_value=dict(PAPER)),
            "urlopen": mock.patch.object(ai, "urlopen", return_value=ai_answer(" It predicts radiation. ")),
        }
        for name, patcher in patches.items():
            setattr(self, name, patcher.start())
            self.addCleanup(patcher.stop)

    def ask(self, body, paper_id=7):
        return self.client.post(f"/api/papers/{paper_id}/ask", json=body)

    def test_signed_out_users_get_401(self):
        with self.client.session_transaction() as session:
            session.clear()

        self.assertEqual(self.ask({"question": "What did they find?"}).status_code, 401)
        self.urlopen.assert_not_called()

    def test_question_gets_an_answer(self):
        response = self.ask({"question": "  What   did they find? "})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json(),
                         {"question": "What did they find?", "answer": "It predicts radiation."})
        sent = json.loads(self.urlopen.call_args.args[0].data)
        self.assertIn("QUESTION: What did they find?", sent["messages"][1]["content"])
        self.assertIn("ABSTRACT: Quantum gravitational", sent["messages"][1]["content"])

    def test_bad_questions_are_400(self):
        for body in (None, {}, {"question": 5}, {"question": "  a "}, {"question": "x" * 301}):
            with self.subTest(body=str(body)[:30]):
                self.assertEqual(self.ask(body).status_code, 400)
        self.urlopen.assert_not_called()

    def test_unknown_paper_is_404(self):
        self.get.return_value = None
        self.assertEqual(self.ask({"question": "Why?"}, paper_id=999).status_code, 404)
        self.urlopen.assert_not_called()

    def test_paper_without_abstract_is_422(self):
        self.get.return_value = {**PAPER, "abstract": None}
        self.assertEqual(self.ask({"question": "What did they find?"}).status_code, 422)
        self.urlopen.assert_not_called()

    def test_only_post_is_allowed(self):
        self.assertEqual(self.client.get("/api/papers/7/ask").status_code, 405)

    def test_slow_ai_is_504(self):
        self.urlopen.side_effect = socket.timeout()

        response = self.ask({"question": "What did they find?"})

        self.assertEqual(response.status_code, 504)
        self.assertNotIn("test-key", response.get_data(as_text=True))

    def test_empty_ai_answer_is_502(self):
        self.urlopen.return_value = ai_answer("")
        self.assertEqual(self.ask({"question": "What did they find?"}).status_code, 502)

    def test_no_ai_key_is_503(self):
        with mock.patch.dict(os.environ, {"AI_API_KEY": "", "OPENAI_API_KEY": ""}):
            self.assertEqual(self.ask({"question": "What did they find?"}).status_code, 503)

    def test_database_errors_are_500(self):
        self.connect.side_effect = psycopg.OperationalError("connection refused")

        response = self.ask({"question": "What did they find?"})

        self.assertEqual(response.status_code, 500)
        self.assertNotIn("connection refused", response.get_data(as_text=True))


if __name__ == "__main__":
    unittest.main()
