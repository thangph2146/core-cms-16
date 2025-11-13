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
import { useCollaborationContextSafe } from "@/components/editor/editor-hooks/use-collaboration-context-safe"
import { cn } from "@/lib/utils"

const imageCache = new Set()

export const RIGHT_CLICK_IMAGE_COMMAND: LexicalCommand<MouseEvent> =
  createCommand("RIGHT_CLICK_IMAGE_COMMAND")

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

type DimensionValue = "inherit" | number

function LazyImage({
  altText,
  className,
  imageRef,
  src,
  width,
  height,
  maxWidth,
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
}: {
  editor: LexicalEditor
  height: DimensionValue
  imageRef: { current: null | HTMLImageElement }
  width: DimensionValue
  isResizing: boolean
  fullWidth?: boolean
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

    const image = imageRef.current
    if (!image) {
      setDimensions({ width, height })
      return
    }

    // Nếu width và height đã được set cụ thể (không phải "inherit"), 
    // không tự động điều chỉnh để cho phép resize không giới hạn
    if (typeof width === "number" && typeof height === "number") {
      setDimensions({ width, height })
      return
    }

    const editorRoot = editor.getRootElement()

    const updateDimensions = () => {
      const containerWidth = getContainerWidth(image, editorRoot)

      if (!containerWidth) {
        setDimensions({ width, height })
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

      // Nếu fullWidth => luôn bám theo container width
      // Nếu không: chỉ scale down khi vượt quá container
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

      setDimensions((prev) => {
        if (prev.width === nextWidth && prev.height === nextHeight) {
          return prev
        }
        return {
          width: nextWidth,
          height: nextHeight,
        }
      })
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
      return () => {
        resizeObserver.disconnect()
      }
    }

    if (typeof window !== "undefined") {
      window.addEventListener("resize", updateDimensions)
      return () => {
        window.removeEventListener("resize", updateDimensions)
      }
    }
  }, [editor, height, imageRef, isResizing, width, fullWidth])

  return dimensions
}

function BrokenImage(): JSX.Element {
  return (
    <img
      src={""}
      style={{
        height: 200,
        opacity: 0.2,
        width: 200,
      }}
      draggable="false"
    />
  )
}

