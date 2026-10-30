"""Tests for the AstroThread API.

Run from the backend folder:  python -m unittest -v
The integration test reads (never writes) the real database configured in
backend/.env and is skipped if the database is not reachable.
"""
import os
import re
import unittest
from datetime import datetime
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
            (
                1, "black-holes", "Black Holes", "Astrophysics",
                "Explore black holes.", datetime(2026, 10, 12, 19, 16), 3, 5, 2,
            ),
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
                    "slug": "black-holes",
                    "title": "Black Holes",
                    "category": "Astrophysics",
                    "description": "Explore black holes.",
                    "updatedAt": "2026-10-12T19:16:00",
                    "paperCount": 3,
                    "completedStages": 2,
                    "totalStages": 5,
                }
            ],
        )

    def test_search_passes_escaped_pattern_as_parameter(self):
        self.client.get("/api/threads", query_string={"q": "  C++ (2.0)  "})

        sql, params = self.cursor.execute.call_args.args
        self.assertIn("~*", sql)
        self.assertEqual(params, {"user_id": None, "pattern": "\\mC\\+\\+ \\(2\\.0\\)"})

    def test_visitors_get_no_progress_and_users_get_their_own(self):
        self.client.get("/api/threads")
        self.assertEqual(self.cursor.execute.call_args.args[1], {"user_id": None})

        with mock.patch.dict(backend.app.config, {"SECRET_KEY": "test-secret"}):
            with self.client.session_transaction() as saved:
                saved["user_id"] = 7
            self.client.get("/api/threads")

        sql, params = self.cursor.execute.call_args.args
        self.assertEqual(params, {"user_id": 7})
        self.assertIn("thread_progress", sql)

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

        sql, params = self.cursor.execute.call_args.args
        self.assertNotIn("~*", sql)
        self.assertNotIn("pattern", params)


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
                set(thread),
                {
                    "id", "slug", "title", "category", "description",
                    "updatedAt", "paperCount", "completedStages", "totalStages",
                },
            )
            self.assertIsInstance(thread["id"], int)
        # Newest first; threads updated at the same time keep id order.
        order = [(thread["updatedAt"] or "", -thread["id"]) for thread in threads]
        self.assertEqual(order, sorted(order, reverse=True))

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
        self.assertNotIn("Black Holes", self.titles("physics"))
        self.assertIn("Black Holes", self.titles("astrophysics"))
        self.assertEqual(self.search("ASTROPHYSICS"), self.search("astrophysics"))

    def test_partial_word_matches_while_typing(self):
        self.assertIn("Black Holes", self.titles("blac"))

    def test_dark_matter_is_found(self):
        self.assertEqual(self.titles("Dark Matter"), ["Dark Matter"])

    def test_removed_topics_are_not_listed(self):
        titles = self.titles("")
        for removed in ("Gravitational Waves", "Neutron Stars", "The Expanding Universe"):
            self.assertNotIn(removed, titles)

    def test_every_thread_has_five_stages(self):
        for thread in self.search(""):
            self.assertEqual(thread["totalStages"], 5, thread["title"])
            self.assertTrue(0 <= thread["completedStages"] <= 5)

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


PASSWORD = "correct horse battery"
# A fast hash method keeps the tests quick; login accepts any Werkzeug hash.
PASSWORD_HASH = backend.generate_password_hash(PASSWORD, method="pbkdf2:sha256:1000")
USER_ROW = (1, "ada@example.com", "user", PASSWORD_HASH)
OWNER_ROW = (2, "owner@example.com", "owner", PASSWORD_HASH)
SESSION_COOKIE = "astrothread_session"


class AuthTestCase(unittest.TestCase):
    """Uses a test secret key and a fake database connection."""

    def setUp(self):
        backend.app.logger.disabled = True
        self.addCleanup(setattr, backend.app.logger, "disabled", False)
        config = mock.patch.dict(backend.app.config, {"SECRET_KEY": "test-secret"})
        config.start()
        self.addCleanup(config.stop)

        self.client = backend.app.test_client()
        connection = mock.MagicMock()
        self.cursor = connection.__enter__.return_value.cursor.return_value
        self.cursor = self.cursor.__enter__.return_value
        self.cursor.fetchone.return_value = None
        patcher = mock.patch.object(
            backend, "get_db_connection", return_value=connection
        )
        patcher.start()
        self.addCleanup(patcher.stop)

    def login(self, row, password=PASSWORD, **extra):
        """Signs in as the account in `row` (the database returns that row)."""
        self.cursor.fetchone.return_value = row
        body = {"email": row[1] if row else "nobody@example.com", "password": password}
        return self.client.post("/api/auth/login", json={**body, **extra})

    def set_stored_user(self, row):
        """What the users table returns for the session lookup."""
        self.cursor.fetchone.return_value = row[:3] if row else None


