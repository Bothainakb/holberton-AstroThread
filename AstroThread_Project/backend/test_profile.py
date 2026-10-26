"""Tests for the User Profile page and bookmarks.

Run from the backend folder:  python -m unittest -v test_profile
The API tests use a fake database. ProfileDatabaseTests runs the real SQL
against the database in backend/.env inside a transaction that is always
rolled back, so nothing is saved; it is skipped if the database is not
reachable or migration 005 has not been applied.
"""
import unittest
from datetime import datetime
from unittest import mock

import psycopg

import app as backend
from app.api.v1 import auth, bookmarks, profile
from app.persistence.database import get_db_connection
from app.services import profile_service as profiles

USER_ROW = (1, "alaa@example.com", "user")
JOINED = datetime(2026, 10, 1, 9, 30)

PROFILE = {
    "user": {"id": 1, "name": "Alaa Aldosari", "email": "alaa@example.com"},
    "plan": dict(profiles.FREE_PLAN),
    "settings": {"email_notifications": False, "language": "en"},
}


class ProfileTestCase(unittest.TestCase):
    """Signed-in user, fake database, profile_service functions mocked."""

    def setUp(self):
        backend.app.logger.disabled = True
        self.addCleanup(setattr, backend.app.logger, "disabled", False)
        config = mock.patch.dict(backend.app.config, {"SECRET_KEY": "test-secret"})
        config.start()
        self.addCleanup(config.stop)
        self.client = backend.app.test_client()

        connection = mock.MagicMock()
        cursor = connection.__enter__.return_value.cursor.return_value
        cursor.__enter__.return_value.fetchone.return_value = USER_ROW
        for module in (auth, profile, bookmarks):
            patcher = mock.patch.object(
                module, "get_db_connection", return_value=connection
            )
            patcher.start()
            self.addCleanup(patcher.stop)

        self.service = {}
        for name in (
            "get_user", "update_user", "get_stats", "count_saved_threads",
            "get_saved_threads", "get_recent_threads", "get_activity",
            "thread_exists", "save_progress", "paper_exists", "discovery_thread",
            "recently_logged", "log_activity", "add_bookmark", "remove_bookmark",
        ):
            patcher = mock.patch.object(profiles, name)
            self.service[name] = patcher.start()
            self.addCleanup(patcher.stop)
        self.service["get_user"].return_value = PROFILE

    def sign_in(self):
        with self.client.session_transaction() as session:
            session["user_id"] = USER_ROW[0]


class LoginRequiredTests(ProfileTestCase):
    def test_every_route_needs_a_session(self):
        requests = [
            ("get", "/api/profile"),
            ("patch", "/api/profile"),
            ("put", "/api/profile/progress/1"),
            ("post", "/api/profile/activity"),
            ("get", "/api/bookmarks"),
            ("post", "/api/bookmarks"),
            ("delete", "/api/bookmarks/1"),
        ]
        for method, url in requests:
            with self.subTest(url=url, method=method):
                response = getattr(self.client, method)(url, json={})
                self.assertEqual(response.status_code, 401)


class GetProfileTests(ProfileTestCase):
    def test_returns_every_profile_section(self):
        self.sign_in()
        self.service["get_stats"].return_value = {"threads_explored": 8}
        self.service["count_saved_threads"].return_value = 5
        self.service["get_saved_threads"].return_value = [{"id": 1}]
        self.service["get_recent_threads"].return_value = [{"id": 2}]
        self.service["get_activity"].return_value = [{"id": 3}]

        response = self.client.get("/api/profile")

        self.assertEqual(response.status_code, 200)
        body = response.get_json()
        self.assertEqual(body["plan"], {"name": "Free", "status": "Active", "ai_assistance": "Basic"})
        self.assertEqual(body["stats"], {"threads_explored": 8})
        self.assertEqual(body["saved_threads"], {"count": 5, "items": [{"id": 1}]})
        self.assertEqual(body["recently_explored"], [{"id": 2}])
        self.assertEqual(body["activity"], [{"id": 3}])

    def test_only_the_signed_in_users_data_is_read(self):
        self.sign_in()
        self.client.get("/api/profile")

        for name in ("get_user", "get_stats", "get_saved_threads", "get_activity"):
            self.assertEqual(self.service[name].call_args.args[1], USER_ROW[0])

    def test_database_error_returns_json_500(self):
        self.sign_in()
        self.service["get_stats"].side_effect = psycopg.OperationalError("down")

        response = self.client.get("/api/profile")

        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.get_json(), {"error": "Unable to load your profile"})


