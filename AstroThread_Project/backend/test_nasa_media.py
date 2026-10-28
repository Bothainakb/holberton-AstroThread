"""Tests for NASA media on the Thread Details page
(GET /api/threads/<id>/nasa-media and app/services/nasa_service.py).

Run from the backend folder:  python -m unittest -v test_nasa_media
NASA is never contacted: urlopen (or the whole search) is mocked, and the
database is a fake, so these tests need neither network nor PostgreSQL.
"""
import json
import socket
import unittest
from io import BytesIO
from unittest import mock
from urllib.error import HTTPError, URLError

import psycopg

import app as backend
from app.api.v1 import nasa_media
from app.services import nasa_service, thread_service

THREAD = {"id": 1, "title": "Black Holes", "category": "Astrophysics", "description": "..."}


def nasa_item(nasa_id, title, description="", keywords=None, links=None, **data):
    """One item shaped like images-api.nasa.gov/search results."""
    if links is None:
        links = [
            {"href": f"https://images-assets.nasa.gov/image/{nasa_id}/{nasa_id}~medium.jpg",
             "rel": "alternate", "render": "image", "width": 1280},
            {"href": f"https://images-assets.nasa.gov/image/{nasa_id}/{nasa_id}~thumb.jpg",
             "rel": "preview", "render": "image", "width": 640},
        ]
    fields = {
        "nasa_id": nasa_id,
        "title": title,
        "description": description,
        "media_type": "image",
        "center": "JPL",
        "date_created": "2017-11-02T00:00:00Z",
        **data,
    }
    if keywords is not None:
        fields["keywords"] = keywords
    return {"data": [fields], "links": links}


def search_payload(*items):
    return {"collection": {"items": list(items), "metadata": {"total_hits": len(items)}}}


class FakeResponse:
    def __init__(self, body):
        self.body = BytesIO(body)

    def read(self, size=-1):
        return self.body.read(size)

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False


def respond_with(payload):
    body = payload if isinstance(payload, bytes) else json.dumps(payload).encode("utf-8")
    return mock.patch.object(nasa_service, "urlopen", return_value=FakeResponse(body))


