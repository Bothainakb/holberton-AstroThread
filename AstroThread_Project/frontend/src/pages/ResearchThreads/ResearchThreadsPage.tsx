import { useEffect, useMemo, useState } from 'react'
import Button from '../../components/Button/Button'
import FilterChip from '../../components/FilterChip/FilterChip'
import ResearchThreadCard from '../../components/ResearchThreadCard/ResearchThreadCard'
import SearchBar from '../../components/SearchBar/SearchBar'
import Tag from '../../components/Tag/Tag'
import ThreadStages from '../../components/ThreadStages/ThreadStages'
import {
  previewCurrentStage,
  threadStages,
  type ResearchThread,
} from '../../data/threads'
import { fetchThreads, type ApiThread } from '../../services/api'
import { threadDetailsPath } from '../../router/router'
import './ResearchThreadsPage.css'

const ALL_TOPICS = 'all'

function mapApiThread(thread: ApiThread): ResearchThread {
  return {
    id: String(thread.id),
    title: thread.title,
    category: thread.category,
    description: thread.description,
    paperCount: 0,
    completedStages: 0,
    totalStages: 5,
    updatedLabel: '',
  }
}

function ResearchThreadsPage() {
  const [query, setQuery] = useState('')
  const [topic, setTopic] = useState(ALL_TOPICS)
  const [threads, setThreads] = useState<ResearchThread[]>([])
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

  const topicFilters = useMemo(
    () => threads.filter((thread) => [
      'black-holes',
      'dark-matter',
      'exoplanets',
      'gravitational-waves',
      'neutron-stars',
      'expanding-universe',
    ].includes(thread.id)),
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
           <button type="button" onClick={() => void loadThreads()}>
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
          <p className="threads-list__empty">
            No threads match your search.
          </p>
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
