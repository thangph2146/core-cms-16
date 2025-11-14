import * as React from "react"
import { JSX, useRef } from "react"
import { calculateZoomLevel } from "@lexical/utils"
import type { LexicalEditor } from "lexical"
import { ImagePlus, ImageMinus } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  getContainerWidth,
  getImageAspectRatio,
  unlockImageBoundaries,
} from "@/components/editor/editor-ui/image-sizing"
import { useEditorContainer } from "@/components/editor/context/editor-container-context"

function clamp(value: number, min: number, max: number) {
  // Nếu max là Infinity, chỉ giới hạn min
  if (max === Infinity) {
    return Math.max(value, min)
  }
  return Math.min(Math.max(value, min), max)
}

const Direction = {
  east: 1 << 0,
  north: 1 << 3,
  south: 1 << 1,
  west: 1 << 2,
}

const RESIZE_HANDLES = [
  {
    key: "n",
    direction: Direction.north,
    className:
      "image-resizer image-resizer-n bg-primary absolute -top-2.5 left-1/2 h-2 w-2 -translate-x-1/2 cursor-ns-resize",
  },
  {
    key: "ne",
    direction: Direction.north | Direction.east,
    className:
      "image-resizer image-resizer-ne bg-primary absolute -top-2.5 -right-2.5 h-2 w-2 cursor-nesw-resize",
  },
  {
    key: "e",
    direction: Direction.east,
    className:
      "image-resizer image-resizer-e bg-primary absolute top-1/2 -right-2.5 h-2 w-2 -translate-y-1/2 cursor-ew-resize",
  },
  {
    key: "se",
    direction: Direction.south | Direction.east,
    className:
      "image-resizer image-resizer-se bg-primary absolute -right-2.5 -bottom-2.5 h-2 w-2 cursor-nwse-resize",
  },
  {
    key: "s",
    direction: Direction.south,
    className:
      "image-resizer image-resizer-s bg-primary absolute -bottom-2.5 left-1/2 h-2 w-2 -translate-x-1/2 cursor-ns-resize",
  },
  {
    key: "sw",
    direction: Direction.south | Direction.west,
    className:
      "image-resizer image-resizer-sw bg-primary absolute -bottom-2.5 -left-2.5 h-2 w-2 cursor-nesw-resize",
  },
  {
    key: "w",
    direction: Direction.west,
    className:
      "image-resizer image-resizer-w bg-primary absolute top-1/2 -left-2.5 h-2 w-2 -translate-y-1/2 cursor-ew-resize",
  },
  {
    key: "nw",
    direction: Direction.north | Direction.west,
    className:
      "image-resizer image-resizer-nw bg-primary absolute -top-2.5 -left-2.5 h-2 w-2 cursor-nwse-resize",
  },
] as const

export interface MediaResizerProps {
  editor: LexicalEditor
  buttonRef: { current: null | HTMLButtonElement }
  mediaRef: { current: null | HTMLElement }
  onResizeEnd: (width: "inherit" | number, height: "inherit" | number) => void
  onResizeStart: () => void
  showCaption?: boolean
  setShowCaption?: (show: boolean) => void
  captionsEnabled?: boolean
  onSetFullWidth?: () => void
  unlockBoundaries?: boolean
  onReplaceMedia?: () => void
}

/**
 * MediaResizer - Universal resizer for media elements (images, videos, etc.)
 * Supports both images with captions and videos without captions
 */
