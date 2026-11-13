import { HomePage } from './pages/Home/HomePage'
import { LoginPage } from './pages/Login/LoginPage'
import { SignUpPage } from './pages/SignUp/SignUpPage'
import { SearchPage } from './pages/Search/SearchPage'
import { PaperDetailsPage } from './pages/PaperDetails/PaperDetailsPage'
import { MyThreadPage } from './pages/MyThread/MyThreadPage'
import { getRouteId, routes, useLocation, useInternalLinkNavigation } from './lib/router'

function App() {
  useInternalLinkNavigation()

  const { pathname } = useLocation()

  if (pathname === routes.signIn) {
    return <LoginPage />
  }

  if (pathname === routes.signUp) {
    return <SignUpPage />
  }

  if (pathname === routes.search) {
    return <SearchPage />
  }

  if (pathname === routes.myThread) {
    return <MyThreadPage />
  }

  const paperId = getRouteId(pathname, routes.papers)

  if (paperId) {
    return <PaperDetailsPage key={paperId} paperId={paperId} />
  }

  return <HomePage />
}

export default App