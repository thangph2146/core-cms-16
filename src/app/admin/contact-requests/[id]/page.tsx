import { AdminHeader } from "@/components/headers"
import { ContactRequestDetail } from "@/features/admin/contact-requests/components/contact-request-detail"
import { PERMISSIONS, canPerformAction } from "@/lib/permissions"
import { getPermissions, getSession } from "@/lib/auth/auth-server"

interface ContactRequestDetailPageProps {
  params: {
    id: string
  }
}

export default async function ContactRequestDetailPage({ params }: ContactRequestDetailPageProps) {
  const session = await getSession()
  const permissions = await getPermissions()
  const roles = session?.roles ?? []

  const canView = canPerformAction(permissions, roles, PERMISSIONS.CONTACT_REQUESTS_VIEW)

  if (!canView) {
    // This should ideally be handled by a higher-level PermissionGate
    // but as a fallback, return a simple message.
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4 md:p-6 lg:p-8">
        <div className="text-center">
          <p className="text-muted-foreground">Bạn không có quyền xem chi tiết yêu cầu liên hệ này.</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <AdminHeader
        breadcrumbs={[
          { label: "Yêu cầu liên hệ", href: "/admin/contact-requests" },
          { label: "Chi tiết", isActive: true },
        ]}
      />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <ContactRequestDetail contactRequestId={params.id} />
      </div>
    </>
  )
}

