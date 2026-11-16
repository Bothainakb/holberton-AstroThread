import { useEffect, useRef, useState } from 'react'
import searchFieldIcon from '../../assets/icons/search-field.svg'
import logoMark from '../../assets/logo.svg'
import Button from '../../components/Button/Button'
import Icon from '../../components/Icon/Icon'
import { usePaperCounts } from '../../components/ResearchThreadCard/usePaperCounts'
import ResearchThreadCard, {
  type ResearchThreadCardData,
} from '../../components/ResearchThreadCard/ResearchThreadCard'
import SearchBar from '../../components/SearchBar/SearchBar'
import SectionHeader from '../../components/SectionHeader/SectionHeader'
import { popularTopics } from '../../data/home'
import { databaseSlug, designOnlyMatches, rankSearchResults } from '../../data/threadSearch'
import { replaceSearchParam, routes, useSearchParam } from '../../router/router'
import { ApiError, fetchThreads, type ApiThread } from '../../services/api'
import './HomePage.css'

const SEARCH_INPUT_ID = 'search-research'
/** Matches MAX_QUERY_LENGTH in backend/app.py. */
const MAX_QUERY_LENGTH = 100

/** One search result, shown as a Research Threads card; `id` is the Thread Details slug. */
type SearchResultData = ResearchThreadCardData & {
  /** Design-only thread with no database record yet. */
  preview?: boolean
}

type SearchState =
  | { status: 'error'; message: string }
  | { status: 'success'; results: SearchResultData[]; matches: ApiThread[] }

/**
 * Searches research threads with GET /api/threads?q= (title, category and
 * description, matched at the start of a word) and ranks the matches, best
 * first. Design-only threads (data/threads.ts) that match and have no
 * database record yet are listed after them as previews.
 */
function useSearchResults(query: string) {
  const [attempt, setAttempt] = useState(0)
  // The result remembers which request produced it, so a new query or retry
  // shows the loading state until its own response arrives.
  const [result, setResult] = useState<SearchState & { request: string }>()
  const request = `${attempt}:${query}`

  useEffect(() => {
    const controller = new AbortController()

    // Every database thread is also needed, to know which design threads
    // have no record (and so are previews, not duplicates).
    Promise.all([
      fetchThreads({ query, signal: controller.signal }),
      fetchThreads({ signal: controller.signal }),
    ])
      .then(([matches, allThreads]) => {
        // Same card fields as the Research Threads page: the signed-in user's
        // stage progress (0 for visitors) from the API; the paper count is
        // added when rendering (usePaperCounts).
        const found: SearchResultData[] = matches.map((thread) => {
          const totalStages = thread.totalStages || undefined
          return {
            id: databaseSlug(thread),
            title: thread.title,
            category: thread.category,
            description: thread.description,
            completedStages: totalStages
              ? Math.min(thread.completedStages ?? 0, totalStages)
              : undefined,
            totalStages, // no bar for a thread without stages
          }
        })
        const previews: SearchResultData[] = designOnlyMatches(query, allThreads).map(
          ({ id, title, category, description }) => ({ id, title, category, description, preview: true }),
        )
        setResult({
          request,
          status: 'success',
          results: [...rankSearchResults(found, query), ...rankSearchResults(previews, query)],
          matches,
        })
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        const message =
          error instanceof ApiError ? error.message : 'Something went wrong while searching.'
        setResult({ request, status: 'error', message })
      })

    return () => controller.abort()
  }, [query, request])

  const state = result?.request === request ? result : { status: 'loading' as const }
  return { state, retry: () => setAttempt((value) => value + 1) }
}

const NO_THREADS: ApiThread[] = []

function resultLabel(count: number) {
  return `${count} ${count === 1 ? 'result' : 'results'}`
}

interface SearchResultsProps {
  query: string
  onClearSearch: () => void
}

