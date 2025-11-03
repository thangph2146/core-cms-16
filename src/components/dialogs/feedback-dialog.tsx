"use client"

import * as DialogPrimitive from "@radix-ui/react-dialog"
import { CheckCircle2, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

export type FeedbackVariant = "success" | "error"

export interface FeedbackDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  variant: FeedbackVariant
  title: string
  description?: string
  details?: string
}

export function FeedbackDialog({
  open,
  onOpenChange,
  variant,
  title,
  description,
  details,
}: FeedbackDialogProps) {
  const Icon = variant === "success" ? CheckCircle2 : XCircle
  const iconClass =
    variant === "success" ? "text-emerald-500" : "text-rose-500"

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in data-[state=closed]:fade-out" />
        <DialogPrimitive.Content className="bg-background data-[state=open]:animate-in data-[state=closed]:animate-out fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl p-6 shadow-lg focus:outline-hidden">
          <div className="flex items-start gap-3">
            <Icon className={cn("size-6 flex-shrink-0", iconClass)} />
            <div className="flex-1">
              <DialogPrimitive.Title className="text-foreground text-lg font-semibold">
                {title}
              </DialogPrimitive.Title>
              {description ? (
                <DialogPrimitive.Description className="text-muted-foreground mt-1 text-sm">
                  {description}
                </DialogPrimitive.Description>
              ) : null}
            </div>
          </div>

          {details ? (
            <div className="mt-4">
              <span className="text-foreground mb-2 block text-sm font-medium">
                Chi tiết
              </span>
              <ScrollArea className="max-h-48 rounded-md border border-border/60 bg-muted/30 p-3 text-sm text-muted-foreground">
                <pre className="whitespace-pre-wrap break-words">{details}</pre>
              </ScrollArea>
            </div>
          ) : null}

          <div className="mt-6 flex justify-end">
            <Button onClick={() => onOpenChange(false)}>Đóng</Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

