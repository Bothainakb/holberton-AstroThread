"""NASA images for the Thread Details page (GET /api/threads/<id>/nasa-media).

Searches the NASA Image and Video Library (https://images.nasa.gov), a public
API that needs no key. Uses only the standard library, so no new dependency.
A plain text search also returns off-topic images (Saturn's ring "waves" for
gravitational waves), so results must mention the thread's topic, and those
NASA tagged with it come first.
"""
import html
import json
import re
import socket
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlencode, urlparse
from urllib.request import Request, urlopen

SEARCH_URL = "https://images-api.nasa.gov/search"
DETAILS_URL = "https://images.nasa.gov/details/"
SOURCE_NAME = "NASA Image and Video Library"

TIMEOUT_SECONDS = 8
MAX_RESPONSE_BYTES = 2_000_000
# Candidates fetched per search; filtering keeps at most MAX_ITEMS.
PAGE_SIZE = 40
MAX_ITEMS = 6
MAX_DESCRIPTION_LENGTH = 280

# Search text and the phrases a result must mention, by thread title.
# Threads not listed here search for their title with no extra filter.
THREAD_SEARCHES = {
    "black holes": ("black hole", ("black hole", "blackhole")),
    "exoplanets": ("exoplanet", ("exoplanet",)),
    "gravitational waves": ("gravitational wave", ("gravitational wave", "gravitational-wave")),
}

TAG_PATTERN = re.compile(r"<[^>]+>")
DATE_PATTERN = re.compile(r"^\d{4}-\d{2}-\d{2}")


class NasaUnavailable(Exception):
    """NASA could not be reached or sent something unusable."""


class NasaTimeout(NasaUnavailable):
    """NASA did not answer within TIMEOUT_SECONDS."""


def search_terms(thread_title):
    """(search text, phrases a result must mention) for a thread title."""
    key = thread_title.strip().lower()
    if key in THREAD_SEARCHES:
        return THREAD_SEARCHES[key]
    return thread_title.strip(), ()


def fetch_search(query):
    """The raw JSON of one image search."""
    params = urlencode({"q": query, "media_type": "image", "page_size": PAGE_SIZE})
    request = Request(
        f"{SEARCH_URL}?{params}",
        headers={"Accept": "application/json", "User-Agent": "AstroThread/1.0"},
    )
    try:
        with urlopen(request, timeout=TIMEOUT_SECONDS) as response:
            body = response.read(MAX_RESPONSE_BYTES + 1)
    except HTTPError as exc:
        raise NasaUnavailable(f"NASA answered with HTTP {exc.code}") from exc
    except (TimeoutError, socket.timeout) as exc:
        raise NasaTimeout("NASA did not answer in time") from exc
    except URLError as exc:
        if isinstance(exc.reason, (TimeoutError, socket.timeout)):
            raise NasaTimeout("NASA did not answer in time") from exc
        raise NasaUnavailable(f"NASA could not be reached: {exc.reason}") from exc
    except OSError as exc:
        raise NasaUnavailable(f"NASA could not be reached: {exc}") from exc

    if len(body) > MAX_RESPONSE_BYTES:
        raise NasaUnavailable("NASA sent an unexpectedly large response")
    try:
        return json.loads(body)
    except ValueError as exc:
        raise NasaUnavailable("NASA sent a response that is not JSON") from exc


def is_nasa_https(url):
    """Only HTTPS links on nasa.gov are passed to the page."""
    if not isinstance(url, str):
        return False
    parsed = urlparse(url)
    host = parsed.hostname or ""
    return parsed.scheme == "https" and (host == "nasa.gov" or host.endswith(".nasa.gov"))


def clean_text(value):
    """Plain text: NASA descriptions sometimes contain HTML tags and entities."""
    if not isinstance(value, str):
        return ""
    return " ".join(html.unescape(TAG_PATTERN.sub(" ", value)).split())


def shorten(text, limit=MAX_DESCRIPTION_LENGTH):
    if len(text) <= limit:
        return text
    cut = text[:limit].rsplit(" ", 1)[0].rstrip(",;:.")
    return f"{cut}…"


def image_link(links):
    """The preview image, else the smallest image NASA lists (never the original)."""
    images = [
        link for link in links or []
        if isinstance(link, dict) and link.get("render") == "image" and is_nasa_https(link.get("href"))
    ]
    for link in images:
        if link.get("rel") == "preview":
            return link["href"]
    sized = [link for link in images if isinstance(link.get("width"), int)]
    if sized:
        return min(sized, key=lambda link: link["width"])["href"]
    resized = [link for link in images if "~orig." not in link["href"]]
    return resized[0]["href"] if resized else None


def keywords_of(data):
    """NASA keywords, lower-cased; some items pack several into one string."""
    words = []
    for keyword in data.get("keywords") or []:
        if isinstance(keyword, str):
            words.extend(part.strip().lower() for part in keyword.split(","))
    return words


def to_media_item(item):
    """One search result as the page shows it, or None if it is unusable."""
    if not isinstance(item, dict) or not isinstance(item.get("data"), list) or not item["data"]:
        return None
    data = item["data"][0]
    if not isinstance(data, dict) or data.get("media_type") != "image":
        return None
    nasa_id = data.get("nasa_id")
    title = clean_text(data.get("title"))
    image_url = image_link(item.get("links"))
    # Press photos are often titled with their bare id ("KSC-2011-7033").
    if not isinstance(nasa_id, str) or not nasa_id or not title or title == nasa_id or not image_url:
        return None

    date = data.get("date_created")
    credit = clean_text(data.get("secondary_creator") or data.get("photographer")) or None
    return {
        "nasa_id": nasa_id,
        "title": title,
        "description": shorten(clean_text(data.get("description"))) or None,
        "date": date[:10] if isinstance(date, str) and DATE_PATTERN.match(date) else None,
        "center": clean_text(data.get("center")) or None,
        "credit": credit,
        "image_url": image_url,
        "source_url": DETAILS_URL + quote(nasa_id, safe=""),
    }


def relevant_items(payload, required_phrases):
    """Usable, de-duplicated results that mention the topic, tagged ones first."""
    collection = payload.get("collection") if isinstance(payload, dict) else None
    items = collection.get("items") if isinstance(collection, dict) else None
    if not isinstance(items, list):
        raise NasaUnavailable("NASA sent a response in an unexpected format")

    tagged, mentioned = [], []
    seen_titles = set()
    for item in items:
        media = to_media_item(item)
        if media is None or media["title"].lower() in seen_titles:
            continue
        keywords = " ".join(keywords_of(item["data"][0]))
        text = f"{media['title']} {clean_text(item['data'][0].get('description'))}".lower()
        is_tagged = any(phrase in keywords for phrase in required_phrases)
        if required_phrases and not is_tagged and not any(phrase in text for phrase in required_phrases):
            continue
        seen_titles.add(media["title"].lower())
        (tagged if is_tagged else mentioned).append(media)
    return (tagged + mentioned)[:MAX_ITEMS]


def search_thread_media(thread_title):
    """NASA images for a research thread. Raises NasaUnavailable / NasaTimeout."""
    query, required_phrases = search_terms(thread_title)
    payload = fetch_search(query)
    return {
        "query": query,
        "source": SOURCE_NAME,
        "items": relevant_items(payload, required_phrases),
    }
