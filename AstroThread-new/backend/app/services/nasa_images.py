import json
import re
import socket
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlencode
from urllib.request import Request, urlopen

SEARCH_URL = "https://images-api.nasa.gov/search"
DETAILS_URL = "https://images.nasa.gov/details/"

TIMEOUT_SECONDS = 8
MAX_RESPONSE_BYTES = 3_000_000
MAX_IMAGES = 24
MAX_DESCRIPTION_LENGTH = 500

HTML_TAG = re.compile(r"<[^>]+>")
SPACE_BEFORE_PUNCTUATION = re.compile(r"\s+([.,;:!?])")


class NasaImagesError(Exception):

    status = 502
    message = "Space images could not be loaded right now. Please try again."


class NasaImagesTimeout(NasaImagesError):

    status = 504
    message = "Searching for images took too long. Please try again."


def search_images(query):
    params = urlencode({"q": query, "media_type": "image", "page_size": MAX_IMAGES})
    data = get_json(f"{SEARCH_URL}?{params}")

    collection = data.get("collection") if isinstance(data, dict) else None
    items = collection.get("items") if isinstance(collection, dict) else None
    if not isinstance(items, list):
        raise NasaImagesError("NASA sent results in an unexpected format")

    images = [to_image(item) for item in items]
    return [image for image in images if image is not None][:MAX_IMAGES]


def get_json(url):
    request = Request(url, headers={"Accept": "application/json", "User-Agent": "AstroThread/1.0"})
    try:
        with urlopen(request, timeout=TIMEOUT_SECONDS) as response:
            body = response.read(MAX_RESPONSE_BYTES + 1)
    except HTTPError as error:
        raise NasaImagesError(f"NASA answered with HTTP {error.code}") from error
    except (TimeoutError, socket.timeout) as error:
        raise NasaImagesTimeout("NASA did not answer in time") from error
    except URLError as error:
        if isinstance(error.reason, (TimeoutError, socket.timeout)):
            raise NasaImagesTimeout("NASA did not answer in time") from error
        raise NasaImagesError(f"NASA could not be reached: {error.reason}") from error

    if len(body) > MAX_RESPONSE_BYTES:
        raise NasaImagesError("NASA sent an unexpectedly large response")
    try:
        return json.loads(body)
    except ValueError as error:
        raise NasaImagesError("NASA sent a response that is not JSON") from error


def to_image(item):
    if not isinstance(item, dict):
        return None
    data = first(item.get("data"))
    nasa_id = text(data.get("nasa_id"))
    title = text(data.get("title"))
    thumbnail = preview_url(item.get("links"))
    if not nasa_id or not title or not thumbnail:
        return None

    return {
        "id": nasa_id,
        "title": title,
        "description": clean_description(data.get("description")),
        "thumbnailUrl": thumbnail,
        "imageUrl": thumbnail,
        "pageUrl": DETAILS_URL + quote(nasa_id),
        "credit": credit(data),
        "date": text(data.get("date_created"))[:10],
    }


def first(value):
    if isinstance(value, list) and value and isinstance(value[0], dict):
        return value[0]
    return {}


def text(value):
    return " ".join(value.split()) if isinstance(value, str) else ""


def preview_url(links):
    for link in links if isinstance(links, list) else []:
        if not isinstance(link, dict):
            continue
        href = link.get("href")
        if link.get("rel") == "preview" and isinstance(href, str) and href.startswith("https://"):
            return href
    return ""


def clean_description(value):
    description = text(HTML_TAG.sub(" ", value) if isinstance(value, str) else "")
    description = SPACE_BEFORE_PUNCTUATION.sub(r"\1", description)
    if len(description) > MAX_DESCRIPTION_LENGTH:
        description = description[:MAX_DESCRIPTION_LENGTH].rsplit(" ", 1)[0] + "…"
    return description


def credit(data):
    for key in ("photographer", "secondary_creator"):
        name = text(data.get(key))
        if name:
            return name
    center = text(data.get("center"))
    return f"NASA {center}" if center else "NASA"