class UpdateProfileTests(ProfileTestCase):
    def patch(self, body):
        self.sign_in()
        return self.client.patch("/api/profile", json=body)

    def test_valid_changes_are_saved_trimmed(self):
        response = self.patch({
            "name": "  Alaa Aldosari ",
            "bio": " Exploring black holes. ",
            "email_notifications": True,
            "language": "en",
        })

        self.assertEqual(response.status_code, 200)
        self.service["update_user"].assert_called_once()
        self.assertEqual(
            self.service["update_user"].call_args.args[2],
            {
                "name": "Alaa Aldosari",
                "bio": "Exploring black holes.",
                "email_notifications": True,
                "language": "en",
            },
        )

    def test_empty_bio_and_avatar_are_cleared(self):
        self.patch({"bio": "  ", "avatar_url": ""})

        self.assertEqual(
            self.service["update_user"].call_args.args[2],
            {"bio": None, "avatar_url": None},
        )

    def test_email_and_role_cannot_be_changed(self):
        for field, value in (("email", "x@example.com"), ("role", "owner")):
            with self.subTest(field=field):
                response = self.patch({field: value})
                self.assertEqual(response.status_code, 400)
        self.service["update_user"].assert_not_called()

    def test_invalid_values_are_rejected(self):
        bad_bodies = [
            {},
            {"name": "   "},
            {"name": "x" * 101},
            {"bio": "x" * 301},
            {"avatar_url": "javascript:alert(1)"},
            {"email_notifications": "yes"},
            {"language": "xx"},
        ]
        for body in bad_bodies:
            with self.subTest(body=body):
                self.assertEqual(self.patch(body).status_code, 400)
        self.service["update_user"].assert_not_called()


class ProgressTests(ProfileTestCase):
    def put(self, body, thread_id=1):
        self.sign_in()
        return self.client.put(f"/api/profile/progress/{thread_id}", json=body)

    def test_first_visit_returns_201(self):
        self.service["thread_exists"].return_value = True
        self.service["save_progress"].return_value = {"started": True}

        response = self.put({"current_stage": 1, "stage_count": 5})

        self.assertEqual(response.status_code, 201)
        self.service["save_progress"].assert_called_once_with(
            mock.ANY, USER_ROW[0], 1, 1, 5, None
        )

    def test_unknown_thread_returns_404(self):
        self.service["thread_exists"].return_value = False

        response = self.put({"current_stage": 1, "stage_count": 5}, thread_id=99)

        self.assertEqual(response.status_code, 404)
        self.service["save_progress"].assert_not_called()

    def test_out_of_range_stages_are_rejected(self):
        bad_bodies = [
            {"current_stage": 1},
            {"current_stage": 0, "stage_count": 5},
            {"current_stage": 6, "stage_count": 5},
            {"current_stage": 1, "stage_count": 51},
            {"current_stage": True, "stage_count": 5},
            {"current_stage": 1, "stage_count": 5, "completed_stage": 6},
        ]
        for body in bad_bodies:
            with self.subTest(body=body):
                self.assertEqual(self.put(body).status_code, 400)
        self.service["save_progress"].assert_not_called()


