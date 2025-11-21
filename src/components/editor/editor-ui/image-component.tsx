/* eslint-disable @next/next/no-img-element */
import * as React from "react"
import {
  JSX,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"
import { AutoFocusPlugin } from "@lexical/react/LexicalAutoFocusPlugin"
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary"
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin"
import { LexicalNestedComposer } from "@lexical/react/LexicalNestedComposer"
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin"
import { useLexicalEditable } from "@lexical/react/useLexicalEditable"
import { useLexicalNodeSelection } from "@lexical/react/useLexicalNodeSelection"
import { mergeRegister } from "@lexical/utils"
import type {
  BaseSelection,
  LexicalCommand,
  LexicalEditor,
  NodeKey,
} from "lexical"
import {
  $getNodeByKey,
  $getSelection,
  $isNodeSelection,
  $isRangeSelection,
  $setSelection,
  CLICK_COMMAND,
  COMMAND_PRIORITY_LOW,
  createCommand,
  DRAGSTART_COMMAND,
  KEY_BACKSPACE_COMMAND,
  KEY_DELETE_COMMAND,
  KEY_ENTER_COMMAND,
  KEY_ESCAPE_COMMAND,
  SELECTION_CHANGE_COMMAND,
} from "lexical"
import { $getRoot } from "lexical"

// import brokenImage from '@/registry/new-york-v4/editor/images/image-broken.svg';
import { ContentEditable } from "@/components/editor/editor-ui/content-editable"
import { ImageResizer } from "@/components/editor/editor-ui/image-resizer"
import {
  getContainerWidth,
  getImageAspectRatio,
} from "@/components/editor/editor-ui/image-sizing"
import { $isImageNode } from "@/components/editor/nodes/image-node"
import { cn } from "@/lib/utils"
import { useEditorContainer } from "@/components/editor/context/editor-container-context"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  InsertImageDialog,
  InsertImagePayload,
} from "@/components/editor/plugins/images-plugin"
import { Logo } from "../../../../public/svg/Logo"

const imageCache = new Set()
const RESIZE_HANDLE_HIDE_DELAY = 200

type TimeoutHandle = ReturnType<typeof setTimeout>

export const RIGHT_CLICK_IMAGE_COMMAND: LexicalCommand<MouseEvent> =
  createCommand("RIGHT_CLICK_IMAGE_COMMAND")

type DimensionValue = "inherit" | number

interface ImageComponentProps {
  altText: string
  caption: LexicalEditor
  captionsEnabled: boolean
  fullWidth: boolean
  height: DimensionValue
  maxWidth: number
  nodeKey: NodeKey
  resizable: boolean
  showCaption: boolean
  src: string
  width: DimensionValue
}

function useSuspenseImage(src: string) {
  if (!imageCache.has(src)) {
    throw new Promise((resolve) => {
      const img = new Image()
      img.src = src
      img.onload = () => {
        imageCache.add(src)
        resolve(null)
      }
      img.onerror = () => {
        imageCache.add(src)
      }
    })
  }
}

function LazyImage({
  altText,
  className,
  imageRef,
  src,
  width,
  height,
  maxWidth: _maxWidth,
  onError,
}: {
  altText: string
  className: string | null
  height: DimensionValue
  imageRef: { current: null | HTMLImageElement }
  maxWidth: number
  src: string
  width: DimensionValue
  onError: () => void
}): JSX.Element {
  useSuspenseImage(src)
  return (
    <img
      className={className || undefined}
      src={src}
      alt={altText}
      ref={imageRef}
      style={{
        height,
        width,
        // Không set maxWidth để cho phép resize không giới hạn
        // maxWidth sẽ được xử lý bởi unlockImageBoundaries khi resize
      }}
      onError={onError}
      draggable="false"
    />
  )
}

