
import { useId } from "react";
import type { ChangeEvent, SyntheticEvent } from "react";
import "./SearchBox.css";

interface SearchBoxProps {
  value: string;
  onValueChange: (value: string) => void;
  onSearch: (query: string) => void;
  label?: string;
  placeholder?: string;
  buttonLabel?: string;
}

export function SearchBox({
  value,
  onValueChange,
  onSearch,
  label = "Search topics and research papers",
  placeholder = "Search by topic, keyword, paper title, or author...",
  buttonLabel = "Search",
}: SearchBoxProps) {
  const inputId = useId();

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    onValueChange(event.target.value);
  }

  function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    onSearch(value.trim());
  }

  return (
    <form className="search-box" role="search" onSubmit={handleSubmit}>
      <label className="visually-hidden" htmlFor={inputId}>
        {label}
      </label>

      <span className="search-box__icon" aria-hidden="true">
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
      </span>

      <input
        id={inputId}
        className="search-box__input"
        type="search"
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        enterKeyHint="search"
        onChange={handleChange}
      />

      <button className="search-box__button" type="submit">
        {buttonLabel}
      </button>
    </form>
  );
}
