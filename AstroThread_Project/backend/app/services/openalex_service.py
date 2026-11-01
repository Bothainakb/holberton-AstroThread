"""Research papers from OpenAlex for threads with none in the database
(GET /api/threads/<id>/openalex-papers).

OpenAlex (https://openalex.org) is a free scholarly index that needs no key.
A plain full-text search sorted by citations returns unrelated papers (SciPy,
NumPy, ...), so only research articles in Physics and Astronomy with the
thread's topic in their title are requested, and each result is checked again
here. ("expanding universe" alone also finds a protein-database paper.) Nothing is written to
the database: these are search results, not curated papers.
"""
import json
import re
import socket
from concurrent.futures import ThreadPoolExecutor
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urlparse
from urllib.request import Request, urlopen

from app.services.nasa_service import clean_text, search_terms

WORKS_URL = "https://api.openalex.org/works"
SOURCE_NAME = "OpenAlex"

TIMEOUT_SECONDS = 8
MAX_RESPONSE_BYTES = 2_000_000
# Candidates fetched per search; filtering keeps at most MAX_ITEMS.
PAGE_SIZE = 25
MAX_ITEMS = 6
MAX_AUTHORS = 3
MAX_SUMMARY_LENGTH = 280
# OpenAlex field "Physics and Astronomy" (https://openalex.org/fields/31).
PHYSICS_AND_ASTRONOMY_FIELD = 31
# Links only ever point at the paper's DOI or its OpenAlex page.
LINK_HOSTS = {"doi.org", "openalex.org"}

LEADING_ABSTRACT = re.compile(r"^abstract\b[\s:.\-\u2013\u2014]*", re.IGNORECASE)
# Publisher footers that some abstracts carry after the science text, e.g.
# "...expanding universes.Received 15 July 1968DOI:https://doi.org/...(c)1968 APS".
# The summary is cut at the first one; the scientific text before it is kept.
PUBLISHER_FOOTER = re.compile(
    r"Received\s+\d{1,2}\s+[A-Z][a-z]+\s+\d{4}"
    r"|\bDOI:\s*\S"
    r"|https?://(?:dx\.)?doi\.org/\S"
    r"|\u00a9"
    r"|\([cC]\)\s*\d{4}"
    r"|\bCopyright\b"
    r"|\bAll rights reserved\b"
    r"|\bPublished by\b"
)
# Escaped line breaks stored as text in some OpenAlex titles ("a glimpse of the
# \nepoch of deceleration"); shown as a space.
ESCAPED_LINE_BREAK = re.compile(r"\\[nr]")
# Hyphens and dashes OpenAlex titles use ("High\u2010Redshift"), treated as spaces.
HYPHENS = re.compile(r"[-\u2010\u2011\u2012\u2013\u2014]")

# Threads whose papers need more than the single title phrase from
# nasa_service.search_terms. Keys are lower-cased thread titles.
#   phrases:        title phrases searched separately, then merged by citations
#   per_phrase:     at most this many papers from each phrase (keeps the mix)
#   observational:  the title must say the paper reports observations or
#                   measurements (drops theory papers that only share a phrase)
#   max_per_event:  at most this many papers about one gravitational-wave
#                   event (GWyymmdd in the title or abstract)
# None of the three library topics (Black Holes, Exoplanets, Dark Matter)
# needs more than its single phrase today.
TOPIC_SEARCHES = {}
OBSERVATIONAL_TITLE = re.compile(
    r"observ|measur|evidence|supernova|survey|determin|constraint|detect", re.IGNORECASE
)
GW_EVENT = re.compile(r"\bGW\d{6}\b")

# Characters with a meaning in OpenAlex filter syntax.
FILTER_SYNTAX = re.compile(r'[,:|"!<>]')


class OpenAlexUnavailable(Exception):
    """OpenAlex could not be reached or sent something unusable."""