class ActivityTests(ProfileTestCase):
    def post(self, body):
        self.sign_in()
        return self.client.post("/api/profile/activity", json=body)

    def test_reading_a_paper_is_logged(self):
        self.service["paper_exists"].return_value = True
        self.service["thread_exists"].return_value = True
        self.service["recently_logged"].return_value = False

        response = self.post({"type": "read_paper", "paper_id": 3, "thread_id": 1})

        self.assertEqual(response.status_code, 201)
        self.service["log_activity"].assert_called_once_with(
            mock.ANY, USER_ROW[0], "read_paper", thread_id=1, paper_id=3
        )

    def test_repeat_view_is_not_logged_twice(self):
        self.service["discovery_thread"].return_value = 1
        self.service["recently_logged"].return_value = True

        response = self.post({"type": "viewed_discovery", "event_id": 7})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json(), {"logged": False})
        self.service["log_activity"].assert_not_called()

    def test_unknown_discovery_returns_404(self):
        self.service["discovery_thread"].return_value = None

        response = self.post({"type": "viewed_discovery", "event_id": 7})

        self.assertEqual(response.status_code, 404)

    def test_other_types_are_rejected(self):
        for body in (
            {"type": "started_thread", "thread_id": 1},
            {"type": "read_paper"},
            {"type": "viewed_discovery", "event_id": "7"},
        ):
            with self.subTest(body=body):
                self.assertEqual(self.post(body).status_code, 400)
        self.service["log_activity"].assert_not_called()


class BookmarkTests(ProfileTestCase):
    def test_saving_a_new_thread_returns_201(self):
        self.sign_in()
        self.service["thread_exists"].return_value = True
        self.service["add_bookmark"].return_value = True

        response = self.client.post("/api/bookmarks", json={"thread_id": 2})

        self.assertEqual(response.status_code, 201)
        self.service["add_bookmark"].assert_called_once_with(mock.ANY, USER_ROW[0], 2)

    def test_saving_twice_returns_200(self):
        self.sign_in()
        self.service["thread_exists"].return_value = True
        self.service["add_bookmark"].return_value = False

        response = self.client.post("/api/bookmarks", json={"thread_id": 2})

        self.assertEqual(response.status_code, 200)

    def test_saving_unknown_thread_returns_404(self):
        self.sign_in()
        self.service["thread_exists"].return_value = False

        response = self.client.post("/api/bookmarks", json={"thread_id": 99})

        self.assertEqual(response.status_code, 404)

    def test_removing_returns_204_or_404(self):
        self.sign_in()
        self.service["remove_bookmark"].return_value = True
        self.assertEqual(self.client.delete("/api/bookmarks/2").status_code, 204)

        self.service["remove_bookmark"].return_value = False
        self.assertEqual(self.client.delete("/api/bookmarks/2").status_code, 404)


class InitialsTests(unittest.TestCase):
    def test_initials(self):
        self.assertEqual(profiles.initials("Alaa Aldosari", "a@x.com"), "AA")
        self.assertEqual(profiles.initials("bothaina", "b@x.com"), "B")
        self.assertEqual(profiles.initials(None, "dana@x.com"), "D")


