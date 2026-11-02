import { useEffect, useMemo, useState } from 'react'
import FilterChip from '../../components/FilterChip/FilterChip'
import { usePaperCounts } from '../../components/ResearchThreadCard/usePaperCounts'
import ResearchThreadCard, {
  type ResearchThreadCardData,
} from '../../components/ResearchThreadCard/ResearchThreadCard'
import Tag from '../../components/Tag/Tag'
import { databaseSlug, designOnlyThreads } from '../../data/threadSearch'
import { fetchThreads, type ApiThread } from '../../services/api'
import './ResearchThreadsPage.css'
import '../ResearchSearch/ResearchSearchPage.css' // for the empty-state styles

const ALL_TOPICS = 'all'

// Topic chips, in this order, for the threads that exist (database or design).
const TOPIC_SLUGS = ['black-holes', 'exoplanets', 'dark-matter']

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
  // Both counts come from the API: totalStages is the thread's stages in the
  // database, completedStages the signed-in user's progress (0 for visitors).
  const totalStages = thread.totalStages || undefined
  return {
    // Same slug as Home's cards, so links and topic chips work without a slug column.
    id: databaseSlug(thread),
    title: thread.title,
    category: thread.category,
    description: thread.description,
    // paperCount is added when rendering (usePaperCounts): the papers the thread's page lists.
    completedStages: totalStages ? Math.min(thread.completedStages ?? 0, totalStages) : undefined,
    totalStages, // no bar for a thread without stages
    updatedLabel: updatedLabel(thread.updatedAt),
  }
}

function ResearchThreadsPage() {
  const [topic, setTopic] = useState(ALL_TOPICS)
  const [threads, setThreads] = useState<ResearchThreadCardData[]>([])
  const [apiThreads, setApiThreads] = useState<ApiThread[]>([])
  const paperCounts = usePaperCounts(apiThreads)
  // Design-only threads (no database record yet); only title, category and
  // description are shown, since their design paper counts and stages are not data.
  const [previews, setPreviews] = useState<ResearchThreadCardData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function loadThreads() {
    setLoading(true)
    setError('')

    try {
      const data = await fetchThreads()
      setThreads(data.map(mapApiThread))
      setApiThreads(data)
      setPreviews(
        designOnlyThreads(data).map(({ id, title, category, description }) => ({
          id,
          title,
          category,
          description,
        })),
      )
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
    () =>
      TOPIC_SLUGS.map((slug) => [...threads, ...previews].find((thread) => thread.id === slug)).filter(
        (thread): thread is ResearchThreadCardData => thread !== undefined,
      ),
    [threads, previews],
  )

  // Searching happens on Home only; this page just filters by topic.
  const matches = (thread: ResearchThreadCardData) => topic === ALL_TOPICS || thread.id === topic
  const visibleThreads = threads.filter(matches)
  const visiblePreviews = previews.filter(matches)
  const nothingVisible = visibleThreads.length === 0 && visiblePreviews.length === 0

  return (
    <main className="threads-page">
      <section className="threads-intro container" aria-labelledby="threads-title">
        <Tag>Research library</Tag>
        <h1 className="threads-intro__title" id="threads-title">
          Browse Threads
        </h1>
        <p className="threads-intro__subtitle">
          Explore scientific discoveries through connected research journeys.
        </p>

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
              : `Showing ${visibleThreads.length} of ${threads.length} threads · Sorted by most recent${
                  visiblePreviews.length
                    ? ` · ${visiblePreviews.length} design ${visiblePreviews.length === 1 ? 'preview' : 'previews'}`
                    : ''
                }`}
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
        ) : !nothingVisible ? (
          <>
            {visibleThreads.length > 0 && (
              <div className="threads-list__grid">
                {visibleThreads.map((thread) => (
                  <ResearchThreadCard
                    key={thread.id}
                    thread={{ ...thread, paperCount: paperCounts.get(thread.id) }}
                  />
                ))}
              </div>
            )}
            {visiblePreviews.length > 0 && (
              <div className="threads-list__previews">
                <h3 className="threads-list__previews-title" id="design-previews-title">
                  Design previews
                </h3>
                <p className="threads-list__previews-note">
                  Not in the AstroThread database yet, so{' '}
                  {visiblePreviews.length === 1 ? 'this thread has' : 'these threads have'} no
                  papers, NASA images or charts.
                </p>
                <div className="threads-list__grid">
                  {visiblePreviews.map((thread) => (
                    <ResearchThreadCard key={thread.id} thread={thread} />
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="search-empty">
            <h3 className="search-empty__title">No research threads here yet</h3>
            <p className="search-empty__text">
              No thread matches this topic. Show all topics, or search from the Home page.
            </p>
            <div className="search-empty__actions">
              <button
                type="button"
                className="button button--secondary search-empty__clear"
                onClick={() => setTopic(ALL_TOPICS)}
              >
                Show all topics
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  )
}

export default ResearchThreadsPage
