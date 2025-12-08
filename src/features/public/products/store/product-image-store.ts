/**
 * Product Image Store (Zustand)
 * Manages UI state for product image gallery to prevent lag and unnecessary refreshes
 * Follows Zustand best practices with devtools support
 */

import { create } from "zustand"
import { devtools } from "zustand/middleware"

interface ProductImageState {
  selectedImageIndex: Record<string, number>
  canScrollLeft: Record<string, boolean>
  canScrollRight: Record<string, boolean>
  preloadedImages: Set<string>
  
  // Actions
  setSelectedImageIndex: (productId: string, index: number) => void
  setCanScrollLeft: (productId: string, canScroll: boolean) => void
  setCanScrollRight: (productId: string, canScroll: boolean) => void
  preloadImage: (url: string) => void
  isImagePreloaded: (url: string) => boolean
  resetProductState: (productId: string) => void
}

// Helper to update nested record state
const updateRecord = <T>(
  state: Record<string, T>,
  key: string,
  value: T
): Record<string, T> => ({
  ...state,
  [key]: value,
})

export const useProductImageStore = create<ProductImageState>()(
  devtools(
    (set, get) => ({
      selectedImageIndex: {},
      canScrollLeft: {},
      canScrollRight: {},
      preloadedImages: new Set<string>(),

      setSelectedImageIndex: (productId, index) =>
        set((state) => ({
          selectedImageIndex: updateRecord(state.selectedImageIndex, productId, index),
        })),

      setCanScrollLeft: (productId, canScroll) =>
        set((state) => ({
          canScrollLeft: updateRecord(state.canScrollLeft, productId, canScroll),
        })),

      setCanScrollRight: (productId, canScroll) =>
        set((state) => ({
          canScrollRight: updateRecord(state.canScrollRight, productId, canScroll),
        })),

      preloadImage: (url) => {
        if (get().preloadedImages.has(url)) return
        const img = new Image()
        img.src = url
        set((state) => ({
          preloadedImages: new Set([...state.preloadedImages, url]),
        }))
      },

      isImagePreloaded: (url) => get().preloadedImages.has(url),

      resetProductState: (productId) =>
        set((state) => {
          const { [productId]: _, ...selectedImageIndex } = state.selectedImageIndex
          const { [productId]: __, ...canScrollLeft } = state.canScrollLeft
          const { [productId]: ___, ...canScrollRight } = state.canScrollRight
          return { selectedImageIndex, canScrollLeft, canScrollRight }
        }),
    }),
    { name: "ProductImageStore" }
  )
)

