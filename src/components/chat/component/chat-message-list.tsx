"use client"

import * as React from "react";
import { ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAutoScroll } from "@/components/chat/hooks/use-auto-scroll";
import { cn } from "@/lib/utils";

interface ChatMessageListProps extends React.HTMLAttributes<HTMLDivElement> {
  smooth?: boolean;
}

const ChatMessageList = React.forwardRef<HTMLDivElement, ChatMessageListProps>(
  ({ className, children, smooth = false, ...props }, _ref) => {
    const containerRef = React.useRef<HTMLDivElement>(null);
    const scrollAreaViewportRef = React.useRef<HTMLElement | null>(null);
    
    const {
      scrollRef,
      isAtBottom,
      autoScrollEnabled: _autoScrollEnabled,
      scrollToBottom,
      disableAutoScroll,
    } = useAutoScroll({
      smooth,
      content: children,
    });

    // Get ScrollArea viewport from parent and sync with scrollRef
    React.useEffect(() => {
      if (containerRef.current) {
        const viewport = containerRef.current.closest('[data-slot="scroll-area-viewport"]') as HTMLElement;
        if (viewport) {
          scrollAreaViewportRef.current = viewport;
          // Update scrollRef to point to ScrollArea viewport
          if (scrollRef && typeof scrollRef === "object" && "current" in scrollRef) {
            (scrollRef as React.MutableRefObject<HTMLElement | null>).current = viewport;
          }
        }
      }
    }, [scrollRef]);

    return (
      <div className="relative w-full h-full" ref={containerRef}>
        <div
          className={cn(
            "flex flex-col w-full min-h-full p-4",
            className
          )}
          onWheel={disableAutoScroll}
          onTouchMove={disableAutoScroll}
          {...props}
        >
          <div className="flex flex-col gap-6">{children}</div>
        </div>

        {!isAtBottom && (
          <Button
            onClick={() => {
              scrollToBottom();
            }}
            size="icon"
            variant="outline"
            className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10 inline-flex rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 bg-background/95 backdrop-blur"
            aria-label="Scroll to bottom"
          >
            <ArrowDown className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  }
);

ChatMessageList.displayName = "ChatMessageList";

export { ChatMessageList };
