import { useEffect, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { SiteHeader } from "../../components/SiteHeader/SiteHeader";
import { SiteFooter } from "../../components/SiteFooter/SiteFooter";
import { SearchBox } from "../../components/SearchBox/SearchBox";
import { EmptyState } from "../../components/EmptyState/EmptyState";
import { Button } from "../../components/Button/Button";
import { KnowledgeMap } from "../../components/KnowledgeMap/KnowledgeMap";
import { getCurrentSession } from "../../data/demoAuth";
import {
  getMyThread,
  getReadPaperIds,
  isTopicSaved,
  removeJourneyStep,
  removeTopic,
  sameText,
  saveTopic,
  setStepNote,
} from "../../data/myThread";
import type { JourneyStep, MyThread, SavedTopic } from "../../data/myThread";
import {
  LEVEL_LABELS,
  STEP_STATUS_LABELS,
  findPathPaper,
  getLearningPath,
  getLearningPaths,
  getPathProgress,
} from "../../data/learningPaths";
import type {
  LearningLevel,
  LearningPath,
  PathPaper,
  PathProgress,
  StepProgress,
} from "../../data/learningPaths";
import { navigate, paperPath, routes } from "../../lib/router";
import "./MyThreadPage.css";

type ThreadView = "overview" | "journey" | "map";

const VIEWS: { id: ThreadView; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "journey", label: "Journey" },
  { id: "map", label: "Map" },
];

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

function oldestFirst(topics: readonly SavedTopic[]) {
  return [...topics].sort((a, b) => a.savedAt.localeCompare(b.savedAt));
}

function findCurrentTopic(
  topics: readonly SavedTopic[],
  journey: readonly JourneyStep[],
  chosen: string | null,
): string | null {
  if (topics.length === 0) {
    return null;
  }

  const chosenSaved = chosen ? topics.find((saved) => sameText(saved.topic, chosen)) : undefined;

  if (chosenSaved) {
    return chosenSaved.topic;
  }

  for (const step of journey) {
    if (step.type === "paper") {
      const match = topics.find((saved) => sameText(saved.topic, step.topic));

      if (match) {
        return match.topic;
      }
    }
  }

  return topics[0].topic;
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

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  );
}

function LevelBadge({ level }: { level: LearningLevel }) {
  return <span className={`level-badge level-badge--${level}`}>{LEVEL_LABELS[level]}</span>;
}

function ProgressBar({ label, value, max }: { label: string; value: number; max: number }) {
  const percent = max > 0 ? Math.round((value / max) * 100) : 0;

  return (
    <div
      className="mt-progress"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
    >
      <span className="mt-progress__fill" style={{ width: `${percent}%` }} />
    </div>
  );
}

