"""Tests for the AI Research Assistant
(app/api/v1/ai_assistant.py and app/services/ai_service.py).

"""
import json
import os
import socket
import unittest
from io import BytesIO
from unittest import mock
from urllib.error import HTTPError, URLError

import app as backend
from app.api.v1 import ai_assistant
from app.services import ai_service

USER = {"id": 7, "name": "Test", "email": "test@example.test", "role": "user"}
PAPER_CONTEXT = (
    "Research paper: Gravitational Collapse and Space-Time Singularities\nAbstract: ...",
    {"type": "paper", "id": 3, "title": "Gravitational Collapse and Space-Time Singularities"},
)
THREAD_CONTEXT = (
    "Research thread: Black Holes (Astrophysics)\nOverview: ...",
    {"type": "thread", "id": 1, "title": "Black Holes"},
)
CONFIG = {"OPENAI_API_KEY": "test-key", "OPENAI_MODEL": "test-model", "AI_DAILY_LIMIT": "3"}


class FakeResponse:
    def __init__(self, payload):
        body = payload if isinstance(payload, bytes) else json.dumps(payload).encode("utf-8")
        self.body = BytesIO(body)

    def read(self, size=-1):
        return self.body.read(size)

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False


def openai_answer(text):
    return {"choices": [{"message": {"role": "assistant", "content": text}}]}


class ExplainRouteTests(unittest.TestCase):
    def setUp(self):
        backend.app.logger.disabled = True
        self.addCleanup(setattr, backend.app.logger, "disabled", False)
        self.client = backend.app.test_client()

        patches = {
            "env": mock.patch.dict(os.environ, CONFIG),
            "connect": mock.patch.object(ai_assistant, "get_db_connection", return_value=mock.MagicMock()),
            "find_user": mock.patch.object(backend, "find_user", return_value=USER),
            "paper": mock.patch.object(ai_service, "paper_context", return_value=PAPER_CONTEXT),
            "thread": mock.patch.object(ai_service, "thread_context", return_value=THREAD_CONTEXT),
            "reserve": mock.patch.object(ai_service, "reserve_question", return_value=1),
            "refund": mock.patch.object(ai_service, "refund_question"),
            "urlopen": mock.patch.object(
                ai_service, "urlopen", return_value=FakeResponse(openai_answer("A singularity is..."))
            ),
        }
        for name, patcher in patches.items():
            setattr(self, name, patcher.start())
            self.addCleanup(patcher.stop)

    def sign_in(self):
        with self.client.session_transaction() as session:
            session["user_id"] = USER["id"]

    def ask(self, body):
        return self.client.post("/api/ai/explain", json=body)

    def test_signed_out_is_401_and_never_calls_the_ai(self):
        response = self.ask({"question": "What is a singularity?", "paper_id": 3})

        self.assertEqual(response.status_code, 401)
        self.urlopen.assert_not_called()
        self.reserve.assert_not_called()

    def test_answers_a_question_about_a_paper(self):
        self.sign_in()

        response = self.ask({"question": "  What is a singularity?  ", "paper_id": 3})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json(), {
            "answer": "A singularity is...",
            "context": PAPER_CONTEXT[1],
            "usage": {"used": 1, "limit": 3, "remaining": 2},
        })
        self.assertEqual(self.paper.call_args.args[1], 3)
        self.assertEqual(self.reserve.call_args.args[1:], (USER["id"], 3))

        sent = json.loads(self.urlopen.call_args.args[0].data)
        self.assertEqual(sent["model"], "test-model")
        self.assertIn(PAPER_CONTEXT[0], sent["messages"][1]["content"])
        self.assertIn("QUESTION:\nWhat is a singularity?", sent["messages"][1]["content"])
        self.assertEqual(
            self.urlopen.call_args.args[0].get_header("Authorization"), "Bearer test-key"
        )
        self.refund.assert_not_called()

    def test_answers_a_question_about_a_thread(self):
        self.sign_in()

        response = self.ask({"question": "Why does this matter?", "thread_id": 1})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["context"], THREAD_CONTEXT[1])
        self.paper.assert_not_called()

    def test_invalid_bodies_are_400_and_never_call_the_ai(self):
        self.sign_in()
        for body in (
            ["question"],
            {},
            {"question": "", "paper_id": 3},
            {"question": "   ", "paper_id": 3},
            {"question": 5, "paper_id": 3},
            {"question": "x" * 501, "paper_id": 3},
            {"question": "Why?"},
            {"question": "Why?", "paper_id": "3"},
            {"question": "Why?", "paper_id": True},
            {"question": "Why?", "paper_id": 0},
            {"question": "Why?", "thread_id": -1},
        ):
            with self.subTest(body=body):
                self.assertEqual(self.ask(body).status_code, 400)
        self.urlopen.assert_not_called()
        self.reserve.assert_not_called()

    def test_unknown_paper_is_404_and_not_counted(self):
        self.sign_in()
        self.paper.return_value = None

        response = self.ask({"question": "Why?", "paper_id": 999})

        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.get_json(), {"error": "Research paper not found"})
        self.reserve.assert_not_called()
        self.urlopen.assert_not_called()

    def test_daily_limit_reached_is_429_and_never_calls_the_ai(self):
        self.sign_in()
        self.reserve.return_value = None

        response = self.ask({"question": "Why?", "paper_id": 3})

        self.assertEqual(response.status_code, 429)
        self.assertEqual(response.get_json()["usage"], {"used": 3, "limit": 3, "remaining": 0})
        self.urlopen.assert_not_called()

    def test_missing_configuration_is_503_and_refunded(self):
        self.sign_in()
        with mock.patch.dict(os.environ, {"OPENAI_API_KEY": ""}):
            response = self.ask({"question": "Why?", "paper_id": 3})

        self.assertEqual(response.status_code, 503)
        self.urlopen.assert_not_called()
        self.assertEqual(self.refund.call_args.args[1], USER["id"])

    def test_ai_failures_are_refunded_with_a_clear_status(self):
        cases = (
            (socket.timeout(), 504),
            (URLError(TimeoutError()), 504),
            (URLError("no route"), 502),
            (HTTPError("u", 401, "Unauthorized", {}, None), 502),
            (HTTPError("u", 429, "Too Many Requests", {}, None), 502),
            (HTTPError("u", 500, "Server Error", {}, None), 502),
        )
        self.sign_in()
        for failure, status in cases:
            with self.subTest(failure=failure):
                self.refund.reset_mock()
                self.urlopen.side_effect = failure

                response = self.ask({"question": "Why?", "paper_id": 3})

                self.assertEqual(response.status_code, status)
                self.assertIn("error", response.get_json())
                self.refund.assert_called_once()

    def test_unexpected_ai_responses_are_502(self):
        self.sign_in()
        for payload in (b"not json", {"choices": []}, openai_answer(""), openai_answer(None)):
            with self.subTest(payload=payload):
                self.urlopen.side_effect = None
                self.urlopen.return_value = FakeResponse(payload)

                response = self.ask({"question": "Why?", "paper_id": 3})

                self.assertEqual(response.status_code, 502)

    def test_api_key_never_appears_in_responses(self):
        self.sign_in()
        self.urlopen.side_effect = HTTPError("u", 401, "Unauthorized", {}, None)

        response = self.ask({"question": "Why?", "paper_id": 3})

        self.assertNotIn("test-key", response.get_data(as_text=True))


