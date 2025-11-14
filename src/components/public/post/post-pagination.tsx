"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface PostPaginationProps {
  currentPage: number
  totalPages: number
}

export function PostPagination({ currentPage, totalPages }: PostPaginationProps) {
  const searchParams = useSearchParams()
  
  if (totalPages <= 1) return null

  const getPageUrl = (page: number) => {
    const params = new URLSearchParams(searchParams?.toString() || "")
    if (page === 1) {
      params.delete("page")
    } else {
      params.set("page", page.toString())
    }
    const queryString = params.toString()
    return `/bai-viet${queryString ? `?${queryString}` : ""}`
  }

  // Calculate visible page range
  const maxVisible = 5
  let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2))
  const endPage = Math.min(totalPages, startPage + maxVisible - 1)

  // Adjust if we're near the end
  if (endPage - startPage < maxVisible - 1) {
    startPage = Math.max(1, endPage - maxVisible + 1)
  }

  const pages = Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i)

  return (
    <nav className="flex items-center justify-center gap-2" aria-label="Pagination">
      <Button
        variant="outline"
        size="icon"
        asChild
        disabled={currentPage === 1}
        className={cn(currentPage === 1 && "opacity-50 cursor-not-allowed")}
      >
        <Link href={getPageUrl(currentPage - 1)} aria-label="Previous page">
          <ChevronLeft className="h-4 w-4" />
        </Link>
      </Button>

      {startPage > 1 && (
        <>
          <Button variant="outline" asChild>
            <Link href={getPageUrl(1)}>1</Link>
          </Button>
          {startPage > 2 && <span className="px-2">...</span>}
        </>
      )}

      {pages.map((page) => (
        <Button
          key={page}
          variant={currentPage === page ? "default" : "outline"}
          asChild
        >
          <Link href={getPageUrl(page)}>{page}</Link>
        </Button>
      ))}

      {endPage < totalPages && (
        <>
          {endPage < totalPages - 1 && <span className="px-2">...</span>}
          <Button variant="outline" asChild>
            <Link href={getPageUrl(totalPages)}>{totalPages}</Link>
          </Button>
        </>
      )}

      <Button
        variant="outline"
        size="icon"
        asChild
        disabled={currentPage === totalPages}
        className={cn(currentPage === totalPages && "opacity-50 cursor-not-allowed")}
      >
        <Link href={getPageUrl(currentPage + 1)} aria-label="Next page">
          <ChevronRight className="h-4 w-4" />
        </Link>
      </Button>
    </nav>
  )
}

