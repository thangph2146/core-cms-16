import { JSX } from "react"
import { ContentEditable as LexicalContentEditable } from "@lexical/react/LexicalContentEditable"
import { cn } from "@/lib/utils"

type Props = {
  placeholder: string
  className?: string
  placeholderClassName?: string
  readOnly?: boolean
}

export function ContentEditable({
  placeholder,
  className,
  placeholderClassName,
  readOnly = false,
}: Props): JSX.Element {
  return (
    <LexicalContentEditable
      className={cn("ContentEditable__root relative block min-h-72 min-h-full overflow-auto px-8 py-4 focus:outline-none", className, readOnly && "px-0 py-0")}
      aria-placeholder={placeholder}
      placeholder={
        <div
          className={cn(placeholderClassName, `text-muted-foreground pointer-events-none absolute top-0 left-0 overflow-hidden px-8 py-[18px] text-ellipsis select-none`)}
        >
          {placeholder}
        </div>
      }
    />
  )
}
