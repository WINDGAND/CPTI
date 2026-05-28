import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { FeedbackProvider } from './components/feedback/FeedbackContext.jsx'
import { LanguageProvider } from './i18n/LanguageContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LanguageProvider>
      <FeedbackProvider>
        <App />
      </FeedbackProvider>
    </LanguageProvider>
  </StrictMode>,
)
