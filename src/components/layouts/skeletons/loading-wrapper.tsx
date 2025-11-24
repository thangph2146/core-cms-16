/**
 * LoadingWrapper Component
 * 
 * Helper component để tạo loading page nhất quán cho admin pages
 * Giảm code lặp lại và đảm bảo structure nhất quán
 */

import { AdminHeader, type AdminBreadcrumbItem } from "@/components/layouts/headers"

interface LoadingWrapperProps {
  breadcrumbs: AdminBreadcrumbItem[]
  children: React.ReactNode
  className?: string
}

export function LoadingWrapper({ breadcrumbs, children, className }: LoadingWrapperProps) {
  return (
    <>
      <AdminHeader breadcrumbs={breadcrumbs} />
      <div className={`flex flex-1 flex-col gap-4 p-4 ${className || ""}`}>
        {children}
      </div>
    </>
  )
}

