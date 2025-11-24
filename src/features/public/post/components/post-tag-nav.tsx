"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useMemo } from "react"
import { Tag, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"

interface Tag {
  id: string
  name: string
  slug: string
}

interface PostTagNavProps {
  tags: Tag[]
}

export function PostTagNav({ tags }: PostTagNavProps) {
  const searchParams = useSearchParams()
  const selectedTags = useMemo(() => {
    const tags = searchParams?.getAll("tag") || []
    return new Set(tags)
  }, [searchParams])

  const toggleTag = useMemo(
    () => (slug: string) => {
      const params = new URLSearchParams(searchParams?.toString() || "")
      const currentTags = params.getAll("tag")
      
      if (currentTags.includes(slug)) {
        // Remove tag
        params.delete("tag")
        currentTags.filter(t => t !== slug).forEach(t => params.append("tag", t))
      } else {
        // Add tag
        params.append("tag", slug)
      }
      
      params.delete("page") // Reset to page 1 when changing tag
      return `/bai-viet${params.toString() ? `?${params.toString()}` : ""}`
    },
    [searchParams]
  )

  const clearAllTags = useMemo(
    () => () => {
      const params = new URLSearchParams(searchParams?.toString() || "")
      params.delete("tag")
      params.delete("page")
      return `/bai-viet${params.toString() ? `?${params.toString()}` : ""}`
    },
    [searchParams]
  )

  return (
    <nav aria-label="Tag navigation">
      {/* Mobile: Flex wrap */}
      <div className="lg:hidden">
        <div className="flex flex-wrap items-stretch gap-2">
          <Link
            href={clearAllTags()}
            className={cn(
              "group flex items-center gap-2 px-3 sm:px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-all border",
              selectedTags.size === 0
                ? "bg-accent/10 hover:bg-accent/10 text-primary border-primary/20 shadow-sm"
                : "hover:bg-accent/10 text-muted-foreground border-transparent hover:border-border"
            )}
          >
            <Tag className={cn(
              "h-4 w-4 transition-transform",
              selectedTags.size === 0 && "scale-110"
            )} />
            <span>Tất cả</span>
            {selectedTags.size > 0 && (
              <X className="h-3 w-3 opacity-50 group-hover:opacity-100" />
            )}
          </Link>
          {tags.map((tag) => {
            const isActive = selectedTags.has(tag.slug)
            return (
              <Link
                key={tag.id}
                href={toggleTag(tag.slug)}
                className={cn(
                  "group flex items-center gap-2 px-3 sm:px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-all border",
                  isActive
                    ? "bg-accent/10 hover:bg-accent/10 text-primary border-primary/20 shadow-sm"
                    : "hover:bg-accent/10 text-muted-foreground border-transparent hover:border-border"
                )}
              >
                <Tag className={cn(
                  "h-4 w-4 transition-transform",
                  isActive && "scale-110"
                )} />
                <span>{tag.name}</span>
                {isActive && (
                  <X className="h-3 w-3 opacity-50 group-hover:opacity-100 ml-auto" />
                )}
              </Link>
            )
          })}
        </div>
      </div>

      {/* Desktop: Vertical scroll */}
      <div className="hidden lg:block">
        <ScrollArea className="w-full max-h-[calc(100vh-20rem)]">
          <div className="flex flex-col items-stretch gap-2 pr-4">
            <Link
              href={clearAllTags()}
              className={cn(
                "group flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-all border w-full",
                selectedTags.size === 0
                  ? "bg-primary/10 text-primary border-primary/20 shadow-sm"
                  : "hover:bg-accent/10 text-muted-foreground border-transparent hover:border-border"
              )}
            >
              <Tag className={cn(
                "h-4 w-4 transition-transform",
                selectedTags.size === 0 && "scale-110"
              )} />
              <span>Tất cả</span>
              {selectedTags.size > 0 && (
                <X className="h-3 w-3 opacity-50 group-hover:opacity-100 ml-auto" />
              )}
            </Link>
            {tags.map((tag) => {
              const isActive = selectedTags.has(tag.slug)
              return (
                <Link
                  key={tag.id}
                  href={toggleTag(tag.slug)}
                  className={cn(
                    "group flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-all border w-full",
                    isActive
                      ? "bg-primary/10 text-primary border-primary/20 shadow-sm"
                      : "hover:bg-accent/10 text-muted-foreground border-transparent hover:border-border"
                  )}
                >
                  <Tag className={cn(
                    "h-4 w-4 transition-transform",
                    isActive && "scale-110"
                  )} />
                  <span>{tag.name}</span>
                  {isActive && (
                    <X className="h-3 w-3 opacity-50 group-hover:opacity-100 ml-auto" />
                  )}
                </Link>
              )
            })}
          </div>
          <ScrollBar orientation="vertical" />
        </ScrollArea>
      </div>
    </nav>
  )
}

