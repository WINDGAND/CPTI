import { createContext, useContext, useState } from 'react'
import FeedbackModal from './FeedbackModal'

const FeedbackContext = createContext(null)

export function useFeedback() {
  const ctx = useContext(FeedbackContext)
  if (!ctx) throw new Error('useFeedback must be used inside FeedbackProvider')
  return ctx
}

export function FeedbackProvider({ children }) {
  const [open, setOpen] = useState(false)

  return (
    <FeedbackContext.Provider value={{ openFeedback: () => setOpen(true) }}>
      {children}
      <FeedbackModal open={open} onClose={() => setOpen(false)} />
    </FeedbackContext.Provider>
  )
}
