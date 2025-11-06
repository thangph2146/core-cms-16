"use client"

import { useState } from "react"
import { Shield, FileText, Calendar, Clock, CheckCircle2, XCircle, Edit, ChevronsUpDown, Check } from "lucide-react"
import { ResourceDetailPage, type ResourceDetailField, type ResourceDetailSection } from "@/features/admin/resources/components"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { formatDateVi } from "../utils"
import { getAllPermissionsOptionGroups } from "../form-fields"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { cn } from "@/lib/utils"

export interface RoleDetailData {
  id: string
  name: string
  displayName: string
  description: string | null
  permissions: string[]
  isActive: boolean
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  [key: string]: unknown
}

export interface RoleDetailClientProps {
  roleId: string
  role: RoleDetailData
  backUrl?: string
}

export function RoleDetailClient({ roleId, role, backUrl = "/admin/roles" }: RoleDetailClientProps) {
  const router = useRouter()
  const [permissionsOpen, setPermissionsOpen] = useState(false)

  // Get grouped permissions
  const permissionsGroups = getAllPermissionsOptionGroups()
  
  // Get all options from groups
  const allPermissionsOptions = permissionsGroups.flatMap((group) => group.options)

  const detailFields: ResourceDetailField<RoleDetailData>[] = [
    {
      name: "name",
      label: "Tên vai trò",
      type: "custom",
      section: "basic",
      render: (value) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div className="font-medium">{String(value || "—")}</div>
        </div>
      ),
    },
    {
      name: "displayName",
      label: "Tên hiển thị",
      type: "custom",
      section: "basic",
      render: (value) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-1/10">
            <FileText className="h-5 w-5 text-chart-1" />
          </div>
          <div className="font-medium">{String(value || "—")}</div>
        </div>
      ),
    },
    {
      name: "description",
      label: "Mô tả",
      type: "custom",
      section: "basic",
      render: (value) => (
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-2/10">
            <FileText className="h-5 w-5 text-chart-2" />
          </div>
          <div className="flex-1">
            <div className="text-sm text-muted-foreground">{String(value || "—")}</div>
          </div>
        </div>
      ),
    },
    {
      name: "permissions",
      label: "Quyền",
      type: "custom",
      section: "permissions",
      render: (value) => {
        if (!value || !Array.isArray(value) || value.length === 0) {
          return <span className="text-muted-foreground">—</span>
        }

        const selectedValues = value.map((v) => String(v))
        
        // Get selected permissions with labels
        const selectedPermissions = value
          .map((perm) => {
            const option = allPermissionsOptions.find((opt) => opt.value === perm)
            return option ? { value: perm, label: option.label } : null
          })
          .filter((p): p is { value: string; label: string } => p !== null)

        const displayText = selectedPermissions.length > 0
          ? `${selectedPermissions.length} quyền đã chọn`
          : `${value.length} quyền đã chọn`

        return (
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-2/10">
              <Shield className="h-5 w-5 text-chart-2" />
            </div>
            <div className="flex-1 space-y-2">
              <Popover open={permissionsOpen} onOpenChange={setPermissionsOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={permissionsOpen}
                    className="w-full justify-between"
                  >
                    <span className="truncate">{displayText}</span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Tìm kiếm quyền..." className="h-9" />
                    <CommandList>
                      <CommandEmpty>Không tìm thấy quyền.</CommandEmpty>
                      {permissionsGroups.map((group) => {
                        const groupSelectedCount = group.options.filter((opt) =>
                          selectedValues.includes(String(opt.value))
                        ).length
                        
                        if (groupSelectedCount === 0) return null

                        return (
                          <CommandGroup key={group.label} heading={group.label}>
                            {group.options.map((option) => {
                              const isSelected = selectedValues.includes(String(option.value))
                              if (!isSelected) return null
                              
                              return (
                                <CommandItem
                                  key={option.value}
                                  value={String(option.value)}
                                  disabled
                                  className="cursor-default"
                                >
                                  <Check className={cn("mr-2 h-4 w-4", "opacity-100")} />
                                  {option.label}
                                </CommandItem>
                              )
                            })}
                          </CommandGroup>
                        )
                      })}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <div className="flex flex-wrap gap-2">
                {selectedPermissions.slice(0, 5).map((perm) => (
                  <Badge key={perm.value} variant="outline" className="text-xs">
                    {perm.label}
                  </Badge>
                ))}
                {selectedPermissions.length > 5 && (
                  <Badge variant="outline" className="text-xs">
                    +{selectedPermissions.length - 5} quyền khác
                  </Badge>
                )}
              </div>
            </div>
          </div>
        )
      },
    },
    {
      name: "isActive",
      label: "Trạng thái",
      type: "custom",
      section: "status",
      render: (value) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-3/10">
            {value ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500" />
            )}
          </div>
          <div>
            <div className="font-medium">{value ? "Hoạt động" : "Tạm khóa"}</div>
          </div>
        </div>
      ),
    },
    {
      name: "createdAt",
      label: "Ngày tạo",
      type: "custom",
      section: "status",
      render: (value) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-4/10">
            <Calendar className="h-5 w-5 text-chart-4" />
          </div>
          <div>
            <div className="font-medium">{value ? formatDateVi(String(value)) : "—"}</div>
          </div>
        </div>
      ),
    },
    {
      name: "updatedAt",
      label: "Cập nhật lần cuối",
      type: "custom",
      section: "status",
      render: (value) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-5/10">
            <Clock className="h-5 w-5 text-chart-5" />
          </div>
          <div>
            <div className="font-medium">{value ? formatDateVi(String(value)) : "—"}</div>
          </div>
        </div>
      ),
    },
  ]

  // Sections cho detail view - tách fields thành các sections
  const detailSections: ResourceDetailSection<RoleDetailData>[] = [
    {
      id: "basic",
      title: "Thông tin cơ bản",
      description: "Thông tin chính về vai trò",
    },
    {
      id: "permissions",
      title: "Quyền truy cập",
      description: "Danh sách quyền được gán cho vai trò",
    },
    {
      id: "status",
      title: "Trạng thái và thời gian",
      description: "Trạng thái hoạt động và thông tin thời gian",
    },
  ]

  return (
    <ResourceDetailPage<RoleDetailData>
      data={role}
      fields={detailFields}
      detailSections={detailSections}
      title={role.displayName}
      description={`Chi tiết vai trò ${role.name}`}
      backUrl={backUrl}
      backLabel="Quay lại danh sách"
      actions={
        <Button
          variant="outline"
          onClick={() => router.push(`/admin/roles/${roleId}/edit`)}
          className="gap-2"
        >
          <Edit className="h-4 w-4" />
          Chỉnh sửa
        </Button>
      }
    />
  )
}

