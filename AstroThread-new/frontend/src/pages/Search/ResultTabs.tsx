import { useEffect, useId, useRef, useState } from "react";

export type ResultTab = "all" | "images" | "timeline" | "data";

interface ResultTabsProps {
  active: ResultTab;
  onChange: (tab: ResultTab) => void;
}

const MORE_TABS: readonly { value: ResultTab; label: string }[] = [
  { value: "timeline", label: "Timeline" },
  { value: "data", label: "Data" },
];

export function parseResultTab(value: string | null): ResultTab {
  return value === "images" || value === "timeline" || value === "data" ? value : "all";
}

export function ResultTabs({ active, onChange }: ResultTabsProps) {
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const menuId = useId();
  const moreRef = useRef<HTMLLIElement>(null);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const activeMore = MORE_TABS.find((tab) => tab.value === active);

  useEffect(() => {
    if (!isMoreOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (moreRef.current && !moreRef.current.contains(event.target as Node)) {
        setIsMoreOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsMoreOpen(false);
        moreButtonRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMoreOpen]);

  function select(tab: ResultTab) {
    setIsMoreOpen(false);
    onChange(tab);
  }

  return (
    <nav className="search-page__tabs" aria-label="Result types">
      <ul className="search-page__tab-list">
        <li>
          <button
            type="button"
            className="search-page__tab"
            aria-current={active === "all" ? "page" : undefined}
            onClick={() => select("all")}
          >
            All
          </button>
        </li>
        <li>
          <button
            type="button"
            className="search-page__tab"
            aria-current={active === "images" ? "page" : undefined}
            onClick={() => select("images")}
          >
            Images
          </button>
        </li>
        <li className="search-page__more" ref={moreRef}>
          <button
            ref={moreButtonRef}
            type="button"
            className="search-page__tab"
            aria-current={activeMore ? "page" : undefined}
            aria-expanded={isMoreOpen}
            aria-controls={menuId}
            onClick={() => setIsMoreOpen((open) => !open)}
          >
            {activeMore ? activeMore.label : "More"}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M7 10l5 5 5-5z" />
            </svg>
          </button>

          <ul id={menuId} className="search-page__more-menu" hidden={!isMoreOpen}>
            {MORE_TABS.map((tab) => (
              <li key={tab.value}>
                <button
                  type="button"
                  className="search-page__more-item"
                  aria-current={active === tab.value ? "page" : undefined}
                  onClick={() => select(tab.value)}
                >
                  {tab.label}
                </button>
              </li>
            ))}
          </ul>
        </li>
      </ul>
    </nav>
  );
}