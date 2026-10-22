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
from werkzeug.security import check_password_hash, generate_password_hash

import app as backend
from app.api.v1 import auth
from app.services import auth_service


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


CODE = "042917"
# A fast hash method keeps the tests quick; verification accepts any Werkzeug hash.
CODE_HASH = generate_password_hash(CODE, method="pbkdf2:sha256:1000")
USER_ROW = (1, "ada@example.com", "user")
OWNER_ROW = (2, "owner@example.com", "owner")
SESSION_COOKIE = "astrothread_session"


def stored_code(purpose="login", attempts=0):
    """A login_codes row: id, purpose, code_hash, attempts."""
    return (10, purpose, CODE_HASH, attempts)


class AuthTestCase(unittest.TestCase):
    """Uses a test secret key, a fake database and no real email."""

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
            auth, "get_db_connection", return_value=connection
        )
        patcher.start()
        self.addCleanup(patcher.stop)

        mailer = mock.patch.object(auth, "send_code_email")
        self.send_code_email = mailer.start()
        self.addCleanup(mailer.stop)

    def db_returns(self, *rows):
        """What each cur.fetchone() returns, in order."""
        self.cursor.fetchone.side_effect = list(rows)

    def sign_in_as(self, row):
        with self.client.session_transaction() as session:
            session["user_id"] = row[0]

    def set_stored_user(self, row):
        """What the users table returns for the session lookup."""
        self.cursor.fetchone.side_effect = None
        self.cursor.fetchone.return_value = row

    def executed_sql(self):
        return " ".join(call.args[0] for call in self.cursor.execute.call_args_list)


class RequestCodeTests(AuthTestCase):
    def request_code(self, email="ada@example.com", purpose="login"):
        return self.client.post(
            "/api/auth/request-code", json={"email": email, "purpose": purpose}
        )

    def test_login_code_is_emailed_to_an_existing_account(self):
        self.db_returns((1,), (10,))

        response = self.request_code(email="  Ada@Example.COM ")

        self.assertEqual(response.status_code, 200)
        email, code, _ = self.send_code_email.call_args.args
        self.assertEqual(email, "ada@example.com")
        self.assertRegex(code, r"^\d{6}$")

    def test_code_is_stored_hashed(self):
        self.db_returns((1,), (10,))

        self.request_code()

        code = self.send_code_email.call_args.args[1]
        params = self.cursor.execute.call_args.args[1]
        self.assertNotIn(code, params.values())
        self.assertTrue(check_password_hash(params["code_hash"], code))

    def test_login_with_unknown_email_is_rejected(self):
        self.db_returns(None)

        response = self.request_code(email="nobody@example.com")

        self.assertEqual(response.status_code, 404)
        self.assertIn("No account", response.get_json()["error"])
        self.send_code_email.assert_not_called()

    def test_signup_with_new_email_sends_a_code(self):
        self.db_returns(None, (10,))

        response = self.request_code(email="new@example.com", purpose="signup")

        self.assertEqual(response.status_code, 200)
        self.send_code_email.assert_called_once()

    def test_signup_with_existing_email_is_rejected(self):
        self.db_returns((1,))

        response = self.request_code(purpose="signup")

        self.assertEqual(response.status_code, 409)
        self.send_code_email.assert_not_called()

    def test_new_code_within_a_minute_is_refused(self):
        # The upsert's WHERE clause skips the update, so nothing is returned.
        self.db_returns((1,), None)

        response = self.request_code()

        self.assertEqual(response.status_code, 429)
        self.send_code_email.assert_not_called()

    def test_invalid_input_is_rejected_without_querying(self):
        cases = [
            {"email": "not-an-email"},
            {"email": ""},
            {"email": None},
            {"email": "x" * 250 + "@example.com"},
            {"purpose": "owner"},
        ]
        for body in cases:
            with self.subTest(body=body):
                payload = {"email": "ada@example.com", "purpose": "login", **body}
                response = self.client.post("/api/auth/request-code", json=payload)
                self.assertEqual(response.status_code, 400)
        self.cursor.execute.assert_not_called()

    def test_non_json_body_is_rejected(self):
        response = self.client.post("/api/auth/request-code", data="email=a@b.co")

        self.assertEqual(response.status_code, 400)

    def test_email_failure_returns_json_502(self):
        self.db_returns((1,), (10,))
        self.send_code_email.side_effect = auth.EmailDeliveryError("down")

        response = self.request_code()

        self.assertEqual(response.status_code, 502)
        self.assertIn("error", response.get_json())

    def test_database_error_returns_json_500(self):
        error = psycopg.OperationalError("connection refused")
        with mock.patch.object(auth, "get_db_connection", side_effect=error):
            response = self.request_code()

        self.assertEqual(response.status_code, 500)

    def test_disabled_without_secret_key(self):
        with mock.patch.dict(backend.app.config, {"SECRET_KEY": None}):
            response = self.request_code()

        self.assertEqual(response.status_code, 503)


