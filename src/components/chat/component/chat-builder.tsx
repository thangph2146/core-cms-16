"use client";

import React, { useRef, useState } from "react";
import { X, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils/index";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

export type ChatPosition = "bottom-right" | "bottom-left";
export type ChatSize = "sm" | "md" | "lg" | "xl" | "full";

const chatConfig = {
  dimensions: {
    sm: "sm:max-w-sm sm:max-h-[500px]",
    md: "sm:max-w-md sm:max-h-[600px]",
    lg: "sm:max-w-lg sm:max-h-[700px]",
    xl: "sm:max-w-xl sm:max-h-[800px]",
    full: "sm:w-full sm:h-full",
  },
  positions: {
    "bottom-right": "bottom-5 right-5",
    "bottom-left": "bottom-5 left-5",
  },
  chatPositions: {
    "bottom-right": "sm:bottom-[calc(100%+10px)] sm:right-0",
    "bottom-left": "sm:bottom-[calc(100%+10px)] sm:left-0",
  },
  states: {
    open: "pointer-events-auto opacity-100 visible scale-100 translate-y-0",
    closed:
      "pointer-events-none opacity-0 invisible scale-100 sm:translate-y-5",
  },
};

interface ChatBuilderProps extends React.HTMLAttributes<HTMLDivElement> {
  position?: ChatPosition;
  size?: ChatSize;
  icon?: React.ReactNode;
  renderPage?: boolean;
  renderToggle?: (props: { isOpen: boolean; onToggle: () => void }) => React.ReactNode;
}

const ChatBuilder: React.FC<ChatBuilderProps> = ({
  className,
  position = "bottom-right",
  size = "md",
  icon,
  renderPage = false,
  renderToggle,
  children,
  ...props
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  const toggleChat = () => setIsOpen(!isOpen);

  // Render full page mode
  if (renderPage) {
    return (
      <div
        ref={chatRef}
        className={cn(
          "flex flex-col bg-background shadow-lg overflow-hidden transition-all",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  }

  // Render floating chat mode
  return (
    <div
      className={cn(`fixed ${chatConfig.positions[position]} z-50`)}
      {...props}
    >
      <div
        ref={chatRef}
        className={cn(
          "flex flex-col bg-background border shadow-md overflow-hidden transition-all duration-250 ease-out sm:absolute sm:w-[90vw] sm:h-[80vh] fixed inset-0 w-full h-full sm:inset-auto",
          chatConfig.chatPositions[position],
          chatConfig.dimensions[size],
          isOpen ? chatConfig.states.open : chatConfig.states.closed,
          className,
        )}
      >
        {children}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 sm:hidden"
          onClick={toggleChat}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      {renderToggle ? (
        renderToggle({ isOpen, onToggle: toggleChat })
      ) : (
        <ChatBuilderToggle
          icon={icon}
          isOpen={isOpen}
          onToggle={toggleChat}
        />
      )}
    </div>
  );
};

ChatBuilder.displayName = "ChatBuilder";

const ChatBuilderHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...props
}) => (
  <div
    className={cn(
      "flex items-center justify-between border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
      className,
    )}
    {...props}
  />
);

ChatBuilderHeader.displayName = "ChatBuilderHeader";

interface ChatBuilderBodyProps extends React.ComponentProps<typeof ScrollArea> {
  className?: string;
  children: React.ReactNode;
}

const ChatBuilderBody: React.FC<ChatBuilderBodyProps> = ({
  className,
  children,
  ...props
}) => (
  <ScrollArea
    className={cn(
      "flex-grow max-h-[calc(100dvh)] sm:max-h-[calc(100dvh-300px)] shadow-md  ",
      className
    )}
    {...props}
  >
    {children}
  </ScrollArea>
);

ChatBuilderBody.displayName = "ChatBuilderBody";

const ChatBuilderFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...props
}) => (
  <div
    className={cn(
      "border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
      className,
    )}
    {...props}
  />
);

ChatBuilderFooter.displayName = "ChatBuilderFooter";

interface ChatBuilderToggleProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
}

const ChatBuilderToggle: React.FC<ChatBuilderToggleProps> = ({
  className,
  icon,
  isOpen,
  onToggle,
  ...props
}) => (
  <Button
    variant="default"
    onClick={onToggle}
    className={cn(
      "w-14 h-14 rounded-full shadow-md flex items-center justify-center hover:shadow-lg hover:shadow-black/30 transition-all duration-300",
      className,
    )}
    {...props}
  >
    {isOpen ? (
      <X className="h-6 w-6" />
    ) : (
      icon || <MessageCircle className="h-6 w-6" />
    )}
  </Button>
);

ChatBuilderToggle.displayName = "ChatBuilderToggle";

export {
  ChatBuilder,
  ChatBuilderHeader,
  ChatBuilderBody,
  ChatBuilderFooter,
  ChatBuilderToggle,
};
