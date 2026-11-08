import { HomePage } from './pages/Home/HomePage'
import { LoginPage } from './pages/Login/LoginPage'
import { SignUpPage } from './pages/SignUp/SignUpPage'
import { SearchPage } from './pages/Search/SearchPage'
import { routes, useLocation, useInternalLinkNavigation } from './lib/router'

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

  return <HomePage />
}

export default App