class VerifyCodeTests(AuthTestCase):
    def verify(self, code=CODE, email="ada@example.com", **extra):
        return self.client.post(
            "/api/auth/verify-code", json={"email": email, "code": code, **extra}
        )

    def test_correct_login_code_signs_in(self):
        self.db_returns(stored_code(), USER_ROW)

        response = self.verify()

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.get_json(),
            {"user": {"id": 1, "email": "ada@example.com", "role": "user"}},
        )
        self.assertIsNotNone(self.client.get_cookie(SESSION_COOKIE))
        self.assertIn("DELETE FROM login_codes", self.executed_sql())

    def test_owner_login_returns_owner_role(self):
        self.db_returns(stored_code(), OWNER_ROW)

        response = self.verify(email="owner@example.com")

        self.assertEqual(response.get_json()["user"]["role"], "owner")

    def test_signup_code_creates_a_user_account(self):
        self.db_returns(stored_code("signup"), (3, "new@example.com", "user"))

        response = self.verify(email="new@example.com", name=" Ada ", role="owner")

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.get_json()["user"]["role"], "user")
        sql, params = self.cursor.execute.call_args.args
        self.assertIn("INSERT INTO users", sql)
        self.assertIn("'user'", sql)
        self.assertEqual(params, ("Ada", "new@example.com"))

    def test_wrong_code_counts_an_attempt(self):
        self.db_returns(stored_code(attempts=1))

        response = self.verify(code="000000")

        self.assertEqual(response.status_code, 401)
        self.assertIn("attempts = attempts + 1", self.executed_sql())
        self.assertIsNone(self.client.get_cookie(SESSION_COOKIE))

    def test_last_wrong_attempt_deletes_the_code(self):
        self.db_returns(stored_code(attempts=auth.MAX_CODE_ATTEMPTS - 1))

        response = self.verify(code="000000")

        self.assertEqual(response.status_code, 429)
        self.assertIn("DELETE FROM login_codes", self.executed_sql())

    def test_expired_or_used_code_is_rejected(self):
        self.db_returns(None)

        response = self.verify()

        self.assertEqual(response.status_code, 400)
        self.assertIn("expired", response.get_json()["error"])

    def test_malformed_input_is_rejected_without_querying(self):
        cases = [
            {"code": "12345"},
            {"code": "12a456"},
            {"code": 42917},
            {"email": "nope"},
            {"name": 42},
            {"name": "x" * (auth.MAX_NAME_LENGTH + 1)},
        ]
        for body in cases:
            with self.subTest(body=body):
                self.assertEqual(self.verify(**body).status_code, 400)
        self.cursor.execute.assert_not_called()

    def test_response_never_contains_the_code_hash(self):
        self.db_returns(stored_code(), USER_ROW)

        body = self.verify().get_data(as_text=True)

        self.assertNotIn(CODE_HASH, body)

    def test_session_cookie_is_http_only(self):
        self.db_returns(stored_code(), USER_ROW)

        cookie = self.verify().headers["Set-Cookie"]

        self.assertIn("HttpOnly", cookie)
        self.assertNotIn("user", self.client.get_cookie(SESSION_COOKIE).value)

    def test_remember_me_sets_a_persistent_cookie(self):
        self.db_returns(stored_code(), USER_ROW)
        self.assertNotIn("Expires", self.verify().headers["Set-Cookie"])

        self.db_returns(stored_code(), USER_ROW)
        self.assertIn("Expires", self.verify(remember=True).headers["Set-Cookie"])

    def test_database_error_returns_json_500(self):
        error = psycopg.OperationalError("connection refused")
        with mock.patch.object(auth, "get_db_connection", side_effect=error):
            response = self.verify()

        self.assertEqual(response.status_code, 500)


