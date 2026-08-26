import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import App from './App.tsx'
import { ToastViewport } from './components/feedback/ToastViewport'
import { useAuthStore } from './stores/useAuthStore'

useAuthStore.getState().bootstrap()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <ToastViewport />
  </StrictMode>,
)
