import { listStudents } from "../server/queries"
import { serializeStudentsList } from "../server/helpers"
import { StudentsTableClient } from "./students-table.client"

export interface StudentsTableProps {
  canDelete?: boolean
  canRestore?: boolean
  canManage?: boolean
  canCreate?: boolean
  actorId?: string
  isSuperAdmin?: boolean
}

export async function StudentsTable({ 
  canDelete, 
  canRestore, 
  canManage, 
  canCreate,
  actorId,
  isSuperAdmin: isSuperAdminUser = false,
}: StudentsTableProps) {
  // Theo chuẩn Next.js 16: không cache admin data
  const studentsData = await listStudents({
    page: 1,
    limit: 10,
    status: "active",
    actorId,
    isSuperAdmin: isSuperAdminUser,
  })

  return (
    <StudentsTableClient
      canDelete={canDelete}
      canRestore={canRestore}
      canManage={canManage}
      canCreate={canCreate}
      initialData={serializeStudentsList(studentsData)}
    />
  )
}

