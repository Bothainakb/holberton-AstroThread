import { HomePage } from './pages/Home/HomePage'
import { SearchPage } from './pages/Search/SearchPage'

function App() {
  if (window.location.pathname === '/search') {
    return <SearchPage />
  }
  return <HomePage />
}

export default App
