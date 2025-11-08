import type { Metadata } from "next"
import { AdminHeader } from "@/components/headers"
import { DashboardStats } from "@/features/admin/dashboard/dashboard-stats"

/**
 * Dashboard Stats Page Metadata
 * 
 * Theo Next.js 16 best practices:
 * - Metadata được merge với admin layout và root layout
 * - Title sử dụng template từ root: "Thống kê | CMS"
 */
export const metadata: Metadata = {
  title: "Thống kê",
  description: "Thống kê và phân tích dữ liệu hệ thống",
}

export default function Page() {
  return (
    <>
      <AdminHeader
        breadcrumbs={[
          {
            label: "Dashboard",
            href: "/admin/dashboard",
          },
          {
            label: "Thống kê",
            isActive: true,
          },
        ]}
      />
      <DashboardStats />
    </>
  )
}

