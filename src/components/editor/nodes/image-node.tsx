import * as React from "react"
import { JSX, Suspense } from "react"
import type {
  DOMConversionMap,
  DOMConversionOutput,
  DOMExportOutput,
  EditorConfig,
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
    const { altText, height, width, maxWidth, caption, src, showCaption } =
      serializedNode
    // Đảm bảo showCaption có giá trị mặc định là false nếu không có trong data
    // Điều này xử lý trường hợp data cũ không có field showCaption
    const shouldShowCaption = showCaption === true
    
    const node = $createImageNode({
      altText,
      height,
      maxWidth,
      showCaption: shouldShowCaption,
      src,
      width,
      fullWidth: serializedNode.fullWidth,
    })
    const nestedEditor = node.__caption
    
    // Chỉ restore caption content nếu showCaption = true VÀ caption có content thực sự
    // Nếu showCaption = false hoặc caption trống, giữ caption editor trống và set showCaption = false
    if (shouldShowCaption && caption?.editorState) {
      const editorState = nestedEditor.parseEditorState(caption.editorState)
      // Kiểm tra caption có content thực sự không (không chỉ whitespace)
      const hasRealContent = editorState.read(() => {
        const root = $getRoot()
        const raw = root.getTextContent()
        const text = raw.replace(/[\u200B\u00A0\s]+/g, "")
        return text.length > 0
      })
      
      if (hasRealContent) {
        nestedEditor.setEditorState(editorState)
      } else {
        // Nếu showCaption = true nhưng caption trống hoặc chỉ có whitespace
        // Set showCaption = false và clear caption editor
        node.setShowCaption(false)
        nestedEditor.update(() => {
          const root = $getRoot()
          root.clear()
        })
      }
    } else {
      // Nếu showCaption = false hoặc không có caption data
      // Đảm bảo caption editor trống và showCaption = false
      node.setShowCaption(false)
      nestedEditor.update(() => {
        const root = $getRoot()
        root.clear()
      })
    }
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
    // Kiểm tra caption editor có content không
    // LƯU Ý: exportJSON() có thể được gọi trong read-only mode,
    // nên không được modify node state (không dùng getWritable() hoặc update())
    const currentState = this.__caption.getEditorState()
    const hasContent = currentState.read(() => {
      const root = $getRoot()
      const raw = root.getTextContent()
      const text = raw.replace(/[\u200B\u00A0\s]+/g, "")
      return text.length > 0
    })
    
    // Đồng bộ showCaption với caption content khi serialize:
    // - Nếu caption trống, return showCaption = false (ưu tiên cao nhất)
    // - Nếu showCaption = false, vẫn return showCaption = false
    // - Chỉ return showCaption = true nếu cả showCaption = true VÀ có content
    // KHÔNG modify node state ở đây, chỉ return giá trị đúng cho serialization
    let finalShowCaption = this.__showCaption
    
    if (!hasContent) {
      // Nếu caption trống, force showCaption = false trong serialized data
      // Điều này đảm bảo data consistency khi lưu vào database
      finalShowCaption = false
    } else if (!this.__showCaption) {
      // Nếu showCaption = false nhưng caption có content
      // Vẫn return showCaption = false (theo node state)
      // Caption content sẽ được clear ở nơi khác (trong setShowCaption)
      finalShowCaption = false
    }
    
    // Serialize caption editor
    // Nếu finalShowCaption = false, caption sẽ được serialize nhưng sẽ bị ignore khi import
    const serializedCaption = this.__caption.toJSON()
    
    return {
      altText: this.getAltText(),
      caption: serializedCaption,
      height: this.__height === "inherit" ? 0 : this.__height,
      maxWidth: this.__maxWidth,
      showCaption: finalShowCaption,
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