class NasaServiceTests(unittest.TestCase):
    """nasa_service with urlopen mocked."""

    def test_maps_a_result_to_a_media_item(self):
        payload = search_payload(
            nasa_item(
                "PIA22085", "Black Hole With Jet (Artist's Concept)",
                description="<p>A black hole &amp; its jet.</p>",
                keywords=["NuSTAR", "black hole"], secondary_creator="NASA/JPL-Caltech",
            )
        )
        with respond_with(payload) as urlopen:
            media = nasa_service.search_thread_media("Black Holes")

        self.assertEqual(media["query"], "black hole")
        self.assertEqual(media["source"], "NASA Image and Video Library")
        self.assertEqual(
            media["items"],
            [{
                "nasa_id": "PIA22085",
                "title": "Black Hole With Jet (Artist's Concept)",
                "description": "A black hole & its jet.",
                "date": "2017-11-02",
                "center": "JPL",
                "credit": "NASA/JPL-Caltech",
                "image_url": "https://images-assets.nasa.gov/image/PIA22085/PIA22085~thumb.jpg",
                "source_url": "https://images.nasa.gov/details/PIA22085",
            }],
        )
        request = urlopen.call_args.args[0]
        self.assertTrue(request.full_url.startswith("https://images-api.nasa.gov/search?"))
        self.assertIn("q=black+hole", request.full_url)
        self.assertIn("media_type=image", request.full_url)
        self.assertNotIn("api_key", request.full_url)
        self.assertEqual(urlopen.call_args.kwargs["timeout"], nasa_service.TIMEOUT_SECONDS)

    def test_each_thread_searches_its_own_topic(self):
        self.assertEqual(nasa_service.search_terms("Exoplanets")[0], "exoplanet")
        self.assertEqual(nasa_service.search_terms("Gravitational Waves")[0], "gravitational wave")
        self.assertEqual(nasa_service.search_terms("  black holes ")[0], "black hole")
        # Unknown threads search for their title, unfiltered.
        self.assertEqual(nasa_service.search_terms("Dark Matter"), ("Dark Matter", ()))

    def test_off_topic_untitled_and_duplicate_results_are_dropped(self):
        payload = search_payload(
            nasa_item("PIA08257", "Encke Waves", "Density waves in Saturn's rings."),
            nasa_item("PIA17995", "Detectors See Gravitational Waves", "BICEP2 detectors."),
            nasa_item("KSC-2011-7033", "KSC-2011-7033", "Gravitational wave mission launch."),
            nasa_item("GSFC_1", "Black Holes Collide", "Merging black holes emit gravitational waves."),
            nasa_item("GSFC_2", "Black Holes Collide", "The same image archived twice: gravitational wave."),
        )
        with respond_with(payload):
            items = nasa_service.search_thread_media("Gravitational Waves")["items"]

        self.assertEqual([item["nasa_id"] for item in items], ["PIA17995", "GSFC_1"])

    def test_results_tagged_with_the_topic_come_first(self):
        payload = search_payload(
            nasa_item("A", "Hot Jupiter", "An exoplanet close to its star."),
            nasa_item("B", "Kepler-1649c", "An Earth-size world.", keywords=["Kepler", "Exoplanet"]),
        )
        with respond_with(payload):
            items = nasa_service.search_thread_media("Exoplanets")["items"]

        self.assertEqual([item["nasa_id"] for item in items], ["B", "A"])

    def test_returns_at_most_max_items(self):
        payload = search_payload(
            *(nasa_item(f"ID{n}", f"Black hole {n}") for n in range(nasa_service.MAX_ITEMS + 4))
        )
        with respond_with(payload):
            items = nasa_service.search_thread_media("Black Holes")["items"]

        self.assertEqual(len(items), nasa_service.MAX_ITEMS)

    def test_only_https_nasa_images_are_used(self):
        payload = search_payload(
            nasa_item("X", "Black hole elsewhere", links=[
                {"href": "https://example.com/x.jpg", "rel": "preview", "render": "image"},
                {"href": "http://images-assets.nasa.gov/x.jpg", "rel": "alternate", "render": "image"},
            ]),
            nasa_item("Y", "Black hole original only", links=[
                {"href": "https://images-assets.nasa.gov/image/Y/Y~orig.jpg", "rel": "canonical",
                 "render": "image"},
            ]),
            nasa_item("Z", "Black hole small", links=[
                {"href": "https://images-assets.nasa.gov/image/Z/Z~medium.jpg", "rel": "alternate",
                 "render": "image", "width": 1280},
                {"href": "https://images-assets.nasa.gov/image/Z/Z~small.jpg", "rel": "alternate",
                 "render": "image", "width": 640},
            ]),
        )
        with respond_with(payload):
            items = nasa_service.search_thread_media("Black Holes")["items"]

        self.assertEqual(
            [item["image_url"] for item in items],
            ["https://images-assets.nasa.gov/image/Z/Z~small.jpg"],
        )

    def test_long_descriptions_are_shortened(self):
        payload = search_payload(nasa_item("L", "Black hole", "word " * 200))
        with respond_with(payload):
            description = nasa_service.search_thread_media("Black Holes")["items"][0]["description"]

        self.assertLessEqual(len(description), nasa_service.MAX_DESCRIPTION_LENGTH + 1)
        self.assertTrue(description.endswith("…"))

    def test_no_results_is_an_empty_list(self):
        with respond_with(search_payload()):
            media = nasa_service.search_thread_media("Black Holes")

        self.assertEqual(media["items"], [])

    def test_http_error_raises_unavailable(self):
        error = HTTPError(nasa_service.SEARCH_URL, 503, "Service Unavailable", {}, None)
        with mock.patch.object(nasa_service, "urlopen", side_effect=error):
            with self.assertRaises(nasa_service.NasaUnavailable) as caught:
                nasa_service.search_thread_media("Black Holes")
        self.assertNotIsInstance(caught.exception, nasa_service.NasaTimeout)

    def test_timeouts_raise_nasa_timeout(self):
        for failure in (socket.timeout("timed out"), TimeoutError(), URLError(TimeoutError())):
            with self.subTest(failure=failure):
                with mock.patch.object(nasa_service, "urlopen", side_effect=failure):
                    with self.assertRaises(nasa_service.NasaTimeout):
                        nasa_service.search_thread_media("Black Holes")

    def test_network_error_raises_unavailable(self):
        with mock.patch.object(nasa_service, "urlopen", side_effect=URLError("Name not resolved")):
            with self.assertRaises(nasa_service.NasaUnavailable):
                nasa_service.search_thread_media("Black Holes")

    def test_bad_responses_raise_unavailable(self):
        oversized = b"x" * (nasa_service.MAX_RESPONSE_BYTES + 1)
        for body in (b"<html>Gateway error</html>", json.dumps({"reason": "x"}).encode(), oversized):
            with self.subTest(body=body[:30]):
                with respond_with(body):
                    with self.assertRaises(nasa_service.NasaUnavailable):
                        nasa_service.search_thread_media("Black Holes")