function PaperList({ papers, readIds }: { papers: readonly PathPaper[]; readIds: ReadonlySet<string> }) {
  return (
    <ul className="path-papers">
      {papers.map((paper) => {
        const isRead = readIds.has(paper.id);

        return (
          <li key={paper.id} className={isRead ? "path-papers__item path-papers__item--read" : "path-papers__item"}>
            <span className="path-papers__check" aria-hidden="true">
              {isRead && <CheckIcon />}
            </span>
            <a className="my-thread__link" href={paperPath(paper.id)}>
              {paper.title}
            </a>
            <span className="path-papers__year">
              {paper.year}
              {isRead ? ", read" : ""}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function StepLegend({ withTopic = false }: { withTopic?: boolean }) {
  return (
    <div className="step-legend">
      <span>
        <i className="step-legend__dot step-legend__dot--done" />
        Completed
      </span>
      <span>
        <i className="step-legend__dot step-legend__dot--current" />
        Current
      </span>
      <span>
        <i className="step-legend__dot" />
        Up next
      </span>
      {withTopic && (
        <span>
          <i className="step-legend__dot step-legend__dot--topic" />
          Connected topic
        </span>
      )}
    </div>
  );
}

function topicStatus(progress: PathProgress) {
  if (!progress.current) {
    return { label: "Completed", className: "topic-card__status--done" };
  }

  if (progress.readPapers === 0) {
    return { label: "Not started", className: "topic-card__status--new" };
  }

  return { label: "In progress", className: "topic-card__status--active" };
}

interface OverviewProps {
  topics: readonly SavedTopic[];
  currentTopic: string;
  readIds: ReadonlySet<string>;
  onSaveTopic: (topic: string) => void;
  onOpenPath: (topic: string) => void;
  onRemoveTopic: (topic: string) => void;
}

function StartSection({ origin, readIds }: { origin: SavedTopic; readIds: ReadonlySet<string> }) {
  const path = getLearningPath(origin.topic);
  const startPaper = path ? findPathPaper(path, path.startPaperId) : undefined;

  return (
    <section className="mt-section" aria-labelledby="mt-start-title">
      <h2 id="mt-start-title" className="mt-section__title">
        Where it started
      </h2>

      <div className="start-card">
        <div className="start-card__head">
          <h3 className="start-card__topic">{origin.topic}</h3>
          <span className="start-card__saved">
            Your first topic, saved {dayFormat.format(new Date(origin.savedAt))}
          </span>
        </div>

        {path ? (
          <>
            <p className="start-card__intro">{path.intro}</p>
            <p className="start-card__why">
              <strong>Why start here:</strong> {path.why}
            </p>

            {startPaper && (
              <div className="start-card__paper">
                <PaperStepIcon />
                <div>
                  <span className="mt-kicker">First paper to read</span>
                  <a className="my-thread__link start-card__paper-title" href={paperPath(startPaper.id)}>
                    {startPaper.title}
                  </a>
                  <p className="start-card__paper-why">
                    {startPaper.year}. {path.startWhy}
                    {readIds.has(startPaper.id) ? " You’ve already read it." : ""}
                  </p>
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="start-card__why">
            A learning path for this topic isn’t available yet.{" "}
            <a className="my-thread__link" href={searchHref(origin.topic)}>
              Explore papers about {origin.topic}
            </a>
          </p>
        )}
      </div>
    </section>
  );
}

function NextSection({
  path,
  progress,
  readIds,
  topics,
  onSaveTopic,
  onOpenPath,
}: {
  path: LearningPath;
  progress: PathProgress;
  readIds: ReadonlySet<string>;
  topics: readonly SavedTopic[];
  onSaveTopic: (topic: string) => void;
  onOpenPath: (topic: string) => void;
}) {
  const step = progress.current;
  const nextPaper = step?.papers.find((paper) => !readIds.has(paper.id));
  const nextTopics = [...path.next].sort((a, b) => a.level - b.level);

  return (
    <section className="mt-section" aria-labelledby="mt-next-title">
      <h2 id="mt-next-title" className="mt-section__title">
        Where to go next
      </h2>
      <p className="mt-section__lead">
        Based on what you’re learning now, {path.topic.toLowerCase()}. Ordered from beginner to
        advanced.
      </p>

      <div className="continue-card">
        {step ? (
          <>
            <div className="continue-card__text">
              <span className="mt-kicker">Your current step: {step.title}</span>
              <strong className="continue-card__title">
                {nextPaper ? nextPaper.title : "Explore this step"}
              </strong>
              <p className="continue-card__why">{step.why}</p>
            </div>
            <a
              className="button button--primary my-thread__small-button"
              href={nextPaper ? paperPath(nextPaper.id) : searchHref(step.query)}
            >
              {nextPaper ? "Read next" : "Explore"}
            </a>
          </>
        ) : (
          <div className="continue-card__text">
            <span className="mt-kicker">Path complete</span>
            <strong className="continue-card__title">
              You’ve read every paper on the {path.topic.toLowerCase()} path
            </strong>
            <p className="continue-card__why">Pick a connected topic below to keep going.</p>
          </div>
        )}
      </div>

      <ol className="next-list">
        {nextTopics.map((item) => {
          const hasPath = Boolean(getLearningPath(item.name));
          const isSaved = topics.some((saved) => sameText(saved.topic, item.name));

          return (
            <li key={item.name} className="next-list__item">
              <LevelBadge level={item.level} />
              <div className="next-list__text">
                <strong className="next-list__name">{item.name}</strong>
                <p className="next-list__why">{item.why}</p>
              </div>
              <div className="next-list__actions">
                {hasPath && isSaved && (
                  <Button variant="secondary" className="my-thread__small-button" onClick={() => onOpenPath(item.name)}>
                    Open path
                  </Button>
                )}
                {hasPath && !isSaved && (
                  <Button variant="secondary" className="my-thread__small-button" onClick={() => onSaveTopic(item.name)}>
                    Save topic
                  </Button>
                )}
                <a className="button button--secondary my-thread__small-button" href={searchHref(item.name)}>
                  Explore
                </a>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function SavedTopicCard({
  saved,
  isCurrent,
  readIds,
  onOpenPath,
  onRemove,
}: {
  saved: SavedTopic;
  isCurrent: boolean;
  readIds: ReadonlySet<string>;
  onOpenPath: () => void;
  onRemove: () => void;
}) {
  const path = getLearningPath(saved.topic);
  const progress = path ? getPathProgress(path, readIds) : null;
  const status = progress ? topicStatus(progress) : null;

  return (
    <li className={isCurrent ? "topic-card topic-card--current" : "topic-card"}>
      <div className="topic-card__top">
        <div>
          {path && <span className="topic-card__field">{path.field}</span>}
          <h3 className="topic-card__title">{saved.topic}</h3>
        </div>
        {status && <span className={`topic-card__status ${status.className}`}>{status.label}</span>}
      </div>

      {progress ? (
        <>
          <ProgressBar
            label={`Papers read on the ${saved.topic} path`}
            value={progress.readPapers}
            max={progress.totalPapers}
          />
          <p className="topic-card__meta">
            {progress.readPapers} of {progress.totalPapers} papers read, {progress.doneSteps} of{" "}
            {progress.steps.length} steps done
          </p>
          {progress.current && (
            <p className="topic-card__now">
              Now: <strong>{progress.current.title}</strong>
            </p>
          )}
        </>
      ) : (
        <p className="topic-card__meta">A learning path for this topic isn’t available yet.</p>
      )}

      <div className="topic-card__actions">
        {path ? (
          <Button className="my-thread__small-button" onClick={onOpenPath}>
            Open path
          </Button>
        ) : (
          <a className="button button--secondary my-thread__small-button" href={searchHref(saved.topic)}>
            Explore papers
          </a>
        )}
        <Button variant="text" onClick={onRemove}>
          Remove
        </Button>
        <span className="topic-card__saved">Saved {dayFormat.format(new Date(saved.savedAt))}</span>
      </div>
    </li>
  );
}

function Overview({ topics, currentTopic, readIds, onSaveTopic, onOpenPath, onRemoveTopic }: OverviewProps) {
  const ordered = oldestFirst(topics);
  const path = getLearningPath(currentTopic);
  const progress = path ? getPathProgress(path, readIds) : null;
  const unsavedPaths = getLearningPaths().filter((item) => !topics.some((saved) => sameText(saved.topic, item.topic)));

  return (
    <>
      <StartSection origin={ordered[0]} readIds={readIds} />

      {path && progress ? (
        <NextSection
          path={path}
          progress={progress}
          readIds={readIds}
          topics={topics}
          onSaveTopic={onSaveTopic}
          onOpenPath={onOpenPath}
        />
      ) : (
        <section className="mt-section" aria-labelledby="mt-next-title">
          <h2 id="mt-next-title" className="mt-section__title">
            Where to go next
          </h2>
          <p className="mt-section__lead">
            A learning path for {currentTopic} isn’t available yet.{" "}
            <a className="my-thread__link" href={searchHref(currentTopic)}>
              Explore papers about {currentTopic}
            </a>
          </p>
        </section>
      )}

      <section className="mt-section" aria-labelledby="mt-saved-title">
        <h2 id="mt-saved-title" className="mt-section__title">
          Saved topics
        </h2>
        <ul className="my-thread__topics">
          {ordered.map((saved) => (
            <SavedTopicCard
              key={saved.topic}
              saved={saved}
              isCurrent={sameText(saved.topic, currentTopic)}
              readIds={readIds}
              onOpenPath={() => onOpenPath(saved.topic)}
              onRemove={() => onRemoveTopic(saved.topic)}
            />
          ))}
        </ul>

        {unsavedPaths.length > 0 && (
          <>
            <p className="mt-section__lead mt-section__lead--add">Add another topic to your thread</p>
            <div className="add-topics">
              {unsavedPaths.map((item) => (
                <Button
                  key={item.topic}
                  variant="secondary"
                  className="my-thread__small-button"
                  onClick={() => onSaveTopic(item.topic)}
                >
                  {item.topic}
                </Button>
              ))}
            </div>
          </>
        )}
      </section>
    </>
  );
}

function ChooseFirstTopic({ onSaveTopic }: { onSaveTopic: (topic: string) => void }) {
  return (
    <section className="mt-section" aria-labelledby="mt-choose-title">
      <h2 id="mt-choose-title" className="mt-section__title">
        Choose your first topic
      </h2>
      <p className="mt-section__lead">
        Each topic comes with a path from beginner to advanced. You can add more topics later.
      </p>
      <ul className="my-thread__topics">
        {getLearningPaths().map((path) => (
          <li key={path.topic} className="topic-card">
            <div>
              <span className="topic-card__field">{path.field}</span>
              <h3 className="topic-card__title">{path.topic}</h3>
            </div>
            <p className="topic-card__now">{path.intro.split(". ")[0]}.</p>
            <p className="topic-card__meta">{path.steps.length} steps, beginner to advanced</p>
            <div className="topic-card__actions">
              <Button className="my-thread__small-button" onClick={() => onSaveTopic(path.topic)}>
                Start with {path.topic.toLowerCase()}
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function PathStepItem({ step, readIds }: { step: StepProgress; readIds: ReadonlySet<string> }) {
  return (
    <li className={`path-step path-step--${step.status}`}>
      <span className="path-step__node" aria-hidden="true">
        {step.status === "done" ? <CheckIcon /> : step.index + 1}
      </span>
      <div className="path-step__body">
        <div className="path-step__top">
          <LevelBadge level={step.level} />
          <span className="path-step__status">
            Step {step.index + 1}: {STEP_STATUS_LABELS[step.status]}
          </span>
        </div>
        <h3 className="path-step__title">{step.title}</h3>
        <p className="path-step__why">{step.why}</p>
        <PaperList papers={step.papers} readIds={readIds} />
        <p className="path-step__meta">
          {step.readCount} of {step.papers.length} papers read ·{" "}
          <a className="my-thread__link" href={searchHref(step.query)}>
            Explore “{step.query}”
          </a>
        </p>
      </div>
    </li>
  );
}

function LearningPathSection({
  path,
  progress,
  readIds,
}: {
  path: LearningPath;
  progress: PathProgress;
  readIds: ReadonlySet<string>;
}) {
  return (
    <section className="mt-section" aria-labelledby="mt-path-title">
      <h2 id="mt-path-title" className="mt-section__title">
        {path.topic} learning path
      </h2>
      <p className="mt-section__lead">
        From first ideas to current research: {progress.doneSteps} of {progress.steps.length} steps
        done, {progress.readPapers} of {progress.totalPapers} papers read.
      </p>
      <ProgressBar label="Papers read on this path" value={progress.readPapers} max={progress.totalPapers} />
      <StepLegend />
      <ol className="path-steps">
        {progress.steps.map((step) => (
          <PathStepItem key={step.index} step={step} readIds={readIds} />
        ))}
      </ol>
    </section>
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

function ActivitySection({
  journey,
  editingStepId,
  onEdit,
  onSaveNote,
  onRemove,
}: {
  journey: readonly JourneyStep[];
  editingStepId: string | null;
  onEdit: (stepId: string | null) => void;
  onSaveNote: (stepId: string, note: string) => void;
  onRemove: (stepId: string) => void;
}) {
  const groups = groupByDay(journey);

  return (
    <section className="mt-section" aria-labelledby="mt-activity-title">
      <h2 id="mt-activity-title" className="mt-section__title">
        Activity and notes
      </h2>
      <p className="mt-section__lead">
        Every search and paper you open is added here. Add a note to remember what you learned.
      </p>

      {journey.length === 0 ? (
        <p className="my-thread__empty">
          No activity yet. Open a paper from your path to begin.{" "}
          <a className="my-thread__link" href={routes.search}>
            Start searching
          </a>
        </p>
      ) : (
        <div className="journey">
          {groups.map((group) => (
            <section key={group.label} className="journey__day">
              <h3 className="journey__day-title">{group.label}</h3>
              <ol className="journey__steps">
                {group.steps.map((step) => (
                  <JourneyItem
                    key={step.id}
                    step={step}
                    isEditing={editingStepId === step.id}
                    onStartEdit={() => onEdit(step.id)}
                    onCancelEdit={() => onEdit(null)}
                    onSaveNote={(note) => onSaveNote(step.id, note)}
                    onRemove={() => onRemove(step.id)}
                  />
                ))}
              </ol>
            </section>
          ))}
          <p className="journey__private">Only you can see your activity.</p>
        </div>
      )}
    </section>
  );
}

/* Map */

function MapSection({
  path,
  progress,
  readIds,
  selectedIndex,
  isSaved,
  onSelectStep,
  onSelectTopic,
}: {
  path: LearningPath;
  progress: PathProgress;
  readIds: ReadonlySet<string>;
  selectedIndex: number;
  isSaved: (topic: string) => boolean;
  onSelectStep: (index: number) => void;
  onSelectTopic: (topic: string) => void;
}) {
  const selected = progress.steps[selectedIndex] ?? progress.steps[0];
  const previous = progress.steps[selected.index - 1];
  const next = progress.steps[selected.index + 1];

  return (
    <section className="mt-section" aria-labelledby="mt-map-title">
      <h2 id="mt-map-title" className="mt-section__title">
        {path.topic} knowledge map
      </h2>
      <p className="mt-section__lead">
        How the ideas connect, from beginner to advanced. Select a concept to see what it builds on
        and where it leads.
      </p>

      <KnowledgeMap
        topic={path.topic}
        steps={progress.steps}
        selectedIndex={selected.index}
        isTopicSaved={isSaved}
        onSelectStep={onSelectStep}
        onSelectTopic={onSelectTopic}
      />
      <StepLegend withTopic />

      <div className="concept-detail" aria-live="polite">
        <div className="path-step__top">
          <LevelBadge level={selected.level} />
          <span className="path-step__status">
            Step {selected.index + 1}: {STEP_STATUS_LABELS[selected.status]}
          </span>
        </div>
        <h3 className="path-step__title">{selected.title}</h3>
        <p className="path-step__why">{selected.why}</p>
        <PaperList papers={selected.papers} readIds={readIds} />
        <p className="concept-detail__links">
          {previous ? (
            <>
              Builds on{" "}
              <button type="button" className="concept-detail__link" onClick={() => onSelectStep(previous.index)}>
                {previous.title}
              </button>
              .{" "}
            </>
          ) : (
            "This is where the path begins. "
          )}
          {next ? (
            <>
              Leads to{" "}
              <button type="button" className="concept-detail__link" onClick={() => onSelectStep(next.index)}>
                {next.title}
              </button>
              .{" "}
            </>
          ) : (
            "This is the most advanced step on the path. "
          )}
          {selected.relatedTopic && (
            <>
              Connects to the topic{" "}
              <button
                type="button"
                className="concept-detail__link"
                onClick={() => onSelectTopic(selected.relatedTopic as string)}
              >
                {selected.relatedTopic}
              </button>
              .
            </>
          )}
        </p>
      </div>
    </section>
  );
}

function NoPathMessage({ topic }: { topic: string }) {
  return (
    <p className="my-thread__empty">
      A learning path for <strong>{topic}</strong> isn’t available yet.{" "}
      <a className="my-thread__link" href={searchHref(topic)}>
        Explore papers about {topic}
      </a>
    </p>
  );
}

/* Page */

export function MyThreadPage() {
  const [session] = useState(getCurrentSession);
  const [thread, setThread] = useState<MyThread>(() =>
    session ? getMyThread(session.email) : { topics: [], journey: [] },
  );
  const [view, setView] = useState<ThreadView>("overview");
  const [chosenTopic, setChosenTopic] = useState<string | null>(null);
  const [selectedStep, setSelectedStep] = useState<number | null>(null);
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
        title="Log in to start your thread"
        description="My Thread is personal to your account. Choose a topic, follow a path from beginner to advanced, and track what you’ve read."
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
    const readIds = getReadPaperIds(thread);
    const notesCount = thread.journey.filter((step) => step.note).length;
    const ordered = oldestFirst(thread.topics);
    const currentTopic = findCurrentTopic(ordered, thread.journey, chosenTopic);
    const currentPath = currentTopic ? getLearningPath(currentTopic) : undefined;
    const currentProgress = currentPath ? getPathProgress(currentPath, readIds) : null;
    const selectedIndex = selectedStep ?? currentProgress?.current?.index ?? 0;

    const switchTopic = (topic: string) => {
      setChosenTopic(topic);
      setSelectedStep(null);
    };

    const openPath = (topic: string) => {
      switchTopic(topic);
      setView("journey");
      window.scrollTo(0, 0);
    };

    const handleSaveTopic = (topic: string) => {
      setThread(saveTopic(email, topic));
    };

    const handleRemoveTopic = (topic: string) => {
      setThread(removeTopic(email, topic));

      if (chosenTopic && sameText(chosenTopic, topic)) {
        setChosenTopic(null);
        setSelectedStep(null);
      }
    };

    const handleMapTopic = (topic: string) => {
      if (isTopicSaved(thread, topic)) {
        switchTopic(topic);
      } else {
        navigate(searchHref(topic));
      }
    };

    const activity = (
      <ActivitySection
        journey={thread.journey}
        editingStepId={editingStepId}
        onEdit={setEditingStepId}
        onSaveNote={(stepId, note) => {
          setThread(setStepNote(email, stepId, note));
          setEditingStepId(null);
        }}
        onRemove={(stepId) => setThread(removeJourneyStep(email, stepId))}
      />
    );

    let body;

    if (!currentTopic) {
      body = (
        <>
          <ChooseFirstTopic onSaveTopic={handleSaveTopic} />
          {view === "journey" && activity}
        </>
      );
    } else {
      body = (
        <>
          <div className="topic-switch" role="group" aria-label="Topic you’re learning">
            <span className="topic-switch__label">Learning now</span>
            {ordered.map((saved) => (
              <button
                key={saved.topic}
                type="button"
                className="topic-switch__chip"
                aria-pressed={sameText(saved.topic, currentTopic)}
                onClick={() => switchTopic(saved.topic)}
              >
                {saved.topic}
              </button>
            ))}
          </div>

          {view === "overview" && (
            <Overview
              topics={thread.topics}
              currentTopic={currentTopic}
              readIds={readIds}
              onSaveTopic={handleSaveTopic}
              onOpenPath={openPath}
              onRemoveTopic={handleRemoveTopic}
            />
          )}

          {view === "journey" && (
            <>
              {currentPath && currentProgress ? (
                <LearningPathSection path={currentPath} progress={currentProgress} readIds={readIds} />
              ) : (
                <NoPathMessage topic={currentTopic} />
              )}
              {activity}
            </>
          )}

          {view === "map" &&
            (currentPath && currentProgress ? (
              <MapSection
                path={currentPath}
                progress={currentProgress}
                readIds={readIds}
                selectedIndex={selectedIndex}
                isSaved={(topic) => isTopicSaved(thread, topic)}
                onSelectStep={setSelectedStep}
                onSelectTopic={handleMapTopic}
              />
            ) : (
              <NoPathMessage topic={currentTopic} />
            ))}
        </>
      );
    }

    content = (
      <div className="my-thread">
        <h1 className="my-thread__title">My Thread</h1>
        <p className="my-thread__lead">
          Your personal research journey: where you started, where you are now, and where to go
          next.
        </p>

        <div className="my-thread__bar">
          <p className="my-thread__stats">
            <span>
              <b>{thread.topics.length}</b> saved {thread.topics.length === 1 ? "topic" : "topics"}
            </span>
            <span>
              <b>{readIds.size}</b> {readIds.size === 1 ? "paper read" : "papers read"}
            </span>
            <span>
              <b>{notesCount}</b> {notesCount === 1 ? "note" : "notes"}
            </span>
          </p>

          <div className="view-switch" role="group" aria-label="View">
            {VIEWS.map((item) => (
              <button
                key={item.id}
                type="button"
                className="view-switch__button"
                aria-pressed={view === item.id}
                onClick={() => setView(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {body}
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