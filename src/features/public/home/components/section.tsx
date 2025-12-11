import { cn } from "@/lib/utils";
import { ReactNode } from "react";

export interface SectionProps {
  children: ReactNode;
  className?: string;
  padding?: string;
  background?: string;
  containerClassName?: string;
}

export function Section({
  children,
  className,
  padding = "py-6",
  background = "bg-card",
  containerClassName,
}: SectionProps) {
  return (
    <section className={cn(padding, background, className)}>
      <div
        className={cn(
          "container mx-auto px-4 sm:px-6 lg:px-8",
          containerClassName
        )}
      >
        {children}
      </div>
    </section>
  );
}

