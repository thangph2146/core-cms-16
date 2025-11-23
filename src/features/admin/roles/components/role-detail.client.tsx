"use client"

import * as React from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Shield, FileText, Calendar, Clock, CheckCircle2, XCircle, Edit, ChevronsUpDown, Check } from "lucide-react"
import { 
  ResourceDetailPage, 
  FieldItem,
  type ResourceDetailField, 
  type ResourceDetailSection 
} from "@/features/admin/resources/components"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { useResourceNavigation, useResourceDetailData } from "@/features/admin/resources/hooks"
import { queryKeys } from "@/lib/query-keys"
import { formatDateVi } from "../utils"
import { getAllPermissionsOptionGroups } from "../form-fields"
import { resourceLogger } from "@/lib/config"
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
  const queryClient = useQueryClient()
  const { navigateBack, router } = useResourceNavigation({
    queryClient,
    invalidateQueryKey: queryKeys.adminRoles.all(),
  })
  const [permissionsOpen, setPermissionsOpen] = React.useState(false)

  // useRef để track logged state (tránh duplicate logs trong React Strict Mode)
  const loggedDataKeyRef = React.useRef<string | null>(null)

  // Ưu tiên sử dụng React Query cache nếu có (dữ liệu mới nhất sau khi edit), fallback về props
  // Chỉ log sau khi fetch từ API xong để đảm bảo data mới nhất
  const { data: detailData, isFetched, isFromApi, fetchedData } = useResourceDetailData({
    initialData: role,
    resourceId: roleId,
    detailQueryKey: queryKeys.adminRoles.detail,
    resourceName: "roles",
    fetchOnMount: true, // Luôn fetch khi mount để đảm bảo data fresh
  })

  // Log detail load một lần cho mỗi unique data state (chỉ log sau khi fetch từ API xong)
  // Sử dụng fetchedData (data từ API) thay vì detailData để đảm bảo log data mới nhất
  React.useEffect(() => {
    // Chỉ log khi đã fetch xong, data từ API (isFromApi = true), và có fetchedData
    if (!isFetched || !isFromApi || !fetchedData) return
    
    // Tạo unique key từ data để đảm bảo chỉ log khi data thực sự thay đổi
    const dataKey = `${roleId}-${fetchedData.updatedAt || fetchedData.createdAt || ""}`
    
    // Nếu đã log cho data key này rồi, skip
    if (loggedDataKeyRef.current === dataKey) return
    
    // Mark as logged
    loggedDataKeyRef.current = dataKey
    
    resourceLogger.detailAction({
      resource: "roles",
      action: "load-detail",
      resourceId: roleId,
      recordData: fetchedData as Record<string, unknown>,
    })

    resourceLogger.dataStructure({
      resource: "roles",
      dataType: "detail",
      structure: {
        fields: fetchedData as Record<string, unknown>,
      },
    })
  }, [roleId, isFetched, isFromApi, fetchedData?.id, fetchedData?.updatedAt, fetchedData?.createdAt])

  // Get grouped permissions
  const permissionsGroups = getAllPermissionsOptionGroups()
  
  // Get all options from groups
  const allPermissionsOptions = permissionsGroups.flatMap((group) => group.options)
  

  const detailFields: ResourceDetailField<RoleDetailData>[] = []

  // Sections cho detail view - tách fields thành các sections
  const detailSections: ResourceDetailSection<RoleDetailData>[] = [
    {
      id: "basic",
      title: "Thông tin cơ bản",
      description: "Thông tin chính về vai trò",
              fieldsContent: (_fields, data) => {
                const roleData = (data || detailData) as RoleDetailData
        
        return (
          <div className="space-y-6">
            {/* Name & Display Name */}
            <div className="grid gap-4 sm:grid-cols-2">
              <FieldItem icon={Shield} label="Tên vai trò">
                <div className="text-sm font-medium text-foreground">
                  {roleData.name || "—"}
                </div>
              </FieldItem>

              <FieldItem icon={FileText} label="Tên hiển thị">
                <div className="text-sm font-medium text-foreground">
                  {roleData.displayName || "—"}
                </div>
              </FieldItem>
            </div>

            {/* Description */}
            {roleData.description && (
              <>
                <Separator />
                <Card className="border border-border/50 bg-card p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-foreground mb-2">Mô tả</h3>
                      <div className="text-sm leading-relaxed whitespace-pre-wrap text-foreground break-words">
                        {roleData.description || "—"}
                      </div>
                    </div>
                  </div>
                </Card>
              </>
            )}
          </div>
        )
      },
    },
    {
      id: "permissions",
      title: "Quyền truy cập",
      description: "Danh sách quyền được gán cho vai trò",
              fieldsContent: (_fields, data) => {
                const roleData = (data || detailData) as RoleDetailData
        
        if (!roleData.permissions || !Array.isArray(roleData.permissions) || roleData.permissions.length === 0) {
          return (
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Shield className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-muted-foreground mb-1.5">Quyền</div>
                <div className="text-sm text-muted-foreground">—</div>
              </div>
            </div>
          )
        }

        const selectedValues = roleData.permissions.map((v) => String(v))
        
        // Get selected permissions with labels
        const selectedPermissions = roleData.permissions
          .map((perm) => {
            const option = allPermissionsOptions.find((opt) => opt.value === perm)
            return option ? { value: perm, label: option.label } : null
          })
          .filter((p): p is { value: string; label: string } => p !== null)

        const displayText = selectedPermissions.length > 0
          ? `${selectedPermissions.length} quyền đã chọn`
          : `${roleData.permissions.length} quyền đã chọn`

        return (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Shield className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0 space-y-3">
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-1.5">Quyền</div>
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
                          {permissionsGroups.map((group, groupIndex) => {
                            const groupSelectedCount = group.options.filter((opt) =>
                              selectedValues.includes(String(opt.value))
                            ).length
                            
                            if (groupSelectedCount === 0) return null

                            return (
                              <CommandGroup key={`${groupIndex}-${group.label}`} heading={group.label}>
                                {group.options.map((option, optionIndex) => {
                                  const isSelected = selectedValues.includes(String(option.value))
                                  if (!isSelected) return null
                                  
                                  return (
                                    <CommandItem
                                      key={`${groupIndex}-${optionIndex}-${option.value}`}
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
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedPermissions.slice(0, 5).map((perm) => (
                    <Badge key={perm.value} variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                      {perm.label}
                    </Badge>
                  ))}
                  {selectedPermissions.length > 5 && (
                    <Badge variant="outline" className="text-xs bg-muted text-muted-foreground">
                      +{selectedPermissions.length - 5} quyền khác
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      },
    },
    {
      id: "status",
      title: "Trạng thái và thời gian",
      description: "Trạng thái hoạt động và thông tin thời gian",
              fieldsContent: (_fields, data) => {
                const roleData = (data || detailData) as RoleDetailData
        
        return (
          <div className="space-y-6">
            {/* Status */}
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                {roleData.isActive ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-muted-foreground mb-1.5">Trạng thái</div>
                <Badge
                  className={cn(
                    "text-sm font-medium px-2.5 py-1",
                    roleData.isActive
                      ? "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20"
                      : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
                  )}
                  variant={roleData.isActive ? "default" : "secondary"}
                >
                  {roleData.isActive ? (
                    <>
                      <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                      Hoạt động
                    </>
                  ) : (
                    <>
                      <XCircle className="mr-1.5 h-3.5 w-3.5" />
                      Tạm khóa
                    </>
                  )}
                </Badge>
              </div>
            </div>

            <Separator />

            {/* Timestamps */}
            <div className="grid gap-4 sm:grid-cols-2">
              <FieldItem icon={Calendar} label="Ngày tạo">
                <div className="text-sm font-medium text-foreground">
                  {roleData.createdAt ? formatDateVi(roleData.createdAt) : "—"}
                </div>
              </FieldItem>

              <FieldItem icon={Clock} label="Cập nhật lần cuối">
                <div className="text-sm font-medium text-foreground">
                  {roleData.updatedAt ? formatDateVi(roleData.updatedAt) : "—"}
                </div>
              </FieldItem>
            </div>
          </div>
        )
      },
    },
  ]

  return (
    <ResourceDetailPage<RoleDetailData>
      fields={detailFields}
      detailSections={detailSections}
      title={detailData.displayName}
      description={`Chi tiết vai trò ${detailData.name}`}
      backUrl={backUrl}
      backLabel="Quay lại danh sách"
      onBack={() => navigateBack(backUrl)}
      data={detailData}
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

