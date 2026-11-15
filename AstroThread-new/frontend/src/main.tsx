import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/global.css'
import App from './App.tsx'
import { getCurrentSession, syncSession } from './data/demoAuth'
import { syncMyThread } from './data/myThread'

function render() {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
syncSession()
  .then(() => syncMyThread(getCurrentSession()?.email))
  .finally(render)