class OpenAlexTimeout(OpenAlexUnavailable):
    """OpenAlex did not answer within TIMEOUT_SECONDS."""


def fetch_works(phrase):
    """The raw JSON of the most-cited articles with `phrase` in their title."""
    phrase = " ".join(FILTER_SYNTAX.sub(" ", phrase).split())
    params = urlencode({
        "filter": f'title.search:"{phrase}",type:article,primary_topic.field.id:{PHYSICS_AND_ASTRONOMY_FIELD}',
        "sort": "cited_by_count:desc",
        "per-page": PAGE_SIZE,
        "select": "id,display_name,publication_year,doi,authorships,abstract_inverted_index,cited_by_count",
    })
    request = Request(
        f"{WORKS_URL}?{params}",
        headers={"Accept": "application/json", "User-Agent": "AstroThread/1.0"},
    )
    try:
        with urlopen(request, timeout=TIMEOUT_SECONDS) as response:
            body = response.read(MAX_RESPONSE_BYTES + 1)
    except HTTPError as exc:
        raise OpenAlexUnavailable(f"OpenAlex answered with HTTP {exc.code}") from exc
    except (TimeoutError, socket.timeout) as exc:
        raise OpenAlexTimeout("OpenAlex did not answer in time") from exc
    except URLError as exc:
        if isinstance(exc.reason, (TimeoutError, socket.timeout)):
            raise OpenAlexTimeout("OpenAlex did not answer in time") from exc
        raise OpenAlexUnavailable(f"OpenAlex could not be reached: {exc.reason}") from exc
    except OSError as exc:
        raise OpenAlexUnavailable(f"OpenAlex could not be reached: {exc}") from exc

    if len(body) > MAX_RESPONSE_BYTES:
        raise OpenAlexUnavailable("OpenAlex sent an unexpectedly large response")
    try:
        return json.loads(body)
    except ValueError as exc:
        raise OpenAlexUnavailable("OpenAlex sent a response that is not JSON") from exc


def normalize(text):
    """Lowercase with hyphens as spaces, so "black-hole" matches "black hole"."""
    return " ".join(HYPHENS.sub(" ", text.lower()).split())


def paper_link(work):
    """The DOI link, else the OpenAlex page; None unless it is https on LINK_HOSTS."""
    for value in (work.get("doi"), work.get("id")):
        if not isinstance(value, str):
            continue
        url = urlparse(value)
        if url.scheme == "https" and url.hostname in LINK_HOSTS:
            return value
    return None


def authors_of(work):
    names = [
        clean_text(((authorship or {}).get("author") or {}).get("display_name"))
        for authorship in work.get("authorships") or []
        if isinstance(authorship, dict)
    ]
    names = [name for name in names if name]
    if not names:
        return None
    shown = ", ".join(names[:MAX_AUTHORS])
    return f"{shown} et al." if len(names) > MAX_AUTHORS else shown


def full_abstract(work):
    """The whole abstract as plain text, without a leading "Abstract" heading or a
    publisher footer; "" when OpenAlex has none.

    OpenAlex stores abstracts as {word: [positions]}; the words are put back in order.
    """
    index = work.get("abstract_inverted_index")
    if not isinstance(index, dict):
        return ""
    words = {}
    for word, positions in index.items():
        if isinstance(word, str) and isinstance(positions, list):
            for position in positions:
                if isinstance(position, int) and position >= 0:
                    words[position] = word
    text = clean_text(" ".join(words[position] for position in sorted(words)))
    # Some publishers include the heading itself: "Abstract On 2017 August 17 ...".
    text = LEADING_ABSTRACT.sub("", text)
    footer = PUBLISHER_FOOTER.search(text)
    if footer:
        text = text[:footer.start()].rstrip(" ;,:")
    return text


def abstract_of(work):
    """The abstract cut to MAX_SUMMARY_LENGTH; None when OpenAlex has none."""
    text = full_abstract(work)
    if not text:
        return None
    if len(text) <= MAX_SUMMARY_LENGTH:
        return text
    return text[:MAX_SUMMARY_LENGTH].rsplit(" ", 1)[0].rstrip(",;:") + "\u2026"


