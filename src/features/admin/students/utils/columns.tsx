/**
 * Column definitions cho students table
 */

import { useMemo } from "react"
import { Switch } from "@/components/ui/switch"
import type { DataTableColumn } from "@/components/tables"
import { useDynamicFilterOptions } from "@/features/admin/resources/hooks/use-dynamic-filter-options"
import { apiRoutes } from "@/lib/api/routes"
import type { StudentRow } from "../types"
import { STUDENT_LABELS } from "../constants"

interface UseStudentColumnsOptions {
  togglingStudents: Set<string>
  canManage: boolean
  onToggleStatus: (row: StudentRow, checked: boolean) => void
}

export function useStudentColumns({ togglingStudents, canManage, onToggleStatus }: UseStudentColumnsOptions) {
  const studentCodeFilter = useDynamicFilterOptions({
    optionsEndpoint: apiRoutes.students.options({ column: "studentCode" }),
  })

  const nameFilter = useDynamicFilterOptions({
    optionsEndpoint: apiRoutes.students.options({ column: "name" }),
  })

  const emailFilter = useDynamicFilterOptions({
    optionsEndpoint: apiRoutes.students.options({ column: "email" }),
  })

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("vi-VN", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [],
  )

  const baseColumns = useMemo<DataTableColumn<StudentRow>[]>(
    () => [
      {
        accessorKey: "studentCode",
        header: STUDENT_LABELS.STUDENT_CODE,
        filter: {
          type: "select",
          placeholder: "Chọn mã học sinh...",
          searchPlaceholder: "Tìm kiếm...",
          emptyMessage: "Không tìm thấy.",
          options: studentCodeFilter.options,
          onSearchChange: studentCodeFilter.onSearchChange,
          isLoading: studentCodeFilter.isLoading,
        },
        className: "min-w-[150px] max-w-[200px]",
        headerClassName: "min-w-[150px] max-w-[200px]",
      },
      {
        accessorKey: "name",
        header: STUDENT_LABELS.STUDENT_NAME,
        filter: {
          type: "select",
          placeholder: "Chọn tên học sinh...",
          searchPlaceholder: "Tìm kiếm...",
          emptyMessage: "Không tìm thấy.",
          options: nameFilter.options,
          onSearchChange: nameFilter.onSearchChange,
          isLoading: nameFilter.isLoading,
        },
        className: "min-w-[150px] max-w-[250px]",
        headerClassName: "min-w-[150px] max-w-[250px]",
        cell: (row) => row.name ?? <span className="text-muted-foreground">-</span>,
      },
      {
        accessorKey: "email",
        header: STUDENT_LABELS.EMAIL,
        filter: {
          type: "select",
          placeholder: "Chọn email...",
          searchPlaceholder: "Tìm kiếm...",
          emptyMessage: "Không tìm thấy.",
          options: emailFilter.options,
          onSearchChange: emailFilter.onSearchChange,
          isLoading: emailFilter.isLoading,
        },
        className: "min-w-[180px] max-w-[250px]",
        headerClassName: "min-w-[180px] max-w-[250px]",
        cell: (row) => row.email ?? <span className="text-muted-foreground">-</span>,
      },
      {
        accessorKey: "isActive",
        header: STUDENT_LABELS.STATUS,
        filter: {
          type: "select",
          placeholder: "Chọn trạng thái...",
          searchPlaceholder: "Tìm kiếm...",
          emptyMessage: "Không tìm thấy.",
          options: [
            { label: STUDENT_LABELS.ACTIVE, value: "true" },
            { label: STUDENT_LABELS.INACTIVE, value: "false" },
          ],
        },
        className: "w-[120px]",
        headerClassName: "w-[120px]",
        cell: (row) =>
          row.deletedAt ? (
            <span className="inline-flex min-w-[88px] items-center justify-center rounded-full bg-rose-100 px-2 py-1 text-xs font-medium text-rose-700">
              {STUDENT_LABELS.DELETED}
            </span>
          ) : (
            <div className="flex items-center gap-2">
              <Switch
                checked={row.isActive}
                disabled={togglingStudents.has(row.id) || !canManage}
                onCheckedChange={(checked) => onToggleStatus(row, checked)}
                aria-label={row.isActive ? "Vô hiệu hóa học sinh" : "Kích hoạt học sinh"}
              />
              <span className="text-xs text-muted-foreground">
                {row.isActive ? STUDENT_LABELS.ACTIVE : STUDENT_LABELS.INACTIVE}
              </span>
            </div>
          ),
      },
      {
        accessorKey: "createdAt",
        header: STUDENT_LABELS.CREATED_AT,
        filter: {
          type: "date",
          placeholder: "Chọn ngày tạo",
          dateFormat: "dd/MM/yyyy",
        },
        className: "min-w-[140px] max-w-[180px]",
        headerClassName: "min-w-[140px] max-w-[180px]",
        cell: (row) => {
          try {
            return dateFormatter.format(new Date(row.createdAt))
          } catch {
            return row.createdAt
          }
        },
      },
    ],
    [
      dateFormatter,
      studentCodeFilter.options,
      studentCodeFilter.onSearchChange,
      studentCodeFilter.isLoading,
      nameFilter.options,
      nameFilter.onSearchChange,
      nameFilter.isLoading,
      emailFilter.options,
      emailFilter.onSearchChange,
      emailFilter.isLoading,
      togglingStudents,
      canManage,
      onToggleStatus,
    ],
  )

  const deletedColumns = useMemo<DataTableColumn<StudentRow>[]>(
    () => [
      ...baseColumns,
      {
        accessorKey: "deletedAt",
        header: STUDENT_LABELS.DELETED_AT,
        filter: {
          type: "date",
          placeholder: "Chọn ngày xóa",
          dateFormat: "dd/MM/yyyy",
        },
        className: "min-w-[140px] max-w-[180px]",
        headerClassName: "min-w-[140px] max-w-[180px]",
        cell: (row) => {
          if (!row.deletedAt) return "-"
          try {
            return dateFormatter.format(new Date(row.deletedAt))
          } catch {
            return row.deletedAt
          }
        },
      },
    ],
    [baseColumns, dateFormatter],
  )

  return {
    baseColumns,
    deletedColumns,
  }
}

