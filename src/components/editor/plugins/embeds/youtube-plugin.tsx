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
        const youTubeNode =
          typeof payload === "string"
            ? $createYouTubeNode(payload)
            : $createYouTubeNode(
                payload.id,
                payload.width,
                payload.height,
                payload.maxWidth,
                payload.fullWidth
              )
        $insertNodeToNearestRoot(youTubeNode)

        return true
      },
      COMMAND_PRIORITY_EDITOR
    )
  }, [editor])

  return null
}
