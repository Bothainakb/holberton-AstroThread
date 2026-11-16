import { useEffect, useId, useState } from "react";
import type { PopularTopic } from "../../data/popularTopics";
import { getPopularTopics } from "../../services/topics/topicService";
import "./PopularTopics.css";

interface PopularTopicsProps {
  onTopicSelect: (topic: PopularTopic) => void;
  topics?: readonly PopularTopic[];
  title?: string;
}

export function PopularTopics({
  onTopicSelect,
  topics,
  title = "Popular topics",
}: PopularTopicsProps) {
  const titleId = useId();
  const [loadedTopics, setLoadedTopics] = useState<readonly PopularTopic[]>([]);

  useEffect(() => {
    if (topics) {
      return;
    }

    const controller = new AbortController();

    getPopularTopics(controller.signal)
      .then(setLoadedTopics)
      .catch(() => {
      });

    return () => controller.abort();
  }, [topics]);

  const shownTopics = topics ?? loadedTopics;

  if (shownTopics.length === 0) {
    return null;
  }

  return (
    <nav className="popular-topics" aria-labelledby={titleId}>
      <h2 id={titleId} className="popular-topics__title">
        {title}
      </h2>

      <ul className="popular-topics__list">
        {shownTopics.map((topic) => (
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
