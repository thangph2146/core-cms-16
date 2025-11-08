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
    const internalScrollRef = React.useRef<HTMLElement | null>(null);
    
    const {
      scrollRef: _scrollRef,
      isAtBottom: _isAtBottom,
      autoScrollEnabled: _autoScrollEnabled,
      scrollToBottom: _scrollToBottom,
      disableAutoScroll: _disableAutoScroll,
    } = useAutoScroll({
      smooth,
      content: children,
    });

    // Get ScrollArea viewport from parent and use it for scrolling
    React.useEffect(() => {
      if (containerRef.current) {
        const viewport = containerRef.current.closest('[data-slot="scroll-area-viewport"]') as HTMLElement;
        if (viewport) {
          scrollAreaViewportRef.current = viewport;
          internalScrollRef.current = viewport;
        }
      }
    }, []);

    const scrollToBottom = React.useCallback(() => {
      const viewport = scrollAreaViewportRef.current || internalScrollRef.current;
      if (viewport) {
        viewport.scrollTo({
          top: viewport.scrollHeight - viewport.clientHeight,
          behavior: smooth ? "smooth" : "auto",
        });
      }
    }, [smooth]);


    // Check if at bottom
    const [isAtBottomState, setIsAtBottomState] = React.useState(true);

    React.useEffect(() => {
      const viewport = scrollAreaViewportRef.current || internalScrollRef.current;
      if (!viewport) return;

      const checkIsAtBottom = () => {
        const { scrollTop, scrollHeight, clientHeight } = viewport;
        const distanceToBottom = Math.abs(scrollHeight - scrollTop - clientHeight);
        setIsAtBottomState(distanceToBottom <= 20);
      };

      viewport.addEventListener("scroll", checkIsAtBottom, { passive: true });
      checkIsAtBottom();

      return () => {
        viewport.removeEventListener("scroll", checkIsAtBottom);
      };
    }, [children]);

    return (
      <div className="relative w-full h-full" ref={containerRef}>
        <div
          className={cn(
            "flex flex-col w-full min-h-full p-4",
            className
          )}
          {...props}
        >
          <div className="flex flex-col gap-6">{children}</div>
        </div>

        {!isAtBottomState && (
          <Button
            onClick={() => {
              scrollToBottom();
            }}
            size="icon"
            variant="outline"
            className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10 inline-flex rounded-full shadow-xl hover:shadow-2xl bg-gradient-to-br from-background to-muted/50 backdrop-blur border-2 border-primary/30 hover:border-primary/50 ring-2 ring-primary/10"
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
