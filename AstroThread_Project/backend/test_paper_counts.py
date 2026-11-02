"""Tests for the stored OpenAlex paper counts (app/services/paper_count_service.py)
and their use in GET /api/threads and GET /api/threads/<id>/openalex-papers.

Run from the backend folder:  python -m unittest -v test_paper_counts
The database is a fake and OpenAlex is never contacted, so these tests need no
PostgreSQL or network.
"""
import unittest
from unittest import mock

import psycopg

import app as backend
from app.api.v1 import openalex_papers
from app.services import openalex_service, paper_count_service, thread_service

PAPERS = {"query": "exoplanet", "source": "OpenAlex", "items": [{"title": "A"}, {"title": "B"}, {"title": "C"}]}


def fake_connection():
    connection = mock.MagicMock()
    cursor = connection.__enter__.return_value.cursor.return_value.__enter__.return_value
    return connection, cursor


class OpenAlexRouteStoresCountTests(unittest.TestCase):
    def setUp(self):
        backend.app.logger.disabled = True
        self.addCleanup(setattr, backend.app.logger, "disabled", False)
        self.client = backend.app.test_client()
        patches = {
            "connect": mock.patch.object(openalex_papers, "get_db_connection", return_value=mock.MagicMock()),
            "thread": mock.patch.object(thread_service, "get_thread", return_value={"id": 3, "title": "Exoplanets"}),
            "search": mock.patch.object(openalex_service, "search_thread_papers", return_value=PAPERS),
            "store": mock.patch.object(paper_count_service, "store_count"),
        }
        for name, patcher in patches.items():
            setattr(self, name, patcher.start())
            self.addCleanup(patcher.stop)

    def test_a_successful_search_stores_the_thread_count(self):
        response = self.client.get("/api/threads/3/openalex-papers")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json(), PAPERS)
        self.store.assert_called_once_with(3, PAPERS)

    def test_a_failed_search_stores_nothing(self):
        self.search.side_effect = openalex_service.OpenAlexUnavailable("down")
        self.assertEqual(self.client.get("/api/threads/3/openalex-papers").status_code, 502)
        self.store.assert_not_called()

    def test_failing_to_store_the_count_does_not_change_the_answer(self):
        self.store.side_effect = psycopg.OperationalError("down")
        response = self.client.get("/api/threads/3/openalex-papers")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json(), PAPERS)

    def test_design_previews_store_nothing(self):
        with mock.patch.dict(openalex_papers.DESIGN_THREADS, {"dark-matter": "Dark Matter"}):
            self.assertEqual(self.client.get("/api/design-threads/dark-matter/openalex-papers").status_code, 200)
        self.store.assert_not_called()


class RefreshCountsTests(unittest.TestCase):
    def test_searches_each_thread_that_needs_a_count_and_stores_it(self):
        connection, cursor = fake_connection()
        cursor.fetchall.return_value = [(3, "Exoplanets"), (207, "Dark Matter")]
        with mock.patch.object(paper_count_service, "get_db_connection", return_value=connection), \
                mock.patch.object(openalex_service, "search_thread_papers", return_value=PAPERS) as search:
            stored = paper_count_service.refresh_openalex_counts()
        self.assertEqual(stored, {3: 3, 207: 3})
        self.assertEqual([call.args[0] for call in search.call_args_list], ["Exoplanets", "Dark Matter"])
        updates = [call.args[1] for call in cursor.execute.call_args_list if "UPDATE research_threads" in call.args[0]]
        self.assertEqual(updates, [(3, 3), (3, 207)])

    def test_a_thread_whose_search_fails_keeps_its_count(self):
        connection, cursor = fake_connection()
        cursor.fetchall.return_value = [(3, "Exoplanets"), (207, "Dark Matter")]
        results = [openalex_service.OpenAlexTimeout("slow"), PAPERS]
        with mock.patch.object(paper_count_service, "get_db_connection", return_value=connection), \
                mock.patch.object(openalex_service, "search_thread_papers", side_effect=results):
            stored = paper_count_service.refresh_openalex_counts()
        self.assertEqual(stored, {207: 3})

    def test_only_threads_without_database_papers_and_no_recent_count_are_searched(self):
        _connection, cursor = fake_connection()
        paper_count_service.threads_needing_count(cursor)
        sql = cursor.execute.call_args.args[0]
        self.assertIn("NOT EXISTS (SELECT 1 FROM thread_papers", sql)
        self.assertIn("openalex_checked_at IS NULL", sql)
        self.assertEqual(cursor.execute.call_args.args[1], (paper_count_service.REFRESH_AFTER_HOURS,))


class ThreadListCountTests(unittest.TestCase):
    def test_the_thread_list_includes_the_stored_count(self):
        connection, cursor = fake_connection()
        cursor.fetchall.return_value = [
            (3, "exoplanets", "Exoplanets", "Astronomy", "Planets.", None, 0, 5, 0, 6),
        ]
        with mock.patch.object(backend, "get_db_connection", return_value=connection):
            response = backend.app.test_client().get("/api/threads")
        thread = response.get_json()[0]
        self.assertEqual((thread["paperCount"], thread["openAlexPaperCount"]), (0, 6))
        self.assertIn("t.openalex_paper_count", cursor.execute.call_args.args[0])


if __name__ == "__main__":
    unittest.main()
