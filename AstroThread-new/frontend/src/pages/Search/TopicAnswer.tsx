import { useState } from "react";
import logoIcon from "../../assets/brand/astrothread-icon.svg";
import { getCurrentSession } from "../../data/demoAuth";
import { getMyThread, isTopicSaved, removeTopic, saveTopic } from "../../data/myThread";
import type { TopicAnswer as TopicAnswerData, TopicFigure } from "../../data/topicAnswers";
import { routes } from "../../lib/router";
import "./TopicAnswer.css";

interface TopicAnswerProps {
  answer: TopicAnswerData;
  returnHref: string;
}

function searchHref(query: string) {
  return `${routes.search}?${new URLSearchParams({ q: query }).toString()}`;
}

function chirpPath() {
  const merger = 0.84;
  let d = "";

  for (let i = 0; i <= 260; i += 1) {
    const t = i / 260;
    const x = 12 + t * 176;
    let y: number;

    if (t < merger) {
      const tau = 1 - t / merger;
      const phase = 62 * (1 - Math.pow(tau, 0.625));
      const amplitude = 6 + 30 * Math.pow(1 - tau, 2.2);
      y = 70 - amplitude * Math.sin((phase * 2 * Math.PI) / 6);
    } else {
      const after = (t - merger) / (1 - merger);
      const phase = 62 + after * 9;
      const amplitude = 36 * Math.exp(-after * 5);
      y = 70 - amplitude * Math.sin((phase * 2 * Math.PI) / 6);
    }

    d += `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }

  return d;
}

const CHIRP_PATH = chirpPath();

function Figure({ type }: { type: TopicFigure }) {
  if (type === "black-hole") {
    return (
      <svg viewBox="0 0 200 140" role="img" aria-label="Schematic of a black hole shadow inside a bright ring">
        <circle cx="100" cy="62" r="40" fill="none" stroke="#f2a93b" strokeWidth="12" opacity="0.9" />
        <path d="M62 74a40 40 0 0 0 76 0" fill="none" stroke="#ffd27a" strokeWidth="12" />
        <circle cx="100" cy="62" r="30" fill="#0b1222" />
        <text className="topic-figure__label" x="100" y="66" textAnchor="middle" fill="#aeb7cc">
          Shadow
        </text>
        <text className="topic-figure__label" x="100" y="126" textAnchor="middle">
          Ring of light from hot gas
        </text>
      </svg>
    );
  }

  if (type === "gravitational-wave") {
    return (
      <svg
        viewBox="0 0 200 140"
        role="img"
        aria-label="Schematic gravitational-wave signal that rises in frequency and amplitude before a merger"
      >
        <line className="topic-figure__axis" x1="12" y1="70" x2="188" y2="70" />
        <path className="topic-figure__line topic-figure__line--thin" d={CHIRP_PATH} />
        <text className="topic-figure__label" x="14" y="20">
          Strain
        </text>
        <text className="topic-figure__label" x="14" y="128">
          Inspiral
        </text>
        <text className="topic-figure__label" x="160" y="128" textAnchor="middle">
          Merger
        </text>
        <text className="topic-figure__label" x="188" y="20" textAnchor="end">
          Time
        </text>
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 200 140" role="img" aria-label="Schematic light curve with a dip during a planet transit">
      <line className="topic-figure__axis" x1="16" y1="118" x2="188" y2="118" />
      <line className="topic-figure__axis" x1="16" y1="118" x2="16" y2="22" />
      <path className="topic-figure__line" d="M18 50H76L90 86H124L138 50H186" />
      <text className="topic-figure__label" x="20" y="16">
        Brightness
      </text>
      <text className="topic-figure__label" x="186" y="132" textAnchor="end">
        Time
      </text>
      <text className="topic-figure__label" x="107" y="104" textAnchor="middle">
        Planet in front
      </text>
    </svg>
  );
}

function ThreadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true">
      <path d="M4 18c3 0 3-12 6-12s3 12 6 12 2.5-6 4-6" />
      <circle cx="4" cy="18" r="1.7" fill="currentColor" stroke="none" />
      <circle cx="20" cy="12" r="1.7" fill="currentColor" stroke="none" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  );
}

function SaveTopicButton({ topic, returnHref }: { topic: string; returnHref: string }) {
  const [session] = useState(getCurrentSession);
  const [saved, setSaved] = useState(() =>
    session ? isTopicSaved(getMyThread(session.email), topic) : false,
  );

  if (!session) {
    const signInHref = `${routes.signIn}?${new URLSearchParams({ from: returnHref }).toString()}`;

    return (
      <a className="topic-answer__save" href={signInHref}>
        <ThreadIcon />
        Save to My Thread
      </a>
    );
  }

  function toggle() {
    if (!session) {
      return;
    }

    const thread = saved ? removeTopic(session.email, topic) : saveTopic(session.email, topic);
    setSaved(isTopicSaved(thread, topic));
  }

  return (
    <button
      type="button"
      className={saved ? "topic-answer__save topic-answer__save--on" : "topic-answer__save"}
      aria-pressed={saved}
      onClick={toggle}
    >
      {saved ? <CheckIcon /> : <ThreadIcon />}
      {saved ? "Saved to My Thread" : "Save to My Thread"}
    </button>
  );
}

function Definition({ text, highlight }: { text: string; highlight: string }) {
  const start = highlight ? text.indexOf(highlight) : -1;

  if (start < 0) {
    return <p className="topic-answer__definition">{text}</p>;
  }

  return (
    <p className="topic-answer__definition">
      {text.slice(0, start)}
      <strong>{highlight}</strong>
      {text.slice(start + highlight.length)}
    </p>
  );
}

export function TopicAnswer({ answer, returnHref }: TopicAnswerProps) {
  return (
    <article className="topic-answer" aria-label={`Quick answer about ${answer.topic}`}>
      <div className="topic-answer__main">
        <div className="topic-answer__text">
          <h2 className="topic-answer__headline">{answer.headline}</h2>
          <Definition text={answer.definition} highlight={answer.highlight} />
        </div>

        <figure className="topic-answer__figure">
          <div className="topic-answer__art">
            <Figure type={answer.figure} />
          </div>
          <figcaption className="topic-answer__caption">{answer.caption}</figcaption>
        </figure>
      </div>

      <div className="topic-answer__source">
        <div className="topic-answer__brand">
          <span className="topic-answer__tile" aria-hidden="true">
            <img src={logoIcon} alt="" width={22} height={22} />
          </span>
          <span className="topic-answer__brand-text">
            <strong>AstroThread Topics</strong>
            <span>astrothread › topics › {answer.slug}</span>
          </span>
        </div>

        <div className="topic-answer__row">
          <h3 className="topic-answer__topic">
            {answer.topic} – {answer.field}
          </h3>
          <SaveTopicButton topic={answer.topic} returnHref={returnHref} />
        </div>

        <ul className="topic-answer__facts">
          {answer.facts.map((fact) => (
            <li key={fact.label}>
              {fact.label}: {fact.value}
            </li>
          ))}
        </ul>

        <ul className="topic-answer__subtopics">
          {answer.subtopics.map((subtopic) => (
            <li key={subtopic.name}>
              <a className="topic-answer__subtopic-link" href={searchHref(subtopic.name)}>
                {subtopic.name}
              </a>
              <p className="topic-answer__subtopic-text">{subtopic.description}</p>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}