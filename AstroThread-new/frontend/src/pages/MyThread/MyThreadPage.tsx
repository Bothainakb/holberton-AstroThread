import { useEffect, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { SiteHeader } from "../../components/SiteHeader/SiteHeader";
import { SiteFooter } from "../../components/SiteFooter/SiteFooter";
import { SearchBox } from "../../components/SearchBox/SearchBox";
import { EmptyState } from "../../components/EmptyState/EmptyState";
import { Button } from "../../components/Button/Button";
import { ThreadMap } from "../../components/ThreadMap/ThreadMap";
import { getCurrentSession } from "../../data/demoAuth";
import {
  getMyThread,
  getReadPaperIds,
  removeJourneyStep,
  removeTopic,
  setStepNote,
} from "../../data/myThread";
import type { JourneyStep, MyThread, SavedTopic } from "../../data/myThread";
import { navigate, paperPath, routes } from "../../lib/router";
import { getTopicPapers } from "../../services/research/researchService";
import type { PaperSummary } from "../../types/research";
import "./MyThreadPage.css";

type ThreadView = "topics" | "journey" | "map";

const dayFormat = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" });
const timeFormat = new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" });

function searchHref(query: string) {
  return `${routes.search}?${new URLSearchParams({ q: query }).toString()}`;
}

function dayLabel(date: Date) {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return "Today";
  }

  if (date.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  }

  return dayFormat.format(date);
}

function groupByDay(steps: readonly JourneyStep[]) {
  const groups: { label: string; steps: JourneyStep[] }[] = [];

  steps.forEach((step) => {
    const label = dayLabel(new Date(step.at));
    const group = groups[groups.length - 1];

    if (group && group.label === label) {
      group.steps.push(step);
    } else {
      groups.push({ label, steps: [step] });
    }
  });

  return groups;
}

function RemoveIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

function SearchStepIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function PaperStepIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 3.5h7l4 4v13H7z" />
      <path d="M14 3.5v4h4M9.5 12h6M9.5 15.5h6" />
    </svg>
  );
}

interface TopicCardProps {
  saved: SavedTopic;
  readIds: Set<string>;
  onRemove: () => void;
}

function TopicCard({ saved, readIds, onRemove }: TopicCardProps) {
  const [papers, setPapers] = useState<PaperSummary[] | "error" | undefined>(undefined);

  useEffect(() => {
    const controller = new AbortController();

    getTopicPapers(saved.topic, controller.signal)
      .then(setPapers)
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setPapers("error");
      });

    return () => controller.abort();
  }, [saved.topic]);

  const isLoading = papers === undefined;
  const hasError = papers === "error";
  const list = Array.isArray(papers) ? papers : [];
  const readCount = list.filter((paper) => readIds.has(paper.id)).length;
  const total = list.length;
  const percent = total > 0 ? Math.round((readCount / total) * 100) : 0;
  const startPaper = list[0];
  const nextPaper = list.find((paper) => !readIds.has(paper.id));

  let status = "Not started";
  let statusClass = "topic-card__status--new";

  if (total > 0 && readCount === total) {
    status = "Completed";
    statusClass = "topic-card__status--done";
  } else if (readCount > 0) {
    status = "In progress";
    statusClass = "topic-card__status--active";
  }

  return (
    <li className="topic-card">
      <div className="topic-card__top">
        <h2 className="topic-card__title">{saved.topic}</h2>
        {!isLoading && !hasError && total > 0 && (
          <span className={`topic-card__status ${statusClass}`}>{status}</span>
        )}
      </div>
      <p className="topic-card__meta">Saved {dayFormat.format(new Date(saved.savedAt))}</p>

      {isLoading && (
        <p className="topic-card__loading" role="status">
          Loading papers…
        </p>
      )}

      {hasError && (
        <p className="topic-card__loading">Couldn’t load the papers for this topic.</p>
      )}

      {!isLoading && !hasError && total === 0 && (
        <p className="topic-card__loading">No papers found for this topic yet.</p>
      )}

      {total > 0 && (
        <>
          <div className="topic-card__progress">
            <div
              className="topic-card__bar"
              role="progressbar"
              aria-label={`${saved.topic} reading progress`}
              aria-valuemin={0}
              aria-valuemax={total}
              aria-valuenow={readCount}
            >
              <span className="topic-card__bar-fill" style={{ width: `${percent}%` }} />
            </div>
            <span className="topic-card__progress-text">
              {readCount} of {total} papers read
            </span>
          </div>

          <dl className="topic-card__steps">
            {startPaper && (
              <div>
                <dt>Where to start</dt>
                <dd>
                  <a className="my-thread__link" href={paperPath(startPaper.id)}>
                    {startPaper.title}
                  </a>
                  {startPaper.year > 0 && (
                    <span className="topic-card__year"> · {startPaper.year}</span>
                  )}
                </dd>
              </div>
            )}
            <div>
              <dt>Read next</dt>
              <dd>
                {nextPaper ? (
                  <>
                    <a className="my-thread__link" href={paperPath(nextPaper.id)}>
                      {nextPaper.title}
                    </a>
                    {nextPaper.year > 0 && (
                      <span className="topic-card__year"> · {nextPaper.year}</span>
                    )}
                  </>
                ) : (
                  <span className="topic-card__done">You’ve read every paper on this topic.</span>
                )}
              </dd>
            </div>
          </dl>
        </>
      )}

      <div className="topic-card__actions">
        <a className="button button--secondary" href={searchHref(saved.topic)}>
          Explore papers
        </a>
        <button type="button" className="button button--text" onClick={onRemove}>
          Remove
        </button>
      </div>
    </li>
  );
}

