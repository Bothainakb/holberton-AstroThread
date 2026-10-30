"""Tests for the OpenAlex fallback on the Thread Details page
(GET /api/threads/<id>/openalex-papers and app/services/openalex_service.py).

Run from the backend folder:  python -m unittest -v test_openalex_papers
OpenAlex is never contacted: urlopen (or the whole search) is mocked, and the
database is a fake, so these tests need neither network nor PostgreSQL.
"""
import json
import re
import socket
import unittest
from io import BytesIO
from unittest import mock
from urllib.error import HTTPError, URLError
from pathlib import Path
from urllib.parse import parse_qs, urlparse

import psycopg

import app as backend
from app.api.v1 import openalex_papers
from app.services import openalex_service, thread_service

THREAD = {"id": 3, "title": "Exoplanets", "category": "Astronomy", "description": "..."}

# Multi-phrase search settings, used to test the machinery behind
# TOPIC_SEARCHES (no library topic needs them today).
MULTI_PHRASE = {
    "phrases": ("accelerating universe", "high-redshift supernovae", "Hubble constant", "expansion of the universe"),
    "per_phrase": 2,
    "observational": True,
}


def topic_settings(title, settings):
    """Temporarily gives one thread title its own TOPIC_SEARCHES settings."""
    return mock.patch.dict(openalex_service.TOPIC_SEARCHES, {title: settings})


def work(work_id, title, doi="auto", year=2016, authors=("B. P. Abbott",)):
    """One result shaped like api.openalex.org/works."""
    return {
        "id": f"https://openalex.org/{work_id}",
        "display_name": title,
        "publication_year": year,
        "doi": f"https://doi.org/10.1000/{work_id.lower()}" if doi == "auto" else doi,
        "authorships": [{"author": {"display_name": name}} for name in authors],
    }


def works(*results):
    return {"meta": {"count": len(results)}, "results": list(results)}


class FakeResponse:
    def __init__(self, body):
        self.body = BytesIO(body)

    def read(self, size=-1):
        return self.body.read(size)

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False


def respond_by_phrase(pages):
    """Mocks urlopen with a fresh response per request, chosen by the searched
    title phrase (the requests for one thread run at the same time)."""
    def answer(request, timeout):
        phrase = re.search(r'title\.search:"([^"]*)"', parse_qs(urlparse(request.full_url).query)["filter"][0]).group(1)
        return FakeResponse(json.dumps(pages.get(phrase, works())).encode("utf-8"))
    return mock.patch.object(openalex_service, "urlopen", side_effect=answer)


def cited(paper, count, abstract=None):
    """A work with a citation count (and optionally an abstract, word by word)."""
    paper["cited_by_count"] = count
    if abstract is not None:
        paper["abstract_inverted_index"] = {}
        for position, word in enumerate(abstract.split()):
            paper["abstract_inverted_index"].setdefault(word, []).append(position)
    return paper


def respond_with(payload):
    body = payload if isinstance(payload, bytes) else json.dumps(payload).encode("utf-8")
    return mock.patch.object(openalex_service, "urlopen", return_value=FakeResponse(body))


