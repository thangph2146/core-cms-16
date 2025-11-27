"use client"

import { useState, useEffect, useRef } from "react"
import { Editor } from "@/components/editor/editor-x/editor"
import { FieldContent } from "@/components/ui/field"
import type { SerializedEditorState } from "lexical"

export interface EditorFieldProps {
  value: unknown
  onChange: (value: unknown) => void
  error?: string
  disabled?: boolean
  readOnly?: boolean
  className?: string
}

export function EditorField({
  value,
  onChange,
  error,
  disabled = false,
  readOnly = false,
  className,
}: EditorFieldProps) {
  // Parse initial value as SerializedEditorState
  const [editorState, setEditorState] = useState<SerializedEditorState | null>(() => {
    if (value && typeof value === "object" && value !== null) {
      try {
        return value as unknown as SerializedEditorState
      } catch {
        return null
      }
    }
    return null
  })

  // Ref để track xem có đang sync từ external value không
  const isSyncingRef = useRef(false)

  // Sync external value changes to internal state
  useEffect(() => {
    if (value && typeof value === "object" && value !== null) {
      try {
        const newState = value as unknown as SerializedEditorState
        // Only update if different to avoid unnecessary re-renders
        const currentStateStr = editorState ? JSON.stringify(editorState) : null
        const newStateStr = JSON.stringify(newState)
        if (currentStateStr !== newStateStr) {
          isSyncingRef.current = true
          setEditorState(newState)
          // Reset sync flag sau một tick
          setTimeout(() => {
            isSyncingRef.current = false
          }, 0)
        }
      } catch {
        // Invalid value, keep current state
      }
    } else if (value === null || value === undefined) {
      if (editorState !== null) {
        isSyncingRef.current = true
        setEditorState(null)
        setTimeout(() => {
          isSyncingRef.current = false
        }, 0)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  const handleChange = (newState: SerializedEditorState) => {
    setEditorState(newState)
    if (!isSyncingRef.current) {
      onChange(newState)
    }
  }

  return (
    <FieldContent>
      <div className={className || "w-full max-w-5xl mx-auto"}>
        <Editor
          editorSerializedState={editorState || undefined}
          onSerializedChange={handleChange}
          readOnly={readOnly || disabled}
        />
        {error && (
          <p className="text-sm text-destructive mt-2">{error}</p>
        )}
      </div>
    </FieldContent>
  )
}
