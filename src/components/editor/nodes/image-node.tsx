import * as React from "react"
import { JSX, Suspense } from "react"
import type {
  DOMConversionMap,
  DOMConversionOutput,
  DOMExportOutput,
  EditorConfig,
  EditorState,
  LexicalEditor,
  LexicalNode,
  NodeKey,
  SerializedEditor,
  SerializedLexicalNode,
  Spread,
} from "lexical"
import {
  $applyNodeReplacement,
  $getRoot,
  createEditor,
  DecoratorNode,
  ParagraphNode,
  RootNode,
  TextNode,
} from "lexical"

const ImageComponent = React.lazy(() => import("../editor-ui/image-component"))

const WHITESPACE_REGEX = /[\u200B\u00A0\s]+/g

export interface ImagePayload {
  altText: string
  caption?: LexicalEditor
  height?: number
  key?: NodeKey
  maxWidth?: number
  showCaption?: boolean
  src: string
  width?: number
  captionsEnabled?: boolean
  fullWidth?: boolean
}

function editorStateHasContent(editorState: EditorState): boolean {
  return editorState.read(() => {
    const root = $getRoot()
    const text = root.getTextContent().replace(WHITESPACE_REGEX, "")
    return text.length > 0
  })
}

function captionHasContent(editor: LexicalEditor): boolean {
  return editorStateHasContent(editor.getEditorState())
}

function clearCaption(editor: LexicalEditor): void {
  editor.update(() => {
    const root = $getRoot()
    root.clear()
  })
}

function isGoogleDocCheckboxImg(img: HTMLImageElement): boolean {
  return (
    img.parentElement != null &&
    img.parentElement.tagName === "LI" &&
    img.previousSibling === null &&
    img.getAttribute("aria-roledescription") === "checkbox"
  )
}

function $convertImageElement(domNode: Node): null | DOMConversionOutput {
  const img = domNode as HTMLImageElement
  if (img.src.startsWith("file:///") || isGoogleDocCheckboxImg(img)) {
    return null
  }
  const { alt: altText, src, width, height } = img
  const node = $createImageNode({ altText, height, src, width })
  return { node }
}

export type SerializedImageNode = Spread<
  {
    altText: string
    caption: SerializedEditor
    height?: number
    maxWidth: number
    showCaption: boolean
    src: string
    width?: number
    fullWidth?: boolean
  },
  SerializedLexicalNode
>

export class ImageNode extends DecoratorNode<JSX.Element> {
  __src: string
  __altText: string
  __width: "inherit" | number
  __height: "inherit" | number
  __maxWidth: number
  __showCaption: boolean
  __caption: LexicalEditor
  // Captions cannot yet be used within editor cells
  __captionsEnabled: boolean
  __fullWidth: boolean

  static getType(): string {
    return "image"
  }

  static clone(node: ImageNode): ImageNode {
    return new ImageNode(
      node.__src,
      node.__altText,
      node.__maxWidth,
      node.__width,
      node.__height,
      node.__showCaption,
      node.__caption,
      node.__captionsEnabled,
      node.__fullWidth,
      node.__key
    )
  }

  static importJSON(serializedNode: SerializedImageNode): ImageNode {
    const { altText, height, width, maxWidth, caption, src, showCaption, fullWidth } =
      serializedNode

    const node = $createImageNode({
      altText,
      height,
      maxWidth,
      showCaption: showCaption === true,
      src,
      width,
      fullWidth,
    })

    if (showCaption === true && caption?.editorState) {
      const parsedState = node.__caption.parseEditorState(caption.editorState)

      if (editorStateHasContent(parsedState)) {
        node.__caption.setEditorState(parsedState)
        return node
      }
    }

    node.__showCaption = false
    clearCaption(node.__caption)
    return node
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement("img")
    element.setAttribute("src", this.__src)
    element.setAttribute("alt", this.__altText)
    if (typeof this.__width === "number") {
      element.setAttribute("width", this.__width.toString())
    }
    if (typeof this.__height === "number") {
      element.setAttribute("height", this.__height.toString())
    }
    return { element }
  }

