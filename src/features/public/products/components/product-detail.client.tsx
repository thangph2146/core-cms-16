"use client"

import { useState, useRef, useEffect, useMemo, useCallback, memo } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { ChevronLeft, ChevronRight, Loader2, Star } from "lucide-react"
import type { ProductDetail, Product } from "../types"
import { useCart } from "@/features/public/cart/hooks"
import { Editor } from "@/components/editor/editor-x/editor"
import { SerializedEditorState } from "lexical"
import { useProductImageStore } from "../store/product-image-store"
import { useDebouncedCallback } from "@/hooks/use-debounced-callback"
import { usePermissions } from "@/hooks/use-permissions"
import { PERMISSIONS } from "@/lib/permissions"
import { apiClient } from "@/lib/api/api-client"
import { apiRoutes } from "@/lib/api/routes"
import { useToast } from "@/hooks/use-toast"
import { ProductVariantsSection } from "./product-variants-section"
import { ProductInfoSections } from "./product-info-sections"
import { RelatedProductsSection } from "./related-products-section"

export interface ProductDetailClientProps {
  product: ProductDetail
  relatedProducts?: Product[]
}

// Memoized thumbnail component to prevent unnecessary re-renders
const ProductThumbnail = memo<{
  image: { id: string; url: string; alt?: string | null; isPrimary?: boolean }
  index: number
  productName: string
  isSelected: boolean
  isPrimary: boolean
  canSetPrimary: boolean
  onClick: (index: number) => void
  onSetPrimary?: (imageId: string) => void
}>(({ image, index, productName, isSelected, isPrimary, canSetPrimary, onClick, onSetPrimary }) => {
  return (
    <div className="relative my-4 mx-1 flex-shrink-0">
      <button
        onClick={() => onClick(index)}
        className={`relative w-20 h-20 rounded-lg overflow-hidden border-2 transition-all duration-200 ${
          isSelected
            ? "border-primary ring-2 ring-primary/20 scale-105"
            : "border-transparent hover:border-muted-foreground/50"
        }`}
      >
        <Image
          src={image.url}
          alt={image.alt || productName}
          fill
          sizes="80px"
          quality={90}
          className="object-cover transition-transform duration-200 hover:scale-110"
          unoptimized={image.url.includes("cellphones.com.vn") || image.url.includes("cdn")}
        />
        {isPrimary && (
          <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full p-1">
            <Star className="h-3 w-3 fill-current" />
          </div>
        )}
      </button>
      {canSetPrimary && !isPrimary && onSetPrimary && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-1 right-1 h-6 w-6 backdrop-blur-sm shadow-sm hover:bg-background"
          onClick={(e) => {
            e.stopPropagation()
            onSetPrimary(image.id)
          }}
          aria-label="Đặt làm ảnh chính"
          title="Đặt làm ảnh chính"
        >
          <Star className="h-3 w-3 text-muted-foreground hover:text-primary" />
        </Button>
      )}
    </div>
  )
})
ProductThumbnail.displayName = "ProductThumbnail"

