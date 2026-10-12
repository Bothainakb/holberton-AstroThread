import type { FormEvent } from 'react'
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
}

/** Figma "Search Bar": search input for research topics and papers. */
function SearchBar({
  id = 'search-research',
  placeholder = 'Search research...',
  className,
  value,
  onChange,
  onSearch,
}: SearchBarProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const query = new FormData(event.currentTarget).get('q')
    onSearch?.(String(query ?? '').trim())
  }

  return (
    <form
      className={['search-bar', className].filter(Boolean).join(' ')}
      role="search"
      onSubmit={handleSubmit}
    >
      <label className="visually-hidden" htmlFor={id}>
        {placeholder.replace(/\.+$/, '')}
      </label>
      <img className="search-bar__icon" src={searchIcon} alt="" width={17.25} height={17.25} />
      <input
        id={id}
        className="search-bar__input"
        type="search"
        name="q"
        placeholder={placeholder}
        autoComplete="off"
        value={value}
        onChange={onChange ? (event) => onChange(event.target.value) : undefined}
      />
    </form>
  )
}

export default SearchBar
