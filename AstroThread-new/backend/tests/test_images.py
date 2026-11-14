import json
import socket
import unittest
from io import BytesIO
from unittest import mock
from urllib.error import HTTPError, URLError

from app import create_app
from app.services import nasa_images

ITEM = {
    "href": "https://images-assets.nasa.gov/image/PIA23122/collection.json",
    "data": [{
        "nasa_id": "PIA23122",
        "title": "First  Image of a Black Hole",
        "description": "<p>The Event Horizon Telescope captured <b>M87*</b>.</p>",
        "date_created": "2019-04-10T00:00:00Z",
        "center": "JPL",
        "media_type": "image",
    }],
    "links": [{
        "href": "https://images-assets.nasa.gov/image/PIA23122/PIA23122~thumb.jpg",
        "rel": "preview",
        "render": "image",
    }],
}
IMAGE = {
    "id": "PIA23122",
    "title": "First Image of a Black Hole",
    "description": "The Event Horizon Telescope captured M87*.",
    "thumbnailUrl": "https://images-assets.nasa.gov/image/PIA23122/PIA23122~thumb.jpg",
    "imageUrl": "https://images-assets.nasa.gov/image/PIA23122/PIA23122~thumb.jpg",
    "pageUrl": "https://images.nasa.gov/details/PIA23122",
    "credit": "NASA JPL",
    "date": "2019-04-10",
}


class FakeResponse:
    def __init__(self, payload):
        self.body = BytesIO(payload if isinstance(payload, bytes) else json.dumps(payload).encode())

    def read(self, size=-1):
        return self.body.read(size)

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False


def nasa_answer(items):
    return FakeResponse({"collection": {"items": items}})


class ImageRouteTests(unittest.TestCase):
    def setUp(self):
        app = create_app()
        app.logger.disabled = True
        self.client = app.test_client()

        patcher = mock.patch.object(nasa_images, "urlopen", return_value=nasa_answer([ITEM]))
        self.urlopen = patcher.start()
        self.addCleanup(patcher.stop)

    def test_search_returns_space_images(self):
        response = self.client.get("/api/images?q=black%20%20holes")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json(), {"query": "black holes", "results": [IMAGE]})
        url = self.urlopen.call_args.args[0].full_url
        self.assertIn("q=black+holes", url)
        self.assertIn("media_type=image", url)

    def test_invalid_searches_are_400(self):
        for url in ("/api/images", "/api/images?q=a", "/api/images?q=" + "x" * 101):
            with self.subTest(url=url[:30]):
                self.assertEqual(self.client.get(url).status_code, 400)
        self.urlopen.assert_not_called()

    def test_nasa_failures_are_502_or_504(self):
        for failure, status in (
            (socket.timeout(), 504),
            (URLError(TimeoutError()), 504),
            (URLError("no route"), 502),
            (HTTPError("u", 500, "Server Error", {}, None), 502),
        ):
            with self.subTest(status=status, failure=failure):
                self.urlopen.side_effect = failure
                self.assertEqual(self.client.get("/api/images?q=moon").status_code, status)

    def test_unexpected_answers_are_502(self):
        for payload in (b"not json", {"collection": {}}, ["list"]):
            with self.subTest(payload=str(payload)[:20]):
                self.urlopen.return_value = FakeResponse(payload)
                self.assertEqual(self.client.get("/api/images?q=moon").status_code, 502)


class ToImageTests(unittest.TestCase):
    def test_results_without_id_title_or_https_preview_are_skipped(self):
        no_preview = {**ITEM, "links": [{"href": "http://example.com/a.jpg", "rel": "preview"}]}
        no_title = {**ITEM, "data": [{"nasa_id": "X1"}]}
        for item in (no_preview, no_title, {"data": "oops"}, "oops"):
            with self.subTest(item=str(item)[:30]):
                self.assertIsNone(nasa_images.to_image(item))

    def test_credit_prefers_the_photographer(self):
        data = {"photographer": "Bill Ingalls", "center": "HQ"}
        self.assertEqual(nasa_images.credit(data), "Bill Ingalls")
        self.assertEqual(nasa_images.credit({"center": "HQ"}), "NASA HQ")
        self.assertEqual(nasa_images.credit({}), "NASA")

    def test_long_descriptions_are_cut_at_a_word(self):
        description = nasa_images.clean_description("word " * 200)
        self.assertLessEqual(len(description), nasa_images.MAX_DESCRIPTION_LENGTH + 1)
        self.assertTrue(description.endswith("word…"))


if __name__ == "__main__":
    unittest.main()
