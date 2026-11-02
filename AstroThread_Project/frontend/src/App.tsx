import { useEffect } from 'react'
import { restoreSession } from './auth/auth'
import Footer from './components/Footer/Footer'
import Navbar from './components/Navbar/Navbar'
import { researchThreads } from './data/threads'
import HomePage from './pages/Home/HomePage'
import LoginPage from './pages/Login/LoginPage'
import ProfilePage from './pages/Profile/ProfilePage'
import ResearchThreadsPage from './pages/ResearchThreads/ResearchThreadsPage'
import SignUpPage from './pages/SignUp/SignUpPage'
import ThreadDetailsPage from './pages/ThreadDetails/ThreadDetailsPage'
import { matchThreadDetails, routes, usePathname } from './router/router'
import './App.css'

type Page =
  | { name: 'home' }
  | { name: 'research-threads' }
  | { name: 'login' }
  | { name: 'sign-up' }
  | { name: 'profile' }
  | { name: 'thread-details'; threadId: string }

function resolvePage(pathname: string): Page {
  if (pathname === routes.researchThreads) return { name: 'research-threads' }
  if (pathname === routes.login) return { name: 'login' }
  if (pathname === routes.signUp) return { name: 'sign-up' }
  if (pathname === routes.profile) return { name: 'profile' }
  const threadId = matchThreadDetails(pathname)
  if (threadId) return { name: 'thread-details', threadId }
  // Unknown paths fall back to the Home page until more pages exist. This
  // includes the removed Research Search page (prepareStartUrl redirects it).
  return { name: 'home' }
}

function pageTitle(page: Page) {
  if (page.name === 'research-threads') return 'Browse Threads · AstroThread'
  if (page.name === 'login') return 'Login · AstroThread'
  if (page.name === 'sign-up') return 'Create Account · AstroThread'
  if (page.name === 'profile') return 'Profile · AstroThread'
  if (page.name === 'thread-details') {
    const thread = researchThreads.find((item) => item.id === page.threadId)
    // Database ids ("/research-threads/1") are replaced by the thread's slug once it loads.
    return `${thread ? thread.title : 'Research Thread'} · AstroThread`
  }
  return 'AstroThread'
}

/** Navbar item to highlight; Login is the pill, not a text link. */
function activeNavHref(page: Page) {
  if (page.name === 'home') return routes.home
  // Create Account is reached from Login, so Login stays highlighted.
  if (page.name === 'login' || page.name === 'sign-up') return routes.login
  if (page.name === 'profile') return routes.profile
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
      {/* Figma "01-Home" has only the Sign In pill; the other frames have the full header. */}
      <Navbar
        activeHref={activeNavHref(page)}
        variant={page.name === 'home' ? 'minimal' : 'full'}
      />

      {page.name === 'home' && <HomePage />}
      {page.name === 'research-threads' && <ResearchThreadsPage />}
      {page.name === 'login' && <LoginPage />}
      {page.name === 'sign-up' && <SignUpPage />}
      {page.name === 'profile' && <ProfilePage />}
      {/* The key resets the selected stage when switching between threads. */}
      {page.name === 'thread-details' && (
        <ThreadDetailsPage key={page.threadId} threadId={page.threadId} />
      )}

      <Footer />
    </div>
  )
}

export default App
