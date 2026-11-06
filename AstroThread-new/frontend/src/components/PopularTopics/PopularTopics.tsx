import { useId } from "react";
import { popularTopics } from "../../data/popularTopics";
import type { PopularTopic } from "../../data/popularTopics";
import "./PopularTopics.css";

interface PopularTopicsProps {
  onTopicSelect: (topic: PopularTopic) => void;
  topics?: readonly PopularTopic[];
  title?: string;
}

export function PopularTopics({
  onTopicSelect,
  topics = popularTopics,
  title = "Popular",
}: PopularTopicsProps) {
  const titleId = useId();

  if (topics.length === 0) {
    return null;
  }

  return (
    <nav className="popular-topics" aria-labelledby={titleId}>
      <h2 id={titleId} className="popular-topics__title">
        {title}
      </h2>

      <ul className="popular-topics__list">
        {topics.map((topic) => (
          <li key={topic.id} className="popular-topics__item">
            <button
              className="popular-topics__button"
              type="button"
              onClick={() => onTopicSelect(topic)}
            >
              {topic.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}