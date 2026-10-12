import { useEffect } from 'react'
import Footer from './components/Footer/Footer'
import Navbar from './components/Navbar/Navbar'
import StarField from './components/StarField/StarField'
import {
  RESEARCH_THREADS_CANVAS,
  THREAD_DETAILS_CANVAS,
  researchThreadsStars,
  threadDetailsStars,
} from './data/stars'
import { researchThreads } from './data/threads'
import HomePage from './pages/Home/HomePage'
import ResearchThreadsPage from './pages/ResearchThreads/ResearchThreadsPage'
import ThreadDetailsPage from './pages/ThreadDetails/ThreadDetailsPage'
import { matchThreadDetails, routes, usePathname } from './router/router'
import './App.css'

type Page =
  | { name: 'home' }
  | { name: 'research-threads' }
  | { name: 'thread-details'; threadId: string }

function resolvePage(pathname: string): Page {
  if (pathname === routes.researchThreads) return { name: 'research-threads' }
  const threadId = matchThreadDetails(pathname)
  if (threadId) return { name: 'thread-details', threadId }
  // Unknown paths fall back to the Home page until more pages exist.
  return { name: 'home' }
}

function pageTitle(page: Page) {
  if (page.name === 'research-threads') return 'Research Threads · AstroThread'
  if (page.name === 'thread-details') {
    const thread = researchThreads.find((item) => item.id === page.threadId)
    return `${thread ? thread.title : 'Thread not found'} · AstroThread`
  }
  return 'AstroThread'
}

function App() {
  const page = resolvePage(usePathname())
  const title = pageTitle(page)

  useEffect(() => {
    document.title = title
  }, [title])

  return (
    <div className="app">
      {page.name === 'research-threads' && (
        <StarField
          stars={researchThreadsStars}
          twinkles={[]}
          canvas={RESEARCH_THREADS_CANVAS}
          glow="research-threads"
        />
      )}
      {page.name === 'thread-details' && (
        <StarField
          stars={threadDetailsStars}
          twinkles={[]}
          canvas={THREAD_DETAILS_CANVAS}
          glow="thread-details"
        />
      )}
      {page.name === 'home' && <StarField />}

      <Navbar activeHref={page.name === 'home' ? routes.home : routes.researchThreads} />

      {page.name === 'home' && <HomePage />}
      {page.name === 'research-threads' && <ResearchThreadsPage />}
      {/* The key resets the selected stage when switching between threads. */}
      {page.name === 'thread-details' && (
        <ThreadDetailsPage key={page.threadId} threadId={page.threadId} />
      )}

      <Footer />
    </div>
  )
}

export default App