function useResponsiveImageDimensions({
  editor,
  height,
  imageRef,
  width,
  isResizing,
  fullWidth,
  maxWidthLimit,
}: {
  editor: LexicalEditor
  height: DimensionValue
  imageRef: { current: null | HTMLImageElement }
  width: DimensionValue
  isResizing: boolean
  fullWidth?: boolean
  maxWidthLimit?: number
}) {
  const [dimensions, setDimensions] = useState<{
    width: DimensionValue
    height: DimensionValue
  }>({
    width,
    height,
  })

  useEffect(() => {
    if (isResizing) {
      return
    }

    let cancelScheduledUpdate: null | (() => void) = null
    const cleanupTasks: Array<() => void> = []
    const scheduleDimensionsUpdate = (next: {
      width: DimensionValue
      height: DimensionValue
    }) => {
      if (cancelScheduledUpdate) {
        cancelScheduledUpdate()
      }

      const applyNext = () => {
        cancelScheduledUpdate = null
        setDimensions((prev) => {
          if (prev.width === next.width && prev.height === next.height) {
            return prev
          }
          return next
        })
      }

      if (
        typeof window !== "undefined" &&
        typeof window.requestAnimationFrame === "function"
      ) {
        const frameId = window.requestAnimationFrame(applyNext)
        cancelScheduledUpdate = () => window.cancelAnimationFrame(frameId)
      } else {
        const timeoutId = setTimeout(applyNext)
        cancelScheduledUpdate = () => clearTimeout(timeoutId)
      }
    }

    const editorRoot = editor.getRootElement()
    const image = imageRef.current

    if (!image) {
      scheduleDimensionsUpdate({ width, height })
      return () => {
        cancelScheduledUpdate?.()
      }
    }

    if (typeof width === "number" && typeof height === "number") {
      scheduleDimensionsUpdate({ width, height })
      return () => {
        cancelScheduledUpdate?.()
      }
    }

    const updateDimensions = () => {
      const containerWidth = getContainerWidth(
        image,
        editorRoot,
        maxWidthLimit
      )

      if (!containerWidth) {
        scheduleDimensionsUpdate({ width, height })
        return
      }

      const baseWidth =
        typeof width === "number"
          ? width
          : image.naturalWidth || image.getBoundingClientRect().width || containerWidth

      let baseHeight: DimensionValue
      if (typeof height === "number") {
        baseHeight = height
      } else if (image.naturalHeight > 0) {
        baseHeight = image.naturalHeight
      } else {
        const ratio = getImageAspectRatio(image)
        baseHeight = ratio > 0 ? Math.round(baseWidth / ratio) : "inherit"
      }

      let nextWidth: DimensionValue = baseWidth
      let nextHeight: DimensionValue = baseHeight

      if (fullWidth) {
        nextWidth = containerWidth
        if (typeof baseHeight === "number") {
          const ratio =
            typeof baseWidth === "number" && baseWidth > 0
              ? baseWidth / baseHeight
              : getImageAspectRatio(image)
          nextHeight = Math.max(Math.round(containerWidth / ratio), 1)
        } else if (baseHeight === "inherit") {
          const ratio = getImageAspectRatio(image)
          nextHeight = ratio > 0 ? Math.max(Math.round(containerWidth / ratio), 1) : baseHeight
        }
      } else if (
        width === "inherit" &&
        typeof baseWidth === "number" &&
        baseWidth > containerWidth
      ) {
        const scale = containerWidth / baseWidth
        nextWidth = containerWidth
        if (typeof baseHeight === "number") {
          nextHeight = Math.max(Math.round(baseHeight * scale), 1)
        } else if (baseHeight === "inherit") {
          const ratio = getImageAspectRatio(image)
          nextHeight =
            ratio > 0 ? Math.max(Math.round(containerWidth / ratio), 1) : baseHeight
        }
      }

      scheduleDimensionsUpdate({ width: nextWidth, height: nextHeight })
    }

    updateDimensions()

    if (typeof ResizeObserver !== "undefined") {
      const resizeObserver = new ResizeObserver(updateDimensions)
      if (editorRoot) {
        resizeObserver.observe(editorRoot)
      }
      if (image.parentElement) {
        resizeObserver.observe(image.parentElement)
      }
      cleanupTasks.push(() => {
        resizeObserver.disconnect()
      })
    } else if (typeof window !== "undefined") {
      window.addEventListener("resize", updateDimensions)
      cleanupTasks.push(() => {
        window.removeEventListener("resize", updateDimensions)
      })
    }

    return () => {
      cancelScheduledUpdate?.()
      cleanupTasks.forEach((task) => task())
    }
  }, [
    editor,
    height,
    imageRef,
    isResizing,
    width,
    fullWidth,
    maxWidthLimit,
  ])

  return dimensions
}

