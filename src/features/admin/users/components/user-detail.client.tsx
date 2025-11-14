"use client"

import * as React from "react"
import { Mail, User, Shield, Phone, MapPin, Calendar, Clock, CheckCircle2, XCircle, FileText, Edit } from "lucide-react"
import { ResourceDetailPage, type ResourceDetailField, type ResourceDetailSection } from "@/features/admin/resources/components"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { useResourceRouter } from "@/hooks/use-resource-segment"
import { formatDateVi, getUserInitials } from "../utils"
import { cn } from "@/lib/utils"

export interface UserDetailData {
  id: string
  email: string
  name: string | null
  avatar?: string | null
  bio?: string | null
  phone?: string | null
  address?: string | null
  emailVerified?: string | null
  updatedAt?: string
  createdAt?: string
  isActive: boolean
  roles?: Array<{
    id: string
    name: string
    displayName?: string
  }>
  [key: string]: unknown
}

export interface UserDetailClientProps {
  userId: string
  user: UserDetailData
  backUrl?: string
}

// Reusable field item component
interface FieldItemProps {
  icon: React.ComponentType<{ className?: string }>
  label: string
  children: React.ReactNode
  iconColor?: string
}

const FieldItem = ({ icon: Icon, label, children, iconColor = "bg-muted" }: FieldItemProps) => (
  <div className="flex items-start gap-3">
    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconColor}`}>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </div>
    <div className="flex-1 min-w-0">
      <div className="text-xs font-medium text-muted-foreground mb-1.5">{label}</div>
      {children}
    </div>
  </div>
)

export function UserDetailClient({ userId, user, backUrl = "/admin/users" }: UserDetailClientProps) {
  const router = useResourceRouter()

  const detailFields: ResourceDetailField<UserDetailData>[] = []

  const detailSections: ResourceDetailSection<UserDetailData>[] = [
    {
      id: "basic",
      title: "Thông tin cơ bản",
      description: "Thông tin đăng nhập và cá nhân",
      fieldHeader: (
        <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg border border-border/50">
          <div className="relative">
            <Avatar className="h-24 w-24 border-2 border-border">
              <AvatarImage 
                src={user.avatar || undefined} 
                alt={user.name || user.email}
                referrerPolicy="no-referrer"
                crossOrigin="anonymous"
              />
              <AvatarFallback className="text-lg font-bold bg-gradient-to-br from-primary to-chart-1 text-primary-foreground">
                {getUserInitials(user.name, user.email)}
              </AvatarFallback>
            </Avatar>
            {user.isActive && (
              <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-green-500 border-2 border-background flex items-center justify-center">
                <CheckCircle2 className="h-3.5 w-3.5 text-white" />
              </div>
            )}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold">{user.name || "Chưa có tên"}</h3>
            <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
              <Mail className="h-4 w-4" />
              {user.email}
            </p>
            {user.roles && user.roles.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {user.roles.map((role) => (
                  <Badge
                    key={role.name}
                    variant="outline"
                    className="inline-flex items-center gap-1.5 bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary border-primary/20"
                  >
                    <Shield className="h-3 w-3" />
                    {role.displayName || role.name}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      ),
      fieldsContent: (_fields, data) => {
        const userData = data as UserDetailData
        
        return (
          <div className="space-y-6">
            {/* Email & Verification */}
            <div className="grid gap-4 sm:grid-cols-2">
              <FieldItem icon={Mail} label="Email">
                <div className="space-y-1">
                  <a
                    href={`mailto:${userData.email}`}
                    className="text-sm font-medium text-primary hover:underline truncate block transition-colors"
                  >
                    {userData.email || "—"}
                  </a>
                  {userData.emailVerified && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CheckCircle2 className="h-3 w-3 text-green-600 dark:text-green-500" />
                      <span>Đã xác thực</span>
                    </div>
                  )}
                </div>
              </FieldItem>

              {userData.emailVerified && (
                <FieldItem icon={Clock} label="Email đã xác thực">
                  <div className="text-sm font-medium text-foreground">
                    {userData.emailVerified ? formatDateVi(userData.emailVerified) : "—"}
                  </div>
                </FieldItem>
              )}
            </div>

            <Separator />

            {/* Name & Phone */}
            <div className="grid gap-4 sm:grid-cols-2">
              <FieldItem icon={User} label="Tên">
                <div className="text-sm font-medium text-foreground">
                  {userData.name || "—"}
                </div>
              </FieldItem>

              {userData.phone && (
                <FieldItem icon={Phone} label="Số điện thoại">
                  <a
                    href={`tel:${userData.phone}`}
                    className="text-sm font-medium text-primary hover:underline transition-colors"
                  >
                    {userData.phone}
                  </a>
                </FieldItem>
              )}
            </div>
          </div>
        )
      },
    },
    {
      id: "additional",
      title: "Thông tin bổ sung & Hệ thống",
      description: "Thông tin bổ sung, vai trò, trạng thái và thời gian",
      fieldsContent: (_fields, data) => {
        const userData = data as UserDetailData
        
        return (
          <div className="space-y-6">
            {/* Bio */}
            {userData.bio && (
              <>
                <Card className="border border-border/50 bg-card p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-foreground mb-2">Giới thiệu</h3>
                      <div className="text-sm leading-relaxed whitespace-pre-wrap text-foreground break-words">
                        {userData.bio || "—"}
                      </div>
                    </div>
                  </div>
                </Card>
                <Separator />
              </>
            )}

            {/* Address */}
            {userData.address && (
              <>
                <FieldItem icon={MapPin} label="Địa chỉ">
                  <div className="text-sm font-medium text-foreground">
                    {userData.address}
                  </div>
                </FieldItem>
                <Separator />
              </>
            )}

            {/* Roles */}
            {userData.roles && userData.roles.length > 0 && (
              <>
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-muted-foreground mb-2">Vai trò</div>
                    <div className="flex flex-wrap gap-2">
                      {userData.roles.map((role) => (
                        <Badge
                          key={role.name}
                          variant="outline"
                          className="inline-flex items-center gap-1.5 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary border-primary/20"
                        >
                          <Shield className="h-3 w-3" />
                          {role.displayName || role.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* Status */}
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                {userData.isActive ? (
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
                    userData.isActive
                      ? "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20"
                      : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
                  )}
                  variant={userData.isActive ? "default" : "secondary"}
                >
                  {userData.isActive ? (
                    <>
                      <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                      Đang hoạt động
                    </>
                  ) : (
                    <>
                      <XCircle className="mr-1.5 h-3.5 w-3.5" />
                      Đã vô hiệu hóa
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
                  {userData.createdAt ? formatDateVi(userData.createdAt) : "—"}
                </div>
              </FieldItem>

              <FieldItem icon={Clock} label="Cập nhật lần cuối">
                <div className="text-sm font-medium text-foreground">
                  {userData.updatedAt ? formatDateVi(userData.updatedAt) : "—"}
                </div>
              </FieldItem>
            </div>
          </div>
        )
      },
    },
  ]

  return (
    <ResourceDetailPage<UserDetailData>
      data={user}
      fields={detailFields}
      detailSections={detailSections}
      title={user.name || user.email}
      description={`Chi tiết người dùng ${user.email}`}
      backUrl={backUrl}
      backLabel="Quay lại danh sách"
      actions={
        <Button
          variant="outline"
          onClick={() => router.push(`/admin/users/${userId}/edit`)}
          className="gap-2"
        >
          <Edit className="h-4 w-4" />
          Chỉnh sửa
        </Button>
      }
    />
  )
}

