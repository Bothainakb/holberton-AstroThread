import "./FilterPills.css";

export interface FilterPillOption {
  value: string;
  label: string;
  count?: number;
}

interface FilterPillsProps {
  legend: string;
  options: readonly FilterPillOption[];
  selected: readonly string[];
  onChange: (selected: string[]) => void;
  disabled?: boolean;
}

export function FilterPills({
  legend,
  options,
  selected,
  onChange,
  disabled = false,
}: FilterPillsProps) {
  function toggle(value: string) {
    onChange(
      selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value],
    );
  }

  return (
    <fieldset className="filter-pills" disabled={disabled}>
      <legend className="filter-pills__legend">{legend}</legend>
      <div className="filter-pills__list">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className="filter-pills__pill"
            aria-pressed={selected.includes(option.value)}
            onClick={() => toggle(option.value)}
          >
            {option.label}
            {option.count !== undefined && (
              <span className="filter-pills__count">{option.count}</span>
            )}
          </button>
        ))}
      </div>
    </fieldset>
  );
}