export function MediaResizer({
  onResizeStart,
  onResizeEnd,
  buttonRef,
  mediaRef,
  editor,
  showCaption = false,
  setShowCaption,
  captionsEnabled = false,
  onSetFullWidth: _onSetFullWidth,
  unlockBoundaries = true,
  onReplaceMedia,
}: MediaResizerProps): JSX.Element {
  const controlWrapperRef = useRef<HTMLDivElement>(null)
  const userSelect = useRef({
    priority: "",
    value: "default",
  })
  const positioningRef = useRef<{
    currentHeight: "inherit" | number
    currentWidth: "inherit" | number
    direction: number
    isResizing: boolean
    ratio: number
    startHeight: number
    startWidth: number
    startX: number
    startY: number
    maxWidthLimit: number
  }>({
    currentHeight: 0,
    currentWidth: 0,
    direction: 0,
    isResizing: false,
    ratio: 0,
    startHeight: 0,
    startWidth: 0,
    startX: 0,
    startY: 0,
    maxWidthLimit: Infinity,
  })
  const editorRootElement = editor.getRootElement()
  const maxHeightContainer = Infinity
  const editorContainer = useEditorContainer()
  const hardWidthLimit = editorContainer?.maxWidth

  const minWidth = 100
  const minHeight = 100

  React.useEffect(() => {
    if (!unlockBoundaries) {
      return
    }
    if (mediaRef.current) {
      unlockImageBoundaries(mediaRef.current)
    }
  }, [mediaRef, unlockBoundaries])

  const setStartCursor = (direction: number) => {
    const ew = direction === Direction.east || direction === Direction.west
    const ns = direction === Direction.north || direction === Direction.south
    const nwse =
      (direction & Direction.north && direction & Direction.west) ||
      (direction & Direction.south && direction & Direction.east)

    const cursorDir = ew ? "ew" : ns ? "ns" : nwse ? "nwse" : "nesw"

    if (editorRootElement !== null) {
      editorRootElement.style.setProperty(
        "cursor",
        `${cursorDir}-resize`,
        "important"
      )
    }
    if (document.body !== null) {
      document.body.style.setProperty(
        "cursor",
        `${cursorDir}-resize`,
        "important"
      )
      userSelect.current.value = document.body.style.getPropertyValue(
        "-webkit-user-select"
      )
      userSelect.current.priority = document.body.style.getPropertyPriority(
        "-webkit-user-select"
      )
      document.body.style.setProperty(
        "-webkit-user-select",
        `none`,
        "important"
      )
    }
  }

  const setEndCursor = () => {
    if (editorRootElement !== null) {
      editorRootElement.style.setProperty("cursor", "text")
    }
    if (document.body !== null) {
      document.body.style.setProperty("cursor", "default")
      document.body.style.setProperty(
        "-webkit-user-select",
        userSelect.current.value,
        userSelect.current.priority
      )
    }
  }

  const handlePointerDown = (
    event: React.PointerEvent<HTMLDivElement>,
    direction: number
  ) => {
    if (!editor.isEditable()) {
      return
    }

    const media = mediaRef.current
    const controlWrapper = controlWrapperRef.current

    if (media !== null && controlWrapper !== null) {
      event.preventDefault()
      if (unlockBoundaries) {
        unlockImageBoundaries(media)
      }
      const { width, height } = media.getBoundingClientRect()
      const zoom = calculateZoomLevel(media)
      const positioning = positioningRef.current
      positioning.startWidth = width
      positioning.startHeight = height
      positioning.ratio = getImageAspectRatio(media)
      positioning.currentWidth = width
      positioning.currentHeight = height
      positioning.startX = event.clientX / zoom
      positioning.startY = event.clientY / zoom
      positioning.isResizing = true
      positioning.direction = direction
      // Giới hạn theo bề rộng container để không vượt quá parent
      const containerWidth = getContainerWidth(
        media,
        editor.getRootElement(),
        hardWidthLimit
      )
      const allowedWidth = containerWidth || Infinity
      positioning.maxWidthLimit = hardWidthLimit
        ? Math.min(allowedWidth, hardWidthLimit)
        : allowedWidth

      setStartCursor(direction)
      onResizeStart()

      controlWrapper.classList.add("touch-action-none")
      media.style.height = `${height}px`
      media.style.width = `${width}px`

      document.addEventListener("pointermove", handlePointerMove)
      document.addEventListener("pointerup", handlePointerUp)
    }
  }
  const getEffectiveMaxWidth = () => {
    const maxFromPositioning =
      typeof positioningRef.current.maxWidthLimit === "number"
        ? positioningRef.current.maxWidthLimit
        : Infinity
    const maxFromContext =
      typeof hardWidthLimit === "number" ? hardWidthLimit : Infinity
    return Math.min(maxFromPositioning, maxFromContext)
  }
  const handlePointerMove = (event: PointerEvent) => {
    const media = mediaRef.current
    const positioning = positioningRef.current

    const isHorizontal =
      positioning.direction & (Direction.east | Direction.west)
    const isVertical =
      positioning.direction & (Direction.south | Direction.north)

    if (media !== null && positioning.isResizing) {
      const zoom = calculateZoomLevel(media)
      // Corner cursor
      if (isHorizontal && isVertical) {
        let diff = Math.floor(positioning.startX - event.clientX / zoom)
        diff = positioning.direction & Direction.east ? -diff : diff

        const effectiveMaxWidth = getEffectiveMaxWidth()
        const width = clamp(
          positioning.startWidth + diff,
          minWidth,
          effectiveMaxWidth || Infinity
        )
        const widthReachedLimit =
          effectiveMaxWidth !== Infinity &&
          width >= effectiveMaxWidth &&
          diff > 0

        const height = width / positioning.ratio
        media.style.width = `${width}px`
        media.style.height = `${height}px`
        positioning.currentHeight = height
        positioning.currentWidth = width
        if (widthReachedLimit) {
          return
        }
      } else if (isVertical) {
        let diff = Math.floor(positioning.startY - event.clientY / zoom)
        diff = positioning.direction & Direction.south ? -diff : diff

        const height = clamp(
          positioning.startHeight + diff,
          minHeight,
          maxHeightContainer
        )

        // Calculate width based on aspect ratio to maintain proportions
        const width = height * positioning.ratio
        media.style.height = `${height}px`
        media.style.width = `${width}px`
        positioning.currentHeight = height
        positioning.currentWidth = width
      } else {
        let diff = Math.floor(positioning.startX - event.clientX / zoom)
        diff = positioning.direction & Direction.east ? -diff : diff

        const effectiveMaxWidth = getEffectiveMaxWidth()
        const width = clamp(
          positioning.startWidth + diff,
          minWidth,
          effectiveMaxWidth || Infinity
        )
        const widthReachedLimit =
          effectiveMaxWidth !== Infinity &&
          width >= effectiveMaxWidth &&
          diff > 0

        // Calculate height based on aspect ratio to maintain proportions
        const height = width / positioning.ratio
        media.style.width = `${width}px`
        media.style.height = `${height}px`
        positioning.currentWidth = width
        positioning.currentHeight = height
        if (widthReachedLimit) {
          return
        }
      }
    }
  }
  const handlePointerUp = () => {
    const media = mediaRef.current
    const positioning = positioningRef.current
    const controlWrapper = controlWrapperRef.current
    if (media !== null && controlWrapper !== null && positioning.isResizing) {
      const width = positioning.currentWidth
      const height = positioning.currentHeight
      positioning.startWidth = 0
      positioning.startHeight = 0
      positioning.ratio = 0
      positioning.startX = 0
      positioning.startY = 0
      positioning.currentWidth = 0
      positioning.currentHeight = 0
      positioning.isResizing = false

      controlWrapper.classList.remove("touch-action-none")

      setEndCursor()
      onResizeEnd(width, height)

      document.removeEventListener("pointermove", handlePointerMove)
      document.removeEventListener("pointerup", handlePointerUp)
    }
  }

  return (
    <>
      <div ref={controlWrapperRef}>
        {RESIZE_HANDLES.map(({ key, direction, className }) => (
          <div
            key={key}
            className={className}
            onPointerDown={(event) => {
              handlePointerDown(event, direction)
            }}
          />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        {onReplaceMedia && (
          <Button
            className="image-replace-button"
            type="button"
            variant="outline"
            size="sm"
            onClick={onReplaceMedia}
          >
            Change Image
          </Button>
        )}
        {setShowCaption && captionsEnabled && (
          <Button
            className="image-caption-button"
            ref={buttonRef}
            type="button"
            variant={"outline"}
            size="sm"
            onClick={() => {
              setShowCaption(!showCaption)
            }}
          >
            {showCaption ? (
              <>
                <ImageMinus className="mr-1.5 size-4" />
                Remove Caption
              </>
            ) : (
              <>
                <ImagePlus className="mr-1.5 size-4" />
                Add Caption
              </>
            )}
          </Button>
        )}
      </div>
    </>
  )
}

// Backward compatibility: export as ImageResizer for existing code
export const ImageResizer = MediaResizer
