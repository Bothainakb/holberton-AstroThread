
import json
import socket
import unittest
from io import BytesIO
from unittest import mock
from urllib.error import HTTPError, URLError

import psycopg

from app import create_app
from app.routes import home
from app.services import home_service, openalex, paper_service

FOUND = [{
    "openalex_id": "https://openalex.org/W1",
    "title": "Gravitational Collapse and Space-Time Singularities",
    "authors": "Roger Penrose",
    "author_list": ["Roger Penrose"],
    "publication_year": 1965,
    "abstract": None,
    "url": "https://doi.org/10.1103/PhysRevLett.14.57",
    "cited_by_count": 4000,
    "venue": "Physical Review Letters",
    "topic": "Black Holes and Theoretical Physics",
    "keywords": ["Singularity"],
}]
STORED = [{
    "id": 7,
    "title": "Gravitational Collapse and Space-Time Singularities",
    "authors": "Roger Penrose",
    "year": 1965,
    "abstract": None,
    "url": "https://doi.org/10.1103/PhysRevLett.14.57",
    "cited_by_count": 4000,
    "venue": "Physical Review Letters",
    "topic": "Black Holes and Theoretical Physics",
    "keywords": ["Singularity"],
    "author_list": ["Roger Penrose"],
}]
RESULT = {
    "id": "7",
    "title": "Gravitational Collapse and Space-Time Singularities",
    "authors": ["Roger Penrose"],
    "year": 1965,
    "venue": "Physical Review Letters",
    "topic": "Black Holes and Theoretical Physics",
    "paperType": "theoretical",
    "keywords": ["Singularity"],
    "abstract": "",
    "url": "https://doi.org/10.1103/PhysRevLett.14.57",
    "citedByCount": 4000,
}
TOPIC = {"id": 1, "slug": "black-holes", "title": "Black Holes", "fresh": False}


class HomeRouteTests(unittest.TestCase):
    def setUp(self):
        app = create_app()
        app.logger.disabled = True
        self.client = app.test_client()

        patches = {
            "connect": mock.patch.object(home, "get_connection", return_value=mock.MagicMock()),
            "popular": mock.patch.object(home_service, "get_popular_topics", return_value=[]),
            "find": mock.patch.object(home_service, "find_topic", return_value=None),
            "stored": mock.patch.object(home_service, "get_topic_papers", return_value=STORED),
            "record": mock.patch.object(home_service, "record_search", return_value=1),
            "save": mock.patch.object(home_service, "save_papers"),
            "openalex": mock.patch.object(openalex, "search_papers", return_value=FOUND),
        }
        for name, patcher in patches.items():
            setattr(self, name, patcher.start())
            self.addCleanup(patcher.stop)

    def test_health(self):
        response = self.client.get("/api/health")
        self.assertEqual(response.get_json(), {"status": "ok"})

    def test_popular_is_empty_until_people_search(self):
        response = self.client.get("/api/topics/popular")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json(), [])

    def test_first_search_asks_openalex_and_stores_the_topic(self):
        response = self.client.get("/api/search?q=black%20%20holes")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json(), {
            "query": "black holes",
            "topic": {"slug": "black-holes", "title": "Black Holes"},
            "results": [RESULT],
        })
        self.openalex.assert_called_once_with("black holes")
        self.assertEqual(self.record.call_args.args[1:], ("black-holes", "Black Holes"))
        self.assertEqual(self.save.call_args.args[1:], (1, FOUND))

    def test_recent_topic_uses_stored_papers_without_asking_openalex(self):
        self.find.return_value = {**TOPIC, "fresh": True}

        response = self.client.get("/api/search?q=Black%20Holes")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["results"], [RESULT])
        self.openalex.assert_not_called()
        self.save.assert_not_called()
        self.record.assert_called_once()          # the search is still counted

    def test_a_search_that_finds_nothing_stores_nothing(self):
        self.openalex.return_value = []
        self.stored.return_value = []

        response = self.client.get("/api/search?q=zzzz")

        self.assertEqual(response.get_json(), {"query": "zzzz", "topic": None, "results": []})
        self.record.assert_not_called()
        self.save.assert_not_called()

    def test_openalex_failure_with_nothing_stored_is_an_error(self):
        for error, status in ((openalex.OpenAlexError("down"), 502), (openalex.OpenAlexTimeout("slow"), 504)):
            with self.subTest(status=status):
                self.openalex.side_effect = error
                response = self.client.get("/api/search?q=black%20holes")
                self.assertEqual(response.status_code, status)
                self.record.assert_not_called()

    def test_openalex_failure_falls_back_to_stored_papers(self):
        self.find.return_value = TOPIC            # stored, but older than a week
        self.openalex.side_effect = openalex.OpenAlexError("down")

        response = self.client.get("/api/search?q=black%20holes")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["results"], [RESULT])
        self.save.assert_not_called()

    def test_invalid_searches_are_400(self):
        for url in ("/api/search", "/api/search?q=", "/api/search?q=a",
                    "/api/search?q=%21%21%21", "/api/search?q=" + "x" * 101):
            with self.subTest(url=url[:30]):
                response = self.client.get(url)
                self.assertEqual(response.status_code, 400)
                self.assertIn("error", response.get_json())
        self.openalex.assert_not_called()

    def test_database_errors_are_500_with_a_short_message(self):
        self.connect.side_effect = psycopg.OperationalError("connection refused")

        for url in ("/api/topics/popular", "/api/search?q=black"):
            with self.subTest(url=url):
                response = self.client.get(url)
                self.assertEqual(response.status_code, 500)
                self.assertNotIn("connection refused", response.get_data(as_text=True))


