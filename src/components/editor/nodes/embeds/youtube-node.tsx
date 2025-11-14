import * as React from "react"
import { JSX } from "react"
import { BlockWithAlignableContents } from "@lexical/react/LexicalBlockWithAlignableContents"
import { useLexicalEditable } from "@lexical/react/useLexicalEditable"
import { useLexicalNodeSelection } from "@lexical/react/useLexicalNodeSelection"
import { mergeRegister } from "@lexical/utils"
import { ImageResizer } from "@/components/editor/editor-ui/image-resizer"
import { getContainerWidth } from "@/components/editor/editor-ui/image-sizing"
import {
  DecoratorBlockNode,
  SerializedDecoratorBlockNode,
} from "@lexical/react/LexicalDecoratorBlockNode"
import type {
  DOMConversionMap,
  DOMConversionOutput,
  DOMExportOutput,
  EditorConfig,
  ElementFormatType,
  LexicalEditor,
  LexicalNode,
  NodeKey,
  Spread,
} from "lexical"
import { $getNodeByKey, CLICK_COMMAND, COMMAND_PRIORITY_LOW } from "lexical"

type YouTubeComponentProps = Readonly<{
  className: Readonly<{
    base: string
    focus: string
  }>
  format: ElementFormatType | null
  nodeKey: NodeKey
  videoID: string
  width: "inherit" | number
  height: "inherit" | number
  maxWidth: number
  fullWidth: boolean
  editor: LexicalEditor
}>

