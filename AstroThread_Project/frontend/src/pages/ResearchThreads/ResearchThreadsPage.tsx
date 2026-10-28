import { useEffect, useMemo, useState } from 'react'
import Button from '../../components/Button/Button'
import FilterChip from '../../components/FilterChip/FilterChip'
import ResearchThreadCard, {
  type ResearchThreadCardData,
} from '../../components/ResearchThreadCard/ResearchThreadCard'
import SearchBar from '../../components/SearchBar/SearchBar'
import Tag from '../../components/Tag/Tag'
import ThreadStages from '../../components/ThreadStages/ThreadStages'
import { previewCurrentStage, threadStages } from '../../data/threads'
import { fetchThreads, type ApiThread } from '../../services/api'
import { threadDetailsPath } from '../../router/router'
import './ResearchThreadsPage.css'
import '../ResearchSearch/ResearchSearchPage.css' // for the No Results styles

const ALL_TOPICS = 'all'

const TOPIC_SLUGS = [
  'black-holes',
  'dark-matter',
  'exoplanets',
  'gravitational-waves',
  'neutron-stars',
  'expanding-universe',
]

function updatedLabel(iso?: string | null) {
  if (!iso) return undefined
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (days <= 0) return 'Updated today'
  if (days < 7) return `Updated ${days} ${days === 1 ? 'day' : 'days'} ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 5) return `Updated ${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`
  return `Updated ${new Date(iso).toLocaleDateString()}`
}

function mapApiThread(thread: ApiThread): ResearchThreadCardData {
  const stagesDone = thread.completedStages || undefined
  return {
    id: thread.slug ?? String(thread.id),
    title: thread.title,
    category: thread.category,
    description: thread.description,
    paperCount: thread.paperCount || undefined, // hide "0 papers"
    completedStages: stagesDone, // hide "0 / 5"
    totalStages: stagesDone ? (thread.totalStages ?? 5) : undefined,
    updatedLabel: updatedLabel(thread.updatedAt),
  }
}

function ResearchThreadsPage() {
  const [query, setQuery] = useState('')
  const [topic, setTopic] = useState(ALL_TOPICS)
  const [threads, setThreads] = useState<ResearchThreadCardData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function loadThreads() {
    setLoading(true)
    setError('')

    try {
      const data = await fetchThreads()
      setThreads(data.map(mapApiThread))
    } catch {
      setError('Could not load research threads. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadThreads()
  }, [])

  function clearSearch() {
    setQuery('')
    setTopic(ALL_TOPICS)
  }

  const topicFilters = useMemo(
    () => threads.filter((thread) => TOPIC_SLUGS.includes(thread.id)),
    [threads],
  )

  const visibleThreads = useMemo(() => {
    const trimmed = query.trim().toLowerCase()

    return threads.filter((thread) => {
      if (topic !== ALL_TOPICS && thread.id !== topic) return false
      if (!trimmed) return true

      return [thread.title, thread.category, thread.description].some((value) =>
        value.toLowerCase().includes(trimmed),
      )
    })
  }, [threads, query, topic])

  return (
    <main className="threads-page">
      <section className="threads-intro container" aria-labelledby="threads-title">
        <Tag>Research library</Tag>
        <h1 className="threads-intro__title" id="threads-title">
          Research Threads
        </h1>
        <p className="threads-intro__subtitle">
          Explore scientific discoveries through connected research journeys.
        </p>

        <div className="threads-intro__search" id="search">
          <SearchBar
            id="search-threads"
            className="search-bar--wide"
            placeholder="Search research topics and papers"
            value={query}
            onChange={setQuery}
          />
        </div>

        <div className="threads-intro__filters" role="group" aria-label="Filter by topic">
          <FilterChip active={topic === ALL_TOPICS} onClick={() => setTopic(ALL_TOPICS)}>
            All
          </FilterChip>
          {topicFilters.map((thread) => (
            <FilterChip
              key={thread.id}
              active={topic === thread.id}
              onClick={() => setTopic(thread.id)}
            >
              {thread.title}
            </FilterChip>
          ))}
        </div>
      </section>

      <section className="threads-list container" aria-labelledby="all-threads-title">
        <div className="threads-list__header">
          <h2 className="threads-list__title" id="all-threads-title">
            All threads
          </h2>
          <p className="threads-list__meta" aria-live="polite">
            {loading
              ? 'Loading research threads...'
              : `Showing ${visibleThreads.length} of ${threads.length} threads · Sorted by most recent`}
          </p>
        </div>

        {loading ? (
          <p role="status">Loading research threads...</p>
        ) : error ? (
          <div role="alert">
            <p>{error}</p>
            <button
              type="button"
              className="button button--secondary"
              onClick={() => void loadThreads()}
            >
              Try Again
            </button>
          </div>
        ) : visibleThreads.length > 0 ? (
          <div className="threads-list__grid">
            {visibleThreads.map((thread) => (
              <ResearchThreadCard key={thread.id} thread={thread} />
            ))}
          </div>
        ) : (
          <div className="search-empty">
            <h3 className="search-empty__title">No research found</h3>
            <p className="search-empty__text">
              {query.trim() ? `Nothing matches "${query.trim()}". ` : ''}
              Try a different keyword, such as a topic like "black holes" or a category like
              "cosmology".
            </p>
            <div className="search-empty__actions">
              <button
                type="button"
                className="button button--secondary search-empty__clear"
                onClick={clearSearch}
              >
                Clear search
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="threads-journey" aria-labelledby="journey-title">
        <div className="container">
          <div className="threads-journey__header">
            <div>
              <Tag>Research journey</Tag>
              <h2 className="threads-journey__title" id="journey-title">
                How a thread unfolds
              </h2>
              <p className="threads-journey__description">
                Every thread follows the same five stages, from the first idea to the latest
                developments. Preview: Black Holes.
              </p>
            </div>
            <Button href={threadDetailsPath('black-holes')}>Explore Thread</Button>
          </div>

          <div className="threads-journey__stages">
            <ThreadStages stages={threadStages} currentStage={previewCurrentStage} />
          </div>
        </div>
      </section>
    </main>
  )
}

export default ResearchThreadsPage