export function ProductDetailClient({ product: initialProduct, relatedProducts = [] }: ProductDetailClientProps) {
  const router = useRouter()
  const [quantity, setQuantity] = useState(1)
  const [product, setProduct] = useState(initialProduct)
  const [isSettingPrimary, setIsSettingPrimary] = useState(false)
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({})
  const { addToCart, isAddingToCart } = useCart()
  const { toast } = useToast()
  const { hasPermission } = usePermissions()
  const imageScrollRef = useRef<HTMLDivElement>(null)
  
  // Check if user can manage products
  const canManageProducts = hasPermission(PERMISSIONS.PRODUCTS_MANAGE) || hasPermission(PERMISSIONS.PRODUCTS_UPDATE)

  // Group variants by type
  const variantsByType = useMemo(() => {
    const variants = product.variants
    if (!variants || variants.length === 0) return {}
    return variants.reduce((acc, variant) => {
      if (!acc[variant.type]) acc[variant.type] = []
      acc[variant.type].push(variant)
      return acc
    }, {} as Record<string, typeof variants>)
  }, [product.variants])

  // Initialize selected variants with defaults
  useEffect(() => {
    if (product.variants && product.variants.length > 0) {
      const defaults: Record<string, string> = {}
      Object.keys(variantsByType).forEach((type) => {
        const defaultVariant = variantsByType[type]?.find((v) => v.isDefault) || variantsByType[type]?.[0]
        if (defaultVariant) defaults[type] = defaultVariant.id
      })
      setSelectedVariants(defaults)
    }
  }, [product.variants, variantsByType])
  
  // Zustand store for image state
  const selectedImageIndex = useProductImageStore(
    (state) => state.selectedImageIndex[product.id] ?? 0
  )
  const canScrollLeft = useProductImageStore(
    (state) => state.canScrollLeft[product.id] ?? false
  )
  const canScrollRight = useProductImageStore(
    (state) => state.canScrollRight[product.id] ?? false
  )
  const setSelectedImageIndex = useProductImageStore(
    (state) => state.setSelectedImageIndex
  )
  const setCanScrollLeft = useProductImageStore(
    (state) => state.setCanScrollLeft
  )
  const setCanScrollRight = useProductImageStore(
    (state) => state.setCanScrollRight
  )
  const preloadImage = useProductImageStore((state) => state.preloadImage)
  const isImagePreloaded = useProductImageStore((state) => state.isImagePreloaded)

  // Parse description as SerializedEditorState
  const editorState = useMemo((): SerializedEditorState | null => {
    if (!product.description) return null

    try {
      // If it's already an object (SerializedEditorState)
      if (typeof product.description === "object" && product.description !== null) {
        return product.description as unknown as SerializedEditorState
      }

      // If it's a string, try to parse as JSON
      if (typeof product.description === "string") {
        const parsed = JSON.parse(product.description)
        if (parsed && typeof parsed === "object") {
          return parsed as SerializedEditorState
        }
        // If not valid JSON or not an object, return null (will show as plain text)
        return null
      }
    } catch {
      // If parsing fails, description is plain text
      console.debug("[ProductDetailClient] Description is plain text, not editor state")
      return null
    }

    return null
  }, [product.description])
  const isPlainText = useMemo(
    () => product.description && typeof product.description === "string" && !editorState,
    [product.description, editorState]
  )
  const price = useMemo(() => parseFloat(product.price), [product.price])
  const comparePrice = useMemo(
    () => (product.compareAtPrice ? parseFloat(product.compareAtPrice) : null),
    [product.compareAtPrice]
  )
  const primaryImage = useMemo(
    () => product.images.find((img) => img.isPrimary) || product.images[0],
    [product.images]
  )
  const displayImage = useMemo(
    () => product.images[selectedImageIndex] || primaryImage,
    [product.images, selectedImageIndex, primaryImage]
  )

  // Navigation state
  const canNavigatePrev = selectedImageIndex > 0
  const canNavigateNext = selectedImageIndex < product.images.length - 1

  // Handle set primary image
  const handleSetPrimary = useCallback(async (imageId: string) => {
    if (!canManageProducts || isSettingPrimary) return

    setIsSettingPrimary(true)
    try {
      const response = await apiClient.post(apiRoutes.products.setPrimaryImage(product.id, imageId))
      
      if (response.data?.success && response.data?.data) {
        setProduct((prev) => ({
          ...prev,
          images: response.data.data.images || prev.images,
        }))
        toast({ title: "Thành công", description: "Đã đặt làm ảnh chính" })
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: error instanceof Error ? error.message : "Không thể đặt ảnh chính",
      })
    } finally {
      setIsSettingPrimary(false)
    }
  }, [canManageProducts, isSettingPrimary, product.id, toast])

  // Preload all images on mount
  useEffect(() => {
    product.images.forEach((image) => {
      if (!isImagePreloaded(image.url)) {
        preloadImage(image.url)
      }
    })
  }, [product.images, preloadImage, isImagePreloaded])

  // Cleanup: Reset product state when component unmounts or product changes
  useEffect(() => {
    return () => {
      // Don't reset on unmount to preserve state across navigation
      // Only reset if product ID actually changes
    }
  }, [product.id])

  // Get the scrollable viewport element
  const getScrollElement = useCallback(() => {
    if (!imageScrollRef.current) return null
    const viewport = imageScrollRef.current.querySelector('[data-slot="scroll-area-viewport"]') as HTMLElement
    return viewport || imageScrollRef.current
  }, [])

  const updateScrollButtons = useCallback(() => {
    const scrollElement = getScrollElement()
    if (!scrollElement) return

    const { scrollLeft, scrollWidth, clientWidth } = scrollElement
    setCanScrollLeft(product.id, scrollLeft > 0)
    setCanScrollRight(product.id, scrollLeft < scrollWidth - clientWidth - 1)
  }, [getScrollElement, product.id, setCanScrollLeft, setCanScrollRight])

  const updateSelectedImageFromScroll = useCallback(() => {
    const scrollElement = getScrollElement()
    if (!scrollElement) return

    const containerRect = scrollElement.getBoundingClientRect()
    const containerCenter = containerRect.left + containerRect.width / 2

    let closestIndex = 0
    let closestDistance = Infinity

    const imageContainer = scrollElement.querySelector('.flex.gap-2') as HTMLElement
    if (!imageContainer) return

    imageContainer.childNodes.forEach((child, index) => {
      if (child instanceof HTMLElement) {
        const childRect = child.getBoundingClientRect()
        const childCenter = childRect.left + childRect.width / 2
        const distance = Math.abs(containerCenter - childCenter)

        if (distance < closestDistance) {
          closestDistance = distance
          closestIndex = index
        }
      }
    })

    if (closestIndex !== selectedImageIndex) {
      setSelectedImageIndex(product.id, closestIndex)
    }
  }, [getScrollElement, selectedImageIndex, product.id, setSelectedImageIndex])

  // Debounced scroll handler to reduce lag
  const debouncedUpdateScroll = useDebouncedCallback(
    () => {
      updateScrollButtons()
      updateSelectedImageFromScroll()
    },
    50 // 50ms debounce
  )

  // Update scroll buttons visibility on mount and when images change
  useEffect(() => {
    // Auto-select first image on mount if not set
    if (product.images.length > 0 && selectedImageIndex === 0 && !useProductImageStore.getState().selectedImageIndex[product.id]) {
      setSelectedImageIndex(product.id, 0)
    }

    // Wait for ScrollArea to render
    const timer = setTimeout(() => {
      updateScrollButtons()
    }, 100)

    return () => clearTimeout(timer)
  }, [product.images.length, product.id, selectedImageIndex, setSelectedImageIndex, updateScrollButtons])

  // Listen to scroll events on the viewport with debounce
  useEffect(() => {
    const scrollElement = getScrollElement()
    if (!scrollElement) return

    const handleScroll = () => {
      debouncedUpdateScroll()
    }

    scrollElement.addEventListener('scroll', handleScroll, { passive: true })
    
    // Initial check
    updateScrollButtons()
    
    return () => {
      scrollElement.removeEventListener('scroll', handleScroll)
      debouncedUpdateScroll.cancel()
    }
  }, [getScrollElement, debouncedUpdateScroll, updateScrollButtons])

  // Navigate to prev/next image
  const handleNavigateImage = useCallback((direction: "prev" | "next") => {
    const newIndex = direction === "prev"
      ? Math.max(0, selectedImageIndex - 1)
      : Math.min(product.images.length - 1, selectedImageIndex + 1)
    
    if (newIndex !== selectedImageIndex) {
      setSelectedImageIndex(product.id, newIndex)
      const scrollElement = getScrollElement()
      if (scrollElement) {
        const imageContainer = scrollElement.querySelector('.flex.gap-2') as HTMLElement
        const thumbnail = imageContainer?.children[newIndex] as HTMLElement
        thumbnail?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" })
      }
    }
  }, [selectedImageIndex, product.images.length, product.id, setSelectedImageIndex, getScrollElement])

  // Update selected image when clicking on thumbnail
  const handleThumbnailClick = useCallback((index: number) => {
    setSelectedImageIndex(product.id, index)
    const scrollElement = getScrollElement()
    if (scrollElement) {
      const imageContainer = scrollElement.querySelector('.flex.gap-2') as HTMLElement
      const thumbnail = imageContainer?.children[index] as HTMLElement
      thumbnail?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" })
    }
  }, [product.id, setSelectedImageIndex, getScrollElement])

  const handleAddToCart = useCallback(() => {
    if (product.stock < quantity || product.stock === 0) {
      return
    }
    addToCart({
      productId: product.id,
      quantity: Math.min(quantity, product.stock),
    })
  }, [product.stock, product.id, quantity, addToCart])

  const handleBuyNow = useCallback(async () => {
    if (product.stock < quantity || product.stock === 0 || isAddingToCart) {
      return
    }
    addToCart({
      productId: product.id,
      quantity: Math.min(quantity, product.stock),
    })
    // Wait a bit for the mutation to complete before navigating
    setTimeout(() => {
      router.push("/checkout")
    }, 500)
  }, [product.stock, product.id, quantity, addToCart, router, isAddingToCart])


  const scrollImages = useCallback((direction: "left" | "right") => {
    const scrollElement = getScrollElement()
    if (!scrollElement) return

    const imageContainer = scrollElement.querySelector('.flex.gap-2') as HTMLElement
    if (!imageContainer) return

    const firstChild = imageContainer.firstElementChild as HTMLElement
    const scrollAmount = firstChild ? firstChild.offsetWidth + 8 : 120
    
    if (direction === "right" && selectedImageIndex < product.images.length - 1) {
      const nextIndex = selectedImageIndex + 1
      const nextThumbnail = imageContainer.children[nextIndex] as HTMLElement
      if (nextThumbnail) {
        nextThumbnail.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" })
        setSelectedImageIndex(product.id, nextIndex)
      }
    } else if (direction === "left" && selectedImageIndex > 0) {
      const prevIndex = selectedImageIndex - 1
      const prevThumbnail = imageContainer.children[prevIndex] as HTMLElement
      if (prevThumbnail) {
        prevThumbnail.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" })
        setSelectedImageIndex(product.id, prevIndex)
      }
    } else {
      const scrollDirection = direction === "left" ? -scrollAmount : scrollAmount
      scrollElement.scrollBy({
        left: scrollDirection,
        behavior: "smooth",
      })
    }

    // Update button visibility after scroll with debounce
    setTimeout(() => {
      updateScrollButtons()
      updateSelectedImageFromScroll()
    }, 300)
  }, [getScrollElement, selectedImageIndex, product.images.length, product.id, setSelectedImageIndex, updateScrollButtons, updateSelectedImageFromScroll])

  // const isOutOfStock = product.stock === 0

  return (
    <div className="container mx-auto px-4 sm:px-6 max-w-6xl py-4 md:py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
        {/* Product Images */}
        <div className="space-y-4">
          <div className="relative w-full aspect-square group">
            {displayImage ? (
              <>
                <Image
                  src={displayImage.url}
                  alt={displayImage.alt || product.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  loading="eager"
                  priority
                  quality={95}
                  className="object-cover rounded-lg"
                  unoptimized={displayImage.url.includes("cellphones.com.vn") || displayImage.url.includes("cdn")}
                />
                
                {/* Navigation buttons */}
                {product.images.length > 1 && (
                  <>
                    {canNavigatePrev && (
                      <Button
                        variant="secondary"
                        size="icon"
                        className="absolute left-2 top-1/2 -translate-y-1/2 h-10 w-10 backdrop-blur-sm shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10"
                        onClick={() => handleNavigateImage("prev")}
                        aria-label="Ảnh trước"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </Button>
                    )}
                    {canNavigateNext && (
                      <Button
                        variant="secondary"
                        size="icon"
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 backdrop-blur-sm shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10"
                        onClick={() => handleNavigateImage("next")}
                        aria-label="Ảnh sau"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </Button>
                    )}
                  </>
                )}

                {/* Primary badge */}
                {displayImage.isPrimary && (
                  <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full px-2 py-1 text-xs font-medium flex items-center gap-1">
                    <Star className="h-3 w-3 fill-current" />
                    Ảnh chính
                  </div>
                )}

                {/* Set primary button (admin only) */}
                {canManageProducts && !displayImage.isPrimary && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm shadow-lg"
                    onClick={() => handleSetPrimary(displayImage.id)}
                    disabled={isSettingPrimary}
                    aria-label="Đặt làm ảnh chính"
                  >
                    {isSettingPrimary ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Star className="h-4 w-4 mr-1" />
                        Đặt làm ảnh chính
                      </>
                    )}
                  </Button>
                )}
              </>
            ) : (
              <div className="w-full h-full bg-muted rounded-lg flex items-center justify-center">
                <span className="text-muted-foreground">No Image</span>
              </div>
            )}
          </div>
          {product.images.length > 1 && (
            <div className="relative">
              {/* Scroll buttons */}
              {canScrollLeft && (
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute left-2 top-1/2 -translate-y-1/2 z-10 h-8 w-8 backdrop-blur-sm shadow-md"
                  onClick={() => scrollImages("left")}
                  aria-label="Scroll left"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              )}
              {canScrollRight && (
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-10 h-8 w-8 backdrop-blur-sm shadow-md"
                  onClick={() => scrollImages("right")}
                  aria-label="Scroll right"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              )}

              {/* Image thumbnails */}
              <ScrollArea
                ref={imageScrollRef}
                className="w-full"
              >
                <div
                  className="flex gap-2"
                >
                  {product.images.map((image, index) => (
                    <ProductThumbnail
                      key={image.id}
                      image={image}
                      index={index}
                      productName={product.name}
                      isSelected={selectedImageIndex === index}
                      isPrimary={image.isPrimary}
                      canSetPrimary={canManageProducts && !isSettingPrimary}
                      onClick={handleThumbnailClick}
                      onSetPrimary={canManageProducts ? handleSetPrimary : undefined}
                    />
                  ))}
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="space-y-4 md:space-y-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-2">{product.name}</h1>
            {product.categories && product.categories.length > 0 && (
              <div className="flex gap-2 mb-4">
                {product.categories.map((category) => (
                  <Link
                    key={category.id}
                    href={`/san-pham?category=${category.slug}`}
                    className="text-sm text-muted-foreground hover:text-primary"
                  >
                    {category.name}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <span className="text-2xl md:text-3xl font-bold">
                {new Intl.NumberFormat("vi-VN", {
                  style: "currency",
                  currency: "VND",
                }).format(price)}
              </span>
              {comparePrice && comparePrice > price && (
                <span className="text-lg text-muted-foreground line-through">
                  {new Intl.NumberFormat("vi-VN", {
                    style: "currency",
                    currency: "VND",
                  }).format(comparePrice)}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>
            {product.stock > 0 ? (
              <p className="text-sm text-green-600">Còn hàng ({product.stock} sản phẩm)</p>
            ) : (
              <p className="text-sm text-red-600">Hết hàng</p>
            )}
          </div>

          <Separator />

          {product.description && (
            <div>
              <h2 className="text-lg font-semibold mb-2">Mô tả sản phẩm</h2>
              {editorState ? (
                <Editor
                  editorSerializedState={editorState}
                  readOnly={true}
                />
              ) : isPlainText ? (
                <div className="prose prose-sm max-w-none">
                  <p className="whitespace-pre-wrap text-muted-foreground">
                    {product.description}
                  </p>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  Không có mô tả
                </div>
              )}
            </div>
          )}

          <Separator />

          {/* Product Variants */}
          <ProductVariantsSection
            variantsByType={variantsByType}
            selectedVariants={selectedVariants}
            onVariantSelect={(type, variantId) => setSelectedVariants((prev) => ({ ...prev, [type]: variantId }))}
          />

          {/* Product Info Sections */}
          <ProductInfoSections product={product} />

          <Separator />

          {/* Quantity and Add to Cart */}
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <label htmlFor="quantity" className="text-sm font-medium">
                Số lượng:
              </label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                >
                  -
                </Button>
                <input
                  id="quantity"
                  type="number"
                  min="1"
                  max={product.stock}
                  value={quantity}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 1
                    setQuantity(Math.max(1, Math.min(product.stock, val)))
                  }}
                  className="w-16 text-center border rounded-md px-2 py-1"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                  disabled={quantity >= product.stock}
                >
                  +
                </Button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <Button
                onClick={handleAddToCart}
                disabled={product.stock === 0 || isAddingToCart}
                className="flex-1 w-full sm:w-auto"
                size="lg"
              >
                {isAddingToCart ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang thêm...
                  </>
                ) : (
                  "Thêm vào giỏ hàng"
                )}
              </Button>
              <Button
                onClick={handleBuyNow}
                variant="outline"
                size="lg"
                disabled={product.stock === 0 || isAddingToCart}
                className="w-full sm:w-auto"
              >
                {isAddingToCart ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang xử lý...
                  </>
                ) : (
                  "Mua ngay"
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Related Products Section */}
      {relatedProducts.length > 0 && (
        <div className="mt-12 md:mt-16">
          <Separator className="mb-6 md:mb-8" />
          <h2 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8">Sản phẩm liên quan</h2>
          <RelatedProductsSection products={relatedProducts} />
        </div>
      )}
    </div>
  )
}


