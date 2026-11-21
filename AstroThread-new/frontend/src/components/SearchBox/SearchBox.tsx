import { useId, useRef } from "react";
import type { ChangeEvent, SyntheticEvent } from "react";
import "./SearchBox.css";

type SearchBoxSize = "large" | "compact";

interface SearchBoxProps {
  value: string;
  onValueChange: (value: string) => void;
  onSearch: (query: string) => void;
  label?: string;
  placeholder?: string;
  buttonLabel?: string;
  clearLabel?: string;
  size?: SearchBoxSize;
}

export function SearchBox({
  value,
  onValueChange,
  onSearch,
  label = "Search papers and topics",
  placeholder = "Search papers and topics",
  buttonLabel = "Search",
  clearLabel = "Clear search",
  size = "large",
}: SearchBoxProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const iconSize = size === "large" ? 22 : 20;

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    onValueChange(event.target.value);
  }

  function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    onSearch(value.trim());
  }

  function handleClear() {
    onValueChange("");
    inputRef.current?.focus();
  }

  return (
    <form
      className={`search-box search-box--${size}`}
      role="search"
      onSubmit={handleSubmit}
    >
      <label className="visually-hidden" htmlFor={inputId}>
        {label}
      </label>

      <input
        ref={inputRef}
        id={inputId}
        className="search-box__input"
        type="search"
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        enterKeyHint="search"
        onChange={handleChange}
      />

      {value.length > 0 && (
        <button
          type="button"
          className="search-box__clear"
          aria-label={clearLabel}
          onClick={handleClear}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      )}

      <button type="submit" className="search-box__submit" aria-label={buttonLabel}>
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
      </button>
    </form>
  );
}