function SearchResults({ query, onClearSearch }: SearchResultsProps) {
  const { state, retry } = useSearchResults(query)
  const paperCounts = usePaperCounts(state.status === 'success' ? state.matches : NO_THREADS)

  if (state.status === 'loading') {
    return (
      <div className="home-threads__status" role="status">
        <p className="home-threads__status-title">Searching for "{query}"…</p>
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div className="home-threads__status home-threads__status--error" role="alert">
        <p className="home-threads__status-title">Search results could not be loaded</p>
        <p className="home-threads__status-text">{state.message} Please try again.</p>
        <button
          type="button"
          className="button button--secondary home-threads__retry"
          onClick={retry}
        >
          Try again
        </button>
      </div>
    )
  }

  const { results } = state

  if (results.length === 0) {
    return (
      <div className="home-threads__status" role="status">
        <p className="home-threads__status-title">No results for "{query}"</p>
        <p className="home-threads__status-text">
          Check the spelling or try another topic, such as {popularTopics.join(', ')}. Words are
          matched from their start, so "dark" finds Dark Matter.
        </p>
        <button
          type="button"
          className="button button--secondary home-threads__retry"
          onClick={onClearSearch}
        >
          Clear search
        </button>
      </div>
    )
  }

  const threads = results.filter((result) => !result.preview)
  const previews = results.filter((result) => result.preview)

  // Each result is a Research Threads card; its Explore Thread link opens the thread.
  return (
    <>
      <p className="search-results-count" role="status">
        {resultLabel(results.length)} for "{query}"
      </p>
      {threads.length > 0 && (
        <div className="home-threads__grid">
          {threads.map((thread) => (
            <ResearchThreadCard key={thread.id} thread={{ ...thread, paperCount: paperCounts.get(thread.id) }} />
          ))}
        </div>
      )}
      {previews.length > 0 && (
        <div className="home-threads__previews">
          <p className="home-threads__preview-note">
            Design {previews.length === 1 ? 'preview' : 'previews'}: not in the AstroThread
            database yet, so {previews.length === 1 ? 'this thread has' : 'these threads have'} no
            papers, NASA images or charts.
          </p>
          <div className="home-threads__grid">
            {previews.map((thread) => (
              <ResearchThreadCard key={thread.id} thread={thread} />
            ))}
          </div>
        </div>
      )}
    </>
  )
}

function HomePage() {
  // `query` is the search being shown. It lives in the URL ("/?q=...") so it
  // survives a reload and returning with the browser's Back button.
  const query = useSearchParam('q').trim()
  const setQuery = (value: string) => replaceSearchParam('q', value)
  // `input` is what the user is typing; like a search engine, results only
  // change when a search is submitted (Enter, the Search button or a topic).
  const [input, setInput] = useState(query)
  const threadsRef = useRef<HTMLElement>(null)

  // Follow URL changes made outside the search bar, e.g. the navbar Home link.
  const [shownQuery, setShownQuery] = useState(query)
  if (query !== shownQuery) {
    setShownQuery(query)
    if (input.trim() !== query) setInput(query)
  }

  // The results section only renders once a query is set, so scroll after that
  // render. Smooth scrolling (and its reduced-motion opt-out) comes from index.css.
  const [scrollRequest, setScrollRequest] = useState(0)
  useEffect(() => {
    if (scrollRequest) threadsRef.current?.scrollIntoView()
  }, [scrollRequest])

  function showResults() {
    setScrollRequest((value) => value + 1)
  }

  function handleInputChange(value: string) {
    setInput(value)
    // Clearing the field (or its clear button) also clears the results.
    if (!value.trim()) setQuery('')
  }

  function handleSearch(value: string) {
    setQuery(value)
    showResults()
  }

  function clearSearch() {
    setInput('')
    setQuery('')
    document.getElementById(SEARCH_INPUT_ID)?.focus()
  }

  return (
    <main className="home">
      <section
        className={`home-hero container${query ? ' home-hero--searching' : ''}`}
        aria-labelledby="home-hero-title"
      >
        {/* Figma "01-Home": the brand mark and wordmark are the page heading. */}
        <h1 className="home-hero__brand" id="home-hero-title">
          <img className="home-hero__brand-mark" src={logoMark} alt="" width={112} height={57} />
          <span className="home-hero__brand-text">ASTROTHREAD</span>
        </h1>

        <div className="home-hero__search" id="search">
          <SearchBar
            id={SEARCH_INPUT_ID}
            placeholder="Search scientific research"
            value={input}
            onChange={handleInputChange}
            onSearch={handleSearch}
            clearable
            maxLength={MAX_QUERY_LENGTH}
            submitLabel="Search"
            icon={{ src: searchFieldIcon, size: 22 }}
          />
        </div>

        {/* Entry point to every topic, right under the search bar. */}
        <div className="home-hero__browse">
          <Button variant="secondary" className="home-hero__browse-button" href={routes.researchThreads}>
            Browse Threads
            <Icon name="arrow-right" />
          </Button>
          <span className="home-hero__browse-label">Browse all research topics</span>
        </div>
      </section>

      {/* Figma "01-Home" shows only the search; results appear once a search is active. */}
      {query && (
        <section
          ref={threadsRef}
          className="home-threads container"
          aria-labelledby="research-threads"
        >
          <SectionHeader
            id="research-threads"
            title="Search results"
            subtitle="Research threads whose title, category or description match your search."
            action={
              <Button variant="secondary" href={routes.researchThreads}>
                View all threads
              </Button>
            }
          />
          <SearchResults query={query} onClearSearch={clearSearch} />
        </section>
      )}
    </main>
  )
}

export default HomePage