class TextTests(unittest.TestCase):
    def test_slugify_gives_one_slug_per_topic(self):
        for text in ("Black Holes", "black  holes", " BLACK-holes! "):
            self.assertEqual(home_service.slugify(text), "black-holes")
        self.assertEqual(home_service.slugify("!!!"), "")

    def test_display_title(self):
        self.assertEqual(home_service.display_title("dark matter"), "Dark Matter")
        self.assertEqual(home_service.display_title("JWST images"), "JWST images")


class PaperSummaryTests(unittest.TestCase):
    def test_paper_type_is_estimated_from_title_and_abstract(self):
        self.assertEqual(paper_service.paper_type(
            {"title": "Observation of Gravitational Waves", "abstract": None}), "observational")
        self.assertEqual(paper_service.paper_type(
            {"title": "A model", "abstract": "We measured the spectrum."}), "observational")
        self.assertEqual(paper_service.paper_type(
            {"title": "Gravitational Collapse and Space-Time Singularities", "abstract": ""}),
            "theoretical")

    def test_missing_fields_get_safe_defaults(self):
        summary = paper_service.to_summary(
            {"id": 3, "title": "T", "authors": "A, B, C et al.", "year": None, "abstract": None,
             "url": None, "cited_by_count": None, "venue": None, "topic": None,
             "keywords": [], "author_list": []},
            fallback_topic="Moon",
        )
        self.assertEqual(summary["id"], "3")
        self.assertEqual(summary["authors"], ["A", "B", "C"])   # from the short text
        self.assertEqual(summary["year"], 0)
        self.assertEqual(summary["venue"], "")
        self.assertEqual(summary["topic"], "Moon")
        self.assertEqual(summary["abstract"], "")


class FakeResponse:
    def __init__(self, payload):
        self.body = BytesIO(payload if isinstance(payload, bytes) else json.dumps(payload).encode())

    def read(self, size=-1):
        return self.body.read(size)

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False


class OpenAlexTests(unittest.TestCase):
    WORK = {
        "id": "https://openalex.org/W1",
        "display_name": "Observation of  Gravitational Waves",
        "publication_year": 2016,
        "doi": "https://doi.org/10.1103/PhysRevLett.116.061102",
        "cited_by_count": 9000,
        "authorships": [{"author": {"display_name": name}} for name in ("A", "B", "C", "D")],
        "abstract_inverted_index": {"waves": [1], "Gravitational": [0], "detected": [2]},
        "primary_location": {"source": {"display_name": "Physical Review Letters"}},
        "primary_topic": {"display_name": "Pulsars and Gravitational Waves Research"},
        "keywords": [{"display_name": "Gravitational wave"}, {"display_name": "LIGO"}],
    }

    def search(self, payload):
        with mock.patch.object(openalex, "urlopen", return_value=FakeResponse(payload)) as urlopen:
            papers = openalex.search_papers("gravitational waves")
        return papers, urlopen.call_args.args[0].full_url

    def test_turns_openalex_results_into_papers(self):
        papers, url = self.search({"results": [self.WORK, {"id": "no title"}]})

        self.assertEqual(papers, [{
            "openalex_id": "https://openalex.org/W1",
            "title": "Observation of Gravitational Waves",
            "authors": "A, B, C et al.",
            "author_list": ["A", "B", "C", "D"],
            "publication_year": 2016,
            "abstract": "Gravitational waves detected",
            "url": "https://doi.org/10.1103/PhysRevLett.116.061102",
            "cited_by_count": 9000,
            "venue": "Physical Review Letters",
            "topic": "Pulsars and Gravitational Waves Research",
            "keywords": ["Gravitational wave", "LIGO"],
        }])
        self.assertIn("search=gravitational+waves", url)
        self.assertIn("primary_topic.field.id%3A31", url)    # Physics and Astronomy only

    def test_missing_optional_fields_are_none_or_empty(self):
        work = {"id": "https://openalex.org/W2", "display_name": "Bare"}
        papers, _ = self.search({"results": [work]})

        self.assertEqual(papers[0]["venue"], None)
        self.assertEqual(papers[0]["topic"], None)
        self.assertEqual(papers[0]["keywords"], [])
        self.assertEqual(papers[0]["author_list"], [])
        self.assertEqual(papers[0]["authors"], None)

    def test_failures_raise_openalex_errors(self):
        for failure, error in (
            (socket.timeout(), openalex.OpenAlexTimeout),
            (URLError(TimeoutError()), openalex.OpenAlexTimeout),
            (URLError("no route"), openalex.OpenAlexError),
            (HTTPError("u", 503, "Unavailable", {}, None), openalex.OpenAlexError),
        ):
            with self.subTest(failure=failure), \
                    mock.patch.object(openalex, "urlopen", side_effect=failure):
                with self.assertRaises(error):
                    openalex.search_papers("black holes")

    def test_unexpected_responses_raise(self):
        for payload in (b"not json", {"results": "nope"}, ["list"]):
            with self.subTest(payload=payload), self.assertRaises(openalex.OpenAlexError):
                self.search(payload)


if __name__ == "__main__":
    unittest.main()
