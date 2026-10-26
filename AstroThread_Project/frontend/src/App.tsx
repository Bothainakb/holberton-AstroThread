import { useEffect } from 'react'
import { restoreSession } from './auth/auth'
import Footer from './components/Footer/Footer'
import Navbar from './components/Navbar/Navbar'
import StarField from './components/StarField/StarField'
import {
  LOGIN_CANVAS,
  RESEARCH_THREADS_CANVAS,
  THREAD_DETAILS_CANVAS,
  loginStars,
  researchThreadsStars,
  threadDetailsStars,
} from './data/stars'
import { researchThreads } from './data/threads'
import HomePage from './pages/Home/HomePage'
import LoginPage from './pages/Login/LoginPage'
import ResearchSearchPage from './pages/ResearchSearch/ResearchSearchPage'
import ResearchThreadsPage from './pages/ResearchThreads/ResearchThreadsPage'
import SignUpPage from './pages/SignUp/SignUpPage'
import ThreadDetailsPage from './pages/ThreadDetails/ThreadDetailsPage'
import { matchThreadDetails, routes, usePathname } from './router/router'
import './App.css'

type Page =
  | { name: 'home' }
  | { name: 'research-threads' }
  | { name: 'research-search' }
  | { name: 'login' }
  | { name: 'sign-up' }
  | { name: 'thread-details'; threadId: string }

function resolvePage(pathname: string): Page {
  if (pathname === routes.researchThreads) return { name: 'research-threads' }
  if (pathname === routes.researchSearch) return { name: 'research-search' }
  if (pathname === routes.login) return { name: 'login' }
  if (pathname === routes.signUp) return { name: 'sign-up' }
  const threadId = matchThreadDetails(pathname)
  if (threadId) return { name: 'thread-details', threadId }
  // Unknown paths fall back to the Home page until more pages exist.
  return { name: 'home' }
}

function pageTitle(page: Page) {
  if (page.name === 'research-threads') return 'Research Threads · AstroThread'
  if (page.name === 'research-search') return 'Research Search · AstroThread'
  if (page.name === 'login') return 'Login · AstroThread'
  if (page.name === 'sign-up') return 'Create Account · AstroThread'
  if (page.name === 'thread-details') {
    const thread = researchThreads.find((item) => item.id === page.threadId)
    return `${thread ? thread.title : 'Thread not found'} · AstroThread`
  }
  return 'AstroThread'
}

/** Navbar item to highlight; Search and Login are the icon and button, not text links. */
function activeNavHref(page: Page) {
  if (page.name === 'home') return routes.home
  if (page.name === 'research-search') return routes.researchSearch
  // Create Account is reached from Login, so Login stays highlighted.
  if (page.name === 'login' || page.name === 'sign-up') return routes.login
  return routes.researchThreads
}

function App() {
  const page = resolvePage(usePathname())
  const title = pageTitle(page)

  useEffect(() => {
    document.title = title
  }, [title])

  // Picks up an existing login session (HttpOnly cookie) after a reload.
  useEffect(() => {
    restoreSession()
  }, [])

  return (
    <div className="app">
      {/* Research Search reuses the Research Threads star field and glow. */}
      {(page.name === 'research-threads' || page.name === 'research-search') && (
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
      {/* Create Account shares the Login card, so it shares its star field too. */}
      {(page.name === 'login' || page.name === 'sign-up') && (
        <StarField stars={loginStars} twinkles={[]} canvas={LOGIN_CANVAS} glow="login" />
      )}
      {page.name === 'home' && <StarField />}

      <Navbar activeHref={activeNavHref(page)} />

      {page.name === 'home' && <HomePage />}
      {page.name === 'research-threads' && <ResearchThreadsPage />}
      {page.name === 'research-search' && <ResearchSearchPage />}
      {page.name === 'login' && <LoginPage />}
      {page.name === 'sign-up' && <SignUpPage />}
      {/* The key resets the selected stage when switching between threads. */}
      {page.name === 'thread-details' && (
        <ThreadDetailsPage key={page.threadId} threadId={page.threadId} />
      )}

      <Footer />
    </div>
  )
}

export default App