function useImageCaptionControls({
  caption,
  editor,
  nodeKey,
  showCaption,
}: {
  caption: LexicalEditor
  editor: LexicalEditor
  nodeKey: NodeKey
  showCaption: boolean
}) {
  const [hasCaptionContent, setHasCaptionContent] = useState(false)
  const [localShowCaption, setLocalShowCaption] = useState(showCaption)
  const isUpdatingCaptionRef = useRef(false)
  const lastShowCaptionRef = useRef(showCaption)

  useEffect(() => {
    let timeout: TimeoutHandle | null = null
    timeout = setTimeout(() => {
      if (!showCaption) {
        setHasCaptionContent(false)
        setLocalShowCaption(false)
      } else if (
        !isUpdatingCaptionRef.current &&
        lastShowCaptionRef.current !== showCaption
      ) {
        setLocalShowCaption(showCaption)
        lastShowCaptionRef.current = showCaption
      }
      isUpdatingCaptionRef.current = false
    }, 0)

    return () => {
      if (timeout) {
        clearTimeout(timeout)
      }
    }
  }, [showCaption])

  const setShowCaption = useCallback(
    (show: boolean) => {
      isUpdatingCaptionRef.current = true
      lastShowCaptionRef.current = show

      setLocalShowCaption(show)

      if (!show) {
        setHasCaptionContent(false)
      }

      editor.update(() => {
        const node = $getNodeByKey(nodeKey)
        if ($isImageNode(node)) {
          node.setShowCaption(show)

          if (!show) {
            caption.update(() => {
              const root = $getRoot()
              root.clear()
            })
          }
        }
      })
    },
    [caption, editor, nodeKey]
  )

  useEffect(() => {
    const computeHasContent = () => {
      const state = caption.getEditorState()
      const hasContent = state.read(() => {
        const root = $getRoot()
        const raw = root.getTextContent()
        const text = raw.replace(/[\u200B\u00A0\s]+/g, "")
        return text.length > 0
      })
      setHasCaptionContent(showCaption && hasContent)
    }

    const timer = setTimeout(() => {
      computeHasContent()
    }, 0)

    const unregister = caption.registerUpdateListener(() => {
      computeHasContent()
      editor.update(() => {
        const node = $getNodeByKey(nodeKey)
        if ($isImageNode(node)) {
          node.setShowCaption(showCaption)
        }
      })
    })

    return () => {
      clearTimeout(timer)
      unregister()
    }
  }, [caption, editor, nodeKey, showCaption])

  return {
    hasCaptionContent,
    localShowCaption,
    setShowCaption,
  }
}