  static importDOM(): DOMConversionMap | null {
    return {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      img: (node: Node) => ({
        conversion: $convertImageElement,
        priority: 0,
      }),
    }
  }

  constructor(
    src: string,
    altText: string,
    maxWidth: number,
    width?: "inherit" | number,
    height?: "inherit" | number,
    showCaption?: boolean,
    caption?: LexicalEditor,
    captionsEnabled?: boolean,
    fullWidth?: boolean,
    key?: NodeKey
  ) {
    super(key)
    this.__src = src
    this.__altText = altText
    this.__maxWidth = maxWidth
    this.__width = width || "inherit"
    this.__height = height || "inherit"
    this.__showCaption = showCaption || false
    this.__caption =
      caption ||
      createEditor({
        namespace: "ImageCaption",
        nodes: [RootNode, TextNode, ParagraphNode],
      })
    this.__captionsEnabled = captionsEnabled || captionsEnabled === undefined
    // Default image to full width if not specified for consistency with YouTube
    this.__fullWidth = fullWidth === undefined ? true : !!fullWidth
  }

  exportJSON(): SerializedImageNode {
    return {
      altText: this.getAltText(),
      caption: this.__caption.toJSON(),
      height: this.__height === "inherit" ? 0 : this.__height,
      maxWidth: this.__maxWidth,
      showCaption: this.__showCaption && captionHasContent(this.__caption),
      src: this.getSrc(),
      type: "image",
      version: 1,
      width: this.__width === "inherit" ? 0 : this.__width,
      fullWidth: this.__fullWidth || undefined,
    }
  }

  setWidthAndHeight(
    width: "inherit" | number,
    height: "inherit" | number
  ): void {
    const writable = this.getWritable()
    writable.__width = width
    writable.__height = height
  }

  setSrc(src: string): void {
    const writable = this.getWritable()
    writable.__src = src
  }

  setAltText(altText: string): void {
    const writable = this.getWritable()
    writable.__altText = altText
  }

  setShowCaption(showCaption: boolean): void {
    const writable = this.getWritable()
    writable.__showCaption = showCaption
  }

  setFullWidth(fullWidth: boolean): void {
    const writable = this.getWritable()
    writable.__fullWidth = fullWidth
  }

  // View

  createDOM(config: EditorConfig): HTMLElement {
    const span = document.createElement("span")
    const theme = config.theme
    const className = theme.image
    if (className !== undefined) {
      span.className = className
    }
    return span
  }

  updateDOM(): false {
    return false
  }

  getSrc(): string {
    return this.__src
  }

  getAltText(): string {
    return this.__altText
  }

  decorate(): JSX.Element {
    return (
      <Suspense fallback={null}>
        <ImageComponent
          src={this.__src}
          altText={this.__altText}
          width={this.__width}
          height={this.__height}
          maxWidth={this.__maxWidth}
          nodeKey={this.getKey()}
          showCaption={this.__showCaption}
          caption={this.__caption}
          captionsEnabled={this.__captionsEnabled}
          fullWidth={this.__fullWidth}
          resizable={true}
        />
      </Suspense>
    )
  }
}

export function $createImageNode({
  altText,
  height,
  maxWidth = 500,
  captionsEnabled,
  src,
  width,
  showCaption,
  caption,
  fullWidth,
  key,
}: ImagePayload): ImageNode {
  return $applyNodeReplacement(
    new ImageNode(
      src,
      altText,
      maxWidth,
      width,
      height,
      showCaption,
      caption,
      captionsEnabled,
      fullWidth,
      key
    )
  )
}

export function $isImageNode(
  node: LexicalNode | null | undefined
): node is ImageNode {
  return node instanceof ImageNode
}
