"use client"

import { createContext, useContext, type ReactNode } from "react"

type EditorContainerContextValue = {
  maxWidth?: number
}

const EditorContainerContext = createContext<EditorContainerContextValue | null>(
  null
)

export function EditorContainerProvider({
  value,
  children,
}: {
  value: EditorContainerContextValue
  children: ReactNode
}) {
  return (
    <EditorContainerContext.Provider value={value}>
      {children}
    </EditorContainerContext.Provider>
  )
}

export function useEditorContainer() {
  return useContext(EditorContainerContext)
}