class LoginTests(AuthTestCase):
    def test_user_login_returns_verified_user(self):
        response = self.login(USER_ROW)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.get_json(),
            {"user": {"id": 1, "email": "ada@example.com", "role": "user"}},
        )
        self.assertIsNotNone(self.client.get_cookie(SESSION_COOKIE))

    def test_owner_login_returns_owner_role(self):
        response = self.login(OWNER_ROW)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["user"]["role"], "owner")

    def test_role_sent_by_client_is_ignored(self):
        response = self.login(USER_ROW, role="owner")

        self.assertEqual(response.get_json()["user"]["role"], "user")

    def test_response_never_contains_password_data(self):
        body = self.login(USER_ROW).get_data(as_text=True)

        self.assertNotIn("password", body)
        self.assertNotIn(PASSWORD_HASH, body)

    def test_session_cookie_is_http_only_and_holds_no_role(self):
        header = self.login(OWNER_ROW).headers["Set-Cookie"]

        self.assertIn("HttpOnly", header)
        self.assertIn("SameSite=Lax", header)
        with self.client.session_transaction() as session:
            self.assertEqual(dict(session), {"_permanent": False, "user_id": 2})

    def test_email_is_matched_case_insensitively(self):
        self.cursor.fetchone.return_value = USER_ROW
        self.client.post(
            "/api/auth/login",
            json={"email": "  Ada@Example.COM ", "password": PASSWORD},
        )

        sql, params = self.cursor.execute.call_args.args
        self.assertIn("lower(email) = %s", sql)
        self.assertEqual(params, ("ada@example.com",))

    def test_wrong_password_is_rejected(self):
        response = self.login(USER_ROW, password="wrong password")

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.get_json(), {"error": backend.INVALID_CREDENTIALS})
        self.assertIsNone(self.client.get_cookie(SESSION_COOKIE))

    def test_unknown_email_gets_the_same_response_as_wrong_password(self):
        with mock.patch.object(
            backend, "check_password_hash", wraps=backend.check_password_hash
        ) as check:
            response = self.login(None)

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.get_json(), {"error": backend.INVALID_CREDENTIALS})
        # A hash is still checked, so the timing does not reveal the miss.
        check.assert_called_once_with(backend.DUMMY_PASSWORD_HASH, PASSWORD)
        self.assertIsNone(self.client.get_cookie(SESSION_COOKIE))

    def test_missing_or_invalid_fields_are_rejected_without_querying(self):
        bodies = [
            {},
            {"email": "ada@example.com"},
            {"password": PASSWORD},
            {"email": "   ", "password": PASSWORD},
            {"email": "ada@example.com", "password": ""},
            {"email": ["ada@example.com"], "password": PASSWORD},
            {"email": "ada@example.com", "password": 12345678},
        ]
        for body in bodies:
            with self.subTest(body=body):
                response = self.client.post("/api/auth/login", json=body)
                self.assertEqual(response.status_code, 400)
                self.assertEqual(
                    response.get_json(), {"error": "Email and password are required"}
                )
        self.cursor.execute.assert_not_called()

    def test_non_json_body_is_rejected(self):
        for kwargs in (
            {"data": "email=ada@example.com&password=x"},
            {"json": ["ada@example.com", PASSWORD]},
        ):
            with self.subTest(kwargs=kwargs):
                response = self.client.post("/api/auth/login", **kwargs)
                self.assertEqual(response.status_code, 400)
        self.cursor.execute.assert_not_called()

    def test_too_long_fields_are_rejected(self):
        response = self.client.post(
            "/api/auth/login",
            json={"email": "a" * 300 + "@example.com", "password": PASSWORD},
        )

        self.assertEqual(response.status_code, 400)
        self.cursor.execute.assert_not_called()

    def test_database_error_returns_json_500(self):
        error = psycopg.OperationalError("connection refused")
        with mock.patch.object(backend, "get_db_connection", side_effect=error):
            response = self.login(USER_ROW)

        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.get_json(), {"error": "Unable to sign in right now"})

    def test_login_is_disabled_without_secret_key(self):
        with mock.patch.dict(backend.app.config, {"SECRET_KEY": None}):
            response = self.login(USER_ROW)

        self.assertEqual(response.status_code, 503)
        self.cursor.execute.assert_not_called()

    def test_remember_me_sets_a_persistent_cookie(self):
        self.login(USER_ROW)
        self.assertIsNone(self.client.get_cookie(SESSION_COOKIE).expires)

        self.login(USER_ROW, remember=True)
        self.assertIsNotNone(self.client.get_cookie(SESSION_COOKIE).expires)


