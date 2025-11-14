"use client"

import {
  InitialConfigType,
  LexicalComposer,
} from "@lexical/react/LexicalComposer"
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin"
import { EditorState, SerializedEditorState } from "lexical"

import { editorTheme } from "@/components/editor/themes/editor-theme"
import { TooltipProvider } from "@/components/ui/tooltip"

import { nodes } from "./nodes"
import { Plugins } from "./plugins"
import { cn } from "@/lib/utils"
import { useElementSize } from "@/hooks/use-element-size"
import { EditorContainerProvider } from "@/components/editor/context/editor-container-context"

const editorConfig: InitialConfigType = {
  namespace: "Editor",
  theme: editorTheme,
  nodes,
  onError: (error: Error) => {
    console.error(error)
  },
}

export function Editor({
  editorState,
  editorSerializedState,
  onChange,
  onSerializedChange,
  readOnly = false,
}: {
  editorState?: EditorState
  editorSerializedState?: SerializedEditorState
  onChange?: (editorState: EditorState) => void
  onSerializedChange?: (editorSerializedState: SerializedEditorState) => void
  readOnly?: boolean
}) {
  const { ref: editorRef, width: editorWidth } =
    useElementSize<HTMLDivElement>()
  const editorMaxWidth = editorWidth || undefined

  return (
    <div
      ref={editorRef}
      className={cn(
        "bg-background rounded-lg border shadow w-full",
        readOnly && "border-none shadow-none"
      )}
      id="editor-x"
    >
      <EditorContainerProvider value={{ maxWidth: editorMaxWidth }}>
        <LexicalComposer
          initialConfig={{
            ...editorConfig,
            editable: !readOnly,
            ...(editorState ? { editorState } : {}),
            ...(editorSerializedState
              ? { editorState: JSON.stringify(editorSerializedState) }
              : {}),
          }}
        >
          <TooltipProvider>
            <Plugins readOnly={readOnly} />

            {!readOnly && (
              <OnChangePlugin
                ignoreSelectionChange={true}
                onChange={(editorState) => {
                  onChange?.(editorState)
                  onSerializedChange?.(editorState.toJSON())
                }}
              />
            )}
          </TooltipProvider>
        </LexicalComposer>
      </EditorContainerProvider>
    </div>
  )
}
