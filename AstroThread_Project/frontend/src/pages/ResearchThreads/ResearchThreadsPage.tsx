import { useMemo, useState } from 'react'
import Button from '../../components/Button/Button'
import FilterChip from '../../components/FilterChip/FilterChip'
import ResearchThreadCard from '../../components/ResearchThreadCard/ResearchThreadCard'
import SearchBar from '../../components/SearchBar/SearchBar'
import Tag from '../../components/Tag/Tag'
import ThreadStages from '../../components/ThreadStages/ThreadStages'
import {
  previewCurrentStage,
  researchThreads,
  threadStages,
  totalThreadCount,
} from '../../data/threads'
import { threadDetailsPath } from '../../router/router'
import './ResearchThreadsPage.css'

const ALL_TOPICS = 'all'

// Topic filters in the order shown in Figma.
const topicFilters = [
  'black-holes',
  'dark-matter',
  'exoplanets',
  'gravitational-waves',
  'neutron-stars',
  'expanding-universe',
].flatMap((id) => researchThreads.filter((thread) => thread.id === id))

function matchesQuery(text: string, query: string) {
  return text.toLowerCase().includes(query.toLowerCase())
}

function ResearchThreadsPage() {
  const [query, setQuery] = useState('')
  const [topic, setTopic] = useState(ALL_TOPICS)

  const visibleThreads = useMemo(() => {
    const trimmed = query.trim()
    return researchThreads.filter((thread) => {
      if (topic !== ALL_TOPICS && thread.id !== topic) return false
      if (!trimmed) return true
      return [thread.title, thread.category, thread.description].some((text) =>
        matchesQuery(text, trimmed),
      )
    })
  }, [query, topic])

  const isFiltered = topic !== ALL_TOPICS || query.trim() !== ''
  const remainingThreads = totalThreadCount - researchThreads.length

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
            Showing {visibleThreads.length} of {totalThreadCount} threads · Sorted by most recent
          </p>
        </div>

        {visibleThreads.length > 0 ? (
          <div className="threads-list__grid">
            {visibleThreads.map((thread) => (
              <ResearchThreadCard key={thread.id} thread={thread} />
            ))}
          </div>
        ) : (
          <p className="threads-list__empty">No threads match your search.</p>
        )}

        {!isFiltered && remainingThreads > 0 && (
          <div className="threads-list__more">
            {/* More threads will come from the API; nothing else is available locally yet. */}
            <button type="button" className="button button--secondary">
              Load More Threads
            </button>
            <p className="threads-list__more-note">{remainingThreads} more threads available</p>
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