class SessionTests(AuthTestCase):
    def test_me_requires_login(self):
        response = self.client.get("/api/auth/me")

        self.assertEqual(response.status_code, 401)
        self.cursor.execute.assert_not_called()

    def test_me_returns_the_signed_in_user(self):
        self.login(OWNER_ROW)
        self.set_stored_user(OWNER_ROW)

        response = self.client.get("/api/auth/me")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.get_json(),
            {"user": {"id": 2, "email": "owner@example.com", "role": "owner"}},
        )
        self.assertEqual(self.cursor.execute.call_args.args[1], (2,))

    def test_role_is_read_from_the_database_on_each_request(self):
        self.login(OWNER_ROW)
        # The account is demoted after signing in.
        self.set_stored_user((2, "owner@example.com", "user"))

        response = self.client.get("/api/auth/me")

        self.assertEqual(response.get_json()["user"]["role"], "user")

    def test_deleted_account_ends_the_session(self):
        self.login(USER_ROW)
        self.set_stored_user(None)

        self.assertEqual(self.client.get("/api/auth/me").status_code, 401)

    def test_forged_cookie_is_rejected(self):
        self.client.set_cookie(SESSION_COOKIE, '{"user_id": 2}')

        self.assertEqual(self.client.get("/api/auth/me").status_code, 401)
        self.cursor.execute.assert_not_called()

    def test_cookie_signed_with_another_key_is_rejected(self):
        self.login(OWNER_ROW)
        with mock.patch.dict(backend.app.config, {"SECRET_KEY": "other-secret"}):
            response = self.client.get("/api/auth/me")

        self.assertEqual(response.status_code, 401)

    def test_logout_ends_the_session(self):
        self.login(USER_ROW)
        self.set_stored_user(USER_ROW)

        response = self.client.post("/api/auth/logout")

        self.assertEqual(response.status_code, 204)
        self.assertEqual(self.client.get("/api/auth/me").status_code, 401)

    def test_session_lookup_error_returns_json_500(self):
        self.login(USER_ROW)
        error = psycopg.OperationalError("connection refused")
        with mock.patch.object(backend, "get_db_connection", side_effect=error):
            response = self.client.get("/api/auth/me")

        self.assertEqual(response.status_code, 500)


class OwnerAuthorizationTests(AuthTestCase):
    """login_required(role="owner") protects owner-only views."""

    def call_owner_view(self, user_id=None):
        view = backend.login_required(role="owner")(
            lambda: backend.jsonify({"ok": True})
        )
        with backend.app.test_request_context():
            if user_id is not None:
                backend.session["user_id"] = user_id
            return backend.app.make_response(view())

    def test_anonymous_request_is_unauthorized(self):
        self.assertEqual(self.call_owner_view().status_code, 401)

    def test_user_account_is_forbidden(self):
        self.set_stored_user(USER_ROW)

        self.assertEqual(self.call_owner_view(user_id=1).status_code, 403)

    def test_owner_account_is_allowed(self):
        self.set_stored_user(OWNER_ROW)

        response = self.call_owner_view(user_id=2)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json(), {"ok": True})

    def test_owner_session_of_demoted_account_is_forbidden(self):
        # The session says nothing about the role; the stored role decides.
        self.set_stored_user((2, "owner@example.com", "user"))

        self.assertEqual(self.call_owner_view(user_id=2).status_code, 403)

    def test_non_integer_user_id_is_unauthorized(self):
        self.assertEqual(self.call_owner_view(user_id="2").status_code, 401)
        self.cursor.execute.assert_not_called()


NEW_ACCOUNT = {"name": "Ada", "email": "ada@example.com", "password": PASSWORD}


