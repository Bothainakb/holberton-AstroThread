import type { MouseEvent } from "react";
import type { JourneyStep } from "../../data/myThread";
import { navigate, paperPath } from "../../lib/router";
import "./ThreadMap.css";

interface ThreadMapProps {
  journey: readonly JourneyStep[];
}

interface MapPaper {
  id: string;
  title: string;
}

interface MapTopic {
  name: string;
  papers: MapPaper[];
}

const HUB_SPACING = 240;
const SIDE_PADDING = 130;
const HEIGHT = 300;
const CENTER_Y = 120;
const HUB_RADIUS = 30;
const RING_RADIUS = 82;
const NODE_RADIUS = 9;
const MAX_NODES = 10;

function buildTopics(journey: readonly JourneyStep[]): MapTopic[] {
  const topics: MapTopic[] = [];

  [...journey].reverse().forEach((step) => {
    if (step.type !== "paper") {
      return;
    }

    const name = step.topic || "Other";
    let topic = topics.find((item) => item.name.toLowerCase() === name.toLowerCase());

    if (!topic) {
      topic = { name, papers: [] };
      topics.push(topic);
    }

    if (!topic.papers.some((paper) => paper.id === step.paperId)) {
      topic.papers.push({ id: step.paperId, title: step.title });
    }
  });

  return topics;
}

function openPaper(event: MouseEvent<HTMLAnchorElement>, id: string) {
  event.preventDefault();
  navigate(paperPath(id));
}

export function ThreadMap({ journey }: ThreadMapProps) {
  const topics = buildTopics(journey);

  if (topics.length === 0) {
    return (
      <p className="my-thread__empty">
        Your map appears after you open your first paper. Each topic becomes a hub, and the
        papers you read circle around it.
      </p>
    );
  }

  const width = SIDE_PADDING * 2 + (topics.length - 1) * HUB_SPACING;
  const hubX = (index: number) => SIDE_PADDING + index * HUB_SPACING;
  const firstX = hubX(0);
  const lastX = hubX(topics.length - 1);

  let threadPath = `M ${firstX - 56} ${CENTER_Y}`;
  topics.forEach((_, index) => {
    const x = hubX(index);

    if (index === 0) {
      threadPath += ` L ${x} ${CENTER_Y}`;
    } else {
      const prevX = hubX(index - 1);
      const midX = (prevX + x) / 2;
      const bend = index % 2 === 0 ? -34 : 34;
      threadPath += ` Q ${midX} ${CENTER_Y + bend} ${x} ${CENTER_Y}`;
    }
  });
  threadPath += ` L ${lastX + 56} ${CENTER_Y}`;

  return (
    <div className="thread-map">
      <div className="thread-map__scroll">
        <svg
          className="thread-map__svg"
          viewBox={`0 0 ${width} ${HEIGHT}`}
          width={width}
          height={HEIGHT}
          role="img"
          aria-labelledby="thread-map-title"
        >
          <title id="thread-map-title">
            Map of your research thread: {topics.map((topic) => topic.name).join(", then ")}
          </title>

          {topics.map((topic, topicIndex) => {
            const cx = hubX(topicIndex);
            const shown = topic.papers.slice(0, MAX_NODES);

            return shown.map((paper, paperIndex) => {
              const angle = (-90 + (360 / shown.length) * paperIndex) * (Math.PI / 180);
              const x = cx + RING_RADIUS * Math.cos(angle);
              const y = CENTER_Y + RING_RADIUS * Math.sin(angle);

              return (
                <line
                  key={`${topic.name}-${paper.id}-spoke`}
                  className="thread-map__spoke"
                  x1={cx}
                  y1={CENTER_Y}
                  x2={x}
                  y2={y}
                />
              );
            });
          })}

          <path className="thread-map__thread" d={threadPath} />

          <text className="thread-map__end" x={firstX - 62} y={CENTER_Y + 4} textAnchor="end">
            Start
          </text>
          <text className="thread-map__end" x={lastX + 62} y={CENTER_Y + 4}>
            Now
          </text>

          {topics.map((topic, topicIndex) => {
            const cx = hubX(topicIndex);
            const shown = topic.papers.slice(0, MAX_NODES);
            const hidden = topic.papers.length - shown.length;

            return (
              <g key={topic.name}>
                {shown.map((paper, paperIndex) => {
                  const angle = (-90 + (360 / shown.length) * paperIndex) * (Math.PI / 180);
                  const x = cx + RING_RADIUS * Math.cos(angle);
                  const y = CENTER_Y + RING_RADIUS * Math.sin(angle);

                  return (
                    <a
                      key={paper.id}
                      className="thread-map__paper"
                      href={paperPath(paper.id)}
                      aria-label={paper.title}
                      onClick={(event: MouseEvent<HTMLAnchorElement>) => openPaper(event, paper.id)}
                    >
                      <title>{paper.title}</title>
                      <circle cx={x} cy={y} r={NODE_RADIUS} />
                    </a>
                  );
                })}

                <circle className="thread-map__hub" cx={cx} cy={CENTER_Y} r={HUB_RADIUS} />
                <text
                  className="thread-map__hub-count"
                  x={cx}
                  y={CENTER_Y + 5}
                  textAnchor="middle"
                >
                  {topic.papers.length}
                </text>
                <text
                  className="thread-map__hub-name"
                  x={cx}
                  y={CENTER_Y + RING_RADIUS + 44}
                  textAnchor="middle"
                >
                  {topic.name}
                </text>
                <text
                  className="thread-map__hub-meta"
                  x={cx}
                  y={CENTER_Y + RING_RADIUS + 62}
                  textAnchor="middle"
                >
                  {topic.papers.length === 1 ? "1 paper read" : `${topic.papers.length} papers read`}
                  {hidden > 0 ? ` (${hidden} not shown)` : ""}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <p className="thread-map__hint">
        Each circle is a paper you read. Select one to open it. The line follows the order you
        explored each topic.
      </p>
    </div>
  );
}