class UsageRouteTests(unittest.TestCase):
    def setUp(self):
        backend.app.logger.disabled = True
        self.addCleanup(setattr, backend.app.logger, "disabled", False)
        self.client = backend.app.test_client()
        for patcher in (
            mock.patch.dict(os.environ, CONFIG),
            mock.patch.object(ai_assistant, "get_db_connection", return_value=mock.MagicMock()),
            mock.patch.object(backend, "find_user", return_value=USER),
        ):
            patcher.start()
            self.addCleanup(patcher.stop)

    def test_signed_out_is_401(self):
        self.assertEqual(self.client.get("/api/ai/usage").status_code, 401)

    def test_reports_todays_usage(self):
        with self.client.session_transaction() as session:
            session["user_id"] = USER["id"]
        with mock.patch.object(ai_service, "questions_used_today", return_value=2) as used:
            response = self.client.get("/api/ai/usage")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json(), {"used": 2, "limit": 3, "remaining": 1})
        self.assertEqual(used.call_args.args[1], USER["id"])


class DailyLimitTests(unittest.TestCase):
    def test_reads_ai_daily_limit_with_a_safe_default(self):
        for value, expected in (("5", 5), ("0", 1), ("-3", 1), ("lots", 20)):
            with self.subTest(value=value), mock.patch.dict(os.environ, {"AI_DAILY_LIMIT": value}):
                self.assertEqual(ai_service.daily_limit(), expected)
        with mock.patch.dict(os.environ, {}, clear=True):
            self.assertEqual(ai_service.daily_limit(), 20)


if __name__ == "__main__":
    unittest.main()