class CodeGenerationTests(unittest.TestCase):
    def test_codes_are_six_digits_with_leading_zeros_kept(self):
        with mock.patch.object(auth_service.secrets, "randbelow", return_value=42):
            self.assertEqual(auth_service.generate_code(), "000042")

    def test_codes_print_to_terminal_only_when_enabled(self):
        with backend.app.app_context(), \
                mock.patch.dict(os.environ, {"OTP_PRINT_TO_TERMINAL": "true"}), \
                mock.patch.object(auth_service.urllib.request, "urlopen") as urlopen:
            auth_service.send_code_email("ada@example.com", CODE, 10)
        urlopen.assert_not_called()

    def test_missing_brevo_settings_raise_delivery_error(self):
        env = {"OTP_PRINT_TO_TERMINAL": "", "BREVO_API_KEY": "", "EMAIL_FROM": ""}
        with backend.app.app_context(), mock.patch.dict(os.environ, env):
            with self.assertRaises(auth_service.EmailDeliveryError):
                auth_service.send_code_email("ada@example.com", CODE, 10)

    def test_brevo_request_contains_the_code(self):
        env = {
            "OTP_PRINT_TO_TERMINAL": "",
            "BREVO_API_KEY": "test-key",
            "EMAIL_FROM": "team@example.com",
        }
        with backend.app.app_context(), mock.patch.dict(os.environ, env), \
                mock.patch.object(auth_service.urllib.request, "urlopen") as urlopen:
            auth_service.send_code_email("ada@example.com", CODE, 10)

        request = urlopen.call_args.args[0]
        self.assertEqual(request.full_url, auth_service.BREVO_URL)
        self.assertEqual(request.get_header("Api-key"), "test-key")
        self.assertIn(CODE, request.data.decode("utf-8"))


class SessionTests(AuthTestCase):
    def test_me_requires_login(self):
        response = self.client.get("/api/auth/me")

        self.assertEqual(response.status_code, 401)
        self.cursor.execute.assert_not_called()

    def test_me_returns_the_signed_in_user(self):
        self.sign_in_as(OWNER_ROW)
        self.set_stored_user(OWNER_ROW)

        response = self.client.get("/api/auth/me")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.get_json(),
            {"user": {"id": 2, "email": "owner@example.com", "role": "owner"}},
        )
        self.assertEqual(self.cursor.execute.call_args.args[1], (2,))

    def test_role_is_read_from_the_database_on_each_request(self):
        self.sign_in_as(OWNER_ROW)
        # The account is demoted after signing in.
        self.set_stored_user((2, "owner@example.com", "user"))

        response = self.client.get("/api/auth/me")

        self.assertEqual(response.get_json()["user"]["role"], "user")

    def test_deleted_account_ends_the_session(self):
        self.sign_in_as(USER_ROW)
        self.set_stored_user(None)

        self.assertEqual(self.client.get("/api/auth/me").status_code, 401)

    def test_forged_cookie_is_rejected(self):
        self.client.set_cookie(SESSION_COOKIE, '{"user_id": 2}')

        self.assertEqual(self.client.get("/api/auth/me").status_code, 401)
        self.cursor.execute.assert_not_called()

    def test_cookie_signed_with_another_key_is_rejected(self):
        self.sign_in_as(OWNER_ROW)
        with mock.patch.dict(backend.app.config, {"SECRET_KEY": "other-secret"}):
            response = self.client.get("/api/auth/me")

        self.assertEqual(response.status_code, 401)

    def test_logout_ends_the_session(self):
        self.sign_in_as(USER_ROW)
        self.set_stored_user(USER_ROW)

        response = self.client.post("/api/auth/logout")

        self.assertEqual(response.status_code, 204)
        self.assertEqual(self.client.get("/api/auth/me").status_code, 401)

    def test_session_lookup_error_returns_json_500(self):
        self.sign_in_as(USER_ROW)
        error = psycopg.OperationalError("connection refused")
        with mock.patch.object(auth, "get_db_connection", side_effect=error):
            response = self.client.get("/api/auth/me")

        self.assertEqual(response.status_code, 500)


class OwnerAuthorizationTests(AuthTestCase):
    """login_required(role="owner") protects owner-only views."""

    def call_owner_view(self, user_id=None):
        view = auth.login_required(role="owner")(
            lambda: backend.jsonify({"ok": True})
        )
        with backend.app.test_request_context():
            if user_id is not None:
                auth.session["user_id"] = user_id
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
        self.assertLessEqual({row[0] for row in roles}, set(auth.ROLES))


if __name__ == "__main__":
    unittest.main()