class NasaMediaRouteTests(unittest.TestCase):
    """The route with a fake database; the NASA search itself is mocked."""

    def setUp(self):
        backend.app.logger.disabled = True
        self.addCleanup(setattr, backend.app.logger, "disabled", False)
        self.client = backend.app.test_client()

        db = mock.patch.object(nasa_media, "get_db_connection", return_value=mock.MagicMock())
        self.connect = db.start()
        self.addCleanup(db.stop)
        thread = mock.patch.object(thread_service, "get_thread", return_value=THREAD)
        self.get_thread = thread.start()
        self.addCleanup(thread.stop)
        self.real_search = nasa_service.search_thread_media
        search = mock.patch.object(
            nasa_service, "search_thread_media",
            return_value={"query": "black hole", "source": "NASA Image and Video Library", "items": []},
        )
        self.search = search.start()
        self.addCleanup(search.stop)

    def test_returns_media_for_the_thread_without_a_session(self):
        item = {"nasa_id": "PIA22085", "title": "Black Hole With Jet"}
        self.search.return_value["items"] = [item]

        response = self.client.get("/api/threads/1/nasa-media")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["items"], [item])
        self.assertEqual(self.get_thread.call_args.args[1], 1)
        self.search.assert_called_once_with("Black Holes")
        self.assertIn("max-age=600", response.headers["Cache-Control"])

    def test_no_images_is_200_with_an_empty_list(self):
        response = self.client.get("/api/threads/1/nasa-media")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["items"], [])

    def test_unknown_thread_returns_json_404_without_calling_nasa(self):
        self.get_thread.return_value = None

        response = self.client.get("/api/threads/999/nasa-media")

        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.get_json(), {"error": "Research thread not found"})
        self.search.assert_not_called()

    def test_database_error_returns_json_500(self):
        self.connect.side_effect = psycopg.OperationalError("connection lost")

        response = self.client.get("/api/threads/1/nasa-media")

        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.get_json(), {"error": "Unable to load this research thread"})
        self.search.assert_not_called()

    def test_nasa_timeout_returns_json_504(self):
        self.search.side_effect = nasa_service.NasaTimeout("slow")

        response = self.client.get("/api/threads/1/nasa-media")

        self.assertEqual(response.status_code, 504)
        self.assertIn("did not respond in time", response.get_json()["error"])

    def test_nasa_failure_returns_json_502(self):
        self.search.side_effect = nasa_service.NasaUnavailable("HTTP 503")

        response = self.client.get("/api/threads/1/nasa-media")

        self.assertEqual(response.status_code, 502)
        self.assertIn("unavailable right now", response.get_json()["error"])
        # The upstream detail stays in the server log.
        self.assertNotIn("503", response.get_json()["error"])

    def test_upstream_failure_through_the_real_service(self):
        # The real search_thread_media, with only the network call mocked.
        with mock.patch.object(
            nasa_service, "search_thread_media", wraps=self.real_search
        ), mock.patch.object(nasa_service, "urlopen", side_effect=URLError(TimeoutError())):
            response = self.client.get("/api/threads/1/nasa-media")

        self.assertEqual(response.status_code, 504)

    def test_non_numeric_id_is_not_routed(self):
        self.assertEqual(self.client.get("/api/threads/black-holes/nasa-media").status_code, 404)
        self.get_thread.assert_not_called()

    def test_only_get_is_allowed(self):
        for method in ("post", "put", "patch", "delete"):
            with self.subTest(method=method):
                response = getattr(self.client, method)("/api/threads/1/nasa-media")
                self.assertEqual(response.status_code, 405)

    def test_thread_details_route_still_registered(self):
        rules = {rule.rule for rule in backend.app.url_map.iter_rules()}
        self.assertIn("/api/threads/<int:thread_id>", rules)
        self.assertIn("/api/threads/<int:thread_id>/nasa-media", rules)


if __name__ == "__main__":
    unittest.main()