function useImageNodeInteractions({
  buttonRef,
  caption,
  editor,
  imageRef,
  isResizing,
  nodeKey,
  showCaption,
}: {
  buttonRef: React.MutableRefObject<HTMLButtonElement | null>
  caption: LexicalEditor
  editor: LexicalEditor
  imageRef: React.MutableRefObject<HTMLImageElement | null>
  isResizing: boolean
  nodeKey: NodeKey
  showCaption: boolean
}) {
  const [selection, setSelection] = useState<BaseSelection | null>(null)
  const [isSelected, setSelected, clearSelection] =
    useLexicalNodeSelection(nodeKey)
  const activeEditorRef = useRef<LexicalEditor | null>(null)

  const $onDelete = useCallback(
    (payload: KeyboardEvent) => {
      const deleteSelection = $getSelection()
      if (isSelected && $isNodeSelection(deleteSelection)) {
        const event: KeyboardEvent = payload
        event.preventDefault()
        editor.update(() => {
          deleteSelection.getNodes().forEach((node) => {
            if ($isImageNode(node)) {
              node.remove()
            }
          })
        })
      }
      return false
    },
    [editor, isSelected]
  )

  const $onEnter = useCallback(
    (event: KeyboardEvent) => {
      const latestSelection = $getSelection()
      const buttonElem = buttonRef.current
      if (
        isSelected &&
        $isNodeSelection(latestSelection) &&
        latestSelection.getNodes().length === 1
      ) {
        if (showCaption) {
          $setSelection(null)
          event.preventDefault()
          caption.focus()
          return true
        } else if (
          buttonElem !== null &&
          buttonElem !== document.activeElement
        ) {
          event.preventDefault()
          buttonElem.focus()
          return true
        }
      }
      return false
    },
    [buttonRef, caption, isSelected, showCaption]
  )

  const $onEscape = useCallback(
    (event: KeyboardEvent) => {
      if (
        activeEditorRef.current === caption ||
        buttonRef.current === event.target
      ) {
        $setSelection(null)
        editor.update(() => {
          setSelected(true)
          const parentRootElement = editor.getRootElement()
          if (parentRootElement !== null) {
            parentRootElement.focus()
          }
        })
        return true
      }
      return false
    },
    [buttonRef, caption, editor, setSelected]
  )

  const onClick = useCallback(
    (payload: MouseEvent) => {
      const event = payload

      if (isResizing) {
        return true
      }
      if (event.target === imageRef.current) {
        if (event.shiftKey) {
          setSelected(!isSelected)
        } else {
          clearSelection()
          setSelected(true)
        }
        return true
      }

      return false
    },
    [clearSelection, imageRef, isResizing, isSelected, setSelected]
  )

  const onRightClick = useCallback(
    (event: MouseEvent): void => {
      editor.getEditorState().read(() => {
        const latestSelection = $getSelection()
        const domElement = event.target as HTMLElement
        if (
          domElement.tagName === "IMG" &&
          $isRangeSelection(latestSelection) &&
          latestSelection.getNodes().length === 1
        ) {
          editor.dispatchCommand(
            RIGHT_CLICK_IMAGE_COMMAND,
            event as MouseEvent
          )
        }
      })
    },
    [editor]
  )

  useEffect(() => {
    let isMounted = true
    const rootElement = editor.getRootElement()
    const unregister = mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        if (isMounted) {
          setSelection(editorState.read(() => $getSelection()))
        }
      }),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        (_, activeEditor) => {
          activeEditorRef.current = activeEditor
          return false
        },
        COMMAND_PRIORITY_LOW
      ),
      editor.registerCommand<MouseEvent>(
        CLICK_COMMAND,
        onClick,
        COMMAND_PRIORITY_LOW
      ),
      editor.registerCommand<MouseEvent>(
        RIGHT_CLICK_IMAGE_COMMAND,
        onClick,
        COMMAND_PRIORITY_LOW
      ),
      editor.registerCommand(
        DRAGSTART_COMMAND,
        (event) => {
          if (event.target === imageRef.current) {
            event.preventDefault()
            return true
          }
          return false
        },
        COMMAND_PRIORITY_LOW
      ),
      editor.registerCommand(
        KEY_DELETE_COMMAND,
        $onDelete,
        COMMAND_PRIORITY_LOW
      ),
      editor.registerCommand(
        KEY_BACKSPACE_COMMAND,
        $onDelete,
        COMMAND_PRIORITY_LOW
      ),
      editor.registerCommand(KEY_ENTER_COMMAND, $onEnter, COMMAND_PRIORITY_LOW),
      editor.registerCommand(
        KEY_ESCAPE_COMMAND,
        $onEscape,
        COMMAND_PRIORITY_LOW
      )
    )

    rootElement?.addEventListener("contextmenu", onRightClick)

    return () => {
      isMounted = false
      unregister()
      rootElement?.removeEventListener("contextmenu", onRightClick)
    }
  }, [
    clearSelection,
    editor,
    imageRef,
    isResizing,
    isSelected,
    nodeKey,
    $onDelete,
    $onEnter,
    $onEscape,
    onClick,
    onRightClick,
    setSelected,
  ])

  return { isSelected, selection }
}

