import requests

TIMEOUT = 8  # seconds


def _abstract(inverted_index):
    """OpenAlex stores abstracts as {word: [positions]}; rebuild the text."""
    if not inverted_index:
        return None
    words = {pos: word for word, positions in inverted_index.items() for pos in positions}
    return " ".join(words[i] for i in sorted(words))


def search_openalex_papers(topic, limit=5):
    response = requests.get(
        "https://api.openalex.org/works",
        params={"search": topic, "per-page": limit, "sort": "cited_by_count:desc"},
        timeout=TIMEOUT,
    )
    response.raise_for_status()
    papers = []
    for work in response.json().get("results", []):
        abstract = _abstract(work.get("abstract_inverted_index"))
        papers.append({
            "openalex_id": work["id"],
            "title": work.get("display_name") or "Untitled",
            "authors": ", ".join(
                a["author"]["display_name"] for a in work.get("authorships", [])[:3]
            ),
            "publication_year": work.get("publication_year"),
            "summary": abstract[:300] if abstract else None,
            "url": work.get("doi") or work["id"],
        })
    return papers


def search_nasa_images(topic, limit=4):
    response = requests.get(
        "https://images-api.nasa.gov/search",
        params={"q": topic, "media_type": "image"},
        timeout=TIMEOUT,
    )
    response.raise_for_status()
    media = []
    for item in response.json()["collection"]["items"][:limit]:
        data = item["data"][0]
        links = item.get("links") or [{}]
        media.append({
            "title": data.get("title", ""),
            "description": (data.get("description") or "")[:300],
            "imageUrl": links[0].get("href"),
        })
    return media
