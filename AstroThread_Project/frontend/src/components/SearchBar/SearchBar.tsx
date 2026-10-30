import { useRef, type FormEvent } from 'react'
import searchIcon from '../../assets/icons/search-muted.svg'
import './SearchBar.css'

interface SearchBarProps {
  id?: string
  placeholder?: string
  className?: string
  /** Pass `value` and `onChange` to filter as the user types. */
  value?: string
  onChange?: (query: string) => void
  onSearch?: (query: string) => void
  /** Show a clear button while the (controlled) input has text. */
  clearable?: boolean
  maxLength?: number
  /** Text of a submit button inside the bar (Figma "01-Home"); omitted, the bar has none. */
  submitLabel?: string
  /** Icon inside the field; Figma "01-Home" uses a larger, darker one (22 x 22). */
  icon?: { src: string; size: number }
}

/** Figma "Search Bar": search input for research topics and papers. */
function SearchBar({
  id = 'search-research',
  placeholder = 'Search research...',
  className,
  value,
  onChange,
  onSearch,
  clearable = false,
  maxLength,
  submitLabel,
  icon = { src: searchIcon, size: 17.25 },
}: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const showClear = clearable && Boolean(value)

  function handleClear() {
    onChange?.('')
    inputRef.current?.focus()
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const query = new FormData(event.currentTarget).get('q')
    onSearch?.(String(query ?? '').trim())
  }

  return (
    <form
      className={[
        'search-bar',
        clearable && 'search-bar--clearable',
        submitLabel && 'search-bar--with-submit',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      role="search"
      onSubmit={handleSubmit}
    >
      <label className="visually-hidden" htmlFor={id}>
        {placeholder.replace(/\.+$/, '')}
      </label>
      <img className="search-bar__icon" src={icon.src} alt="" width={icon.size} height={icon.size} />
      <input
        ref={inputRef}
        id={id}
        className="search-bar__input"
        type="search"
        name="q"
        placeholder={placeholder}
        autoComplete="off"
        maxLength={maxLength}
        value={value}
        onChange={onChange ? (event) => onChange(event.target.value) : undefined}
      />
      {showClear && (
        <button type="button" className="search-bar__clear" aria-label="Clear search" onClick={handleClear}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path
              d="M1 1L11 11M11 1L1 11"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
            />
          </svg>
        </button>
      )}
      {submitLabel && (
        <button type="submit" className="search-bar__submit">
          {submitLabel}
        </button>
      )}
    </form>
  )
}

export default SearchBar
