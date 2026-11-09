
import json
import socket
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

WORKS_URL = "https://api.openalex.org/works"
PHYSICS_AND_ASTRONOMY_FIELD = 31         
FIELDS = (
    "id,display_name,publication_year,doi,authorships,abstract_inverted_index,"
    "cited_by_count,primary_location,primary_topic,keywords"
)

TIMEOUT_SECONDS = 8
MAX_RESPONSE_BYTES = 2_000_000
MAX_PAPERS = 20
MAX_AUTHORS = 3              
MAX_AUTHOR_LIST = 10        
MAX_KEYWORDS = 6
MAX_ABSTRACT_LENGTH = 1200


class OpenAlexError(Exception):
    """OpenAlex could not be reached or sent something unusable (HTTP 502)."""

    status = 502
    message = "Research papers could not be loaded right now. Please try again."


class OpenAlexTimeout(OpenAlexError):
    """OpenAlex did not answer in time (HTTP 504)."""

    status = 504
    message = "Searching for papers took too long. Please try again."


def search_papers(query):
    """Up to MAX_PAPERS papers matching `query`, best match first (raises OpenAlexError)."""
    params = urlencode({
        "search": query,
        "filter": f"type:article,primary_topic.field.id:{PHYSICS_AND_ASTRONOMY_FIELD}",
        "per-page": MAX_PAPERS,
        "select": FIELDS,
    })
    data = get_json(f"{WORKS_URL}?{params}")

    results = data.get("results") if isinstance(data, dict) else None
    if not isinstance(results, list):
        raise OpenAlexError("OpenAlex sent results in an unexpected format")

    papers = [to_paper(work) for work in results]
    return [paper for paper in papers if paper is not None]


def get_json(url):
    """GET a URL and decode its JSON, with a time limit and a size limit."""
    request = Request(url, headers={"Accept": "application/json", "User-Agent": "AstroThread/1.0"})
    try:
        with urlopen(request, timeout=TIMEOUT_SECONDS) as response:
            body = response.read(MAX_RESPONSE_BYTES + 1)
    except HTTPError as error:
        raise OpenAlexError(f"OpenAlex answered with HTTP {error.code}") from error
    except (TimeoutError, socket.timeout) as error:
        raise OpenAlexTimeout("OpenAlex did not answer in time") from error
    except URLError as error:
        if isinstance(error.reason, (TimeoutError, socket.timeout)):
            raise OpenAlexTimeout("OpenAlex did not answer in time") from error
        raise OpenAlexError(f"OpenAlex could not be reached: {error.reason}") from error

    if len(body) > MAX_RESPONSE_BYTES:
        raise OpenAlexError("OpenAlex sent an unexpectedly large response")
    try:
        return json.loads(body)
    except ValueError as error:
        raise OpenAlexError("OpenAlex sent a response that is not JSON") from error


def to_paper(work):
    """One OpenAlex result -> the dict we store, or None if it has no id or title."""
    if not isinstance(work, dict):
        return None
    openalex_id = work.get("id")
    title = work.get("display_name")
    if not isinstance(openalex_id, str) or not isinstance(title, str) or not title.strip():
        return None

    year = work.get("publication_year")
    cited_by = work.get("cited_by_count")
    doi = work.get("doi")
    names = author_list(work.get("authorships"))
    return {
        "openalex_id": openalex_id,
        "title": " ".join(title.split()),
        "authors": short_authors(names),
        "author_list": names[:MAX_AUTHOR_LIST],
        "publication_year": year if isinstance(year, int) else None,
        "abstract": rebuild_abstract(work.get("abstract_inverted_index")),
        "url": doi if isinstance(doi, str) and doi.startswith("https://doi.org/") else openalex_id,
        "cited_by_count": cited_by if isinstance(cited_by, int) else None,
        "venue": nested_name(work.get("primary_location"), "source"),
        "topic": nested_name(work, "primary_topic"),
        "keywords": keyword_names(work.get("keywords")),
    }


def nested_name(parent, key):
    """parent[key]["display_name"] if it is text, else None."""
    child = parent.get(key) if isinstance(parent, dict) else None
    name = child.get("display_name") if isinstance(child, dict) else None
    return name.strip() if isinstance(name, str) and name.strip() else None


def author_list(authorships):
    """All author names from OpenAlex's authorships list, in order."""
    names = []
    for authorship in authorships if isinstance(authorships, list) else []:
        name = nested_name(authorship, "author")
        if name:
            names.append(name)
    return names


def short_authors(names):
    """'A, B, C et al.' (None if there are no authors)."""
    if not names:
        return None
    shown = ", ".join(names[:MAX_AUTHORS])
    return f"{shown} et al." if len(names) > MAX_AUTHORS else shown


def keyword_names(keywords):
    """The names from OpenAlex's keywords list (at most MAX_KEYWORDS)."""
    names = []
    for keyword in keywords if isinstance(keywords, list) else []:
        name = keyword.get("display_name") if isinstance(keyword, dict) else None
        if isinstance(name, str) and name.strip() and name.strip() not in names:
            names.append(name.strip())
    return names[:MAX_KEYWORDS]


def rebuild_abstract(inverted_index):
    """OpenAlex stores abstracts as {word: [positions]}; put the words back in order."""
    if not isinstance(inverted_index, dict) or not inverted_index:
        return None
    words = {}
    for word, positions in inverted_index.items():
        for position in positions if isinstance(positions, list) else []:
            if isinstance(position, int):
                words[position] = word
    text = " ".join(words[position] for position in sorted(words))
    if len(text) > MAX_ABSTRACT_LENGTH:
        text = text[:MAX_ABSTRACT_LENGTH].rsplit(" ", 1)[0] + "…"
    return text or None
