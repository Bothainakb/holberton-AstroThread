import { useEffect, useState } from "react";
import { SiteHeader } from "../../components/SiteHeader/SiteHeader";
import { SiteFooter } from "../../components/SiteFooter/SiteFooter";
import { SearchBox } from "../../components/SearchBox/SearchBox";
import { EmptyState } from "../../components/EmptyState/EmptyState";
import { getCurrentSession } from "../../data/demoAuth";
import { getMyThread, removeJourneyStep, removeTopic } from "../../data/myThread";
import type { JourneyStep, MyThread } from "../../data/myThread";
import { navigate, paperPath, routes } from "../../lib/router";
import "./MyThreadPage.css";

type ThreadView = "topics" | "journey";

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

function countPapersRead(thread: MyThread, topic: string) {
  const ids = new Set(
    thread.journey
      .filter(
        (step) =>
          step.type === "paper" && step.topic.toLocaleLowerCase() === topic.toLocaleLowerCase(),
      )
      .map((step) => (step.type === "paper" ? step.paperId : "")),
  );

  return ids.size;
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

export function MyThreadPage() {
  const [session] = useState(getCurrentSession);
  const [thread, setThread] = useState<MyThread>(() =>
    session ? getMyThread(session.email) : { topics: [], journey: [] },
  );
  const [view, setView] = useState<ThreadView>("topics");
  const [query, setQuery] = useState("");

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
        </div>

        <div
          id="my-thread-panel"
          role="tabpanel"
          aria-labelledby={view === "topics" ? "my-thread-tab-topics" : "my-thread-tab-journey"}
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
                {thread.topics.map((saved) => {
                  const papersRead = countPapersRead(thread, saved.topic);

                  return (
                    <li key={saved.topic} className="topic-card">
                      <h2 className="topic-card__title">{saved.topic}</h2>
                      <p className="topic-card__meta">
                        Saved {dayFormat.format(new Date(saved.savedAt))} ·{" "}
                        {papersRead === 1 ? "1 paper read" : `${papersRead} papers read`}
                      </p>
                      <div className="topic-card__actions">
                        <a className="button button--secondary" href={searchHref(saved.topic)}>
                          Explore papers
                        </a>
                        <button
                          type="button"
                          className="button button--text"
                          onClick={() => setThread(removeTopic(email, saved.topic))}
                        >
                          Remove
                        </button>
                      </div>
                    </li>
                  );
                })}
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
                        <li key={step.id} className="journey__step">
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
                          </div>
                          <button
                            type="button"
                            className="journey__remove"
                            aria-label="Remove this step"
                            onClick={() => setThread(removeJourneyStep(email, step.id))}
                          >
                            <RemoveIcon />
                          </button>
                        </li>
                      ))}
                    </ol>
                  </section>
                ))}
              </div>
            ))}
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