function BrokenImage(): JSX.Element {
  return (
    <img
      src={""}
      alt=""
      style={{
        height: 200,
        opacity: 0.2,
        width: 200,
      }}
      draggable="false"
    />
  )
}

function ImagePlaceholder({
  width,
  height,
}: {
  width: DimensionValue
  height: DimensionValue
}): JSX.Element {
  const size = typeof width === "number" ? width : typeof height === "number" ? height : 200
  const displaySize = Math.min(size, 200)
  
  return (
    <div
      className="flex items-center justify-center bg-gray-100 rounded"
      style={{
        width: typeof width === "number" ? width : displaySize,
        height: typeof height === "number" ? height : displaySize,
        minWidth: displaySize,
        minHeight: displaySize,
      }}
    >
      <Logo
        className="opacity-30"
        style={{
          width: displaySize * 0.6,
          height: displaySize * 0.6,
        }}
      />
    </div>
  )
}

function CaptionComposer({
  caption,
  isEditable,
}: {
  caption: LexicalEditor
  isEditable: boolean
}) {
  return (
    <LexicalNestedComposer initialEditor={caption}>
      <AutoFocusPlugin />
      <HistoryPlugin />
      <RichTextPlugin
        contentEditable={
          <div className="relative">
            <ContentEditable
              className={`ImageNode__contentEditable relative block min-h-5 w-full resize-none border-0 bg-transparent px-2.5 py-2 text-sm whitespace-pre-wrap outline-none word-break-break-word ${
                isEditable
                  ? "box-border cursor-text caret-primary user-select-text"
                  : "cursor-default select-text"
              }`}
              placeholder={isEditable ? "Enter a caption..." : ""}
              placeholderDefaults={false}
              placeholderClassName="ImageNode__placeholder absolute top-0 left-0 overflow-hidden px-2.5 py-2 text-ellipsis text-sm"
            />
          </div>
        }
        ErrorBoundary={LexicalErrorBoundary}
      />
    </LexicalNestedComposer>
  )
}

