import { useEffect, useRef, useState } from 'react'
import Button from '../../components/Button/Button'
import DataChart from '../../components/DataChart/DataChart'
import ResearchThreadCard, {
  type ResearchThreadCardData,
} from '../../components/ResearchThreadCard/ResearchThreadCard'
import SearchBar from '../../components/SearchBar/SearchBar'
import SectionHeader from '../../components/SectionHeader/SectionHeader'
import Tag from '../../components/Tag/Tag'
import Timeline from '../../components/Timeline/Timeline'
import {
  HOME_THREAD_LIMIT,
  blackHoleMassData,
  blackHoleTimeline,
  popularTopics,
  toHomeThread,
} from '../../data/home'
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
  | { status: 'success'; threads: ResearchThreadCardData[] }

/**
 * Loads the Home page threads from GET /api/threads, searching title, category
 * and description when `query` is set. Without a query only the first row of
 * threads is shown.
 */
function useHomeThreads(query: string) {
  const [attempt, setAttempt] = useState(0)
  // The result remembers which request produced it, so a new query or retry
  // shows the loading state until its own response arrives.
  const [result, setResult] = useState<ThreadsResult & { request: string }>()
  const request = `${attempt}:${query}`

  useEffect(() => {
    const controller = new AbortController()

    fetchThreads({ query, signal: controller.signal })
      .then((threads) => {
        const shown = query ? threads : threads.slice(0, HOME_THREAD_LIMIT)
        setResult({ request, status: 'success', threads: shown.map(toHomeThread) })
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

  if (state.threads.length === 0) {
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
          {resultLabel(state.threads.length)} for "{query}"
        </p>
      )}
      <div className="home-threads__grid">
        {state.threads.map((thread) => (
          <ResearchThreadCard key={thread.id} thread={thread} />
        ))}
      </div>
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

  // Smooth scrolling (and its reduced-motion opt-out) comes from index.css.
  function showResults() {
    threadsRef.current?.scrollIntoView()
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
      <section className="home-hero container" aria-labelledby="home-hero-title">
        <Tag className="home-hero__label">Astronomy &amp; Physics Research</Tag>
        <h1 className="home-hero__title" id="home-hero-title">
          Explore the Universe
        </h1>
        <p className="home-hero__description">
          Explore the evolution of scientific discoveries. Follow research threads that connect
          ideas, observations and discoveries over time.
        </p>

        <div className="home-hero__search" id="search">
          <SearchBar
            id={SEARCH_INPUT_ID}
            value={input}
            onChange={handleInputChange}
            onSearch={handleSearch}
            clearable
            maxLength={MAX_QUERY_LENGTH}
          />
        </div>

        <div className="home-hero__actions">
          <Button href={routes.researchThreads}>Explore Research</Button>
          <Button variant="secondary" href="#latest-discoveries">
            View Timeline
          </Button>
        </div>

        <div className="home-hero__popular" role="group" aria-label="Popular topics">
          <span className="home-hero__popular-label">Popular:</span>
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

      <section
        ref={threadsRef}
        className="home-threads container"
        aria-labelledby="research-threads"
      >
        <SectionHeader
          id="research-threads"
          title="Research Threads"
          subtitle={
            query
              ? `Results for "${query}" in titles, categories and descriptions.`
              : 'Research connects ideas, observations, and discoveries.'
          }
          action={
            <Button variant="secondary" href={routes.researchThreads}>
              View all threads
            </Button>
          }
        />
        <HomeThreads query={query} onClearSearch={clearSearch} />
      </section>

      <section className="home-latest container" aria-labelledby="latest-discoveries">
        <SectionHeader
          id="latest-discoveries"
          title="Latest Discoveries"
          subtitle="Black Holes thread: from the first observation to the latest research."
        />
        <div className="home-latest__timeline">
          <Timeline events={blackHoleTimeline} />
        </div>
      </section>

      <section className="home-data container" aria-labelledby="home-data-title">
        <div className="home-data__content">
          <Tag>Data</Tag>
          <h2 className="home-data__title" id="home-data-title">
            See the data behind every discovery
          </h2>
          <p className="home-data__description">
            Each research thread includes the measurements and trends that shaped it, shown in
            clear charts.
          </p>
          <Button className="home-data__button" href={routes.researchThreads}>
            Explore Research
          </Button>
        </div>

        <DataChart title="Black Hole Mass" note="Illustrative data" data={blackHoleMassData} />
      </section>
    </main>
  )
}

export default HomePage
