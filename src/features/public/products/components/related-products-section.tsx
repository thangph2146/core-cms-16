"use client"

import { memo, useRef, useState, useEffect, useCallback } from "react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import type { Product } from "../types"

interface RelatedProductsSectionProps {
  products: Product[]
}

const RelatedProductCard = memo<{ product: Product }>(({ product }) => {
  const primaryImage = product.images?.find((img) => img.isPrimary) || product.images?.[0]
  const price = parseFloat(product.price)
  const comparePrice = product.compareAtPrice ? parseFloat(product.compareAtPrice) : null

  return (
    <Card className="flex flex-col hover:shadow-lg transition-shadow min-w-[200px] sm:min-w-[220px]">
      <Link href={`/san-pham/${product.slug}`} className="flex flex-col flex-1">
        <CardHeader className="p-0">
          {primaryImage ? (
            <div className="relative w-full aspect-square overflow-hidden">
              <Image
                src={primaryImage.url}
                alt={primaryImage.alt || product.name}
                fill
                sizes="200px"
                className="object-cover rounded-t-lg transition-transform hover:scale-105"
                quality={85}
                unoptimized={primaryImage.url.includes("cellphones.com.vn") || primaryImage.url.includes("cdn")}
              />
            </div>
          ) : (
            <div className="w-full aspect-square bg-muted rounded-t-lg flex items-center justify-center">
              <span className="text-muted-foreground text-xs">No Image</span>
            </div>
          )}
        </CardHeader>
        <CardContent className="flex-1 p-3">
          <CardTitle className="text-sm mb-2 line-clamp-2 min-h-[2.5rem]">
            {product.name}
          </CardTitle>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold">
              {new Intl.NumberFormat("vi-VN", {
                style: "currency",
                currency: "VND",
              }).format(price)}
            </span>
            {comparePrice && comparePrice > price && (
              <span className="text-xs text-muted-foreground line-through">
                {new Intl.NumberFormat("vi-VN", {
                  style: "currency",
                  currency: "VND",
                }).format(comparePrice)}
              </span>
            )}
          </div>
        </CardContent>
      </Link>
      <CardFooter className="p-3 pt-0">
        <Button asChild variant="outline" size="sm" className="w-full text-xs">
          <Link href={`/san-pham/${product.slug}`}>Xem chi tiết</Link>
        </Button>
      </CardFooter>
    </Card>
  )
})
RelatedProductCard.displayName = "RelatedProductCard"

export const RelatedProductsSection = memo<RelatedProductsSectionProps>(({ products }) => {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const getScrollElement = useCallback(() => {
    return scrollRef.current?.querySelector('[data-slot="scroll-area-viewport"]') as HTMLElement | null
  }, [])

  const updateScrollButtons = useCallback(() => {
    const scrollElement = getScrollElement()
    if (!scrollElement) return

    const { scrollLeft, scrollWidth, clientWidth } = scrollElement
    setCanScrollLeft(scrollLeft > 0)
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10)
  }, [getScrollElement])

  const scrollProducts = useCallback((direction: "left" | "right") => {
    const scrollElement = getScrollElement()
    if (!scrollElement) return

    const container = scrollElement.querySelector('.flex.gap-4') as HTMLElement
    if (!container) return

    const firstChild = container.firstElementChild as HTMLElement
    const scrollAmount = firstChild ? firstChild.offsetWidth + 16 : 220

    scrollElement.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    })
  }, [getScrollElement])

  useEffect(() => {
    if (products.length === 0) return
    const scrollElement = getScrollElement()
    if (!scrollElement) return

    // Initial check after mount
    const timeoutId = setTimeout(() => updateScrollButtons(), 0)

    scrollElement.addEventListener("scroll", updateScrollButtons)
    const resizeObserver = new ResizeObserver(updateScrollButtons)
    resizeObserver.observe(scrollElement)

    return () => {
      clearTimeout(timeoutId)
      scrollElement.removeEventListener("scroll", updateScrollButtons)
      resizeObserver.disconnect()
    }
  }, [products.length, updateScrollButtons, getScrollElement])

  if (products.length === 0) return null

  return (
    <div className="relative">
      {canScrollLeft && (
        <Button
          variant="secondary"
          size="icon"
          className="absolute left-2 top-1/2 -translate-y-1/2 z-10 h-10 w-10 backdrop-blur-sm shadow-lg"
          onClick={() => scrollProducts("left")}
          aria-label="Cuộn trái"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
      )}
      {canScrollRight && (
        <Button
          variant="secondary"
          size="icon"
          className="absolute right-2 top-1/2 -translate-y-1/2 z-10 h-10 w-10 backdrop-blur-sm shadow-lg"
          onClick={() => scrollProducts("right")}
          aria-label="Cuộn phải"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      )}
      <ScrollArea ref={scrollRef} className="w-full">
        <div className="flex gap-4 md:gap-6 pb-4">
          {products.map((product) => (
            <RelatedProductCard key={product.id} product={product} />
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  )
})
RelatedProductsSection.displayName = "RelatedProductsSection"

