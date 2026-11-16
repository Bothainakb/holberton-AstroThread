import type { KeyboardEvent } from "react";
import { LEVEL_LABELS, STEP_STATUS_LABELS } from "../../data/learningPaths";
import type { LearningLevel, StepProgress } from "../../data/learningPaths";
import "./KnowledgeMap.css";

interface KnowledgeMapProps {
  topic: string;
  steps: readonly StepProgress[];
  selectedIndex: number;
  isTopicSaved: (topic: string) => boolean;
  onSelectStep: (index: number) => void;
  onSelectTopic: (topic: string) => void;
}

interface ConnectedTopic {
  name: string;
  fromIndex: number;
  x: number;
  y: number;
}

const NODE_WIDTH = 206;
const NODE_HEIGHT = 56;
const WIDTH = 770;
const TOP = 46;
const ROW_GAP = 80;
const TOPIC_GAP = 72;
const COLUMN_X: Record<LearningLevel, number> = { 1: 34, 2: 287, 3: 540 };
const LEVELS: LearningLevel[] = [1, 2, 3];

function activateOnKey(event: KeyboardEvent<SVGGElement>, action: () => void) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    action();
  }
}

export function KnowledgeMap({
  topic,
  steps,
  selectedIndex,
  isTopicSaved,
  onSelectStep,
  onSelectTopic,
}: KnowledgeMapProps) {
  const rows: Record<LearningLevel, number> = { 1: 0, 2: 0, 3: 0 };
  const positions = steps.map((step) => {
    const position = { x: COLUMN_X[step.level], y: TOP + rows[step.level] * ROW_GAP };
    rows[step.level] += 1;
    return position;
  });

  const maxRows = Math.max(1, rows[1], rows[2], rows[3]);
  const topicsTop = TOP + maxRows * ROW_GAP + 24;
  const connected: ConnectedTopic[] = [];

  steps.forEach((step) => {
    if (step.relatedTopic && !connected.some((item) => item.name === step.relatedTopic)) {
      connected.push({
        name: step.relatedTopic,
        fromIndex: step.index,
        x: COLUMN_X[step.level],
        y: topicsTop + connected.length * TOPIC_GAP,
      });
    }
  });

  const height = connected.length > 0 ? topicsTop + connected.length * TOPIC_GAP : TOP + maxRows * ROW_GAP;

  return (
    <div className="knowledge-map">
      <svg
        className="knowledge-map__svg"
        viewBox={`0 0 ${WIDTH} ${height}`}
        role="group"
        aria-label={`Knowledge map for ${topic}`}
      >
        {LEVELS.map((level) => (
          <text key={level} className="knowledge-map__column" x={COLUMN_X[level]} y={28}>
            {LEVEL_LABELS[level]}
          </text>
        ))}

        {steps.slice(0, -1).map((step, index) => {
          const from = positions[index];
          const to = positions[index + 1];
          let d: string;

          if (from.x === to.x) {
            const x = from.x + NODE_WIDTH / 2;
            d = `M${x} ${from.y + NODE_HEIGHT}L${x} ${to.y}`;
          } else {
            const x1 = from.x + NODE_WIDTH;
            const y1 = from.y + NODE_HEIGHT / 2;
            const x2 = to.x;
            const y2 = to.y + NODE_HEIGHT / 2;
            const midX = (x1 + x2) / 2;
            d = `M${x1} ${y1}C${midX} ${y1} ${midX} ${y2} ${x2} ${y2}`;
          }

          return (
            <path
              key={`link-${step.index}`}
              className={`knowledge-map__link${step.status === "done" ? " knowledge-map__link--done" : ""}`}
              d={d}
            />
          );
        })}

        {connected.map((item) => {
          const from = positions[item.fromIndex];
          const gutterX = from.x - 18;
          const startY = from.y + NODE_HEIGHT / 2;
          const endY = item.y + NODE_HEIGHT / 2;

          return (
            <path
              key={`connector-${item.name}`}
              className="knowledge-map__connector"
              d={`M${from.x} ${startY}H${gutterX}V${endY}H${item.x}`}
            />
          );
        })}

        {steps.map((step, index) => {
          const { x, y } = positions[index];
          const isSelected = selectedIndex === step.index;
          const className = [
            "knowledge-map__node",
            `knowledge-map__node--${step.status}`,
            isSelected ? "knowledge-map__node--selected" : "",
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <g
              key={step.index}
              className={className}
              role="button"
              tabIndex={0}
              aria-pressed={isSelected}
              aria-label={`${step.title}: ${LEVEL_LABELS[step.level]}, ${STEP_STATUS_LABELS[step.status]}, ${step.readCount} of ${step.papers.length} papers read`}
              onClick={() => onSelectStep(step.index)}
              onKeyDown={(event) => activateOnKey(event, () => onSelectStep(step.index))}
            >
              <rect x={x} y={y} width={NODE_WIDTH} height={NODE_HEIGHT} rx={12} />
              <text className="knowledge-map__title" x={x + 14} y={y + 23}>
                {step.title}
              </text>
              <text className="knowledge-map__meta" x={x + 14} y={y + 42}>
                Step {step.index + 1}, {step.readCount} of {step.papers.length} read
              </text>
              {step.status === "done" && (
                <g aria-hidden="true">
                  <circle className="knowledge-map__check" cx={x + NODE_WIDTH - 18} cy={y + 38} r={8} />
                  <path
                    className="knowledge-map__check-mark"
                    d={`M${x + NODE_WIDTH - 22} ${y + 38}l3 3 5-6`}
                  />
                </g>
              )}
              {step.status === "current" && (
                <text
                  className="knowledge-map__now"
                  x={x + NODE_WIDTH - 12}
                  y={y + 42}
                  textAnchor="end"
                  aria-hidden="true"
                >
                  Now
                </text>
              )}
            </g>
          );
        })}

        {connected.map((item) => {
          const saved = isTopicSaved(item.name);

          return (
            <g
              key={item.name}
              className="knowledge-map__node knowledge-map__node--topic"
              role="button"
              tabIndex={0}
              aria-label={`Connected topic: ${item.name}`}
              onClick={() => onSelectTopic(item.name)}
              onKeyDown={(event) => activateOnKey(event, () => onSelectTopic(item.name))}
            >
              <rect x={item.x} y={item.y} width={NODE_WIDTH} height={NODE_HEIGHT} rx={12} />
              <text className="knowledge-map__title" x={item.x + 14} y={item.y + 23}>
                {item.name}
              </text>
              <text className="knowledge-map__meta" x={item.x + 14} y={item.y + 42}>
                {saved ? "Saved topic: open its path" : "Connected topic: explore"}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}