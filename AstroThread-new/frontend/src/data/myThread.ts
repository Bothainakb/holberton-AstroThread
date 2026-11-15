import { apiBaseUrl, searchSource } from "../services/search/searchService";

// "My Thread": a signed-in user's saved topics and research journey.
// The pages read and change the copy in localStorage straight away (so they never wait).
// With the backend on, every change is also sent to /api/my-thread, which keeps the real
// copy in PostgreSQL, and syncMyThread() reloads that copy when the website opens or
// after signing in. In sample mode, localStorage is the only copy.

export interface SavedTopic {
  topic: string;
  savedAt: string;
}

interface StepBase {
  id: string;
  at: string;
  note?: string;
}

export type JourneyStep =
  | (StepBase & { type: "search"; query: string })
  | (StepBase & { type: "paper"; paperId: string; title: string; topic: string });

export interface MyThread {
  topics: SavedTopic[];
  journey: JourneyStep[];
}

const USES_BACKEND = searchSource === "api";
const STORAGE_PREFIX = "astrothread-my-thread:";
const MAX_JOURNEY_STEPS = 100;
const MAX_NOTE_LENGTH = 500;

function storageKey(email: string) {
  return `${STORAGE_PREFIX}${email.trim().toLowerCase()}`;
}

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function sameText(a: string, b: string) {
  return a.trim().toLocaleLowerCase() === b.trim().toLocaleLowerCase();
}

export function getMyThread(email: string): MyThread {
  try {
    const raw = window.localStorage.getItem(storageKey(email));
    const parsed: unknown = raw ? JSON.parse(raw) : null;

    if (parsed && typeof parsed === "object") {
      const data = parsed as Partial<MyThread>;
      return {
        topics: Array.isArray(data.topics) ? data.topics : [],
        journey: Array.isArray(data.journey) ? data.journey : [],
      };
    }
  } catch {
  }

  return { topics: [], journey: [] };
}

function send(method: "POST" | "PATCH" | "DELETE", path: string, body?: unknown) {
  if (!USES_BACKEND) {
    return;
  }

  fetch(`${apiBaseUrl}/my-thread${path}`, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    keepalive: true,
  })
    .then((response) => {
      if (!response.ok) {
        console.warn(`My Thread change wasn't saved on the server (status ${response.status}).`);
      }
    })
    .catch(() => {
      console.warn("My Thread change wasn't saved: the server can't be reached.");
    });
}

function isMyThread(value: unknown): value is MyThread {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    Array.isArray((value as MyThread).topics) &&
    Array.isArray((value as MyThread).journey)
  );
}

export async function syncMyThread(email: string | undefined): Promise<void> {
  if (!USES_BACKEND || !email) {
    return;
  }

  try {
    const response = await fetch(`${apiBaseUrl}/my-thread`, {
      headers: { Accept: "application/json" },
    });

    if (response.ok) {
      const data: unknown = await response.json();

      if (isMyThread(data)) {
        saveMyThread(email, data);
      }
    }
  } catch {
  }
}

export function forgetMyThread(email: string) {
  if (!USES_BACKEND) {
    return;
  }

  try {
    window.localStorage.removeItem(storageKey(email));
  } catch {
  }
}

function saveMyThread(email: string, thread: MyThread): MyThread {
  try {
    window.localStorage.setItem(storageKey(email), JSON.stringify(thread));
  } catch {
  }

  return thread;
}

export function isTopicSaved(thread: MyThread, topic: string) {
  return thread.topics.some((saved) => sameText(saved.topic, topic));
}

export function getReadPaperIds(thread: MyThread): Set<string> {
  return new Set(
    thread.journey.flatMap((step) => (step.type === "paper" ? [step.paperId] : [])),
  );
}

export function saveTopic(email: string, topic: string): MyThread {
  const thread = getMyThread(email);

  if (isTopicSaved(thread, topic)) {
    return thread;
  }

  send("POST", "/topics", { topic: topic.trim() });

  return saveMyThread(email, {
    ...thread,
    topics: [{ topic: topic.trim(), savedAt: new Date().toISOString() }, ...thread.topics],
  });
}

export function removeTopic(email: string, topic: string): MyThread {
  const thread = getMyThread(email);

  send("DELETE", `/topics/${encodeURIComponent(topic.trim())}`);

  return saveMyThread(email, {
    ...thread,
    topics: thread.topics.filter((saved) => !sameText(saved.topic, topic)),
  });
}

function addStep(email: string, step: JourneyStep): MyThread {
  const thread = getMyThread(email);
  const last = thread.journey[0];

  const isRepeat =
    last &&
    ((last.type === "search" && step.type === "search" && sameText(last.query, step.query)) ||
      (last.type === "paper" && step.type === "paper" && last.paperId === step.paperId));

  if (isRepeat) {
    return thread;
  }

  send(
    "POST",
    "/steps",
    step.type === "search"
      ? { id: step.id, type: "search", query: step.query }
      : { id: step.id, type: "paper", paperId: step.paperId, topic: step.topic },
  );

  return saveMyThread(email, {
    ...thread,
    journey: [step, ...thread.journey].slice(0, MAX_JOURNEY_STEPS),
  });
}

export function recordSearch(email: string, query: string): MyThread {
  return addStep(email, {
    id: createId(),
    type: "search",
    query: query.trim(),
    at: new Date().toISOString(),
  });
}

export function recordPaperView(
  email: string,
  paper: { id: string; title: string; topic: string },
): MyThread {
  return addStep(email, {
    id: createId(),
    type: "paper",
    paperId: paper.id,
    title: paper.title,
    topic: paper.topic,
    at: new Date().toISOString(),
  });
}

export function setStepNote(email: string, stepId: string, note: string): MyThread {
  const thread = getMyThread(email);
  const text = note.trim().slice(0, MAX_NOTE_LENGTH);

  send("PATCH", `/steps/${encodeURIComponent(stepId)}`, { note: text });

  return saveMyThread(email, {
    ...thread,
    journey: thread.journey.map((step) => {
      if (step.id !== stepId) {
        return step;
      }

      const updated: JourneyStep = { ...step };
      delete updated.note;

      if (text) {
        updated.note = text;
      }

      return updated;
    }),
  });
}

export function removeJourneyStep(email: string, stepId: string): MyThread {
  const thread = getMyThread(email);

  send("DELETE", `/steps/${encodeURIComponent(stepId)}`);

  return saveMyThread(email, {
    ...thread,
    journey: thread.journey.filter((step) => step.id !== stepId),
  });
}