function YouTubeComponent({
  className,
  format,
  nodeKey,
  videoID,
  width,
  height,
  maxWidth,
  fullWidth,
  editor,
}: YouTubeComponentProps) {
  const isEditable = useLexicalEditable()
  const [isSelected, setSelected, clearSelection] =
    useLexicalNodeSelection(nodeKey)
  const [isResizing, setIsResizing] = React.useState(false)
  const wrapperRef = React.useRef<HTMLDivElement | null>(null)
  const [wrapperElement, setWrapperElement] =
    React.useState<HTMLDivElement | null>(null)
  const buttonRef = React.useRef<HTMLButtonElement | null>(null)
  const [containerWidth, setContainerWidth] = React.useState<number>(maxWidth)
  const updateNode = React.useCallback(
    (updater: (node: YouTubeNode) => void) => {
      editor.update(() => {
        const node = $getNodeByKey(nodeKey)
        if (node instanceof YouTubeNode) {
          updater(node)
        }
      })
    },
    [editor, nodeKey]
  )
  // YouTube videos have 16:9 aspect ratio (width:height)
  const aspectRatio = 16 / 9
  const clampToContainer = React.useCallback(
    (value: number) => {
      return Math.min(value, containerWidth || value)
    },
    [containerWidth]
  )
  React.useEffect(() => {
    if (!wrapperElement) {
      return
    }
    const editorRoot = editor.getRootElement()
    const parentElement = wrapperElement.parentElement
    const getMeasurementTarget = () => parentElement ?? wrapperElement
    const updateAvailableWidth = () => {
      const measurementTarget = getMeasurementTarget()
      const widthValue =
        getContainerWidth(measurementTarget, editorRoot) || maxWidth
      if (widthValue > 0) {
        setContainerWidth((prev) => (prev === widthValue ? prev : widthValue))
      }
    }
    updateAvailableWidth()
    const hasResizeObserver =
      typeof window !== "undefined" && typeof ResizeObserver !== "undefined"
    let observer: ResizeObserver | null = null
    if (hasResizeObserver) {
      observer = new ResizeObserver(updateAvailableWidth)
      observer.observe(wrapperElement)
      if (parentElement && parentElement !== wrapperElement) {
        observer.observe(parentElement)
      }
      if (editorRoot && editorRoot !== parentElement) {
        observer.observe(editorRoot)
      }
      return () => observer?.disconnect()
    }
    if (typeof window !== "undefined") {
      window.addEventListener("resize", updateAvailableWidth)
      return () => window.removeEventListener("resize", updateAvailableWidth)
    }
  }, [editor, maxWidth, wrapperElement])
  React.useEffect(() => {
    if (!containerWidth) {
      return
    }
    updateNode((node) => {
      if (node.getMaxWidth() !== containerWidth) {
        node.setMaxWidth(containerWidth)
      }
    })
  }, [containerWidth, updateNode])
  const availableWidth = containerWidth || maxWidth
  const targetWidth =
    typeof width === "number" ? width : availableWidth
  const boundedWidth =
    typeof targetWidth === "number"
      ? Math.min(targetWidth, availableWidth)
      : availableWidth
  const renderedWidth = fullWidth ? availableWidth : boundedWidth
  const actualHeight: number = Math.round(renderedWidth / aspectRatio)
  // CSS aspect-ratio expects width/height, not height/width
  const cssAspectRatio =
    typeof width === "number" && typeof height === "number" && height > 0
      ? width / height
      : aspectRatio
  const isFocused = (isSelected || isResizing) && isEditable
  const disablePlaybackInteractions = isEditable
  const iframeWidth = renderedWidth
  const iframeHeight = Math.round(iframeWidth / aspectRatio)
  const handleWrapperRef = React.useCallback((node: HTMLDivElement | null) => {
    wrapperRef.current = node
    setWrapperElement(node)
  }, [])
  React.useEffect(() => {
    if (!isEditable) {
      return
    }
    return mergeRegister(
      editor.registerCommand<MouseEvent>(
        CLICK_COMMAND,
        (event) => {
          const wrapper = wrapperRef.current
          if (!wrapper || !(event.target instanceof Node)) {
            return false
          }
          if (!wrapper.contains(event.target)) {
            return false
          }
          if (isResizing) {
            return true
          }
          if (event.shiftKey) {
            setSelected(!isSelected)
          } else {
            clearSelection()
            setSelected(true)
          }
          event.preventDefault()
          return true
        },
        COMMAND_PRIORITY_LOW
      )
    )
  }, [clearSelection, editor, isEditable, isResizing, isSelected, setSelected])
  return (
    <BlockWithAlignableContents
      className={className}
      format={format}
      nodeKey={nodeKey}
    >
      <div
        style={{
          width: fullWidth ? "100%" : boundedWidth,
          height: fullWidth ? undefined : actualHeight,
          aspectRatio: cssAspectRatio,
          maxWidth: "100%",
        }}
        className="relative inline-block"
        ref={handleWrapperRef}
      >
        <iframe
          width={iframeWidth}
          height={iframeHeight}
          src={`https://www.youtube-nocookie.com/embed/${videoID}`}
          frameBorder="0"
          allow={
            disablePlaybackInteractions
              ? "accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              : "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          }
          allowFullScreen={true}
          title="YouTube video"
          className={`block absolute inset-0 h-full w-full ${
            disablePlaybackInteractions ? "pointer-events-none" : ""
          }`}
          tabIndex={disablePlaybackInteractions ? -1 : undefined}
          aria-label={
            disablePlaybackInteractions
              ? "YouTube video preview disabled while editing"
              : "YouTube video"
          }
        />
        {isFocused && (
          <ImageResizer
            editor={editor}
            buttonRef={buttonRef}
            mediaRef={wrapperRef}
            unlockBoundaries={false}
            onResizeStart={() => {
              setIsResizing(true)
              updateNode((node) => node.setFullWidth(false))
            }}
            onResizeEnd={(nextWidth, nextHeight) => {
              setTimeout(() => setIsResizing(false), 200)
              const finalWidth =
                typeof nextWidth === "number"
                  ? clampToContainer(nextWidth)
                  : nextWidth
              const finalHeight =
                typeof finalWidth === "number"
                  ? Math.round(finalWidth / aspectRatio)
                  : nextHeight
              updateNode((node) =>
                node.setWidthAndHeight(finalWidth, finalHeight)
              )
            }}
            onSetFullWidth={() => {
              updateNode((node) => node.setFullWidth(true))
            }}
          />
        )}
      </div>
    </BlockWithAlignableContents>
  )
}

export type SerializedYouTubeNode = Spread<
  {
    videoID: string
    width?: number
    height?: number
    maxWidth?: number
    fullWidth?: boolean
  },
  SerializedDecoratorBlockNode
>

function $convertYoutubeElement(
  domNode: HTMLElement
): null | DOMConversionOutput {
  const videoID = domNode.getAttribute("data-lexical-youtube")
  if (videoID) {
    const node = $createYouTubeNode(videoID)
    return { node }
  }
  return null
}

export class YouTubeNode extends DecoratorBlockNode {
  __id: string
  __width: "inherit" | number
  __height: "inherit" | number
  __maxWidth: number
  __fullWidth: boolean

