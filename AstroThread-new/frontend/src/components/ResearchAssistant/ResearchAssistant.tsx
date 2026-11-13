import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent, KeyboardEvent } from "react";
import { Button } from "../Button/Button";
import type { PaperDetails } from "../../types/research";
import "./ResearchAssistant.css";

interface ResearchAssistantProps {
  paper: PaperDetails;
  isSignedIn: boolean;
  logInHref: string;
  signUpHref: string;
}

interface Message {
  id: number;
  role: "user" | "assistant";
  text: string;
  note?: string;
}

const QUICK_QUESTIONS = [
  "Summarize this paper",
  "Explain the methodology",
  "Show the key findings",
  "Explain the limitations",
] as const;

const DEMO_NOTE = "Answer from this paper’s details. Live AI answers aren’t connected yet.";
const THINKING_DELAY_MS = 600;

function answerFromPaper(paper: PaperDetails, question: string): string {
  const q = question.toLowerCase();

  if (q.includes("summar")) {
    return `${paper.abstract}\n\n${paper.mainFinding}`;
  }

  if (q.includes("method")) {
    return paper.method;
  }

  if (q.includes("finding") || q.includes("result")) {
    return paper.mainFinding;
  }

  if (q.includes("why") || q.includes("matter") || q.includes("important")) {
    return paper.whyItMatters;
  }

  if (q.includes("limit")) {
    const focus =
      paper.paperType === "observational"
        ? "how precise the measurements are and how much the result depends on modelling assumptions"
        : "which assumptions the work relies on and how well they have been tested since";

    return `The paper’s own discussion of its limitations is in the original text. For ${
      paper.paperType === "observational" ? "an observational" : "a theoretical"
    } paper like this one, the usual questions are ${focus}.`;
  }

  return "Live answers aren’t available yet. Try one of the suggested questions, which are answered from this paper’s details.";
}

function SparkIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2.5c.4 4.6 2.9 7.1 7.5 7.5-4.6.4-7.1 2.9-7.5 7.5-.4-4.6-2.9-7.1-7.5-7.5 4.6-.4 7.1-2.9 7.5-7.5Z" />
      <path d="M18.5 15c.2 2 1.2 3 3.2 3.2-2 .2-3 1.2-3.2 3.3-.2-2.1-1.2-3.1-3.2-3.3 2-.2 3-1.2 3.2-3.2Z" opacity=".7" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 19V5M6 11l6-6 6 6" />
    </svg>
  );
}

export function ResearchAssistant({
  paper,
  isSignedIn,
  logInHref,
  signUpHref,
}: ResearchAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(1);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    return () => window.clearTimeout(timer.current);
  }, []);

  useEffect(() => {
    const body = bodyRef.current;

    if (body) {
      body.scrollTop = body.scrollHeight;
    }
  }, [messages, isThinking]);

  function ask(question: string) {
    const text = question.trim();

    if (!text || !isSignedIn || isThinking) {
      return;
    }

    setMessages((current) => [
      ...current,
      { id: nextId.current++, role: "user", text },
    ]);
    setIsThinking(true);

    timer.current = window.setTimeout(() => {
      setMessages((current) => [
        ...current,
        {
          id: nextId.current++,
          role: "assistant",
          text: answerFromPaper(paper, text),
          note: DEMO_NOTE,
        },
      ]);
      setIsThinking(false);
    }, THINKING_DELAY_MS);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    ask(input);
    setInput("");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      ask(input);
      setInput("");
    }
  }

  const hasConversation = messages.length > 0;

  return (
    <aside
      id="research-assistant"
      className="assistant"
      aria-label="Research assistant for this paper"
    >
      <div className="assistant__head">
        <span className="assistant__icon">
          <SparkIcon />
        </span>
        <div>
          <h2 className="assistant__title">Research assistant</h2>
          <p className="assistant__reading">Reading: {paper.title}</p>
        </div>
      </div>

      <div className="assistant__body" ref={bodyRef} aria-live="polite">
        {!hasConversation ? (
          <>
            <p className="assistant__intro">
              Ask anything about this paper, or start with one of these:
            </p>
            <div className="assistant__questions">
              {QUICK_QUESTIONS.map((question) => (
                <button
                  key={question}
                  type="button"
                  className="assistant__question"
                  disabled={!isSignedIn}
                  onClick={() => ask(question)}
                >
                  {question}
                </button>
              ))}
            </div>

            {!isSignedIn && (
              <div className="assistant__gate">
                <p className="assistant__gate-title">Log in to use the assistant</p>
                <p>The research assistant is included with every free account.</p>
                <div className="assistant__gate-actions">
                  <a className="button button--primary" href={logInHref}>
                    Log in
                  </a>
                  <a className="button button--secondary" href={signUpHref}>
                    Create account
                  </a>
                </div>
              </div>
            )}
          </>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`assistant__message assistant__message--${message.role}`}
            >
              {message.text.split("\n\n").map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
              {message.note && <span className="assistant__note">{message.note}</span>}
            </div>
          ))
        )}

        {isThinking && (
          <div className="assistant__message assistant__message--assistant">
            <span className="assistant__thinking" role="status" aria-label="Thinking">
              <i />
              <i />
              <i />
            </span>
          </div>
        )}
      </div>

      <div className="assistant__foot">
        {hasConversation && !isThinking && (
          <div className="assistant__chips">
            {QUICK_QUESTIONS.map((question) => (
              <button
                key={question}
                type="button"
                className="assistant__chip"
                onClick={() => ask(question)}
              >
                {question}
              </button>
            ))}
          </div>
        )}

        <form className="assistant__form" onSubmit={handleSubmit}>
          <label className="visually-hidden" htmlFor="assistant-input">
            Ask about this paper
          </label>
          <textarea
            id="assistant-input"
            className="assistant__input"
            rows={1}
            value={input}
            disabled={!isSignedIn}
            placeholder={isSignedIn ? "Ask a question about this paper" : "Log in to ask about this paper"}
            onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
          />
          <Button
            type="submit"
            className="assistant__send"
            aria-label="Send question"
            disabled={!isSignedIn || isThinking || !input.trim()}
          >
            <SendIcon />
          </Button>
        </form>

        <p className="assistant__disclaimer">
          Answers can be wrong. Check them against the paper.
        </p>
      </div>
    </aside>
  );
}