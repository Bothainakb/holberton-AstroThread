"""Tests for GET /api/threads/<id>, /timeline and /charts (app/api/v1/threads.py).

Run from the backend folder:  python -m unittest -v
The database is mocked, so these tests do not need PostgreSQL.
"""
import unittest
from datetime import datetime, timezone
from unittest import mock

import psycopg
from flask import Flask

from app.api.v1 import threads


def fake_connection(fetchone=None, fetchall=None):
    """A mocked psycopg connection. `fetchone` may be a list of results."""
    cursor = mock.MagicMock()
    if isinstance(fetchone, list):
        cursor.fetchone.side_effect = fetchone
    else:
        cursor.fetchone.return_value = fetchone
    cursor.fetchall.return_value = fetchall or []
    cursor.__enter__.return_value = cursor
    cursor.__exit__.return_value = False  # never swallow exceptions

    conn = mock.MagicMock()
    conn.cursor.return_value = cursor
    conn.__enter__.return_value = conn
    conn.__exit__.return_value = False
    return conn, cursor


class ThreadDataTestCase(unittest.TestCase):
    def setUp(self):
        app = Flask(__name__)
        app.register_blueprint(threads.threads_bp)
        app.logger.disabled = True
        self.client = app.test_client()

    def use_db(self, **kwargs):
        conn, cursor = fake_connection(**kwargs)
        patcher = mock.patch.object(threads, "get_db_connection", return_value=conn)
        patcher.start()
        self.addCleanup(patcher.stop)
        return cursor

    def fail_db(self):
        error = psycopg.OperationalError("connection refused")
        patcher = mock.patch.object(threads, "get_db_connection", side_effect=error)
        patcher.start()
        self.addCleanup(patcher.stop)


class GetThreadTests(ThreadDataTestCase):
    def test_returns_thread_with_paper_count(self):
        updated = datetime(2026, 10, 15, 9, 30, tzinfo=timezone.utc)
        self.use_db(fetchone=(1, "Black Holes", "Astrophysics", "Regions...", True, updated, 2))
        response = self.client.get("/api/threads/1")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json(), {
            "id": 1,
            "title": "Black Holes",
            "category": "Astrophysics",
            "description": "Regions...",
            "is_featured": True,
            "updated_at": "2026-10-15T09:30:00+00:00",
            "paper_count": 2,
        })

    def test_unknown_thread_returns_404(self):
        self.use_db(fetchone=None)
        response = self.client.get("/api/threads/999")

        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.get_json(), {"error": "Research thread not found"})

    def test_non_numeric_id_returns_404(self):
        self.assertEqual(self.client.get("/api/threads/abc").status_code, 404)

    def test_database_error_returns_json_500(self):
        self.fail_db()
        response = self.client.get("/api/threads/1")

        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.get_json(), {"error": "Unable to retrieve the research thread"})


class TimelineTests(ThreadDataTestCase):
    def test_returns_events_in_order(self):
        cursor = self.use_db(
            fetchone=(1,),
            fetchall=[
                (1, 1916, "Schwarzschild solution", "First exact solution."),
                (4, 2019, "First image of a black hole", "EHT image of M87."),
            ],
        )
        response = self.client.get("/api/threads/1/timeline")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json(), [
            {"id": 1, "year": 1916, "title": "Schwarzschild solution", "description": "First exact solution."},
            {"id": 4, "year": 2019, "title": "First image of a black hole", "description": "EHT image of M87."},
        ])
        sql = cursor.execute.call_args.args[0]
        self.assertIn("ORDER BY year", sql)

    def test_thread_without_events_returns_empty_list(self):
        self.use_db(fetchone=(1,), fetchall=[])
        response = self.client.get("/api/threads/1/timeline")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json(), [])

    def test_unknown_thread_returns_404(self):
        cursor = self.use_db(fetchone=None)
        response = self.client.get("/api/threads/999/timeline")

        self.assertEqual(response.status_code, 404)
        cursor.fetchall.assert_not_called()

    def test_database_error_returns_json_500(self):
        self.fail_db()
        response = self.client.get("/api/threads/1/timeline")

        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.get_json(), {"error": "Unable to retrieve the timeline"})


class ChartTests(ThreadDataTestCase):
    def test_returns_charts_with_points(self):
        points = [{"year": 2015, "value": 0.196}, {"year": 2025, "value": 1}]
        self.use_db(
            fetchone=(1,),
            fetchall=[(1, "Black Hole Mass", "line", "Illustrative data", points)],
        )
        response = self.client.get("/api/threads/1/charts")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json(), [{
            "id": 1,
            "title": "Black Hole Mass",
            "chart_type": "line",
            "note": "Illustrative data",
            "points": points,
        }])

    def test_unknown_thread_returns_404(self):
        self.use_db(fetchone=None)
        self.assertEqual(self.client.get("/api/threads/999/charts").status_code, 404)

    def test_database_error_returns_json_500(self):
        self.fail_db()
        response = self.client.get("/api/threads/1/charts")

        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.get_json(), {"error": "Unable to retrieve the charts"})


if __name__ == "__main__":
    unittest.main()
