export const unlockImageBoundaries = (image: HTMLElement) => {
  // Không cho phép vượt quá container: luôn giữ max-width = 100%
  image.style.setProperty("max-width", "100%", "important")
  image.style.setProperty("max-height", "none", "important")
}

export const getImageAspectRatio = (image: HTMLElement | null) => {
  if (!image) {
    return 1
  }
  const anyImg = image as any
  if (anyImg.naturalWidth > 0 && anyImg.naturalHeight > 0) {
    return anyImg.naturalWidth / anyImg.naturalHeight
  }
  const { width, height } = image.getBoundingClientRect()
  if (!height) {
    return 1
  }
  return width / height
}

export const getInnerWidth = (element: HTMLElement) => {
  const rectWidth = element.getBoundingClientRect().width
  if (rectWidth <= 0) {
    return 0
  }
  if (typeof window === "undefined") {
    return rectWidth
  }
  const styles = window.getComputedStyle(element)
  const paddingLeft = Number.parseFloat(styles.paddingLeft || "0") || 0
  const paddingRight = Number.parseFloat(styles.paddingRight || "0") || 0
  return Math.max(rectWidth - (paddingLeft + paddingRight), 0)
}

export const getNearestContentWidth = (image: HTMLElement) => {
  if (typeof window === "undefined") {
    return null
  }

  let current: HTMLElement | null = image.parentElement
  while (current) {
    const display = window.getComputedStyle(current).display
    const isInline =
      display === "inline" ||
      display === "inline-block" ||
      display === "inline-flex" ||
      display === "contents"

    if (!isInline) {
      const width = getInnerWidth(current)
      if (width > 0) {
        return width
      }
    }
    current = current.parentElement
  }

  return null
}

const FIELD_CONTENT_SELECTOR = "[data-slot='field-content']"

const getFieldContentWidth = (element: HTMLElement | null) => {
  if (!element) {
    return null
  }
  const fieldContent = element.closest(FIELD_CONTENT_SELECTOR) as
    | HTMLElement
    | null
  if (fieldContent) {
    const width = getInnerWidth(fieldContent)
    if (width > 0) {
      return width
    }
  }
  return null
}

const clampWidth = (value: number | null, hardLimit?: number) => {
  if (!value || value <= 0) {
    return null
  }
  if (hardLimit && hardLimit > 0) {
    return Math.min(value, hardLimit)
  }
  return value
}

export const getContainerWidth = (
  element: HTMLElement,
  editorRoot: HTMLElement | null,
  hardLimit?: number
) => {
  const fieldContentWidth = clampWidth(
    getFieldContentWidth(element),
    hardLimit
  )
  if (fieldContentWidth) {
    return fieldContentWidth
  }
  const contentWidth = clampWidth(getNearestContentWidth(element), hardLimit)
  if (contentWidth) {
    return contentWidth
  }

  if (editorRoot) {
    const rootWidth = clampWidth(getInnerWidth(editorRoot), hardLimit)
    if (rootWidth) {
      return rootWidth
    }
  }

  const elementWidth = clampWidth(
    element.getBoundingClientRect().width,
    hardLimit
  )
  return elementWidth ?? undefined
}
