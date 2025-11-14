"use client"

import { useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ChevronDown, ArrowUpDown, ArrowDownUp } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const sortOptions = [
  { 
    value: "newest" as const, 
    label: "Mới nhất",
    icon: ArrowDownUp,
  },
  { 
    value: "oldest" as const, 
    label: "Cũ nhất",
    icon: ArrowUpDown,
  },
] as const

export function PostSort() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentSort = (searchParams?.get("sort") || "newest") as "newest" | "oldest"

  const handleSortChange = (value: string) => {
    const params = new URLSearchParams(searchParams?.toString() || "")
    params.set("sort", value)
    params.delete("page") // Reset to page 1 when changing sort
    router.push(`/bai-viet?${params.toString()}`)
  }

  const currentOption = useMemo(
    () => sortOptions.find((opt) => opt.value === currentSort) || sortOptions[0],
    [currentSort]
  )

  const CurrentIcon = currentOption.icon

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <CurrentIcon className="h-4 w-4" />
          <span>{currentOption.label}</span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {sortOptions.map((option) => {
          const OptionIcon = option.icon
          const isActive = currentSort === option.value
          return (
            <DropdownMenuItem
              key={option.value}
              onClick={() => handleSortChange(option.value)}
              className={cn(
                "flex items-center gap-2 cursor-pointer",
                isActive && "bg-accent font-medium"
              )}
            >
              <OptionIcon className={cn(
                "h-4 w-4",
                isActive ? "text-primary" : "text-muted-foreground"
              )} />
              <span>{option.label}</span>
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

