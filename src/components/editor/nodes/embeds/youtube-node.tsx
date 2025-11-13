import * as React from "react"
import { JSX } from "react"
import { BlockWithAlignableContents } from "@lexical/react/LexicalBlockWithAlignableContents"
import { useLexicalEditable } from "@lexical/react/useLexicalEditable"
import { useLexicalNodeSelection } from "@lexical/react/useLexicalNodeSelection"
import { ImageResizer } from "@/components/editor/editor-ui/image-resizer"
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
import { $getNodeByKey } from "lexical"

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
  const [isSelected] = useLexicalNodeSelection(nodeKey)
  const [isResizing, setIsResizing] = React.useState(false)
  const wrapperRef = React.useRef<HTMLDivElement | null>(null)
  const buttonRef = React.useRef<HTMLButtonElement | null>(null)
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
  const actualWidth: number = typeof width === "number" ? width : maxWidth
  const actualHeight: number =
    typeof height === "number"
      ? height
      : Math.round(actualWidth / aspectRatio)
  // CSS aspect-ratio expects width/height, not height/width
  const cssAspectRatio =
    typeof width === "number" && typeof height === "number" && height > 0
      ? width / height
      : aspectRatio
  const isFocused = (isSelected || isResizing) && isEditable
  return (
    <BlockWithAlignableContents
      className={className}
      format={format}
      nodeKey={nodeKey}
    >
      <div
        style={{
          width: fullWidth ? "100%" : actualWidth,
          height: fullWidth ? undefined : actualHeight,
          aspectRatio: cssAspectRatio,
        }}
        className="relative block"
        ref={wrapperRef}
      >
        <iframe
          width={actualWidth}
          height={actualHeight}
          src={`https://www.youtube-nocookie.com/embed/${videoID}`}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen={true}
          title="YouTube video"
          className="block absolute inset-0 h-full w-full"
        />
        {isFocused && (
          <ImageResizer
            editor={editor}
            buttonRef={buttonRef}
            mediaRef={wrapperRef}
            onResizeStart={() => {
              setIsResizing(true)
              updateNode((node) => node.setFullWidth(false))
            }}
            onResizeEnd={(nextWidth, nextHeight) => {
              setTimeout(() => setIsResizing(false), 200)
              updateNode((node) => node.setWidthAndHeight(nextWidth, nextHeight))
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
      fullWidth: this.__fullWidth || undefined,
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
    // Default to full width if not specified to keep consistent across views
    this.__fullWidth = fullWidth === undefined ? true : !!fullWidth
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
