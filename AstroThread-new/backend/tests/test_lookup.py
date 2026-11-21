import json
import unittest
from io import BytesIO
from unittest import mock

import psycopg

from app import create_app
from app.routes import papers
from app.services import home_service, openalex, paper_service

HAWKING = {
    "openalex_id": "https://openalex.org/W1",
    "title": "Particle creation by black holes",
    "publication_year": 1975,
}


class FakeResponse:
    def __init__(self, payload):
        self.body = BytesIO(json.dumps(payload).encode())

    def read(self, size=-1):
        return self.body.read(size)

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False


class LookupRouteTests(unittest.TestCase):
    def setUp(self):
        app = create_app()
        app.logger.disabled = True
        self.client = app.test_client()

        patches = {
            "connect": mock.patch.object(papers, "get_connection", return_value=mock.MagicMock()),
            "find_stored": mock.patch.object(paper_service, "find_by_title", return_value=None),
            "find_openalex": mock.patch.object(openalex, "find_paper", return_value=dict(HAWKING)),
            "save": mock.patch.object(home_service, "save_paper", return_value=42),
        }
        for name, patcher in patches.items():
            setattr(self, name, patcher.start())
            self.addCleanup(patcher.stop)

    def lookup(self, title="Particle Creation by Black Holes", year="1975"):
        return self.client.get("/api/papers/lookup", query_string={"title": title, "year": year})

    def test_stored_paper_is_returned_without_asking_openalex(self):
        self.find_stored.return_value = 7

        response = self.lookup()

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json(), {"id": "7"})
        self.assertEqual(self.find_stored.call_args.args[1:], ("Particle Creation by Black Holes", 1975))
        self.find_openalex.assert_not_called()

    def test_new_paper_is_fetched_from_openalex_and_stored(self):
        response = self.lookup()

        self.assertEqual(response.get_json(), {"id": "42"})
        self.find_openalex.assert_called_once_with("Particle Creation by Black Holes", 1975)
        self.assertEqual(self.save.call_args.args[1], HAWKING)

    def test_year_is_optional(self):
        self.lookup(year="")
        self.find_openalex.assert_called_once_with("Particle Creation by Black Holes", None)

    def test_paper_openalex_does_not_have_is_404(self):
        self.find_openalex.return_value = None

        response = self.lookup()

        self.assertEqual(response.status_code, 404)
        self.save.assert_not_called()

    def test_openalex_failure_passes_on_its_status(self):
        self.find_openalex.side_effect = openalex.OpenAlexTimeout("slow")

        response = self.lookup()

        self.assertEqual(response.status_code, 504)

    def test_title_must_be_3_to_300_characters(self):
        self.assertEqual(self.lookup(title="ab").status_code, 400)
        self.assertEqual(self.lookup(title="x" * 301).status_code, 400)
        self.find_stored.assert_not_called()

    def test_database_error_is_500(self):
        self.find_stored.side_effect = psycopg.OperationalError("down")

        self.assertEqual(self.lookup().status_code, 500)


class FindPaperTests(unittest.TestCase):
    def work(self, title, work_id="https://openalex.org/W1"):
        return {"id": work_id, "display_name": title, "publication_year": 1975}

    def test_returns_the_first_result_with_the_same_title(self):
        results = [self.work("Black hole explosions?", "https://openalex.org/W9"),
                   self.work("Particle creation by black holes")]
        with mock.patch.object(openalex, "urlopen",
                               return_value=FakeResponse({"results": results})) as urlopen:
            paper = openalex.find_paper("Particle Creation by Black Holes", 1975)

        self.assertEqual(paper["openalex_id"], "https://openalex.org/W1")
        url = urlopen.call_args.args[0].full_url
        self.assertIn("title.search%3AParticle+Creation+by+Black+Holes", url)
        self.assertIn("publication_year%3A1974-1976", url)

    def test_no_close_title_means_not_found(self):
        results = [self.work("Black hole explosions?")]
        with mock.patch.object(openalex, "urlopen",
                               return_value=FakeResponse({"results": results})):
            self.assertIsNone(openalex.find_paper("Particle Creation by Black Holes", 1975))

    def test_commas_and_colons_are_removed_from_the_filter(self):
        with mock.patch.object(openalex, "urlopen",
                               return_value=FakeResponse({"results": []})) as urlopen:
            openalex.find_paper("Cygnus X-1: a binary, maybe", None)

        url = urlopen.call_args.args[0].full_url
        self.assertIn("title.search%3ACygnus+X-1+a+binary+maybe", url)
        self.assertNotIn("publication_year%3A", url)
        
    def test_same_title_ignores_case_and_punctuation(self):
        self.assertTrue(openalex.same_title("Particle Creation by Black Holes",
                                            "Particle creation by black holes."))
        self.assertFalse(openalex.same_title("Particle Creation by Black Holes",
                                             "Black hole explosions?"))


if __name__ == "__main__":
    unittest.main()
