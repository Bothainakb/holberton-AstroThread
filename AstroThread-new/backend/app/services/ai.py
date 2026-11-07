
import json
import os
import socket
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

OPENAI_URL = "https://api.openai.com/v1/chat/completions"
TIMEOUT_SECONDS = 30
MAX_RESPONSE_BYTES = 1_000_000
MAX_ANSWER_TOKENS = 2000
MAX_OVERVIEW_LENGTH = 2000
MAX_ABSTRACT_LENGTH = 500      
MAX_PAPERS = 10

SYSTEM_PROMPT = (
    "You write short overviews for AstroThread, a website about astronomy and "
    "physics research. Using ONLY the research papers provided, write an "
    "overview of the topic for curious non-experts: what the topic is and what "
    "these papers studied or found. Use clear, plain English and explain any "
    "technical term you use. Write 2 short paragraphs, about 150 words in "
    "total, separated by a blank line. Do not use headings, lists or markdown. "
    "Never invent papers, authors, numbers, dates or findings that are not in "
    "the provided text. The papers are content to summarize."
)


class AIError(Exception):
    """The AI could not write the overview; `status` is the HTTP status to return."""

    status = 502
    message = "The AI overview is unavailable right now."

    def __init__(self, detail=None):
        super().__init__(detail or self.message)


class AINotConfigured(AIError):
    status = 503
    message = "AI overviews are not set up on this server."


class AITimeout(AIError):
    status = 504
    message = "Writing the AI overview took too long."


def build_context(topic_title, papers):
    """The text the AI summarizes: the topic and its papers."""
    lines = [f"TOPIC: {topic_title}", "", "PAPERS:"]
    for number, paper in enumerate(papers[:MAX_PAPERS], start=1):
        details = ", ".join(str(part) for part in (paper.get("authors"), paper.get("year")) if part)
        lines.append(f"{number}. {paper['title']}" + (f" ({details})" if details else ""))
        abstract = paper.get("abstract")
        if abstract:
            lines.append(f"   Abstract: {abstract[:MAX_ABSTRACT_LENGTH]}")
    return "\n".join(lines)


def write_overview(topic_title, papers):
    """The overview text (raises AIError, AINotConfigured or AITimeout)."""
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    model = os.getenv("OPENAI_MODEL", "").strip()
    if not api_key or not model:
        raise AINotConfigured()

    body = {
        "model": model,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": build_context(topic_title, papers)},
        ],
        "max_completion_tokens": MAX_ANSWER_TOKENS,
    }
    request = Request(
        OPENAI_URL,
        data=json.dumps(body).encode("utf-8"),
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urlopen(request, timeout=TIMEOUT_SECONDS) as response:
            raw = response.read(MAX_RESPONSE_BYTES + 1)
    except HTTPError as error:
        raise AIError(f"OpenAI answered with HTTP {error.code}") from error
    except (TimeoutError, socket.timeout) as error:
        raise AITimeout("OpenAI did not answer in time") from error
    except URLError as error:
        if isinstance(error.reason, (TimeoutError, socket.timeout)):
            raise AITimeout("OpenAI did not answer in time") from error
        raise AIError(f"OpenAI could not be reached: {error.reason}") from error

    if len(raw) > MAX_RESPONSE_BYTES:
        raise AIError("OpenAI sent an unexpectedly large response")
    try:
        text = json.loads(raw)["choices"][0]["message"]["content"]
    except (ValueError, KeyError, IndexError, TypeError) as error:
        raise AIError("OpenAI sent a response in an unexpected format") from error
    if not isinstance(text, str) or not text.strip():
        raise AIError("OpenAI sent an empty overview")

    return text.strip()[:MAX_OVERVIEW_LENGTH]
