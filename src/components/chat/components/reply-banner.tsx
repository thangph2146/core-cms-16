/**
 * Banner hiển thị khi đang reply một message
 */

"use client"

import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import type { Message } from "../types"

interface ReplyBannerProps {
  replyingTo: Message
  onCancel: () => void
}

export function ReplyBanner({ replyingTo, onCancel }: ReplyBannerProps) {
  return (
    <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-muted-foreground mb-0.5">Replying to:</p>
        <p className="text-xs truncate">{replyingTo.content}</p>
      </div>
      <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={onCancel}>
        <X className="h-3 w-3" />
      </Button>
    </div>
  )
}

