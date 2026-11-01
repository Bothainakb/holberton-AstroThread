import { useEffect, useRef, useState } from 'react'
import searchFieldIcon from '../../assets/icons/search-field.svg'
import logoMark from '../../assets/logo.svg'
import Button from '../../components/Button/Button'
import ResearchThreadCard, {
  type ResearchThreadCardData,
} from '../../components/ResearchThreadCard/ResearchThreadCard'
import SearchBar from '../../components/SearchBar/SearchBar'
import SectionHeader from '../../components/SectionHeader/SectionHeader'
import Tag from '../../components/Tag/Tag'
import {
  HOME_THREAD_LIMIT,
  popularTopics,
  selectHomeThreads,
  toHomeThread,
} from '../../data/home'
import { designOnlyMatches } from '../../data/threadSearch'
import { replaceSearchParam, routes, useSearchParam } from '../../router/router'
import { ApiError, fetchThreads } from '../../services/api'
import './HomePage.css'

const SEARCH_INPUT_ID = 'search-research'
/** Wait this long after the last keystroke before searching. */
const SEARCH_DELAY_MS = 300
/** Matches MAX_QUERY_LENGTH in backend/app.py. */
const MAX_QUERY_LENGTH = 100

type ThreadsResult =
  | { status: 'error'; message: string }
  | {
      status: 'success'
      threads: ResearchThreadCardData[]
      /** Design-only threads (not in the database yet) that match the search. */
      previews: ResearchThreadCardData[]
    }

/**
 * Loads the Home page threads from GET /api/threads, searching title, category
 * and description when `query` is set. Without a query only the first row of
 * threads is shown. A search also lists matching design-only threads (e.g.
 * Dark Matter) that have no database record yet, kept apart as previews.
 */
function useHomeThreads(query: string) {
  const [attempt, setAttempt] = useState(0)
  // The result remembers which request produced it, so a new query or retry
  // shows the loading state until its own response arrives.
  const [result, setResult] = useState<ThreadsResult & { request: string }>()
  const request = `${attempt}:${query}`

  useEffect(() => {
    const controller = new AbortController()

    // A search also needs every database thread, to know which design
    // threads have no record (and so are previews, not duplicates).
    Promise.all([
      fetchThreads({ query, signal: controller.signal }),
      query ? fetchThreads({ signal: controller.signal }) : Promise.resolve([]),
    ])
      .then(([threads, allThreads]) => {
        const homeThreads = selectHomeThreads(threads)
        const shown = query ? homeThreads : homeThreads.slice(0, HOME_THREAD_LIMIT)
        const previews = query ? selectHomeThreads(designOnlyMatches(query, allThreads)) : []
        setResult({
          request,
          status: 'success',
          threads: shown.map(toHomeThread),
          previews: previews.map(({ id, title, category, description }) => ({
            id,
            title,
            category,
            description,
          })),
        })
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        const message =
          error instanceof ApiError ? error.message : 'Something went wrong while loading threads.'
        setResult({ request, status: 'error', message })
      })

    return () => controller.abort()
  }, [query, request])

  const state = result?.request === request ? result : { status: 'loading' as const }
  return { state, retry: () => setAttempt((value) => value + 1) }
}

function resultLabel(count: number) {
  return `${count} ${count === 1 ? 'result' : 'results'}`
}

interface HomeThreadsProps {
  query: string
  onClearSearch: () => void
}

function HomeThreads({ query, onClearSearch }: HomeThreadsProps) {
  const { state, retry } = useHomeThreads(query)

  if (state.status === 'loading') {
    return (
      <div className="home-threads__status" role="status">
        <p className="home-threads__status-title">
          {query ? `Searching for "${query}"…` : 'Loading research threads…'}
        </p>
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div className="home-threads__status home-threads__status--error" role="alert">
        <p className="home-threads__status-title">Research threads could not be loaded</p>
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

  const { threads, previews } = state

  if (threads.length === 0 && previews.length === 0) {
    if (query) {
      return (
        <div className="home-threads__status" role="status">
          <p className="home-threads__status-title">No research threads match "{query}"</p>
          <p className="home-threads__status-text">
            Try another keyword from a thread's title, category or description.
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

    return (
      <div className="home-threads__status" role="status">
        <p className="home-threads__status-title">No research threads yet</p>
        <p className="home-threads__status-text">
          New research threads will appear here once they are added.
        </p>
      </div>
    )
  }

  return (
    <>
      {query && (
        <p className="visually-hidden" role="status">
          {resultLabel(threads.length + previews.length)} for "{query}"
        </p>
      )}
      {threads.length > 0 && (
        <div className="home-threads__grid">
          {threads.map((thread) => (
            <ResearchThreadCard key={thread.id} thread={thread} />
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
  // `input` is what the user is typing.
  const [input, setInput] = useState(query)
  const threadsRef = useRef<HTMLElement>(null)

  // Follow URL changes made outside the search bar, e.g. the navbar Home link.
  const [shownQuery, setShownQuery] = useState(query)
  if (query !== shownQuery) {
    setShownQuery(query)
    if (input.trim() !== query) setInput(query)
  }

  useEffect(() => {
    const timer = window.setTimeout(() => replaceSearchParam('q', input.trim()), SEARCH_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [input])

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
    // Clearing the field shows the default threads right away.
    if (!value.trim()) setQuery('')
  }

  function handleSearch(value: string) {
    setQuery(value)
    showResults()
  }

  function handleTopicClick(topic: string) {
    const isActive = query.toLowerCase() === topic.toLowerCase()
    const next = isActive ? '' : topic
    setInput(next)
    setQuery(next)
    if (!isActive) showResults()
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

        <div className="home-hero__popular" role="group" aria-label="Popular topics">
          <span className="home-hero__popular-label">Try:</span>
          {popularTopics.map((topic) => (
            <Tag
              key={topic}
              pressed={query.toLowerCase() === topic.toLowerCase()}
              onClick={() => handleTopicClick(topic)}
            >
              {topic}
            </Tag>
          ))}
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
            title="Research Threads"
            subtitle={`Results for "${query}" in titles, categories and descriptions.`}
            action={
              <Button variant="secondary" href={routes.researchThreads}>
                View all threads
              </Button>
            }
          />
          <HomeThreads query={query} onClearSearch={clearSearch} />
        </section>
      )}
    </main>
  )
}

export default HomePage
