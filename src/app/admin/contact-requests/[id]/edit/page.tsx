import { AdminHeader } from "@/components/headers"
import { ContactRequestEdit } from "@/features/admin/contact-requests/components/contact-request-edit"
import { PERMISSIONS, canPerformAction } from "@/lib/permissions"
import { getPermissions, getSession } from "@/lib/auth/auth-server"

interface ContactRequestEditPageProps {
  params: {
    id: string
  }
}

export default async function ContactRequestEditPage({ params }: ContactRequestEditPageProps) {
  const session = await getSession()
  const permissions = await getPermissions()
  const roles = session?.roles ?? []

  const canUpdate = canPerformAction(permissions, roles, PERMISSIONS.CONTACT_REQUESTS_UPDATE)

  if (!canUpdate) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4 md:p-6 lg:p-8">
        <div className="text-center">
          <p className="text-muted-foreground">Bạn không có quyền chỉnh sửa yêu cầu liên hệ này.</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <AdminHeader
        breadcrumbs={[
          { label: "Yêu cầu liên hệ", href: "/admin/contact-requests" },
          { label: "Chỉnh sửa", isActive: true },
        ]}
      />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <ContactRequestEdit contactRequestId={params.id} variant="page" />
      </div>
    </>
  )
}

