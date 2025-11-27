import { useCallback, useState } from "react"
import type { FeedbackVariant } from "@/components/dialogs"

interface FeedbackState {
  open: boolean
  variant: FeedbackVariant
  title: string
  description?: string
  details?: string
}

export function useRoleFeedback() {
  const [feedback, setFeedback] = useState<FeedbackState | null>(null)

  const showFeedback = useCallback(
    (variant: FeedbackVariant, title: string, description?: string, details?: string) => {
      setFeedback({ open: true, variant, title, description, details })
    },
    [],
  )

  const handleFeedbackOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setFeedback(null)
    }
  }, [])

  return {
    feedback,
    showFeedback,
    handleFeedbackOpenChange,
  }
}

