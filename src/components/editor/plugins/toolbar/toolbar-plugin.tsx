"use client"

import { type CSSProperties, type ReactNode, useEffect, useState } from "react"
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import { COMMAND_PRIORITY_CRITICAL, SELECTION_CHANGE_COMMAND } from "lexical"

import { ToolbarContext } from "@/components/editor/context/toolbar-context"
import { useEditorModal } from "@/components/editor/editor-hooks/use-modal"
import { cn } from "@/lib/utils/utils"

export function ToolbarPlugin({
  children,
  className,
  style,
}: {
  children: (props: { blockType: string }) => ReactNode
  className?: string
  style?: CSSProperties
}) {
  const [editor] = useLexicalComposerContext()

  const [activeEditor, setActiveEditor] = useState(editor)
  const [blockType, setBlockType] = useState<string>("paragraph")

  const [modal, showModal] = useEditorModal()

  const $updateToolbar = () => {}

  useEffect(() => {
    return activeEditor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      (_payload, newEditor) => {
        setActiveEditor(newEditor)
        return false
      },
      COMMAND_PRIORITY_CRITICAL
    )
  }, [editor])

  return (
    <ToolbarContext
      activeEditor={activeEditor}
      $updateToolbar={$updateToolbar}
      blockType={blockType}
      setBlockType={setBlockType}
      showModal={showModal}
    >
      {modal}

      <div
        className={cn(
          "vertical-align-middle sticky top-0 z-20 flex flex-wrap items-center gap-2 overflow-x-auto border-b bg-background/95 p-1 shadow-sm supports-[backdrop-filter]:bg-background/60",
          className
        )}
        style={style}
      >
        {children({ blockType })}
      </div>
    </ToolbarContext>
  )
}
