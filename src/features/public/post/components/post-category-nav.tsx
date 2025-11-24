"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useMemo } from "react"
import { FolderOpen, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface Category {
  id: string
  name: string
  slug: string
}

interface PostCategoryNavProps {
  categories: Category[]
}

export function PostCategoryNav({ categories }: PostCategoryNavProps) {
  const searchParams = useSearchParams()
  const currentCategory = searchParams?.get("category") || null

  const getCategoryUrl = useMemo(
    () => (slug: string | null) => {
      const params = new URLSearchParams(searchParams?.toString() || "")
      if (slug) {
        params.set("category", slug)
      } else {
        params.delete("category")
      }
      params.delete("page") // Reset to page 1 when changing category
      return `/bai-viet${params.toString() ? `?${params.toString()}` : ""}`
    },
    [searchParams]
  )

  return (
    <nav 
      className="flex items-center gap-2 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      aria-label="Category navigation"
    >
      <Link
        href={getCategoryUrl(null)}
        className={cn(
          "group flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-all border",
          !currentCategory
            ? "bg-primary/10 text-primary border-primary/20 shadow-sm"
            : "hover:bg-accent text-muted-foreground border-transparent hover:border-border"
        )}
      >
        <FolderOpen className={cn(
          "h-4 w-4 transition-transform",
          !currentCategory && "scale-110"
        )} />
        <span>Tất cả</span>
        {currentCategory && (
          <X className="h-3 w-3 opacity-50 group-hover:opacity-100" />
        )}
      </Link>
      {categories.map((category) => {
        const isActive = currentCategory === category.slug
        return (
          <Link
            key={category.id}
            href={getCategoryUrl(category.slug)}
            className={cn(
              "group flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-all border",
              isActive
                ? "bg-primary/10 text-primary border-primary/20 shadow-sm"
                : "hover:bg-accent/10 text-muted-foreground border-transparent hover:border-border"
            )}
          >
            <FolderOpen className={cn(
              "h-4 w-4 transition-transform",
              isActive && "scale-110"
            )} />
            <span>{category.name}</span>
          </Link>
        )
      })}
    </nav>
  )
}