class RegisterTests(AuthTestCase):
    def setUp(self):
        super().setUp()
        self.cursor.fetchone.return_value = (1, "ada@example.com", "user")

    def register(self, **fields):
        return self.client.post("/api/auth/register", json={**NEW_ACCOUNT, **fields})

    def test_new_account_is_created_and_signed_in(self):
        response = self.register()

        self.assertEqual(response.status_code, 201)
        self.assertEqual(
            response.get_json(),
            {"user": {"id": 1, "email": "ada@example.com", "role": "user"}},
        )
        header = response.headers["Set-Cookie"]
        self.assertIn("HttpOnly", header)
        self.assertIn("SameSite=Lax", header)
        with self.client.session_transaction() as session:
            self.assertEqual(dict(session), {"_permanent": False, "user_id": 1})

    def test_password_is_stored_as_a_hash(self):
        self.register()

        sql, params = self.cursor.execute.call_args.args
        self.assertIn("INSERT INTO users", sql)
        name, email, password_hash = params
        self.assertEqual((name, email), ("Ada", "ada@example.com"))
        self.assertNotEqual(password_hash, PASSWORD)
        self.assertNotIn(PASSWORD, sql)
        self.assertTrue(backend.check_password_hash(password_hash, PASSWORD))

    def test_role_is_always_user(self):
        self.register(role="owner")

        sql, params = self.cursor.execute.call_args.args
        self.assertIn("'user'", sql)
        self.assertNotIn("owner", params)

    def test_name_and_email_are_normalized(self):
        self.register(name="  Ada Lovelace ", email="  Ada@Example.COM ")

        _, params = self.cursor.execute.call_args.args
        self.assertEqual(params[:2], ("Ada Lovelace", "ada@example.com"))

    def test_duplicate_email_is_rejected(self):
        # ON CONFLICT DO NOTHING returns no row for an existing email.
        self.cursor.fetchone.return_value = None

        response = self.register()

        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.get_json(), {"error": backend.EMAIL_TAKEN})
        self.assertIsNone(self.client.get_cookie(SESSION_COOKIE))

    def test_invalid_input_is_rejected_without_querying(self):
        cases = [
            {"name": ""},
            {"name": "   "},
            {"name": None},
            {"name": "a" * (backend.MAX_NAME_LENGTH + 1)},
            {"email": ""},
            {"email": "not-an-email"},
            {"email": "a@b"},
            {"email": "a b@example.com"},
            {"email": "a" * 250 + "@example.com"},
            {"email": ["ada@example.com"]},
            {"password": ""},
            {"password": "short"},
            {"password": "x" * (backend.MAX_PASSWORD_LENGTH + 1)},
            {"password": 12345678},
        ]
        for fields in cases:
            with self.subTest(fields=fields):
                response = self.register(**fields)
                self.assertEqual(response.status_code, 400)
                self.assertIn("error", response.get_json())
        self.cursor.execute.assert_not_called()
        self.assertIsNone(self.client.get_cookie(SESSION_COOKIE))

    def test_non_json_body_is_rejected(self):
        # A cross-site HTML form can only send form or text bodies.
        for kwargs in (
            {"data": "name=Ada&email=ada@example.com&password=x"},
            {"data": '{"name": "Ada"}', "content_type": "text/plain"},
            {"json": ["Ada", "ada@example.com", PASSWORD]},
        ):
            with self.subTest(kwargs=kwargs):
                response = self.client.post("/api/auth/register", **kwargs)
                self.assertEqual(response.status_code, 400)
        self.cursor.execute.assert_not_called()

    def test_database_error_returns_json_500(self):
        error = psycopg.OperationalError("connection refused")
        with mock.patch.object(backend, "get_db_connection", side_effect=error):
            response = self.register()

        self.assertEqual(response.status_code, 500)
        self.assertEqual(
            response.get_json(), {"error": "Unable to create your account right now"}
        )

    def test_register_is_disabled_without_secret_key(self):
        with mock.patch.dict(backend.app.config, {"SECRET_KEY": None}):
            response = self.register()

        self.assertEqual(response.status_code, 503)
        self.cursor.execute.assert_not_called()

    def test_registering_replaces_an_existing_session(self):
        self.login(OWNER_ROW)
        self.cursor.fetchone.return_value = (3, "new@example.com", "user")

        self.register(email="new@example.com")

        with self.client.session_transaction() as session:
            self.assertEqual(session["user_id"], 3)

    def test_me_and_logout_work_after_registering(self):
        self.register()
        self.set_stored_user((1, "ada@example.com", "user"))

        me = self.client.get("/api/auth/me")
        self.assertEqual(me.status_code, 200)
        self.assertEqual(me.get_json()["user"]["role"], "user")

        self.assertEqual(self.client.post("/api/auth/logout").status_code, 204)
        self.assertEqual(self.client.get("/api/auth/me").status_code, 401)


