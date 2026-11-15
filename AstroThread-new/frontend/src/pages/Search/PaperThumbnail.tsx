import type { ReactNode } from "react";
import type { PaperSummary } from "../../types/research";
import "./PaperThumbnail.css";

type ThumbnailKind =
  | "ring"
  | "orbit"
  | "chirp"
  | "merger"
  | "pulses"
  | "transit"
  | "wobble"
  | "spectrum"
  | "lens"
  | "rotation"
  | "hawking"
  | "spacetime"
  | "galaxy";

interface PaperThumbnailProps {
  paper: PaperSummary;
  href: string;
}

function miniChirpPath() {
  const merger = 0.84;
  let d = "";

  for (let i = 0; i <= 160; i += 1) {
    const t = i / 160;
    const x = 8 + t * 80;
    let y: number;

    if (t < merger) {
      const tau = 1 - t / merger;
      const phase = 30 * (1 - Math.pow(tau, 0.625));
      const amplitude = 3 + 17 * Math.pow(1 - tau, 2.2);
      y = 36 - amplitude * Math.sin((phase * 2 * Math.PI) / 6);
    } else {
      const after = (t - merger) / (1 - merger);
      const phase = 30 + after * 6;
      const amplitude = 20 * Math.exp(-after * 5);
      y = 36 - amplitude * Math.sin((phase * 2 * Math.PI) / 6);
    }

    d += `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }

  return d;
}

const MINI_CHIRP = miniChirpPath();

const THUMBNAILS: Record<ThumbnailKind, { label: string; art: ReactNode }> = {
  ring: {
    label: "Black hole shadow and ring",
    art: (
      <>
        <circle cx="48" cy="36" r="21" fill="none" stroke="#f2a93b" strokeWidth="8" />
        <path d="M29 44a21 21 0 0 0 38 0" fill="none" stroke="#ffd27a" strokeWidth="8" />
        <circle cx="48" cy="36" r="15" fill="#0b1222" />
      </>
    ),
  },
  orbit: {
    label: "Star orbiting an unseen companion",
    art: (
      <>
        <ellipse className="paper-thumb__line" cx="48" cy="36" rx="34" ry="13" transform="rotate(-18 48 36)" />
        <circle className="paper-thumb__ink" cx="48" cy="36" r="4" />
        <circle className="paper-thumb__star" cx="79" cy="27" r="3.2" />
      </>
    ),
  },
  chirp: {
    label: "Gravitational-wave merger signal",
    art: (
      <>
        <line className="paper-thumb__axis" x1="8" y1="36" x2="88" y2="36" />
        <path className="paper-thumb__line" d={MINI_CHIRP} />
      </>
    ),
  },
  merger: {
    label: "Two neutron stars spiralling together",
    art: (
      <>
        <circle className="paper-thumb__axis paper-thumb__dashed" cx="48" cy="36" r="22" fill="none" />
        <path className="paper-thumb__line" d="M30 36a18 12 0 0 1 36 0" />
        <circle className="paper-thumb__fill-line" cx="34" cy="38" r="5" />
        <circle className="paper-thumb__star" cx="62" cy="34" r="5" />
      </>
    ),
  },
  pulses: {
    label: "Regular pulses from a pulsar",
    art: (
      <path
        className="paper-thumb__line"
        d="M6 50H16L19 22L22 50H36L39 22L42 50H56L59 22L62 50H76L79 22L82 50H90"
      />
    ),
  },
  transit: {
    label: "Transit light curve: the star dims as a planet crosses",
    art: (
      <>
        <path className="paper-thumb__line paper-thumb__line--bold" d="M8 26H36L42 46H56L62 26H88" />
        <circle className="paper-thumb__muted" cx="49" cy="58" r="3" />
      </>
    ),
  },
  wobble: {
    label: "Radial-velocity wobble of a star",
    art: (
      <>
        <line className="paper-thumb__axis paper-thumb__dashed" x1="8" y1="36" x2="88" y2="36" />
        <path className="paper-thumb__line" d="M8 36C16 16 24 16 32 36S48 56 56 36S72 16 80 36L88 44" />
      </>
    ),
  },
  spectrum: {
    label: "Spectrum with absorption lines",
    art: (
      <>
        <rect x="10" y="24" width="15.2" height="24" fill="#6d5bd0" />
        <rect x="25.2" y="24" width="15.2" height="24" fill="#2f7fd1" />
        <rect x="40.4" y="24" width="15.2" height="24" fill="#22a06b" />
        <rect x="55.6" y="24" width="15.2" height="24" fill="#e3b341" />
        <rect x="70.8" y="24" width="15.2" height="24" fill="#e0662f" />
        <line x1="33" y1="24" x2="33" y2="48" stroke="#0b1222" strokeWidth="2" />
        <line x1="61" y1="24" x2="61" y2="48" stroke="#0b1222" strokeWidth="3" />
        <line x1="76" y1="24" x2="76" y2="48" stroke="#0b1222" strokeWidth="1.5" />
      </>
    ),
  },
  lens: {
    label: "Light bent around an unseen mass",
    art: (
      <>
        <circle className="paper-thumb__muted" cx="48" cy="36" r="6" />
        <path className="paper-thumb__line paper-thumb__line--bold" d="M26 26a24 24 0 0 1 14 -10" />
        <path className="paper-thumb__line paper-thumb__line--bold" d="M70 46a24 24 0 0 1 -14 10" />
        <path className="paper-thumb__line paper-thumb__line--bold" d="M68 22a24 24 0 0 1 4 8" />
      </>
    ),
  },
  rotation: {
    label: "Galaxy rotation curve: observed and predicted",
    art: (
      <>
        <path className="paper-thumb__line paper-thumb__line--bold" d="M10 62C16 30 26 22 40 20L88 19" />
        <path className="paper-thumb__axis paper-thumb__dashed" d="M10 62C16 32 24 26 34 27C52 30 70 42 88 48" fill="none" />
      </>
    ),
  },
  hawking: {
    label: "Black hole slowly radiating",
    art: (
      <>
        <circle cx="48" cy="36" r="13" fill="#0b1222" />
        <path
          className="paper-thumb__rays"
          d="M48 18V12M48 54V60M30 36H24M66 36H72M35 23L31 19M61 49L65 53M61 23L65 19M35 49L31 53"
        />
      </>
    ),
  },
  spacetime: {
    label: "Spacetime curved by a mass",
    art: (
      <>
        <path
          className="paper-thumb__line paper-thumb__line--thin"
          d="M8 18Q48 26 88 18M8 30Q48 46 88 30M8 42Q48 66 88 42M28 12Q34 40 40 64M68 12Q62 40 56 64M48 12V66"
        />
        <circle className="paper-thumb__ink" cx="48" cy="54" r="4" />
      </>
    ),
  },
  galaxy: {
    label: "Galaxy with a bright central black hole",
    art: (
      <>
        <ellipse className="paper-thumb__line" cx="48" cy="36" rx="34" ry="12" transform="rotate(-12 48 36)" />
        <ellipse className="paper-thumb__line paper-thumb__faint" cx="48" cy="36" rx="20" ry="7" transform="rotate(-12 48 36)" />
        <circle className="paper-thumb__star" cx="48" cy="36" r="4" />
      </>
    ),
  },
};

const TOPIC_FALLBACK: Record<string, ThumbnailKind> = {
  "black holes": "ring",
  "gravitational waves": "chirp",
  exoplanets: "transit",
  "dark matter": "rotation",
};

function pickThumbnail(paper: PaperSummary): ThumbnailKind {
  const words = paper.keywords.map((keyword) => keyword.toLowerCase());
  const has = (text: string) => words.some((word) => word.includes(text));

  if (has("m87") || has("sagittarius") || has("interferometry")) return "ring";
  if (has("hawking")) return "hawking";
  if (has("pulsar")) return "pulses";
  if (has("neutron star")) return "merger";
  if (has("merger") || has("ligo") || has("binary black hole")) return "chirp";
  if (has("radial velocity")) return "wobble";
  if (has("transit")) return "transit";
  if (has("atmosphere") || has("spectroscopy")) return "spectrum";
  if (has("lensing")) return "lens";
  if (has("rotation curve")) return "rotation";
  if (has("binary star") || has("astrometry") || has("orbit")) return "orbit";
  if (has("supermassive") || has("galaxy")) return "galaxy";
  if (paper.paperType === "theoretical") return "spacetime";

  return TOPIC_FALLBACK[paper.topic.toLowerCase()] ?? "spacetime";
}

export function PaperThumbnail({ paper, href }: PaperThumbnailProps) {
  const thumbnail = THUMBNAILS[pickThumbnail(paper)];

  return (
    <a
      className="paper-thumb"
      href={href}
      tabIndex={-1}
      aria-hidden="true"
      title={thumbnail.label}
    >
      <svg viewBox="0 0 96 72">{thumbnail.art}</svg>
    </a>
  );
}