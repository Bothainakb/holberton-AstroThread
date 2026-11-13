import type { ChangeEvent } from "react";
import type { SearchFilters as Filters, SortOption, YearRange } from "../../lib/searchResults";
import { PAPER_TYPE_LABELS, SORT_OPTIONS, YEAR_RANGES } from "../../lib/searchResults";
import type { PaperType } from "../../types/research";

interface SearchFiltersProps {
  filters: Filters;
  sort: SortOption;
  disabled?: boolean;
  onFiltersChange: (filters: Filters) => void;
  onSortChange: (sort: SortOption) => void;
}

interface InlineSelectProps {
  id: string;
  label: string;
  value: string;
  options: readonly { value: string; label: string }[];
  disabled: boolean;
  onChange: (value: string) => void;
}

const YEAR_OPTIONS = YEAR_RANGES.map((range) => ({
  value: range.value,
  label: range.value === "any" ? "All years" : range.label,
}));

const TYPE_OPTIONS = [
  { value: "", label: "All types" },
  ...(Object.keys(PAPER_TYPE_LABELS) as PaperType[]).map((type) => ({
    value: type,
    label: PAPER_TYPE_LABELS[type],
  })),
];

const SORT_SELECT_OPTIONS = SORT_OPTIONS.map((option) => ({
  value: option.value,
  label: `Sort: ${option.label}`,
}));

function InlineSelect({ id, label, value, options, disabled, onChange }: InlineSelectProps) {
  return (
    <div className="search-filters__field">
      <label className="visually-hidden" htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        className="search-filters__select"
        value={value}
        disabled={disabled}
        onChange={(event: ChangeEvent<HTMLSelectElement>) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <svg
        className="search-filters__chevron"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </div>
  );
}

export function SearchFilters({
  filters,
  sort,
  disabled = false,
  onFiltersChange,
  onSortChange,
}: SearchFiltersProps) {
  return (
    <div className="search-filters" role="group" aria-label="Filter and sort results">
      <InlineSelect
        id="search-filter-year"
        label="Year"
        value={filters.yearRange}
        options={YEAR_OPTIONS}
        disabled={disabled}
        onChange={(value) =>
          onFiltersChange({ ...filters, yearRange: value as YearRange })
        }
      />

      <InlineSelect
        id="search-filter-type"
        label="Paper type"
        value={filters.paperTypes[0] ?? ""}
        options={TYPE_OPTIONS}
        disabled={disabled}
        onChange={(value) =>
          onFiltersChange({
            ...filters,
            paperTypes: value ? [value as PaperType] : [],
          })
        }
      />

      <InlineSelect
        id="search-sort"
        label="Sort results"
        value={sort}
        options={SORT_SELECT_OPTIONS}
        disabled={disabled}
        onChange={(value) => onSortChange(value as SortOption)}
      />
    </div>
  );
}