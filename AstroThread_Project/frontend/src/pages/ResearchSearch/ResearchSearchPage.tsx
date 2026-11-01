import { useMemo, useState } from 'react'
import Button from '../../components/Button/Button'
import ResearchThreadCard from '../../components/ResearchThreadCard/ResearchThreadCard'
import SearchBar from '../../components/SearchBar/SearchBar'
import { researchThreads } from '../../data/threads'
import { routes } from '../../router/router'
import './ResearchSearchPage.css'

function matchesQuery(text: string, query: string) {
  return text.toLowerCase().includes(query.toLowerCase())
}

function resultLabel(count: number) {
  return `${count} ${count === 1 ? 'result' : 'results'}`
}

const SEARCH_INPUT_ID = 'search-research-topics'

function ResearchSearchPage() {
  const [query, setQuery] = useState('')
  const trimmed = query.trim()

  // The empty-state button disappears once cleared, so focus returns to the input.
  function clearAndFocusSearch() {
    setQuery('')
    document.getElementById(SEARCH_INPUT_ID)?.focus()
  }

  const results = useMemo(() => {
    if (!trimmed) return researchThreads
    return researchThreads.filter((thread) =>
      [thread.title, thread.category, thread.description].some((text) =>
        matchesQuery(text, trimmed),
      ),
    )
  }, [trimmed])

  return (
    <main className="search-page">
      <section className="search-intro container" aria-labelledby="search-title">
        <h1 className="search-intro__title" id="search-title">
          Research Search
        </h1>
        <p className="search-intro__subtitle">
          Search astronomy and physics research topics by title, category or description.
        </p>

        <div className="search-intro__field">
          <SearchBar
            id={SEARCH_INPUT_ID}
            className="search-bar--wide"
            placeholder="Search research topics..."
            value={query}
            onChange={setQuery}
            clearable
          />
        </div>
      </section>

      <section className="search-results container" aria-labelledby="search-results-title">
        <div className="search-results__header">
          <h2 className="search-results__title" id="search-results-title">
            {trimmed ? 'Search results' : 'All research threads'}
          </h2>
          <p className="search-results__count" aria-live="polite">
            {trimmed
              ? `${resultLabel(results.length)} for "${trimmed}"`
              : `${resultLabel(results.length)} · Type to filter research threads`}
          </p>
        </div>

        {results.length > 0 ? (
          <div className="search-results__grid">
            {results.map((thread) => (
              <ResearchThreadCard key={thread.id} thread={thread} />
            ))}
          </div>
        ) : (
          <div className="search-empty">
            <h3 className="search-empty__title">No research found</h3>
            <p className="search-empty__text">
              Nothing matches "{trimmed}". Try a different keyword, such as a topic like
              "black holes" or a category like "cosmology", or explore our Research Threads.
            </p>
            <div className="search-empty__actions">
              <button
                type="button"
                className="button button--secondary search-empty__clear"
                onClick={clearAndFocusSearch}
              >
                Clear search
              </button>
              <Button href={routes.researchThreads}>Explore Research Threads</Button>
            </div>
          </div>
        )}
      </section>
    </main>
  )
}

export default ResearchSearchPage
