/**
 * Text utility functions
 */

import React from "react"

/**
 * Highlight search query in text
 */
export function highlightText(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text

  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const parts = text.split(new RegExp(`(${escapedQuery})`, "gi"))
  
  return parts.map((part, index) =>
    part.toLowerCase() === query.toLowerCase() ? (
      React.createElement("mark", { key: index, className: "bg-yellow-300 dark:bg-yellow-600 px-0.5 rounded" }, part)
    ) : (
      part
    )
  )
}

