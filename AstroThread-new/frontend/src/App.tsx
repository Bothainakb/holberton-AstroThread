import { HomePage } from './pages/Home/HomePage'
import { LoginPage } from './pages/Login/LoginPage'
import { routes, useLocation, useInternalLinkNavigation } from './lib/router'

function App() {
  useInternalLinkNavigation()

  const { pathname } = useLocation()

  if (pathname === routes.signIn) {
    return <LoginPage />
  }

  return <HomePage />
}

export default App