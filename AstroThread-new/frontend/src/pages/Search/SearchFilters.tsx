import { SelectField } from "../../components/FormField/FormField";
import type { FacetOption, SearchFilters as Filters } from "../../lib/searchResults";
import { YEAR_RANGES } from "../../lib/searchResults";
import type { PaperType } from "../../types/research";

interface SearchFiltersProps {
  id: string;
  filters: Filters;
  topicOptions: FacetOption[];
  paperTypeOptions: FacetOption[];
  authorOptions: FacetOption[];
  disabled: boolean;
  onChange: (filters: Filters) => void;
  onClear: () => void;
}

function toggleValue<Value extends string>(values: Value[], value: Value) {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

function FilterPills({
  legend,
  options,
  selected,
  disabled,
  onToggle,
}: {
  legend: string;
  options: FacetOption[];
  selected: string[];
  disabled: boolean;
  onToggle: (value: string) => void;
}) {
  return (
    <fieldset className="search-filters__group" disabled={disabled}>
      <legend className="search-filters__legend">{legend}</legend>
      <div className="search-filters__pills">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className="search-filters__pill"
            aria-pressed={selected.includes(option.value)}
            onClick={() => onToggle(option.value)}
          >
            {option.label}
            <span className="search-filters__count">{option.count}</span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function SearchFilters({
  id,
  filters,
  topicOptions,
  paperTypeOptions,
  authorOptions,
  disabled,
  onChange,
  onClear,
}: SearchFiltersProps) {
  if (disabled) {
    return (
      <div id={id} className="search-filters">
        <p className="search-filters__hint">
          Filters become available after you search.
        </p>
      </div>
    );
  }

  return (
    <div id={id} className="search-filters">
      <FilterPills
        legend="Topic"
        options={topicOptions}
        selected={filters.topics}
        disabled={disabled}
        onToggle={(topic) =>
          onChange({ ...filters, topics: toggleValue(filters.topics, topic) })
        }
      />

      <SelectField
        id={`${id}-year`}
        label="Year"
        options={YEAR_RANGES}
        value={filters.yearRange}
        disabled={disabled}
        onChange={(event) =>
          onChange({
            ...filters,
            yearRange: event.target.value as Filters["yearRange"],
          })
        }
      />

      <FilterPills
        legend="Paper type"
        options={paperTypeOptions}
        selected={filters.paperTypes}
        disabled={disabled}
        onToggle={(type) =>
          onChange({
            ...filters,
            paperTypes: toggleValue(filters.paperTypes, type as PaperType),
          })
        }
      />

      <SelectField
        id={`${id}-author`}
        label="Author"
        options={[
          { value: "", label: "All authors" },
          ...authorOptions.map((option) => ({
            value: option.value,
            label: `${option.label} (${option.count})`,
          })),
        ]}
        value={filters.author}
        disabled={disabled}
        onChange={(event) => onChange({ ...filters, author: event.target.value })}
      />

      <button type="button" className="search-filters__clear" onClick={onClear}>
        Clear all
      </button>
    </div>
  );
}