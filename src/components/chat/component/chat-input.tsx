"use client"

import * as React from "react"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

export interface ChatInputProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  onEnter?: () => void
  maxRows?: number
  minRows?: number
}

const ChatInput = React.forwardRef<HTMLTextAreaElement, ChatInputProps>(
  (
    {
      className,
      onEnter,
      maxRows = 5,
      minRows = 1,
      onKeyDown,
      onChange,
      ...props
    },
    ref
  ) => {
    const textareaRef = React.useRef<HTMLTextAreaElement>(null)
    const combinedRef = React.useMemo(() => {
      if (typeof ref === "function") {
        return (node: HTMLTextAreaElement | null) => {
          textareaRef.current = node
          ref(node)
        }
      } else if (ref) {
        return (node: HTMLTextAreaElement | null) => {
          textareaRef.current = node
          if (ref.current) ref.current = node
        }
      }
      return (node: HTMLTextAreaElement | null) => {
        textareaRef.current = node
      }
    }, [ref])

    // Auto-resize functionality
    const adjustHeight = React.useCallback(() => {
      const textarea = textareaRef.current
      if (!textarea) return

      // Reset height to auto to get the correct scrollHeight
      textarea.style.height = "auto"

      // Fixed min and max height: 100px
      const minHeight = 50
      const maxHeight = 50
      const scrollHeight = textarea.scrollHeight

      // Set height based on content, respecting min and max
      const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight)
      textarea.style.height = `${newHeight}px`

      // Show scrollbar if content exceeds max height
      textarea.style.overflowY = scrollHeight > maxHeight ? "auto" : "hidden"
    }, [])

    // Adjust height on mount and when value changes
    React.useEffect(() => {
      adjustHeight()
    }, [props.value, adjustHeight])

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Handle Enter key
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        if (onEnter) {
          onEnter()
        }
      }

      // Call original onKeyDown if provided
      if (onKeyDown) {
        onKeyDown(e)
      }
    }

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      adjustHeight()

      // Call original onChange if provided
      if (onChange) {
        onChange(e)
      }
    }

    return (
      <Textarea
        ref={combinedRef}
        autoComplete="off"
        name="message"
        onKeyDown={handleKeyDown}
        onChange={handleChange}
        className={cn(
          // Base styles
          "w-full resize-none overflow-hidden",
          // Typography
          "text-sm leading-relaxed",
          // Spacing - đồng đều với buttons
          "px-3 py-2.5",
          // Appearance
          "bg-background",
          "placeholder:text-muted-foreground/60",
          // Focus states
          "focus-visible:outline-none focus-visible:ring-0",
          "focus-visible:placeholder:text-muted-foreground/40",
          // Transitions
          "transition-all duration-200 ease-in-out",
          // Disabled state
          "disabled:cursor-not-allowed disabled:opacity-50",
          // Scrollbar styling (when content exceeds max height)
          "scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent",
          "hover:scrollbar-thumb-muted-foreground/30",
          className
        )}
        style={{
          minHeight: "95px",
          maxHeight: "95px",
        }}
        {...props}
      />
    )
  }
)

ChatInput.displayName = "ChatInput"

export { ChatInput }