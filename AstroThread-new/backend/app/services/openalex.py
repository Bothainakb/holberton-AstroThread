import json
import socket
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

WORKS_URL = "https://api.openalex.org/works"
PHYSICS_AND_ASTRONOMY_FIELD = 31          
FIELDS = "id,display_name,publication_year,doi,authorships,abstract_inverted_index,cited_by_count"

TIMEOUT_SECONDS = 8
MAX_RESPONSE_BYTES = 2_000_000
MAX_PAPERS = 10
MAX_AUTHORS = 3
MAX_ABSTRACT_LENGTH = 600


class OpenAlexError(Exception):
    """OpenAlex could not be reached or sent something unusable."""

    status = 502
    message = "Research papers could not be loaded right now. Please try again."


class OpenAlexTimeout(OpenAlexError):
    """OpenAlex did not answer in time."""

    status = 504
    message = "Searching for papers took too long. Please try again."


def search_papers(query):
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
    if not isinstance(work, dict):
        return None
    openalex_id = work.get("id")
    title = work.get("display_name")
    if not isinstance(openalex_id, str) or not isinstance(title, str) or not title.strip():
        return None

    year = work.get("publication_year")
    cited_by = work.get("cited_by_count")
    doi = work.get("doi")
    return {
        "openalex_id": openalex_id,
        "title": " ".join(title.split()),
        "authors": author_names(work.get("authorships")),
        "publication_year": year if isinstance(year, int) else None,
        "abstract": rebuild_abstract(work.get("abstract_inverted_index")),
        "url": doi if isinstance(doi, str) and doi.startswith("https://doi.org/") else openalex_id,
        "cited_by_count": cited_by if isinstance(cited_by, int) else None,
    }


def author_names(authorships):
    names = []
    for authorship in authorships if isinstance(authorships, list) else []:
        author = authorship.get("author") if isinstance(authorship, dict) else None
        name = author.get("display_name") if isinstance(author, dict) else None
        if isinstance(name, str) and name.strip():
            names.append(name.strip())
    if not names:
        return None
    shown = ", ".join(names[:MAX_AUTHORS])
    return f"{shown} et al." if len(names) > MAX_AUTHORS else shown


def rebuild_abstract(inverted_index):
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
