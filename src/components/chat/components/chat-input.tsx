"use client"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Paperclip, Send, Smile } from "lucide-react"
import type { Contact, Message } from "../types"
import { AttachmentMenu } from "./attachment-menu"
import { ReplyBanner } from "./reply-banner"
import { GroupDeletedBanner } from "./group-deleted-banner"

interface ChatInputProps {
  inputRef: React.RefObject<HTMLTextAreaElement | null>
  messageInput: string
  setMessageInput: (value: string) => void
  handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  handleSendMessage: () => void
  currentChat: Contact | null
  replyingTo: Message | null
  onCancelReply: () => void
  replyBannerRef?: React.RefObject<HTMLDivElement | null>
  deletedBannerRef?: React.RefObject<HTMLDivElement | null>
  isGroupDeleted?: boolean
}

export function ChatInput({
  inputRef,
  messageInput,
  setMessageInput,
  handleKeyDown,
  handleSendMessage,
  currentChat,
  replyingTo,
  onCancelReply,
  replyBannerRef,
  deletedBannerRef,
  isGroupDeleted = false,
}: ChatInputProps) {
  const isDisabled = !currentChat || isGroupDeleted

  return (
    <div className="flex flex-col border-t shrink-0">
      {replyingTo && !isGroupDeleted && (
        <div ref={replyBannerRef}>
          <ReplyBanner replyingTo={replyingTo} onCancel={onCancelReply} />
        </div>
      )}
      {isGroupDeleted && <GroupDeletedBanner ref={deletedBannerRef} />}
      <div className="flex items-end gap-1 min-h-[64px] max-h-[152px] px-4 py-2">
        <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 mb-0.5" disabled={isDisabled}>
          <Smile className="h-4 w-4" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 mb-0.5" disabled={isDisabled}>
              <Paperclip className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <AttachmentMenu />
        </DropdownMenu>
        <Textarea
          ref={inputRef}
          className="flex-1 min-h-[36px] resize-none overflow-y-auto"
          style={{ maxHeight: "120px" }}
          placeholder={isGroupDeleted ? "Nhóm đã bị xóa" : "Type a message (Enter to send, Shift+Enter for new line)"}
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isDisabled}
          rows={1}
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0 mb-0.5"
          onClick={handleSendMessage}
          disabled={!messageInput.trim() || isDisabled}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

