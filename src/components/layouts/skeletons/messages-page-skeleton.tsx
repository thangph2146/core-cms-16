import { Skeleton } from "@/components/ui/skeleton"

/**
 * MessagesPageSkeleton
 *
 * Skeleton loading state cho trang admin/messages
 * Hiển thị 2 panel (contact list + chat window) để tránh layout shift
 */
export function MessagesPageSkeleton() {
  const isBrowser = typeof window !== "undefined"
  const viewportHeight = isBrowser ? window.innerHeight : undefined
  const skeletonHeight = viewportHeight ? `calc(${viewportHeight}px - 0px)` : "100dvh"

  return (
    <div
      className="flex w-full overflow-hidden border bg-card"
      style={{
        height: skeletonHeight,
        minHeight: "480px",
      }}
    >
      {/* Contact list */}
      <div className="hidden w-full max-w-xs flex-col border-r p-4 sm:flex">
        <div className="mb-4 flex items-center justify-between gap-2">
          <Skeleton className="h-6 w-20" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-3">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={`contact-skeleton-${index}`} className="flex items-center gap-3 rounded-lg border px-3 py-2">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex flex-1 flex-col gap-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-3 w-8" />
            </div>
          ))}
        </div>
      </div>

      {/* Chat window */}
      <div className="flex flex-1 flex-col">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex flex-col gap-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-9 w-9 rounded-full" />
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-3 overflow-hidden p-4">
          <div className="flex flex-col gap-4 overflow-y-hidden">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={`message-skeleton-${index}`}
                className={`flex ${index % 2 === 0 ? "justify-start" : "justify-end"}`}
              >
                <Skeleton
                  className={`h-16 w-[65%] rounded-2xl ${index % 2 === 0 ? "rounded-tl-none" : "rounded-tr-none"}`}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 border-t px-4 py-3">
          <Skeleton className="h-12 flex-1 rounded-2xl" />
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>
      </div>
    </div>
  )
}
