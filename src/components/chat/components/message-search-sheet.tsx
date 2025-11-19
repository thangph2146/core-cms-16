/**
 * Reusable message search sheet component
 */

"use client"

import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Search, X } from "lucide-react"
import type { Message } from "../types"
import { formatMessageTime } from "../utils"
import { highlightText } from "../utils/text-helpers"

interface MessageSearchSheetProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  onClose: () => void
  messages: Message[]
  onMessageClick: (messageId: string) => void
}

export function MessageSearchSheet({
  searchQuery,
  onSearchChange,
  onClose,
  messages,
  onMessageClick,
}: MessageSearchSheetProps) {
  return (
    <div className="space-y-4 mt-4 p-4">
      <div className="relative">
        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Nhập từ khóa để tìm kiếm..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 pr-9"
          autoFocus
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      {searchQuery && (
        <div className="text-sm text-muted-foreground">
          Tìm thấy {messages.length} tin nhắn
        </div>
      )}
      {searchQuery && messages.length > 0 && (
        <ScrollArea className="h-[calc(100vh-200px)]">
          <div className="space-y-2 pr-4">
            {messages.map((message) => (
              <button
                key={message.id}
                onClick={() => onMessageClick(message.id)}
                className="w-full text-left p-3 rounded-lg border hover:bg-accent/10 transition-colors"
              >
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-muted-foreground mb-1">
                      {formatMessageTime(message.timestamp)}
                    </div>
                    <div className="text-sm break-words">
                      {highlightText(message.content, searchQuery)}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      )}
      {searchQuery && messages.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <p className="text-sm text-muted-foreground">Không tìm thấy tin nhắn nào</p>
          <p className="text-xs text-muted-foreground mt-1">Thử tìm kiếm với từ khóa khác</p>
        </div>
      )}
    </div>
  )
}