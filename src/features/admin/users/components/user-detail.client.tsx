"use client"

import { Mail, User, Shield, Phone, MapPin, Calendar, Clock, CheckCircle2, XCircle, FileText, Edit } from "lucide-react"
import { ResourceDetailPage, type ResourceDetailField, type ResourceDetailSection } from "@/features/admin/resources/components"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { formatDateVi, getUserInitials } from "../utils"

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

type IconComponent = React.ComponentType<{ className?: string }>

const FieldWithIcon = ({ icon: Icon, iconColor, children }: { icon: IconComponent; iconColor: string; children: React.ReactNode }) => (
  <div className="flex items-center gap-3">
    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconColor}`}>
      <Icon className="h-5 w-5" />
    </div>
    {children}
  </div>
)

const FieldWithIconStart = ({ icon: Icon, iconColor, children }: { icon: IconComponent; iconColor: string; children: React.ReactNode }) => (
  <div className="flex items-start gap-3">
    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconColor}`}>
      <Icon className="h-5 w-5" />
    </div>
    {children}
  </div>
)

const createField = (name: string, label: string, section: string, icon: IconComponent, iconColor: string, render?: (value: unknown) => React.ReactNode): ResourceDetailField<UserDetailData> => ({
  name, label, type: "custom", section,
  render: render || ((value) => (
    <FieldWithIcon icon={icon} iconColor={iconColor}>
      <div className="font-medium">{String(value || "—")}</div>
    </FieldWithIcon>
  )),
})

const createDateField = (name: string, label: string, section: string, icon: IconComponent, iconColor: string) =>
  createField(name, label, section, icon, iconColor, (value) => (
    <FieldWithIcon icon={icon} iconColor={iconColor}>
      <div className="font-medium">{value ? formatDateVi(value as string) : "—"}</div>
    </FieldWithIcon>
  ))

export function UserDetailClient({ userId, user, backUrl = "/admin/users" }: UserDetailClientProps) {
  const router = useRouter()

  const detailFields: ResourceDetailField<UserDetailData>[] = [
    createField("email", "Email", "basic", Mail, "bg-primary/10 text-primary", (value) => (
      <FieldWithIcon icon={Mail} iconColor="bg-primary/10 text-primary">
        <div>
          <div className="font-medium">{String(value || "—")}</div>
          {user?.emailVerified && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <CheckCircle2 className="h-3 w-3 text-green-500" />
              Đã xác thực
            </div>
          )}
        </div>
      </FieldWithIcon>
    )),
    createDateField("emailVerified", "Email đã xác thực", "basic", Clock, "bg-muted text-muted-foreground"),
    createField("name", "Tên", "basic", User, "bg-chart-1/10 text-chart-1"),
    createField("phone", "Số điện thoại", "basic", Phone, "bg-chart-3/10 text-chart-3"),
    {
      name: "bio", label: "Giới thiệu", type: "custom", section: "additional",
      render: (value) => (
        <FieldWithIconStart icon={FileText} iconColor="bg-chart-2/10 text-chart-2">
          <div className="flex-1 text-sm leading-relaxed">{String(value || "—")}</div>
        </FieldWithIconStart>
      ),
    },
    {
      name: "address", label: "Địa chỉ", type: "custom", section: "additional",
      render: (value) => (
        <FieldWithIconStart icon={MapPin} iconColor="bg-chart-5/10 text-chart-4">
          <div className="flex-1 font-medium">{String(value || "—")}</div>
        </FieldWithIconStart>
      ),
    },
    {
      name: "roles", label: "Vai trò", type: "custom", section: "additional",
      render: (value) => !value || !Array.isArray(value) ? (
        <span className="text-muted-foreground">—</span>
      ) : (
        <div className="flex flex-wrap gap-2">
          {value.map((role: { name: string; displayName?: string }) => (
            <Badge key={role.name} variant="outline" className="inline-flex items-center gap-1.5 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary border-primary/20 hover:bg-primary/20 transition-colors">
              <Shield className="h-3.5 w-3.5" />
              {role.displayName || role.name}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      name: "isActive", label: "Trạng thái", type: "custom", section: "additional",
      render: (value) => (
        <Badge className={value ? "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20 hover:bg-green-500/20" : "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20"} variant={value ? undefined : "outline"}>
          {value ? <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> : <XCircle className="mr-1.5 h-3.5 w-3.5" />}
          {value ? "Đang hoạt động" : "Đã vô hiệu hóa"}
        </Badge>
      ),
    },
    createDateField("createdAt", "Ngày tạo", "additional", Calendar, "bg-chart-5/10 text-chart-5"),
    createDateField("updatedAt", "Cập nhật lần cuối", "additional", Clock, "bg-muted text-muted-foreground"),
  ]

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
    },
    {
      id: "additional",
      title: "Thông tin bổ sung & Hệ thống",
      description: "Thông tin bổ sung, vai trò, trạng thái và thời gian",
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