class OpenAlexServiceTests(unittest.TestCase):
    """openalex_service with urlopen mocked."""

    def test_maps_a_work_to_a_paper(self):
        payload = works(work("W1", "Observation of <i>Gravitational Waves</i> from a Binary Black Hole Merger",
                             authors=("B. P. Abbott", "R. Abbott", "T. D. Abbott", "M. R. Abernathy")))

        with respond_with(payload):
            result = openalex_service.search_thread_papers("Black Holes")

        self.assertEqual(result["query"], "black hole")
        self.assertEqual(result["source"], "OpenAlex")
        self.assertEqual(result["items"], [{
            "openalex_id": "https://openalex.org/W1",
            "title": "Observation of Gravitational Waves from a Binary Black Hole Merger",
            "authors": "B. P. Abbott, R. Abbott, T. D. Abbott et al.",
            "year": 2016,
            "url": "https://doi.org/10.1000/w1",
            "summary": None,
        }])

    def test_requests_most_cited_articles_with_the_phrase_in_the_title(self):
        with respond_with(works()) as urlopen:
            openalex_service.search_thread_papers("Exoplanets")

        request = urlopen.call_args.args[0]
        url = urlparse(request.full_url)
        params = parse_qs(url.query)
        self.assertEqual(f"{url.scheme}://{url.netloc}{url.path}", openalex_service.WORKS_URL)
        # Physics and Astronomy only (OpenAlex field 31): "expanding universe"
        # alone also finds a protein-database paper.
        self.assertEqual(params["filter"], ['title.search:"exoplanet",type:article,primary_topic.field.id:31'])
        self.assertIn("abstract_inverted_index", params["select"][0])
        self.assertEqual(params["sort"], ["cited_by_count:desc"])
        self.assertEqual(urlopen.call_args.kwargs["timeout"], openalex_service.TIMEOUT_SECONDS)

    def test_filter_syntax_is_removed_from_unknown_titles(self):
        with respond_with(works()) as urlopen:
            openalex_service.search_thread_papers('Dark "Matter", type:dataset')

        params = parse_qs(urlparse(urlopen.call_args.args[0].full_url).query)
        self.assertEqual(
            params["filter"], ['title.search:"Dark Matter type dataset",type:article,primary_topic.field.id:31']
        )

    def test_drops_off_topic_untitled_unlinked_and_repeated_works(self):
        payload = works(
            work("W1", "Array programming with NumPy"),
            work("W2", "GW150914: Observation of Gravitational Waves from a Binary Black Hole Merger"),
            work("W3", ""),
            work("W4", "Black-hole detectors", doi=None),
            work("W5", "gw150914: observation of gravitational waves from a binary black hole merger"),
            work("W6", "A black hole paper", doi="javascript:alert(1)"),
            "not a work",
        )

        with respond_with(payload):
            items = openalex_service.search_thread_papers("Black Holes")["items"]

        # W4 keeps its OpenAlex page link; W6's bad DOI falls back to it too.
        self.assertEqual([item["openalex_id"].rsplit("/", 1)[1] for item in items], ["W2", "W4", "W6"])
        self.assertEqual(items[1]["url"], "https://openalex.org/W4")
        self.assertEqual(items[2]["url"], "https://openalex.org/W6")

    def test_summary_is_the_abstract_in_word_order(self):
        paper = work("W1", "Black hole structure")
        paper["abstract_inverted_index"] = {"Abstract": [0], "Dense": [1], "matter": [2, 5], "and": [3], "dark": [4]}

        with respond_with(works(paper)):
            item = openalex_service.search_thread_papers("Black Holes")["items"][0]

        # The "Abstract" heading some publishers include is dropped.
        self.assertEqual(item["summary"], "Dense matter and dark matter")

    def test_long_abstracts_are_shortened_at_a_word(self):
        paper = work("W1", "Black hole cooling")
        paper["abstract_inverted_index"] = {f"word{n}": [n] for n in range(200)}

        with respond_with(works(paper)):
            summary = openalex_service.search_thread_papers("Black Holes")["items"][0]["summary"]

        self.assertLessEqual(len(summary), openalex_service.MAX_SUMMARY_LENGTH + 1)
        self.assertTrue(summary.endswith("\u2026"))
        self.assertTrue(summary[:-1].split(" ")[-1].startswith("word"))

    def test_missing_or_malformed_abstracts_give_no_summary(self):
        for index in (None, {}, "text", {"a": "not a list"}, {"Abstract": [0]}):
            with self.subTest(index=index):
                paper = work("W1", "Exoplanet atmospheres")
                paper["abstract_inverted_index"] = index
                with respond_with(works(paper)):
                    item = openalex_service.search_thread_papers("Exoplanets")["items"][0]
                self.assertIsNone(item["summary"])

    def test_library_topics_have_their_own_phrases(self):
        for title, phrase in (("Black Holes", "black hole"), ("Exoplanets", "exoplanet"), ("Dark Matter", "dark matter")):
            with self.subTest(title=title), respond_with(works()) as urlopen:
                self.assertEqual(openalex_service.search_thread_papers(title)["query"], phrase)
                params = parse_qs(urlparse(urlopen.call_args.args[0].full_url).query)
                self.assertTrue(params["filter"][0].startswith(f'title.search:"{phrase}",'))
        self.assertEqual(openalex_service.TOPIC_SEARCHES, {})

    def test_multi_phrase_settings_are_reported(self):
        with topic_settings("the expanding universe", MULTI_PHRASE), respond_by_phrase({}):
            result = openalex_service.search_thread_papers("The Expanding Universe")
        self.assertEqual(result["query"], "The Expanding Universe")
        self.assertEqual(
            result["phrases"],
            ["accelerating universe", "high-redshift supernovae", "Hubble constant", "expansion of the universe"],
        )
        self.assertTrue(result["observational"])

    def test_single_phrase_threads_report_their_one_phrase(self):
        with respond_with(works()):
            result = openalex_service.search_thread_papers("Black Holes")
        self.assertEqual((result["phrases"], result["observational"]), (["black hole"], False))

    def test_multi_phrase_search_merges_phrases_by_citations(self):
        pages = {
            "accelerating universe": works(
                cited(work("W1", "Observational Evidence from Supernovae for an Accelerating Universe"), 19613),
                cited(work("W2", "Accelerating Universes with Scaling Dark Matter"), 2493),  # theory: no evidence in title
                cited(work("W3", "The farthest known supernova: support for an accelerating universe"), 955),
                cited(work("W4", "Supernova constraints on an accelerating universe"), 900),  # third of this phrase
            ),
            "high-redshift supernovae": works(
                # "High\u2010Redshift" uses a Unicode hyphen; it still matches.
                cited(work("W5", "Measurements of Omega and Lambda from 42 High\u2010Redshift Supernovae"), 18082),
            ),
            "Hubble constant": works(
                cited(work("W6", "Final Results from the Hubble Space Telescope Key Project to Measure the Hubble Constant"), 3544),
                cited(work("W1", "Observational Evidence from Supernovae for an Accelerating Universe"), 19613),  # also found above
            ),
            "expansion of the universe": works(
                cited(work("W7", "First-order phase transition of a vacuum and the expansion of the Universe"), 1794),
                cited(work("W8", "Evidence of the accelerated expansion of the Universe from weak lensing"), 372),
            ),
        }
        with topic_settings("the expanding universe", MULTI_PHRASE), respond_by_phrase(pages) as urlopen:
            items = openalex_service.search_thread_papers("The Expanding Universe")["items"]

        self.assertEqual(urlopen.call_count, 4)
        # Most cited first; theory papers (W2, W7) dropped; at most two per phrase
        # (W4 is the third "accelerating universe" match); W1 listed once.
        self.assertEqual([item["openalex_id"].rsplit("/", 1)[1] for item in items], ["W1", "W5", "W6", "W3", "W8"])

    def test_one_failed_phrase_fails_the_search(self):
        def answer(request, timeout):
            if "Hubble" in parse_qs(urlparse(request.full_url).query)["filter"][0]:
                raise URLError(TimeoutError())
            return FakeResponse(json.dumps(works()).encode("utf-8"))
        with topic_settings("the expanding universe", MULTI_PHRASE), \
                mock.patch.object(openalex_service, "urlopen", side_effect=answer):
            with self.assertRaises(openalex_service.OpenAlexTimeout):
                openalex_service.search_thread_papers("The Expanding Universe")

    def test_max_per_event_keeps_one_paper_per_gravitational_wave_event(self):
        payload = works(
            cited(work("W1", "GW150914: Observation of Gravitational Waves from a Binary Black Hole Merger"), 9000),
            cited(work("W2", "Astrophysical Implications of the Binary Black Hole Merger"), 8000,
                  "The discovery of the binary black hole merger GW150914 has implications for stellar evolution"),
            cited(work("W3", "A black hole mass measured with stellar orbits"), 4000),
            cited(work("W4", "GW150914: Properties of the Binary Black Hole Merger"), 3000),
            cited(work("W5", "Black hole spin and the equation of state"), 2000),
        )
        with topic_settings("black holes", {"max_per_event": 1}), respond_with(payload):
            items = openalex_service.search_thread_papers("Black Holes")["items"]

        self.assertEqual([item["openalex_id"].rsplit("/", 1)[1] for item in items], ["W1", "W3", "W5"])

    def test_other_threads_may_list_several_papers_about_one_event(self):
        payload = works(
            work("W1", "GW150914: Observation of Gravitational Waves from a Binary Black Hole Merger"),
            work("W2", "Properties of the Binary Black Hole Merger GW150914"),
        )
        with respond_with(payload):
            items = openalex_service.search_thread_papers("Black Holes")["items"]
        self.assertEqual(len(items), 2)

    def test_publisher_footers_are_removed_from_summaries(self):
        cases = {
            "We report results of an investigation of particle creation in expanding universes.Received 15 July 1968DOI:https://doi.org/10.1103/PhysRevLett.21.562\u00a91968 American Physical Society":
                "We report results of an investigation of particle creation in expanding universes.",
            "Neutron stars cool by neutrino emission. \u00a9 2004 Elsevier B.V. All rights reserved.":
                "Neutron stars cool by neutrino emission.",
            "Dense matter sets the radius. Copyright 2001 The American Astronomical Society":
                "Dense matter sets the radius.",
            "Pulsar timing measures the mass. Published by Oxford University Press on behalf of the RAS":
                "Pulsar timing measures the mass.",
            "We received data on 12 pulsars and find no footer here.":
                "We received data on 12 pulsars and find no footer here.",
        }
        for abstract, expected in cases.items():
            with self.subTest(expected=expected):
                paper = cited(work("W1", "Black hole masses"), 10, abstract)
                with respond_with(works(paper)):
                    item = openalex_service.search_thread_papers("Black Holes")["items"][0]
                self.assertEqual(item["summary"], expected)

    def test_an_abstract_that_is_only_a_footer_counts_as_missing(self):
        paper = cited(work("W1", "Black hole masses"), 10, "\u00a9 1998 The American Physical Society")
        with respond_with(works(paper)):
            item = openalex_service.search_thread_papers("Black Holes")["items"][0]
        self.assertIsNone(item["summary"])

    def test_escaped_line_breaks_in_titles_become_spaces(self):
        title = "The farthest known supernova: support for an accelerating universe and a glimpse of the \\nepoch of deceleration"
        with respond_with(works(work("W1", "Black hole " + title))):
            item = openalex_service.search_thread_papers("Black Holes")["items"][0]
        self.assertTrue(item["title"].endswith("a glimpse of the epoch of deceleration"))

    def test_hyphenated_titles_match(self):
        with respond_with(works(work("W1", "Notes on black-hole evaporation"))):
            items = openalex_service.search_thread_papers("Black Holes")["items"]

        self.assertEqual(len(items), 1)

    def test_keeps_at_most_max_items(self):
        payload = works(*(work(f"W{n}", f"Exoplanet survey {n}") for n in range(10)))

        with respond_with(payload):
            items = openalex_service.search_thread_papers("Exoplanets")["items"]

        self.assertEqual(len(items), openalex_service.MAX_ITEMS)

    def test_missing_authors_and_year_become_none(self):
        with respond_with(works(work("W1", "Exoplanet atmospheres", year=None, authors=()))):
            item = openalex_service.search_thread_papers("Exoplanets")["items"][0]

        self.assertIsNone(item["authors"])
        self.assertIsNone(item["year"])

    def test_no_results_is_an_empty_list(self):
        with respond_with(works()):
            self.assertEqual(openalex_service.search_thread_papers("Exoplanets")["items"], [])

    def test_http_error_is_unavailable(self):
        error = HTTPError(openalex_service.WORKS_URL, 503, "Service Unavailable", {}, None)
        with mock.patch.object(openalex_service, "urlopen", side_effect=error):
            with self.assertRaises(openalex_service.OpenAlexUnavailable):
                openalex_service.search_thread_papers("Exoplanets")

    def test_timeouts_are_reported_as_timeouts(self):
        for failure in (TimeoutError(), socket.timeout(), URLError(TimeoutError())):
            with self.subTest(failure=failure):
                with mock.patch.object(openalex_service, "urlopen", side_effect=failure):
                    with self.assertRaises(openalex_service.OpenAlexTimeout):
                        openalex_service.search_thread_papers("Exoplanets")

    def test_network_error_is_unavailable_not_timeout(self):
        with mock.patch.object(openalex_service, "urlopen", side_effect=URLError("Name not resolved")):
            with self.assertRaises(openalex_service.OpenAlexUnavailable) as caught:
                openalex_service.search_thread_papers("Exoplanets")
        self.assertNotIsInstance(caught.exception, openalex_service.OpenAlexTimeout)

    def test_bad_bodies_are_unavailable(self):
        oversized = b" " * (openalex_service.MAX_RESPONSE_BYTES + 1)
        for body in (b"<html>busy</html>", oversized, {"results": "nope"}, ["not", "a", "dict"]):
            with self.subTest(body=str(body)[:30]):
                with respond_with(body):
                    with self.assertRaises(openalex_service.OpenAlexUnavailable):
                        openalex_service.search_thread_papers("Exoplanets")


