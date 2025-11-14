"use client"

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import { JSX, useEffect } from "react"
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import { $insertNodeToNearestRoot } from "@lexical/utils"
import { COMMAND_PRIORITY_EDITOR, createCommand, LexicalCommand } from "lexical"

import {
  $createYouTubeNode,
  YouTubeNode,
} from "@/components/editor/nodes/embeds/youtube-node"

export type InsertYouTubePayload =
  | string
  | { id: string; width?: number; height?: number; maxWidth?: number; fullWidth?: boolean }

export const INSERT_YOUTUBE_COMMAND: LexicalCommand<InsertYouTubePayload> =
  createCommand("INSERT_YOUTUBE_COMMAND")

export function YouTubePlugin(): JSX.Element | null {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    if (!editor.hasNodes([YouTubeNode])) {
      throw new Error("YouTubePlugin: YouTubeNode not registered on editor")
    }

    return editor.registerCommand<InsertYouTubePayload>(
      INSERT_YOUTUBE_COMMAND,
      (payload) => {
        const rootElement = editor.getRootElement()
        const fallbackWidth =
          rootElement?.getBoundingClientRect().width ?? 640
        const resolvedMaxWidth =
          fallbackWidth > 0 ? Math.round(fallbackWidth) : 640
        const clampToEditorWidth = (value?: number) => {
          if (typeof value !== "number") {
            return value
          }
          return Math.min(value, resolvedMaxWidth)
        }
        const normalizedPayload =
          typeof payload === "string"
            ? {
                id: payload,
                width: undefined,
                height: undefined,
                maxWidth: resolvedMaxWidth,
                fullWidth: false,
              }
            : {
                id: payload.id,
                width: clampToEditorWidth(payload.width),
                height: payload.height,
                maxWidth:
                  payload.maxWidth !== undefined
                    ? clampToEditorWidth(payload.maxWidth)
                    : resolvedMaxWidth,
                fullWidth: payload.fullWidth ?? false,
              }
        const youTubeNode = $createYouTubeNode(
          normalizedPayload.id,
          normalizedPayload.width,
          normalizedPayload.height,
          normalizedPayload.maxWidth,
          normalizedPayload.fullWidth
        )
        $insertNodeToNearestRoot(youTubeNode)

        return true
      },
      COMMAND_PRIORITY_EDITOR
    )
  }, [editor])

  return null
}
