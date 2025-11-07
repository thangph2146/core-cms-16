import { AdminHeader } from "@/components/headers"
import { SessionCreate } from "@/features/admin/sessions/components/session-create"

export default function SessionCreatePage() {
  return (
    <>
      <AdminHeader
        breadcrumbs={[
          { label: "Session", href: "/admin/sessions" },
          { label: "Tạo mới", isActive: true },
        ]}
      />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <SessionCreate backUrl="/admin/sessions" />
      </div>
    </>
  )
}

