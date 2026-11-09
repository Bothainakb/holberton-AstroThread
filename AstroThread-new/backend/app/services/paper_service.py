import re

from app.services.home_service import PAPER_COLUMNS, row_to_paper

RELATED_LIMIT = 3
RELATED_CANDIDATES = 40

OBSERVATIONAL_WORDS = re.compile(
    r"\b(observ\w*|measur\w*|detect\w*|survey\w*|telescope\w*|spectroscop\w*|"
    r"photometr\w*|imag(?:e|es|ing)|discover\w*|catalog\w*|monitor\w*|"
    r"evidence|data)\b",
    re.IGNORECASE,
)


def paper_type(paper):
    """'observational' or 'theoretical', estimated from the title and abstract."""
    text = f"{paper.get('title') or ''} {paper.get('abstract') or ''}"
    return "observational" if OBSERVATIONAL_WORDS.search(text) else "theoretical"


def author_names(paper):
    """The full author list, or the short 'A, B et al.' text split into names."""
    if paper.get("author_list"):
        return paper["author_list"]
    short = (paper.get("authors") or "").removesuffix(" et al.")
    return [name.strip() for name in short.split(",") if name.strip()]


def to_summary(paper, fallback_topic=None):
    """A stored paper -> the frontend's PaperSummary (plus url and citedByCount)."""
    return {
        "id": str(paper["id"]),
        "title": paper["title"],
        "authors": author_names(paper),
        "year": paper.get("year") or 0,
        "venue": paper.get("venue") or "",
        "topic": paper.get("topic") or fallback_topic or "Other",
        "paperType": paper_type(paper),
        "keywords": paper.get("keywords") or [],
        "abstract": paper.get("abstract") or "",
        "url": paper.get("url"),
        "citedByCount": paper.get("cited_by_count"),
    }


def get_paper(cur, paper_id):
    """A stored paper with its AI explanations and the topic that found it, or None."""
    cur.execute(
        f"""
        SELECT {PAPER_COLUMNS},
               p.method, p.main_finding, p.why_it_matters,
               (SELECT t.title
                FROM thread_papers tp
                JOIN research_threads t ON t.id = tp.thread_id
                WHERE tp.paper_id = p.id
                ORDER BY t.search_count DESC
                LIMIT 1) AS search_topic
        FROM research_papers p
        WHERE p.id = %s;
        """,
        (paper_id,),
    )
    row = cur.fetchone()
    if row is None:
        return None
    paper = row_to_paper(row)
    paper.update({
        "method": row[11],
        "main_finding": row[12],
        "why_it_matters": row[13],
        "search_topic": row[14],
    })
    return paper


def to_details(paper):
    """A paper from get_paper -> the frontend's PaperDetails.

    Missing explanations are sent as null; the page shows "Not available for
    this paper yet." for them.
    """
    return {
        **to_summary(paper, paper.get("search_topic")),
        "method": paper.get("method"),
        "mainFinding": paper.get("main_finding"),
        "whyItMatters": paper.get("why_it_matters"),
    }


def save_details(cur, paper_id, details):
    """Store the AI explanations, unless another request stored them first."""
    cur.execute(
        """
        UPDATE research_papers
        SET method = %s, main_finding = %s, why_it_matters = %s,
            details_generated_at = NOW()
        WHERE id = %s AND method IS NULL;
        """,
        (details["method"], details["main_finding"], details["why_it_matters"], paper_id),
    )


def get_related(cur, paper):
    """Up to RELATED_LIMIT other papers found by the same searches, most similar first.

    Similar = shares keywords (2 points each) and the same topic (3 points);
    ties go to the newer paper.
    """
    cur.execute(
        f"""
        SELECT DISTINCT {PAPER_COLUMNS}
        FROM thread_papers mine
        JOIN thread_papers other ON other.thread_id = mine.thread_id
        JOIN research_papers p ON p.id = other.paper_id
        WHERE mine.paper_id = %s AND p.id <> %s
        LIMIT %s;
        """,
        (paper["id"], paper["id"], RELATED_CANDIDATES),
    )
    candidates = [row_to_paper(row) for row in cur.fetchall()]

    keywords = {keyword.lower() for keyword in paper.get("keywords") or []}

    def score(other):
        shared = sum(1 for keyword in other["keywords"] if keyword.lower() in keywords)
        same_topic = 3 if other["topic"] and other["topic"] == paper.get("topic") else 0
        return (shared * 2 + same_topic, other["year"] or 0)

    candidates.sort(key=score, reverse=True)
    topic = paper.get("search_topic")
    return [to_summary(other, topic) for other in candidates[:RELATED_LIMIT]]