interface NoteFormProps {
  stepId: string;
  initialNote: string;
  onSave: (note: string) => void;
  onCancel: () => void;
}

function NoteForm({ stepId, initialNote, onSave, onCancel }: NoteFormProps) {
  const [draft, setDraft] = useState(initialNote);
  const noteId = `note-${stepId}`;

  return (
    <form
      className="journey__note-form"
      onSubmit={(event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        onSave(draft);
      }}
    >
      <label className="visually-hidden" htmlFor={noteId}>
        Note for this step
      </label>
      <textarea
        id={noteId}
        className="journey__note-input"
        rows={2}
        maxLength={500}
        value={draft}
        placeholder="Write a note, like “Reread the section on temperature.”"
        autoFocus
        onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setDraft(event.target.value)}
      />
      <div className="journey__note-actions">
        <Button type="submit" className="journey__note-save">
          Save note
        </Button>
        <Button variant="text" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

interface JourneyItemProps {
  step: JourneyStep;
  isEditing: boolean;
  onStartEdit: () => void;
  onSaveNote: (note: string) => void;
  onCancelEdit: () => void;
  onRemove: () => void;
}

function JourneyItem({
  step,
  isEditing,
  onStartEdit,
  onSaveNote,
  onCancelEdit,
  onRemove,
}: JourneyItemProps) {
  return (
    <li className="journey__step">
      <span className="journey__icon">
        {step.type === "search" ? <SearchStepIcon /> : <PaperStepIcon />}
      </span>

      <div className="journey__body">
        {step.type === "search" ? (
          <p>
            Searched{" "}
            <a className="my-thread__link" href={searchHref(step.query)}>
              “{step.query}”
            </a>
          </p>
        ) : (
          <p>
            Read{" "}
            <a className="my-thread__link" href={paperPath(step.paperId)}>
              {step.title}
            </a>
          </p>
        )}
        <span className="journey__time">
          {timeFormat.format(new Date(step.at))}
          {step.type === "paper" && step.topic ? ` · ${step.topic}` : ""}
        </span>

        {isEditing ? (
          <NoteForm
            stepId={step.id}
            initialNote={step.note ?? ""}
            onSave={onSaveNote}
            onCancel={onCancelEdit}
          />
        ) : (
          <>
            {step.note && <p className="journey__note">{step.note}</p>}
            <button type="button" className="journey__note-toggle" onClick={onStartEdit}>
              {step.note ? "Edit note" : "Add note"}
            </button>
          </>
        )}
      </div>

      <button
        type="button"
        className="journey__remove"
        aria-label="Remove this step"
        onClick={onRemove}
      >
        <RemoveIcon />
      </button>
    </li>
  );
}

export function MyThreadPage() {
  const [session] = useState(getCurrentSession);
  const [thread, setThread] = useState<MyThread>(() =>
    session ? getMyThread(session.email) : { topics: [], journey: [] },
  );
  const [view, setView] = useState<ThreadView>("topics");
  const [query, setQuery] = useState("");
  const [editingStepId, setEditingStepId] = useState<string | null>(null);

  useEffect(() => {
    document.title = "My Thread | AstroThread";
  }, []);

  function runSearch(nextQuery: string) {
    const trimmed = nextQuery.trim();

    if (trimmed) {
      navigate(searchHref(trimmed));
    }
  }

  const returnParams = new URLSearchParams({ from: routes.myThread }).toString();

  let content;

  if (!session) {
    content = (
      <EmptyState
        headingLevel="h1"
        title="Log in to see My Thread"
        description="My Thread keeps the topics you save and the papers you read, so you can pick up where you left off."
        actions={
          <>
            <a className="button button--primary" href={`${routes.signIn}?${returnParams}`}>
              Log in
            </a>
            <a className="button button--secondary" href={`${routes.signUp}?${returnParams}`}>
              Create account
            </a>
          </>
        }
      />
    );
  } else {
    const email = session.email;
    const journeyGroups = groupByDay(thread.journey);
    const readIds = getReadPaperIds(thread);

    content = (
      <div className="my-thread">
        <h1 className="my-thread__title">My Thread</h1>
        <p className="my-thread__lead">
          The topics you saved and the path you took through them.
        </p>

        <div className="my-thread__tabs" role="tablist" aria-label="My Thread views">
          <button
            type="button"
            role="tab"
            id="my-thread-tab-topics"
            aria-controls="my-thread-panel"
            aria-selected={view === "topics"}
            className="my-thread__tab"
            onClick={() => setView("topics")}
          >
            Topics
            <span className="my-thread__count">{thread.topics.length}</span>
          </button>
          <button
            type="button"
            role="tab"
            id="my-thread-tab-journey"
            aria-controls="my-thread-panel"
            aria-selected={view === "journey"}
            className="my-thread__tab"
            onClick={() => setView("journey")}
          >
            Journey
            <span className="my-thread__count">{thread.journey.length}</span>
          </button>
          <button
            type="button"
            role="tab"
            id="my-thread-tab-map"
            aria-controls="my-thread-panel"
            aria-selected={view === "map"}
            className="my-thread__tab"
            onClick={() => setView("map")}
          >
            Map
          </button>
        </div>

        <div
          id="my-thread-panel"
          role="tabpanel"
          aria-labelledby={`my-thread-tab-${view}`}
          className="my-thread__panel"
        >
          {view === "topics" &&
            (thread.topics.length === 0 ? (
              <p className="my-thread__empty">
                You haven’t saved any topics yet. Open a paper and choose{" "}
                <strong>Save topic to My Thread</strong>.{" "}
                <a className="my-thread__link" href={routes.search}>
                  Start searching
                </a>
              </p>
            ) : (
              <ul className="my-thread__topics">
                {thread.topics.map((saved) => (
                  <TopicCard
                    key={saved.topic}
                    saved={saved}
                    readIds={readIds}
                    onRemove={() => setThread(removeTopic(email, saved.topic))}
                  />
                ))}
              </ul>
            ))}

          {view === "journey" &&
            (thread.journey.length === 0 ? (
              <p className="my-thread__empty">
                Your journey starts with your first search. Every search you make and every
                paper you open while logged in appears here.{" "}
                <a className="my-thread__link" href={routes.search}>
                  Start searching
                </a>
              </p>
            ) : (
              <div className="journey">
                {journeyGroups.map((group) => (
                  <section key={group.label} className="journey__day">
                    <h2 className="journey__day-title">{group.label}</h2>
                    <ol className="journey__steps">
                      {group.steps.map((step) => (
                        <JourneyItem
                          key={step.id}
                          step={step}
                          isEditing={editingStepId === step.id}
                          onStartEdit={() => setEditingStepId(step.id)}
                          onCancelEdit={() => setEditingStepId(null)}
                          onSaveNote={(note) => {
                            setThread(setStepNote(email, step.id, note));
                            setEditingStepId(null);
                          }}
                          onRemove={() => setThread(removeJourneyStep(email, step.id))}
                        />
                      ))}
                    </ol>
                  </section>
                ))}
              </div>
            ))}

          {view === "map" && <ThreadMap journey={thread.journey} />}
        </div>
      </div>
    );
  }

  return (
    <div className="my-thread-page">
      <SiteHeader
        search={
          <SearchBox
            size="compact"
            value={query}
            onValueChange={setQuery}
            onSearch={runSearch}
          />
        }
      />

      <main className="my-thread-page__main">{content}</main>

      <SiteFooter />
    </div>
  );
}