  static getType(): string {
    return "youtube"
  }

  static clone(node: YouTubeNode): YouTubeNode {
    return new YouTubeNode(
      node.__id,
      node.__format,
      node.__width,
      node.__height,
      node.__maxWidth,
      node.__fullWidth,
      node.__key
    )
  }

  static importJSON(serializedNode: SerializedYouTubeNode): YouTubeNode {
    const node = $createYouTubeNode(
      serializedNode.videoID,
      serializedNode.width,
      serializedNode.height,
      serializedNode.maxWidth ?? 640,
      serializedNode.fullWidth
    )
    node.setFormat(serializedNode.format)
    return node
  }

  exportJSON(): SerializedYouTubeNode {
    return {
      ...super.exportJSON(),
      type: "youtube",
      version: 1,
      videoID: this.__id,
      width: this.__width === "inherit" ? undefined : (this.__width as number),
      height:
        this.__height === "inherit" ? undefined : (this.__height as number),
      maxWidth: this.__maxWidth,
      fullWidth: this.__fullWidth,
    }
  }

  constructor(
    id: string,
    format?: ElementFormatType,
    width?: "inherit" | number,
    height?: "inherit" | number,
    maxWidth: number = 640,
    fullWidth?: boolean,
    key?: NodeKey
  ) {
    super(format, key)
    this.__id = id
    this.__width = width ?? "inherit"
    this.__height = height ?? "inherit"
    this.__maxWidth = maxWidth
    // Default to not full width so align controls remain effective
    this.__fullWidth = fullWidth ?? false
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement("iframe")
    element.setAttribute("data-lexical-youtube", this.__id)
    if (typeof this.__width === "number") {
      element.setAttribute("width", String(this.__width))
    }
    if (typeof this.__height === "number") {
      element.setAttribute("height", String(this.__height))
    }
    element.setAttribute(
      "src",
      `https://www.youtube-nocookie.com/embed/${this.__id}`
    )
    element.setAttribute("frameborder", "0")
    element.setAttribute(
      "allow",
      "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
    )
    element.setAttribute("allowfullscreen", "true")
    element.setAttribute("title", "YouTube video")
    return { element }
  }

  static importDOM(): DOMConversionMap | null {
    return {
      iframe: (domNode: HTMLElement) => {
        if (!domNode.hasAttribute("data-lexical-youtube")) {
          return null
        }
        return {
          conversion: $convertYoutubeElement,
          priority: 1,
        }
      },
    }
  }

  updateDOM(): false {
    return false
  }

  getId(): string {
    return this.__id
  }

  getTextContent(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _includeInert?: boolean | undefined,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _includeDirectionless?: false | undefined
  ): string {
    return `https://www.youtube.com/watch?v=${this.__id}`
  }

  decorate(_editor: LexicalEditor, config: EditorConfig): JSX.Element {
    const embedBlockTheme = config.theme.embedBlock || {}
    const className = {
      base: embedBlockTheme.base || "",
      focus: embedBlockTheme.focus || "",
    }
    return (
      <YouTubeComponent
        className={className}
        format={this.__format}
        nodeKey={this.getKey()}
        videoID={this.__id}
        width={this.__width}
        height={this.__height}
        maxWidth={this.__maxWidth}
        fullWidth={this.__fullWidth}
        editor={_editor}
      />
    )
  }

  setWidthAndHeight(width: "inherit" | number, height: "inherit" | number) {
    const writable = this.getWritable()
    writable.__width = width
    writable.__height = height
  }
  getMaxWidth(): number {
    return this.__maxWidth
  }

  setMaxWidth(maxWidth: number) {
    const writable = this.getWritable()
    writable.__maxWidth = maxWidth
  }

  isFullWidth(): boolean {
    return this.__fullWidth
  }

  setFullWidth(fullWidth: boolean) {
    const writable = this.getWritable()
    writable.__fullWidth = fullWidth
  }
}

export function $createYouTubeNode(
  videoID: string,
  width?: number,
  height?: number,
  maxWidth?: number,
  fullWidth?: boolean
): YouTubeNode {
  return new YouTubeNode(videoID, undefined, width, height, maxWidth, fullWidth)
}

export function $isYouTubeNode(
  node: YouTubeNode | LexicalNode | null | undefined
): node is YouTubeNode {
  return node instanceof YouTubeNode
}
