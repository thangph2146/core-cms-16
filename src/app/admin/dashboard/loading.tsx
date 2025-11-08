import { AdminHeader } from "@/components/headers"
import { ResourceDetailSkeleton } from "@/components/skeletons"

/**
 * Dashboard Page Loading
 * 
 * Theo Next.js 16 best practices:
 * - Loading UI hiển thị ngay khi route đang load
 * - Sử dụng skeleton phù hợp với dashboard layout
 * - Giữ header structure giống page thật
 */
export default function DashboardPageLoading() {
  return (
    <>
      <AdminHeader
        breadcrumbs={[
          { label: "Dashboard", isActive: true },
        ]}
      />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <ResourceDetailSkeleton 
          showHeader={false} 
          fieldCount={8} 
          sectionCount={2} 
        />
      </div>
    </>
  )
}