class ProfileDatabaseTests(unittest.TestCase):
    """Runs the real SQL in a transaction that is rolled back afterwards."""

    def setUp(self):
        try:
            self.conn = get_db_connection()
        except (psycopg.Error, RuntimeError) as exc:
            self.skipTest(f"database not available: {exc}")
        self.addCleanup(self.conn.close)
        self.addCleanup(self.conn.rollback)
        self.cur = self.conn.cursor()
        self.cur.execute("SELECT to_regclass('thread_progress');")
        if self.cur.fetchone()[0] is None:
            self.skipTest("run python manage.py migrate first")

        self.cur.execute(
            "INSERT INTO users (name, email) VALUES "
            "('Test Explorer', 'profile-test@example.invalid') RETURNING id;"
        )
        self.user_id = self.cur.fetchone()[0]
        self.cur.execute(
            "INSERT INTO research_threads (title, category, description) "
            "VALUES ('Profile Test Thread', 'Physics', 'Test') RETURNING id;"
        )
        self.thread_id = self.cur.fetchone()[0]
        self.cur.execute(
            "INSERT INTO timeline_events (thread_id, year, title) "
            "VALUES (%s, 2019, 'Test discovery') RETURNING id;",
            (self.thread_id,),
        )
        self.event_id = self.cur.fetchone()[0]
        self.cur.execute(
            "INSERT INTO research_papers (title) VALUES ('Test paper') RETURNING id;"
        )
        self.paper_id = self.cur.fetchone()[0]

    def test_new_user_has_an_empty_profile(self):
        profile = profiles.get_user(self.cur, self.user_id)

        self.assertEqual(profile["user"]["initials"], "TE")
        self.assertEqual(profile["settings"], {"email_notifications": False, "language": "en"})
        stats = profiles.get_stats(self.cur, self.user_id)
        self.assertEqual(stats["threads_explored"], 0)
        self.assertEqual(stats["stages_total"], 0)
        self.assertEqual(profiles.get_activity(self.cur, self.user_id, 10), [])

    def test_update_user(self):
        profiles.update_user(
            self.cur, self.user_id, {"bio": "Hello", "email_notifications": True}
        )
        profile = profiles.get_user(self.cur, self.user_id)

        self.assertEqual(profile["user"]["bio"], "Hello")
        self.assertTrue(profile["settings"]["email_notifications"])

    def test_progress_bookmarks_and_activity_flow(self):
        started = profiles.save_progress(self.cur, self.user_id, self.thread_id, 1, 5)
        self.assertTrue(started["started"])

        moved = profiles.save_progress(self.cur, self.user_id, self.thread_id, 3, 5, 2)
        self.assertEqual(moved["stages_completed"], 2)
        # Going back to stage 1 never undoes completed stages.
        back = profiles.save_progress(self.cur, self.user_id, self.thread_id, 1, 5, 1)
        self.assertEqual(back["stages_completed"], 2)

        self.assertTrue(profiles.add_bookmark(self.cur, self.user_id, self.thread_id))
        self.assertFalse(profiles.add_bookmark(self.cur, self.user_id, self.thread_id))
        profiles.log_activity(self.cur, self.user_id, "read_paper", paper_id=self.paper_id)
        profiles.log_activity(
            self.cur, self.user_id, "viewed_discovery",
            thread_id=self.thread_id, event_id=self.event_id,
        )
        self.assertTrue(profiles.recently_logged(
            self.cur, self.user_id, "read_paper", "paper_id", self.paper_id
        ))

        stats = profiles.get_stats(self.cur, self.user_id)
        self.assertEqual(stats["threads_explored"], 1)
        self.assertEqual(stats["papers_read"], 1)
        self.assertEqual(stats["discoveries_viewed_this_week"], 1)
        self.assertEqual((stats["stages_completed"], stats["stages_total"]), (2, 5))

        saved = profiles.get_saved_threads(self.cur, self.user_id, 3)
        self.assertEqual(saved[0]["progress"], {"current_stage": 1, "stage_count": 5})
        recent = profiles.get_recent_threads(self.cur, self.user_id, 3)
        self.assertEqual(recent[0]["title"], "Profile Test Thread")

        types = [item["type"] for item in profiles.get_activity(self.cur, self.user_id, 10)]
        self.assertEqual(
            sorted(types),
            ["completed_stage", "read_paper", "started_thread", "viewed_discovery"],
        )

        self.assertTrue(profiles.remove_bookmark(self.cur, self.user_id, self.thread_id))
        self.assertFalse(profiles.remove_bookmark(self.cur, self.user_id, self.thread_id))


if __name__ == "__main__":
    unittest.main()
