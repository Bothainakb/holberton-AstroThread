import unittest
from unittest import mock

import psycopg

from app import create_app
from app.routes import recent_searches
from app.services import recent_search_service


class RecentSearchRouteTests(unittest.TestCase):
    def setUp(self):
        app = create_app()
        app.secret_key = "test-secret"
        app.logger.disabled = True
        self.client = app.test_client()
        with self.client.session_transaction() as session:
            session["user_id"] = 5

        self.cur = mock.MagicMock()
        connection = mock.MagicMock()
        connection.__enter__.return_value.cursor.return_value.__enter__.return_value = self.cur

        patches = {
            "connect": mock.patch.object(recent_searches, "get_connection", return_value=connection),
            "get": mock.patch.object(recent_search_service, "get_searches", return_value=["black holes"]),
            "add": mock.patch.object(recent_search_service, "add_search"),
            "remove": mock.patch.object(recent_search_service, "remove_search"),
            "clear": mock.patch.object(recent_search_service, "clear_searches"),
        }
        for name, patcher in patches.items():
            setattr(self, name, patcher.start())
            self.addCleanup(patcher.stop)

    def test_signed_out_users_get_401_everywhere(self):
        with self.client.session_transaction() as session:
            session.clear()

        requests = (
            ("get", "/api/recent-searches", None),
            ("post", "/api/recent-searches", {"query": "moon"}),
            ("delete", "/api/recent-searches/moon", None),
            ("delete", "/api/recent-searches", None),
        )
        for method, url, body in requests:
            with self.subTest(method=method, url=url):
                response = getattr(self.client, method)(url, json=body)
                self.assertEqual(response.status_code, 401)
        self.connect.assert_not_called()

    def test_get_returns_this_users_searches(self):
        response = self.client.get("/api/recent-searches")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json(), {"searches": ["black holes"]})
        self.assertEqual(self.get.call_args.args[1], 5)

    def test_add_saves_the_cleaned_search_and_returns_the_list(self):
        response = self.client.post("/api/recent-searches", json={"query": "  black   holes "})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.add.call_args.args[1:], (5, "black holes"))
        self.assertEqual(response.get_json(), {"searches": ["black holes"]})

    def test_add_rejects_empty_or_long_searches(self):
        for body in ({"query": "   "}, {"query": "x" * 101}, {}, {"query": 7}):
            with self.subTest(body=body):
                response = self.client.post("/api/recent-searches", json=body)
                self.assertEqual(response.status_code, 400)
        self.add.assert_not_called()

    def test_remove_deletes_one_search(self):
        response = self.client.delete("/api/recent-searches/Black%20Holes")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.remove.call_args.args[1:], (5, "Black Holes"))

    def test_clear_deletes_all_of_this_users_searches(self):
        self.get.return_value = []

        response = self.client.delete("/api/recent-searches")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.clear.call_args.args[1], 5)
        self.assertEqual(response.get_json(), {"searches": []})

    def test_database_errors_are_500(self):
        self.get.side_effect = psycopg.OperationalError("down")

        response = self.client.get("/api/recent-searches")

        self.assertEqual(response.status_code, 500)
        self.assertIn("error", response.get_json())


class RecentSearchServiceTests(unittest.TestCase):
    def setUp(self):
        self.cur = mock.MagicMock()

    def test_get_returns_the_newest_five_queries(self):
        self.cur.fetchall.return_value = [("moon",), ("black holes",)]

        searches = recent_search_service.get_searches(self.cur, 5)

        self.assertEqual(searches, ["moon", "black holes"])
        sql, params = self.cur.execute.call_args.args
        self.assertIn("ORDER BY searched_at DESC", sql)
        self.assertEqual(params, (5, 5))

    def test_add_updates_a_repeated_search_and_keeps_only_five(self):
        recent_search_service.add_search(self.cur, 5, "black holes")

        insert_sql, insert_params = self.cur.execute.call_args_list[0].args
        trim_sql, trim_params = self.cur.execute.call_args_list[1].args
        self.assertIn("ON CONFLICT (user_id, LOWER(query))", insert_sql)
        self.assertEqual(insert_params, (5, "black holes"))
        self.assertIn("DELETE FROM recent_searches", trim_sql)
        self.assertEqual(trim_params, (5, 5, 5))

    def test_remove_ignores_letter_case(self):
        recent_search_service.remove_search(self.cur, 5, "Black Holes")

        sql, params = self.cur.execute.call_args.args
        self.assertIn("LOWER(query) = LOWER(%s)", sql)
        self.assertEqual(params, (5, "Black Holes"))

    def test_clear_only_touches_this_user(self):
        recent_search_service.clear_searches(self.cur, 5)

        sql, params = self.cur.execute.call_args.args
        self.assertIn("WHERE user_id = %s", sql)
        self.assertEqual(params, (5,))


if __name__ == "__main__":
    unittest.main()