def to_paper(work):
    """One API item, or None when the work lacks an id, a title or a safe link."""
    if not isinstance(work, dict) or not isinstance(work.get("id"), str):
        return None
    title = clean_text(ESCAPED_LINE_BREAK.sub(" ", work.get("display_name") or ""))
    url = paper_link(work)
    if not title or url is None:
        return None
    year = work.get("publication_year")
    return {
        "openalex_id": work["id"],
        "title": title,
        "authors": authors_of(work),
        "year": year if isinstance(year, int) else None,
        "url": url,
        "summary": abstract_of(work),
    }


def candidates(results, phrases, observational=False, limit=None):
    """(citations, paper, events) for usable works whose title contains one of
    `phrases`, in OpenAlex order (most cited first), at most `limit` of them."""
    wanted = [normalize(phrase) for phrase in phrases]
    found = []
    for work in results:
        paper = to_paper(work)
        if paper is None:
            continue
        title = normalize(paper["title"])
        if not any(phrase in title for phrase in wanted):
            continue
        if observational and not OBSERVATIONAL_TITLE.search(paper["title"]):
            continue
        cited = work.get("cited_by_count")
        events = set(GW_EVENT.findall(f"{paper['title']} {full_abstract(work)}"))
        found.append((cited if isinstance(cited, int) else 0, paper, events))
        if limit is not None and len(found) == limit:
            break
    return found


def pick_papers(found, max_per_event=None):
    """At most MAX_ITEMS papers from `found`, without repeated works or titles and
    with at most `max_per_event` papers about the same gravitational-wave event."""
    papers, seen_ids, seen_titles, per_event = [], set(), set(), {}
    for _cited, paper, events in found:
        title = normalize(paper["title"])
        if paper["openalex_id"] in seen_ids or title in seen_titles:
            continue
        if max_per_event is not None and any(per_event.get(event, 0) >= max_per_event for event in events):
            continue
        seen_ids.add(paper["openalex_id"])
        seen_titles.add(title)
        for event in events:
            per_event[event] = per_event.get(event, 0) + 1
        papers.append(paper)
        if len(papers) == MAX_ITEMS:
            break
    return papers


def relevant_papers(results, phrases):
    """Papers whose title contains one of `phrases`, without repeated titles."""
    return pick_papers(candidates(results, phrases))


def results_of(data):
    results = data.get("results") if isinstance(data, dict) else None
    if not isinstance(results, list):
        raise OpenAlexUnavailable("OpenAlex sent results in an unexpected format")
    return results


def search_thread_papers(thread_title):
    """{"query", "phrases", "observational", "source", "items"}: the most-cited
    relevant OpenAlex articles for a thread (see TOPIC_SEARCHES)."""
    query, phrases = search_terms(thread_title)
    config = TOPIC_SEARCHES.get(thread_title.strip().lower(), {})
    search_phrases = config.get("phrases", (query,))

    if len(search_phrases) == 1:
        found = candidates(results_of(fetch_works(query)), phrases or (query,), config.get("observational", False))
    else:
        # One request per phrase, at the same time; each phrase must appear in
        # the title of its own results, then all are ranked by citations.
        with ThreadPoolExecutor(max_workers=len(search_phrases)) as pool:
            pages = list(pool.map(fetch_works, search_phrases))
        found = []
        for phrase, data in zip(search_phrases, pages):
            found.extend(candidates(
                results_of(data), (phrase,), config.get("observational", False), config.get("per_phrase"),
            ))
        found.sort(key=lambda entry: -entry[0])

    return {
        "query": query,
        "phrases": list(search_phrases),
        "observational": bool(config.get("observational")),
        "source": SOURCE_NAME,
        "items": pick_papers(found, config.get("max_per_event")),
    }
