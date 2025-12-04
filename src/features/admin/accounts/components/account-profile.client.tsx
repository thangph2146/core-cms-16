"use client"

import * as React from "react"
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Clock, 
  Shield,
  FileText,
  Edit,
  CheckCircle2
} from "lucide-react"
import { 
  ResourceDetailClient, 
  FieldItem,
  type ResourceDetailField, 
  type ResourceDetailSection 
} from "@/features/admin/resources/components"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { useResourceRouter } from "@/hooks/use-resource-segment"
import { formatDateVi } from "@/features/admin/resources/utils"
import { getUserInitials } from "@/features/admin/accounts/utils"
import { AccountEditClient } from "./account-edit.client"
import type { AccountProfile } from "../types"
import { useResourceDetailLogger } from "@/features/admin/resources/hooks"
import { usePermissions } from "@/hooks/use-permissions"
import { PERMISSIONS } from "@/lib/permissions"

export interface AccountProfileClientProps {
  account: AccountProfile
  variant?: "page" | "dialog" | "sheet"
}

export function AccountProfileClient({
  account,
  variant = "page",
}: AccountProfileClientProps) {
  const router = useResourceRouter()
  const [isEditing, setIsEditing] = React.useState(false)
  const { hasPermission } = usePermissions()
  
  // Check permission for edit (user can always edit their own profile)
  const canUpdate = hasPermission(PERMISSIONS.ACCOUNTS_UPDATE)

  useResourceDetailLogger({
    resourceName: "accounts",
    resourceId: account.id,
    data: account,
    isFetched: true,
    isFromApi: false,
    fetchedData: account,
  })

  if (isEditing) {
    return (
      <AccountEditClient
        account={account}
        variant={variant}
        open={true}
        onOpenChange={(open) => {
          if (!open) {
            setIsEditing(false)
          }
        }}
        onSuccess={() => {
          setIsEditing(false)
          router.refresh()
        }}
        onCancel={() => {
          setIsEditing(false)
        }}
      />
    )
  }

  const detailFields: ResourceDetailField<AccountProfile>[] = []

  const detailSections: ResourceDetailSection<AccountProfile>[] = [
    {
      id: "basic",
      title: "Thông tin cơ bản",
      description: "Thông tin đăng nhập và cá nhân",
      fieldHeader: (
        <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg border border-border/50">
          <div className="relative">
            <Avatar className="h-24 w-24 border-2 border-border">
              <AvatarImage 
                src={account.avatar || undefined} 
                alt={account.name || account.email}
                referrerPolicy="no-referrer"
                crossOrigin="anonymous"
              />
              <AvatarFallback className="text-lg font-bold bg-gradient-to-br from-primary to-chart-1 text-primary-foreground">
                {getUserInitials(account.name, account.email)}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-green-500 border-2 border-background flex items-center justify-center">
              <CheckCircle2 className="h-3.5 w-3.5 text-white" />
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold">{account.name || "Chưa có tên"}</h3>
            <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
              <Mail className="h-4 w-4" />
              {account.email}
            </p>
            {account.roles && account.roles.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {account.roles.map((role) => (
                  <Badge
                    key={role.id}
                    variant="secondary"
                    className="text-xs"
                  >
                    <Shield className="mr-1 h-3 w-3" />
                    {role.displayName || role.name}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      ),
      fieldsContent: (_fields, data) => {
        const accountData = data as AccountProfile
        
        return (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <FieldItem icon={User} label="Tên">
                <div className="text-sm font-medium text-foreground">
                  {accountData.name || "—"}
                </div>
              </FieldItem>

              <FieldItem icon={Phone} label="Số điện thoại">
                <div className="text-sm font-medium text-foreground">
                  {accountData.phone || "—"}
                </div>
              </FieldItem>
            </div>

            {accountData.bio && (
              <>
                <Separator />
                <Card className="border border-border/50 bg-card p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-foreground mb-2">Giới thiệu</h3>
                      <div className="text-sm leading-relaxed whitespace-pre-wrap text-foreground break-words">
                        {accountData.bio}
                      </div>
                    </div>
                  </div>
                </Card>
              </>
            )}

            {accountData.address && (
              <>
                <Separator />
                <FieldItem icon={MapPin} label="Địa chỉ">
                  <div className="text-sm font-medium text-foreground">
                    {accountData.address}
                  </div>
                </FieldItem>
              </>
            )}
          </div>
        )
      },
    },
    {
      id: "security",
      title: "Bảo mật",
      description: "Thông tin bảo mật và xác thực",
      fieldsContent: (_fields, data) => {
        const accountData = data as AccountProfile
        
        return (
          <div className="space-y-6">
            <FieldItem icon={Mail} label="Email">
              <div className="space-y-0.5">
                <div className="text-sm font-medium text-foreground">
                  {accountData.email}
                </div>
                {accountData.emailVerified && (
                  <Badge
                    className="bg-green-500/10 hover:bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/20 text-xs"
                    variant="default"
                  >
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    Đã xác thực
                  </Badge>
                )}
              </div>
            </FieldItem>

            {accountData.emailVerified && (
              <>
                <Separator />
                <FieldItem icon={Clock} label="Ngày xác thực email">
                  <div className="text-sm font-medium text-foreground">
                    {formatDateVi(accountData.emailVerified)}
                  </div>
                </FieldItem>
              </>
            )}
          </div>
        )
      },
    },
    {
      id: "timestamps",
      title: "Thông tin thời gian",
      description: "Ngày tạo và cập nhật tài khoản",
      fieldsContent: (_fields, data) => {
        const accountData = data as AccountProfile
        
        return (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <FieldItem icon={Calendar} label="Ngày tạo">
                <div className="text-sm font-medium text-foreground">
                  {accountData.createdAt ? formatDateVi(accountData.createdAt) : "—"}
                </div>
              </FieldItem>

              <FieldItem icon={Clock} label="Cập nhật lần cuối">
                <div className="text-sm font-medium text-foreground">
                  {accountData.updatedAt ? formatDateVi(accountData.updatedAt) : "—"}
                </div>
              </FieldItem>
            </div>
          </div>
        )
      },
    },
  ]

  return (
    <ResourceDetailClient<AccountProfile>
      data={account}
      fields={detailFields}
      detailSections={detailSections}
      title="Thông tin tài khoản"
      description="Quản lý thông tin cá nhân của bạn"
      actions={
        canUpdate ? (
          <Button
            variant="default"
            onClick={() => setIsEditing(true)}
            className="gap-2"
          >
            <Edit className="h-4 w-4" />
            Chỉnh sửa
          </Button>
        ) : null
      }
    />
  )
}