class RollbackConnection:
    """One real connection whose work is rolled back, so tests leave no rows."""

    def __init__(self, conn):
        self.conn = conn

    def __call__(self):
        return self

    def __enter__(self):
        return self.conn

    def __exit__(self, *exc):
        return False


class RegisterIntegrationTests(unittest.TestCase):
    """Signs up, in and out against the real users table, then rolls back."""

    def setUp(self):
        try:
            conn = backend.get_db_connection()
        except (psycopg.Error, RuntimeError) as error:
            self.skipTest(f"Database not reachable: {error}")
        self.addCleanup(conn.close)
        self.addCleanup(conn.rollback)
        self.conn = conn

        config = mock.patch.dict(backend.app.config, {"SECRET_KEY": "test-secret"})
        config.start()
        self.addCleanup(config.stop)
        patcher = mock.patch.object(
            backend, "get_db_connection", RollbackConnection(conn)
        )
        patcher.start()
        self.addCleanup(patcher.stop)
        self.client = backend.app.test_client()
        self.email = "signup-test@astrothread.invalid"

    def test_sign_up_then_me_logout_and_login(self):
        # The extra role field must be ignored: public sign-up only makes users.
        response = self.client.post(
            "/api/auth/register",
            json={
                "name": "Signup Test",
                "email": self.email,
                "password": PASSWORD,
                "role": "owner",
            },
        )
        self.assertEqual(response.status_code, 201, response.get_json())
        user = response.get_json()["user"]
        self.assertEqual((user["email"], user["role"]), (self.email, "user"))

        name, role, password_hash = self.conn.execute(
            "SELECT name, role, password_hash FROM users WHERE id = %s;",
            (user["id"],),
        ).fetchone()
        self.assertEqual((name, role), ("Signup Test", "user"))
        self.assertNotEqual(password_hash, PASSWORD)
        self.assertTrue(backend.check_password_hash(password_hash, PASSWORD))

        self.assertEqual(self.client.get("/api/auth/me").get_json(), {"user": user})

        duplicate = self.client.post(
            "/api/auth/register",
            json={"name": "Again", "email": self.email.upper(), "password": PASSWORD},
        )
        self.assertEqual(duplicate.status_code, 409)

        self.assertEqual(self.client.post("/api/auth/logout").status_code, 204)
        self.assertEqual(self.client.get("/api/auth/me").status_code, 401)

        login = self.client.post(
            "/api/auth/login", json={"email": self.email, "password": PASSWORD}
        )
        self.assertEqual(login.status_code, 200)
        self.assertEqual(self.client.get("/api/auth/me").get_json(), {"user": user})


class UsersTableIntegrationTests(unittest.TestCase):
    """Checks the migrated `users` table (read-only)."""

    @classmethod
    def setUpClass(cls):
        try:
            with backend.get_db_connection() as conn:
                cls.columns = {
                    row[0]
                    for row in conn.execute(
                        """
                        SELECT column_name FROM information_schema.columns
                        WHERE table_schema = 'public' AND table_name = 'users';
                        """
                    )
                }
        except (psycopg.Error, RuntimeError) as error:
            raise unittest.SkipTest(f"Database not reachable: {error}")
        if not cls.columns:
            raise unittest.SkipTest("users table missing; run python manage.py migrate")

    def test_users_table_has_expected_columns(self):
        self.assertEqual(
            self.columns,
            {"id", "name", "email", "password_hash", "role", "created_at", "updated_at"},
        )

    def test_roles_are_limited_to_user_and_owner(self):
        with backend.get_db_connection() as conn:
            roles = conn.execute(
                "SELECT DISTINCT role FROM users;"
            ).fetchall()
        self.assertLessEqual({row[0] for row in roles}, set(backend.ROLES))


if __name__ == "__main__":
    unittest.main()
