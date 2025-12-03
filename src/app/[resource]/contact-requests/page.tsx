import type { Metadata } from "next";
import { AdminHeader } from "@/components/layouts/headers";
import { PERMISSIONS, canPerformAction } from "@/lib/permissions";
import { getAuthInfo } from "@/features/admin/resources/server";
import { ContactRequestsTable } from "@/features/admin/contact-requests/components/contact-requests-table";
import { TablePageSuspense } from "@/features/admin/resources/components";
import { createListBreadcrumbs } from "@/features/admin/resources/utils";

/**
 * Contact Requests Page Metadata
 *
 * Theo Next.js 16 best practices:
 * - Metadata được merge với admin layout và root layout
 * - Title sử dụng template từ root: "Yêu cầu liên hệ | CMS"
 */
export const metadata: Metadata = {
  title: "Yêu cầu liên hệ",
  description: "Quản lý yêu cầu liên hệ",
};

/**
 * Contact Requests Page với Suspense cho streaming
 *
 * Theo Next.js 16 best practices:
 * - Header render ngay, table content stream khi ready
 * - ContactRequestsTable component sử dụng Promise.all để fetch contactRequestsData và usersOptions song song
 */
async function ContactRequestsTableContent() {
  const { permissions, roles } = await getAuthInfo();

  // Check permissions cho UI actions (không phải page access)
  const canDelete = canPerformAction(
    permissions,
    roles,
    PERMISSIONS.CONTACT_REQUESTS_MANAGE
  );
  const canRestore = canPerformAction(
    permissions,
    roles,
    PERMISSIONS.CONTACT_REQUESTS_MANAGE
  );
  const canManage = canPerformAction(
    permissions,
    roles,
    PERMISSIONS.CONTACT_REQUESTS_MANAGE
  );
  const canUpdate = canPerformAction(
    permissions,
    roles,
    PERMISSIONS.CONTACT_REQUESTS_UPDATE
  );
  const canAssign = canPerformAction(
    permissions,
    roles,
    PERMISSIONS.CONTACT_REQUESTS_ASSIGN
  );

  return (
    <ContactRequestsTable
      canDelete={canDelete}
      canRestore={canRestore}
      canManage={canManage}
      canUpdate={canUpdate}
      canAssign={canAssign}
    />
  );
}

export default async function ContactRequestsPage() {
  return (
    <>
      <AdminHeader
        breadcrumbs={createListBreadcrumbs({ listLabel: "Yêu cầu liên hệ" })}
      />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <TablePageSuspense columnCount={6} rowCount={10}>
          <ContactRequestsTableContent />
        </TablePageSuspense>
      </div>
    </>
  );
}
