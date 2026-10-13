"""Tests for the AstroThread API.

Run from the backend folder:  python -m unittest -v
The integration test reads (never writes) the real database configured in
backend/.env and is skipped if the database is not reachable.
"""
import os
import re
import unittest
from unittest import mock

import psycopg

import app as backend


class HealthTests(unittest.TestCase):
    def setUp(self):
        self.client = backend.app.test_client()

    def test_health_returns_ok(self):
        response = self.client.get("/api/health")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json(), {"status": "ok"})


class ThreadsErrorTests(unittest.TestCase):
    def setUp(self):
        self.client = backend.app.test_client()
        backend.app.logger.disabled = True

    def tearDown(self):
        backend.app.logger.disabled = False

    def test_failed_authentication_returns_json_500(self):
        error = psycopg.OperationalError("password authentication failed")
        with mock.patch.object(backend, "get_db_connection", side_effect=error):
            response = self.client.get("/api/threads")

        self.assertEqual(response.status_code, 500)
        self.assertEqual(
            response.get_json(), {"error": "Unable to retrieve research threads"}
        )

    def test_missing_password_returns_json_500(self):
        with mock.patch.dict(os.environ, {"DB_PASSWORD": ""}):
            response = self.client.get("/api/threads")

        self.assertEqual(response.status_code, 500)
        self.assertEqual(
            response.get_json(), {"error": "Unable to retrieve research threads"}
        )

    def test_failed_search_returns_json_500(self):
        error = psycopg.OperationalError("connection refused")
        with mock.patch.object(backend, "get_db_connection", side_effect=error):
            response = self.client.get("/api/threads?q=black")

        self.assertEqual(response.status_code, 500)
        self.assertEqual(
            response.get_json(), {"error": "Unable to retrieve research threads"}
        )


class ThreadsQueryTests(unittest.TestCase):
    """Checks the SQL sent for searches, using a fake connection."""

    def setUp(self):
        self.client = backend.app.test_client()
        connection = mock.MagicMock()
        self.cursor = connection.__enter__.return_value.cursor.return_value
        self.cursor = self.cursor.__enter__.return_value
        self.cursor.fetchall.return_value = [
            (1, "Black Holes", "Astrophysics", "Explore black holes."),
        ]
        patcher = mock.patch.object(
            backend, "get_db_connection", return_value=connection
        )
        patcher.start()
        self.addCleanup(patcher.stop)

    def test_rows_are_returned_in_api_format(self):
        response = self.client.get("/api/threads")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.get_json(),
            [
                {
                    "id": 1,
                    "title": "Black Holes",
                    "category": "Astrophysics",
                    "description": "Explore black holes.",
                }
            ],
        )

    def test_search_passes_escaped_pattern_as_parameter(self):
        self.client.get("/api/threads", query_string={"q": "  C++ (2.0)  "})

        sql, params = self.cursor.execute.call_args.args
        self.assertIn("~*", sql)
        self.assertEqual(params, {"pattern": "\\mC\\+\\+ \\(2\\.0\\)"})

    def test_too_long_search_is_rejected_without_querying(self):
        query = "a" * (backend.MAX_QUERY_LENGTH + 1)
        response = self.client.get("/api/threads", query_string={"q": query})

        self.assertEqual(response.status_code, 400)
        self.assertIn("error", response.get_json())
        self.cursor.execute.assert_not_called()

    def test_longest_allowed_search_is_accepted(self):
        query = "a" * backend.MAX_QUERY_LENGTH
        response = self.client.get("/api/threads", query_string={"q": query})

        self.assertEqual(response.status_code, 200)

    def test_blank_search_lists_all_threads(self):
        self.client.get("/api/threads", query_string={"q": "   "})

        self.assertEqual(len(self.cursor.execute.call_args.args), 1)
        self.assertNotIn("WHERE", self.cursor.execute.call_args.args[0])


class WordStartPatternTests(unittest.TestCase):
    def test_words_are_anchored_to_the_start_of_a_word(self):
        self.assertEqual(
            backend.word_start_pattern("Black Holes"), "\\mBlack Holes"
        )

    def test_regex_characters_are_escaped(self):
        self.assertEqual(
            backend.word_start_pattern("a.b*c\\d"), "\\ma\\.b\\*c\\\\d"
        )

    def test_query_starting_with_symbol_is_not_anchored(self):
        self.assertEqual(backend.word_start_pattern("(x"), "\\(x")


def matches_word_start(text, query):
    """Python version of the search rule, used to check the SQL results."""
    prefix = r"(?<!\w)" if query[:1].isalnum() or query[:1] == "_" else ""
    return re.search(prefix + re.escape(query), text, re.IGNORECASE) is not None


class ThreadsIntegrationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        try:
            backend.get_db_connection().close()
        except (psycopg.Error, RuntimeError) as error:
            raise unittest.SkipTest(f"Database not reachable: {error}")

    def test_threads_returns_records_from_database(self):
        response = backend.app.test_client().get("/api/threads")

        self.assertEqual(response.status_code, 200)
        threads = response.get_json()
        self.assertIsInstance(threads, list)
        for thread in threads:
            self.assertEqual(
                set(thread), {"id", "title", "category", "description"}
            )
            self.assertIsInstance(thread["id"], int)
        ids = [thread["id"] for thread in threads]
        self.assertEqual(ids, sorted(ids))

    def search(self, query):
        response = backend.app.test_client().get(
            "/api/threads", query_string={"q": query}
        )
        self.assertEqual(response.status_code, 200)
        return response.get_json()

    def expected_matches(self, query):
        """What a search should return, computed from the unfiltered list."""
        threads = backend.app.test_client().get("/api/threads").get_json()
        needle = query.strip()
        return [
            thread
            for thread in threads
            if any(
                matches_word_start(thread[field], needle)
                for field in ("title", "category", "description")
            )
        ]

    def titles(self, query):
        return [thread["title"] for thread in self.search(query)]

    def test_physics_matches_whole_word_not_astrophysics(self):
        # Black Holes has the category "Astrophysics", which must not match.
        titles = self.titles("physics")
        self.assertIn("Gravitational Waves", titles)
        self.assertNotIn("Black Holes", titles)
        self.assertEqual(self.search("PHYSICS"), self.search("physics"))

    def test_partial_word_matches_while_typing(self):
        self.assertIn("Black Holes", self.titles("blac"))

    def test_dark_matter_has_no_results(self):
        self.assertEqual(self.search("Dark Matter"), [])

    def test_search_matches_title_category_and_description(self):
        threads = backend.app.test_client().get("/api/threads").get_json()
        if not threads:
            self.skipTest("research_threads is empty")
        first = threads[0]
        # A word from each field, upper-cased to check case-insensitivity.
        for field in ("title", "category", "description"):
            query = first[field].split()[0].upper()
            with self.subTest(field=field, query=query):
                results = self.search(query)
                self.assertIn(first, results)
                self.assertEqual(results, self.expected_matches(query))

    def test_search_without_matches_returns_empty_list(self):
        self.assertEqual(self.search("zzqx-no-such-thread"), [])

    def test_search_treats_special_characters_literally(self):
        for query in ("%", "_", ".", "*", "(", "\\"):
            with self.subTest(query=query):
                self.assertEqual(self.search(query), self.expected_matches(query))

    def test_blank_search_returns_all_threads(self):
        all_threads = backend.app.test_client().get("/api/threads").get_json()
        self.assertEqual(self.search("   "), all_threads)


if __name__ == "__main__":
    unittest.main()