class OpenAlexPapersRouteTests(unittest.TestCase):
    """The route with a fake database; the OpenAlex search itself is mocked."""

    def setUp(self):
        backend.app.logger.disabled = True
        self.addCleanup(setattr, backend.app.logger, "disabled", False)
        self.client = backend.app.test_client()

        db = mock.patch.object(openalex_papers, "get_db_connection", return_value=mock.MagicMock())
        self.connect = db.start()
        self.addCleanup(db.stop)
        thread = mock.patch.object(thread_service, "get_thread", return_value=THREAD)
        self.get_thread = thread.start()
        self.addCleanup(thread.stop)
        self.real_search = openalex_service.search_thread_papers
        search = mock.patch.object(
            openalex_service, "search_thread_papers",
            return_value={"query": "exoplanet", "source": "OpenAlex", "items": []},
        )
        self.search = search.start()
        self.addCleanup(search.stop)

    def test_returns_papers_for_the_thread_without_a_session(self):
        item = {"openalex_id": "https://openalex.org/W1", "title": "Exoplanet atmospheres"}
        self.search.return_value["items"] = [item]

        response = self.client.get("/api/threads/3/openalex-papers")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["items"], [item])
        self.assertEqual(self.get_thread.call_args.args[1], 3)
        self.search.assert_called_once_with("Exoplanets")
        self.assertIn("max-age=3600", response.headers["Cache-Control"])

    def test_no_papers_is_200_with_an_empty_list(self):
        response = self.client.get("/api/threads/2/openalex-papers")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["items"], [])

    def test_unknown_thread_returns_json_404_without_calling_openalex(self):
        self.get_thread.return_value = None

        response = self.client.get("/api/threads/999/openalex-papers")

        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.get_json(), {"error": "Research thread not found"})
        self.search.assert_not_called()

    def test_database_error_returns_json_500(self):
        self.connect.side_effect = psycopg.OperationalError("connection lost")

        response = self.client.get("/api/threads/2/openalex-papers")

        self.assertEqual(response.status_code, 500)
        self.search.assert_not_called()

    def test_openalex_timeout_returns_json_504(self):
        self.search.side_effect = openalex_service.OpenAlexTimeout("slow")

        response = self.client.get("/api/threads/2/openalex-papers")

        self.assertEqual(response.status_code, 504)
        self.assertIn("did not respond in time", response.get_json()["error"])

    def test_openalex_failure_returns_json_502_without_upstream_detail(self):
        self.search.side_effect = openalex_service.OpenAlexUnavailable("HTTP 503")

        response = self.client.get("/api/threads/2/openalex-papers")

        self.assertEqual(response.status_code, 502)
        self.assertIn("unavailable right now", response.get_json()["error"])
        self.assertNotIn("503", response.get_json()["error"])

    def test_upstream_failure_through_the_real_service(self):
        with mock.patch.object(
            openalex_service, "search_thread_papers", wraps=self.real_search
        ), mock.patch.object(openalex_service, "urlopen", side_effect=URLError(TimeoutError())):
            response = self.client.get("/api/threads/2/openalex-papers")

        self.assertEqual(response.status_code, 504)

    def test_route_writes_nothing_to_the_database(self):
        self.client.get("/api/threads/2/openalex-papers")

        cursor = self.connect.return_value.__enter__.return_value.cursor.return_value.__enter__.return_value
        cursor.execute.assert_not_called()  # get_thread is mocked; nothing else may run SQL
        self.connect.return_value.__enter__.return_value.commit.assert_not_called()

    def test_only_get_is_allowed(self):
        for method in ("post", "put", "patch", "delete"):
            with self.subTest(method=method):
                response = getattr(self.client, method)("/api/threads/2/openalex-papers")
                self.assertEqual(response.status_code, 405)

    def test_design_preview_route_searches_the_allowed_title(self):
        for slug, title in (("dark-matter", "Dark Matter"),):
            with self.subTest(slug=slug):
                self.search.reset_mock()
                response = self.client.get(f"/api/design-threads/{slug}/openalex-papers")
                self.assertEqual(response.status_code, 200)
                self.search.assert_called_once_with(title)
                self.assertIn("max-age=3600", response.headers["Cache-Control"])
        # No database lookup is needed for a design preview.
        self.get_thread.assert_not_called()

    def test_design_preview_route_rejects_other_slugs_without_calling_openalex(self):
        # Database threads use /api/threads/<id>/openalex-papers instead; case,
        # extra characters and unknown slugs are not accepted.
        for slug in ("black-holes", "Dark-Matter", "dark-matter-x", "anything", "neutron-stars%22",
                     "gravitational-waves", "neutron-stars", "expanding-universe"):
            with self.subTest(slug=slug):
                response = self.client.get(f"/api/design-threads/{slug}/openalex-papers")
                self.assertEqual(response.status_code, 404)
                self.assertEqual(response.get_json(), {"error": "Research thread not found"})
        self.search.assert_not_called()

    def test_design_preview_route_reports_openalex_failures(self):
        self.search.side_effect = openalex_service.OpenAlexTimeout("slow")
        self.assertEqual(self.client.get("/api/design-threads/dark-matter/openalex-papers").status_code, 504)
        self.search.side_effect = openalex_service.OpenAlexUnavailable("HTTP 503")
        response = self.client.get("/api/design-threads/dark-matter/openalex-papers")
        self.assertEqual(response.status_code, 502)
        self.assertNotIn("503", response.get_json()["error"])

    def test_dark_matter_preview_returns_its_papers(self):
        item = {"openalex_id": "https://openalex.org/W1", "title": "The Structure of Cold Dark Matter Halos",
                "authors": "Julio F. Navarro", "year": 1996, "url": "https://doi.org/10.1000/w1", "summary": None}
        self.search.return_value = {"query": "dark matter", "source": "OpenAlex", "items": [item]}

        response = self.client.get("/api/design-threads/dark-matter/openalex-papers")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["items"], [item])
        self.search.assert_called_once_with("Dark Matter")

    def test_design_previews_match_the_frontend_list(self):
        # frontend/src/pages/ThreadDetails/useOpenAlexPapers.ts, DESIGN_PAPER_PREVIEWS
        source = (Path(__file__).resolve().parent.parent / "frontend" / "src" / "pages"
                  / "ThreadDetails" / "useOpenAlexPapers.ts").read_text(encoding="utf-8")
        block = re.search(r"DESIGN_PAPER_PREVIEWS[^=]*=\s*new Set\(\[(.*?)\]\)", source, re.S)
        self.assertIsNotNone(block, "DESIGN_PAPER_PREVIEWS not found")
        frontend = set(re.findall(r"'([a-z0-9-]+)'", block.group(1)))
        self.assertEqual(frontend, set(openalex_papers.DESIGN_THREADS))
        self.assertEqual(frontend, {"dark-matter"})

    def test_routes_registered(self):
        rules = {rule.rule for rule in backend.app.url_map.iter_rules()}
        self.assertIn("/api/threads/<int:thread_id>", rules)
        self.assertIn("/api/threads/<int:thread_id>/nasa-media", rules)
        self.assertIn("/api/threads/<int:thread_id>/openalex-papers", rules)
        self.assertIn("/api/design-threads/<slug>/openalex-papers", rules)


if __name__ == "__main__":
    unittest.main()