export default function ImageComponent({
  altText,
  caption,
  captionsEnabled,
  fullWidth,
  height,
  maxWidth,
  nodeKey,
  resizable,
  showCaption,
  src,
  width,
}: ImageComponentProps): JSX.Element {
  const imageRef = useRef<null | HTMLImageElement>(null)
  const buttonRef = useRef<HTMLButtonElement | null>(null)
  const [isResizing, setIsResizing] = useState<boolean>(false)
  const resizeTimeoutRef = useRef<TimeoutHandle | null>(null)
  const [editor] = useLexicalComposerContext()
  const [isLoadError, setIsLoadError] = useState<boolean>(false)
  const [isReplaceDialogOpen, setIsReplaceDialogOpen] = useState(false)
  const isEditable = useLexicalEditable()
  const editorContainer = useEditorContainer()
  const {
    hasCaptionContent,
    localShowCaption,
    setShowCaption,
  } = useImageCaptionControls({
    caption,
    editor,
    nodeKey,
    showCaption,
  })
  const responsiveDimensions = useResponsiveImageDimensions({
    editor,
    imageRef,
    width,
    height,
    isResizing,
    fullWidth,
    maxWidthLimit: editorContainer?.maxWidth,
  })

  const { isSelected, selection } = useImageNodeInteractions({
    buttonRef,
    caption,
    editor,
    imageRef,
    isResizing,
    nodeKey,
    showCaption,
  })

  useEffect(() => {
    if (!isEditable && isReplaceDialogOpen) {
      // Use setTimeout to avoid calling setState synchronously within effect
      setTimeout(() => {
        setIsReplaceDialogOpen(false)
      }, 0)
    }
  }, [isEditable, isReplaceDialogOpen])

  useEffect(() => {
    return () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current)
      }
    }
  }, [])

  const onResizeEnd = useCallback(
    (nextWidth: DimensionValue, nextHeight: DimensionValue) => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current)
      }
      resizeTimeoutRef.current = setTimeout(() => {
        setIsResizing(false)
      }, RESIZE_HANDLE_HIDE_DELAY)

      editor.update(() => {
        const node = $getNodeByKey(nodeKey)
        if ($isImageNode(node)) {
          node.setWidthAndHeight(nextWidth, nextHeight)
        }
      })
    },
    [editor, nodeKey]
  )

  const onResizeStart = useCallback(() => {
    setIsResizing(true)
    editor.update(() => {
      const node = $getNodeByKey(nodeKey)
      if ($isImageNode(node)) {
        node.setFullWidth(false)
      }
    })
  }, [editor, nodeKey])

  const handleReplaceImage = useCallback(
    (payload: InsertImagePayload) => {
      if (!payload?.src) {
        return
      }
      editor.update(() => {
        const node = $getNodeByKey(nodeKey)
        if ($isImageNode(node)) {
          node.setSrc(payload.src)
          if (payload.altText !== undefined) {
            node.setAltText(payload.altText)
          }
          node.setWidthAndHeight("inherit", "inherit")
        }
      })
    },
    [editor, nodeKey]
  )

  const draggable = isSelected && $isNodeSelection(selection) && !isResizing
  const isFocused = (isSelected || isResizing) && isEditable
  const shouldRenderCaption =
    showCaption &&
    (isEditable
      ? localShowCaption && captionsEnabled
      : hasCaptionContent)

  const imageClassName = cn(
    "cursor-default",
    isFocused && "focused ring-primary ring-2 ring-offset-2",
    isFocused &&
      $isNodeSelection(selection) &&
      "draggable cursor-grab active:cursor-grabbing"
  )

  const captionWrapperClass = cn(
    "image-caption-container mt-2 block min-w-[100px] overflow-hidden p-0",
    isEditable ? "border-1 rounded-md bg-white/90" : "border-0 bg-transparent"
  )

  return (
    <Suspense
      fallback={
        <div draggable={draggable}>
          <ImagePlaceholder
            width={responsiveDimensions.width}
            height={responsiveDimensions.height}
          />
        </div>
      }
    >
      <>
        <div draggable={draggable}>
          {isLoadError ? (
            <BrokenImage />
          ) : (
            <LazyImage
              className={imageClassName}
              src={src}
              altText={altText}
              imageRef={imageRef}
              width={responsiveDimensions.width}
              height={responsiveDimensions.height}
              maxWidth={maxWidth}
              onError={() => setIsLoadError(true)}
            />
          )}
        </div>

        {shouldRenderCaption && (
          <div className={captionWrapperClass}>
            <CaptionComposer caption={caption} isEditable={isEditable} />
          </div>
        )}
        {resizable && $isNodeSelection(selection) && isFocused && (
          <ImageResizer
            showCaption={localShowCaption}
            setShowCaption={setShowCaption}
            editor={editor}
            buttonRef={buttonRef}
            mediaRef={imageRef}
            onResizeStart={onResizeStart}
            onResizeEnd={onResizeEnd}
            captionsEnabled={!isLoadError && captionsEnabled}
            onSetFullWidth={() => {
              editor.update(() => {
                const node = $getNodeByKey(nodeKey)
                if ($isImageNode(node)) {
                  node.setFullWidth(true)
                }
              })
            }}
            onReplaceMedia={
              isEditable
                ? () => setIsReplaceDialogOpen(true)
                : undefined
            }
          />
        )}
        <Dialog
          open={isReplaceDialogOpen}
          onOpenChange={(open) => setIsReplaceDialogOpen(open)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change image</DialogTitle>
            </DialogHeader>
            <InsertImageDialog
              activeEditor={editor}
              onClose={() => setIsReplaceDialogOpen(false)}
              onInsert={(payload, close) => {
                handleReplaceImage(payload)
                close()
              }}
            />
          </DialogContent>
        </Dialog>
      </>
    </Suspense>
  )
}