export default function ImageComponent({
  src,
  altText,
  nodeKey,
  width,
  height,
  maxWidth,
  resizable,
  showCaption,
  caption,
  captionsEnabled,
  fullWidth,
}: {
  altText: string
  caption: LexicalEditor
  height: "inherit" | number
  maxWidth: number
  nodeKey: NodeKey
  resizable: boolean
  showCaption: boolean
  src: string
  width: "inherit" | number
  captionsEnabled: boolean
  fullWidth: boolean
}): JSX.Element {
  const imageRef = useRef<null | HTMLImageElement>(null)
  const buttonRef = useRef<HTMLButtonElement | null>(null)
  const [isSelected, setSelected, clearSelection] =
    useLexicalNodeSelection(nodeKey)
  const [isResizing, setIsResizing] = useState<boolean>(false)
  // Safely get collaboration context - may not exist if collaboration is not enabled
  const { isCollabActive } = useCollaborationContextSafe()
  const [editor] = useLexicalComposerContext()
  const [selection, setSelection] = useState<BaseSelection | null>(null)
  const activeEditorRef = useRef<LexicalEditor | null>(null)
  const [isLoadError, setIsLoadError] = useState<boolean>(false)
  const isEditable = useLexicalEditable()
  const [hasCaptionContent, setHasCaptionContent] = useState<boolean>(false)
  const [localShowCaption, setLocalShowCaption] = useState<boolean>(showCaption)
  const isUpdatingCaptionRef = useRef(false)
  const lastShowCaptionRef = useRef(showCaption)

  useEffect(() => {
    if (!showCaption) {
      setHasCaptionContent(false)
      setLocalShowCaption(false)
    } else if (!isUpdatingCaptionRef.current && lastShowCaptionRef.current !== showCaption) {
      setLocalShowCaption(showCaption)
      lastShowCaptionRef.current = showCaption
    }
    isUpdatingCaptionRef.current = false
  }, [showCaption])
  const responsiveDimensions = useResponsiveImageDimensions({
    editor,
    imageRef,
    width,
    height,
    isResizing,
    fullWidth,
  })

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
          // Move focus into nested editor
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
    [caption, isSelected, showCaption]
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
    [caption, editor, setSelected]
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
    [isResizing, isSelected, setSelected, clearSelection]
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
          editor.dispatchCommand(RIGHT_CLICK_IMAGE_COMMAND, event as MouseEvent)
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
            // TODO This is just a temporary workaround for FF to behave like other browsers.
            // Ideally, this handles drag & drop too (and all browsers).
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

  const setShowCaption = (show: boolean) => {
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
  }


  const onResizeEnd = (
    nextWidth: "inherit" | number,
    nextHeight: "inherit" | number
  ) => {
    // Delay hiding the resize bars for click case
    setTimeout(() => {
      setIsResizing(false)
    }, 200)

    editor.update(() => {
      const node = $getNodeByKey(nodeKey)
      if ($isImageNode(node)) {
        node.setWidthAndHeight(nextWidth, nextHeight)
      }
    })
  }

  const onResizeStart = () => {
    setIsResizing(true)
    // Exiting full-width mode on manual resize
    editor.update(() => {
      const node = $getNodeByKey(nodeKey)
      if ($isImageNode(node)) {
        node.setFullWidth(false)
      }
    })
  }

  useEffect(() => {
    const computeHasContent = () => {
      const state = caption.getEditorState()
      const hasContent = state.read(() => {
        const root = $getRoot()
        const raw = root.getTextContent()
        // Remove normal whitespace, NBSP, and zero-width chars
        const text = raw.replace(/[\u200B\u00A0\s]+/g, "")
        return text.length > 0
      })
      setHasCaptionContent(showCaption && hasContent)
    }

    setTimeout(() => {
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
      unregister()
    }
  }, [caption, editor, nodeKey, showCaption])

  const draggable = isSelected && $isNodeSelection(selection) && !isResizing
  const isFocused = (isSelected || isResizing) && isEditable
  const shouldRenderCaption = showCaption && (
    isEditable 
      ? (localShowCaption && captionsEnabled) 
      : hasCaptionContent
  )
  return (
    <Suspense fallback={null}>
      <>
        <div draggable={draggable}>
          {isLoadError ? (
            <BrokenImage />
          ) : (
            <LazyImage
              className={`cursor-default ${
                isFocused
                  ? `${$isNodeSelection(selection) ? "draggable cursor-grab active:cursor-grabbing" : ""} focused ring-primary ring-2 ring-offset-2`
                  : null
              }`}
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
          <div className={cn("image-caption-container mt-2 block min-w-[100px] overflow-hidden p-0", isEditable ? "border-1 rounded-md bg-white/90" : "border-0 bg-transparent")}>
            <LexicalNestedComposer initialEditor={caption}>
              <AutoFocusPlugin />
              <HistoryPlugin />
                <RichTextPlugin
                  contentEditable={
                    <div className="relative">
                      <ContentEditable
                        className={`ImageNode__contentEditable relative block min-h-5 w-full resize-none border-0 bg-transparent px-2.5 py-2 text-sm whitespace-pre-wrap outline-none word-break-break-word ${isEditable ? "box-border cursor-text caret-primary user-select-text" : "cursor-default select-text"}`}
                        placeholder={isEditable ? "Enter a caption..." : ""}
                        placeholderDefaults={false}
                        placeholderClassName="ImageNode__placeholder absolute top-0 left-0 overflow-hidden px-2.5 py-2 text-ellipsis text-sm"
                      />
                    </div>
                  }
                  ErrorBoundary={LexicalErrorBoundary}
                />
            </LexicalNestedComposer>
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
          />
        )}
      </>
    </Suspense>
  )
}
