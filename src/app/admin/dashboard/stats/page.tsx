import { AdminHeader } from "@/components/headers"
import { DashboardStats } from "@/features/admin/dashboard/dashboard-stats"

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

