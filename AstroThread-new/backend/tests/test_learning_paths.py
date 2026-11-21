import unittest
from unittest import mock

from app import create_app
from app.routes import my_thread
from app.services import home_service, learning_path_service


def paper(paper_id, year, cited, keywords=(), topic="Black Hole Physics"):
    """ورقة وهمية بنفس شكل home_service.row_to_paper."""
    return {
        "id": paper_id, "title": f"Paper {paper_id}", "year": year, "cited_by_count": cited,
        "keywords": list(keywords), "topic": topic,
    }


# ست أوراق من 1972 إلى 2023، تُقسم إلى ثلاث فترات من ورقتين
PAPERS = [
    paper(1, 1972, 900, ["Cygnus X-1", "X-ray binaries"]),
    paper(2, 1975, 300, ["Hawking radiation"]),
    paper(3, 2016, 5000, ["Gravitational waves", "Black Holes"]),
    paper(4, 2019, 4000, ["Event Horizon Telescope", "Gravitational waves"]),
    paper(5, 2022, 800, ["Event Horizon Telescope", "gravitational waves"]),
    paper(6, 2023, 50, [], topic=None),
]


class BuildPathTests(unittest.TestCase):
    def test_three_steps_from_oldest_to_newest(self):
        path = learning_path_service.build_path("Black Holes", PAPERS)

        self.assertEqual([step["level"] for step in path["steps"]], [1, 2, 3])
        self.assertEqual([p["id"] for p in path["steps"][0]["papers"]], ["1", "2"])
        self.assertEqual([p["id"] for p in path["steps"][2]["papers"]], ["5", "6"])
        self.assertIn("1972–1975", path["steps"][0]["why"])

    def test_most_cited_papers_are_chosen_first(self):
        many = [paper(index, 2000 + index, index * 10) for index in range(1, 10)]

        path = learning_path_service.build_path("Dark Matter", many)

        # الفترة الأولى فيها 3 أوراق: نأخذ أكثر ورقتين استشهاداً
        self.assertEqual([p["id"] for p in path["steps"][0]["papers"]], ["3", "2"])

    def test_start_paper_is_the_most_cited_early_paper(self):
        path = learning_path_service.build_path("Black Holes", PAPERS)

        self.assertEqual(path["startPaperId"], "1")
        self.assertIn("cited 900 times", path["startWhy"])

    def test_next_topics_come_from_keywords_without_the_topic_itself(self):
        path = learning_path_service.build_path("Black Holes", PAPERS)

        names = [item["name"] for item in path["next"]]
        self.assertEqual(names[0], "Gravitational waves")  # يظهر في 3 أوراق (بأي حالة أحرف)
        self.assertNotIn("Black Holes", names)
        self.assertLessEqual(len(names), 3)

    def test_field_is_the_most_common_paper_topic(self):
        path = learning_path_service.build_path("Black Holes", PAPERS)
        self.assertEqual(path["field"], "Black Hole Physics")

    def test_overview_is_used_as_the_intro_when_there_is_one(self):
        path = learning_path_service.build_path("Black Holes", PAPERS, overview="AI overview.")
        self.assertEqual(path["intro"], "AI overview.")

    def test_papers_without_a_year_are_left_out(self):
        papers = PAPERS + [paper(7, None, 99999)]

        path = learning_path_service.build_path("Black Holes", papers)

        ids = [p["id"] for step in path["steps"] for p in step["papers"]]
        self.assertNotIn("7", ids)

    def test_too_few_papers_gives_no_path(self):
        self.assertIsNone(learning_path_service.build_path("Moon", PAPERS[:2]))


class GetPathTests(unittest.TestCase):
    def test_topic_never_searched_gives_no_path(self):
        with mock.patch.object(home_service, "find_topic", return_value=None):
            self.assertIsNone(learning_path_service.get_path(mock.MagicMock(), "moon"))

    def test_uses_the_stored_papers_and_overview(self):
        topic = {"id": 7, "slug": "black-holes", "title": "Black Holes", "fresh": True}
        with mock.patch.object(home_service, "find_topic", return_value=topic), \
                mock.patch.object(home_service, "get_topic_papers", return_value=PAPERS) as papers, \
                mock.patch.object(home_service, "get_overview", return_value={"overview": "Hi."}):
            path = learning_path_service.get_path(mock.MagicMock(), "black-holes")

        papers.assert_called_once_with(mock.ANY, 7)
        self.assertEqual(path["topic"], "Black Holes")
        self.assertEqual(path["intro"], "Hi.")


class LearningPathRouteTests(unittest.TestCase):
    def setUp(self):
        app = create_app()
        app.secret_key = "test-secret"
        app.logger.disabled = True
        self.client = app.test_client()
        with self.client.session_transaction() as session:
            session["user_id"] = 5

        patches = {
            "connect": mock.patch.object(my_thread, "get_connection", return_value=mock.MagicMock()),
            "path": mock.patch.object(learning_path_service, "get_path", return_value={"topic": "Black Holes"}),
        }
        for name, patcher in patches.items():
            setattr(self, name, patcher.start())
            self.addCleanup(patcher.stop)

    def test_signed_out_is_401(self):
        with self.client.session_transaction() as session:
            session.clear()

        self.assertEqual(self.client.get("/api/my-thread/paths/Black%20Holes").status_code, 401)
        self.connect.assert_not_called()

    def test_returns_the_path_for_the_topic_slug(self):
        response = self.client.get("/api/my-thread/paths/Black%20Holes")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json(), {"topic": "Black Holes"})
        self.path.assert_called_once_with(mock.ANY, "black-holes")

    def test_unknown_topic_is_404(self):
        self.path.return_value = None

        self.assertEqual(self.client.get("/api/my-thread/paths/Moon").status_code, 404)

    def test_topic_without_letters_is_400(self):
        self.assertEqual(self.client.get("/api/my-thread/paths/%21%21%21").status_code, 400)
        self.path.assert_not_called()


if __name__ == "__main__":
    unittest.main()