'use client'

import { useState } from 'react'
import { ThumbsUp, ThumbsDown } from 'lucide-react'

interface MealFeedbackProps {
  foodName: string
  onFeedback?: () => void
}

export function MealFeedback({ foodName, onFeedback }: MealFeedbackProps) {
  const [submitted, setSubmitted] = useState<'like' | 'dislike' | null>(null)

  const sendFeedback = async (signal: 'like' | 'dislike') => {
    setSubmitted(signal)
    try {
      await fetch('/api/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          food_name: foodName,
          signal,
          source: 'meal_feedback',
          evidence: `User ${signal === 'like' ? 'liked' : 'disliked'} "${foodName}" from meal plan`,
        }),
      })
      onFeedback?.()
    } catch {
      // silently fail
    }
  }

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => sendFeedback('like')}
        disabled={submitted !== null}
        className={`rounded-md p-1 transition-colors ${
          submitted === 'like'
            ? 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30'
            : 'text-muted-foreground hover:text-green-600 hover:bg-green-100 dark:hover:text-green-400 dark:hover:bg-green-900/30'
        }`}
        title="Like this food"
      >
        <ThumbsUp className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={() => sendFeedback('dislike')}
        disabled={submitted !== null}
        className={`rounded-md p-1 transition-colors ${
          submitted === 'dislike'
            ? 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30'
            : 'text-muted-foreground hover:text-red-600 hover:bg-red-100 dark:hover:text-red-400 dark:hover:bg-red-900/30'
        }`}
        title="Dislike this food"
      >
        <ThumbsDown className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
