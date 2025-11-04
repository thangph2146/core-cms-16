"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { 
  Mail, 
  User, 
  Shield, 
  Phone, 
  MapPin, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  XCircle,
  FileText,
  ArrowLeft,
  Edit
} from "lucide-react"
import { ResourceDetailPage, type ResourceDetailField } from "@/features/admin/resources/components"
import { apiClient } from "@/lib/api/axios"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { formatDateVi, getUserInitials } from "../utils"
import type { UserRow } from "../types"

interface UserDetailData extends UserRow {
  avatar?: string | null
  bio?: string | null
  phone?: string | null
  address?: string | null
  emailVerified?: string | null
  updatedAt?: string
  roleIds?: string[] | string
  [key: string]: unknown
}

export interface UserDetailProps {
  userId: string
  initialUser?: UserDetailData | null
  backUrl?: string
  onUpdate?: () => void
}

export function UserDetail({ userId, initialUser, backUrl = "/admin/users", onUpdate: _onUpdate }: UserDetailProps) {
  const router = useRouter()
  const { toast } = useToast()
  
  const [user, setUser] = useState<UserDetailData | null>(initialUser || null)
  const [isLoading, setIsLoading] = useState(!initialUser)
  const [_avatarError, setAvatarError] = useState(false)


  const fetchUserData = async () => {
    try {
      setIsLoading(true)
      const userResponse = await apiClient.get<{ data: UserDetailData }>(`/users/${userId}`)
      const userData = userResponse.data.data
      setUser(userData)
      
      // Debug: Log avatar URL và validate
      if (userData?.avatar) {
        console.log("User avatar URL:", userData.avatar)
        // Validate URL format
        try {
          new URL(userData.avatar)
          console.log("Avatar URL is valid")
        } catch {
          console.warn("Avatar URL is invalid:", userData.avatar)
        }
      }
      setAvatarError(false) // Reset avatar error when fetching new data
    } catch (error) {
      console.error("Error fetching user data:", error)
      setUser(null)
      toast({
        variant: "destructive",
        title: "Lỗi tải dữ liệu",
        description: "Không thể tải thông tin người dùng. Vui lòng thử lại.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    // If initialUser is provided, use it and skip initial fetch
    if (initialUser) {
      setUser(initialUser)
      setIsLoading(false)
      setAvatarError(false)
    } else {
      // Otherwise fetch from API
      fetchUserData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, initialUser])


  const detailFields: ResourceDetailField<UserDetailData>[] = [
    {
      name: "email",
      label: "Email",
      type: "custom",
      render: (value) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Mail className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="font-medium">{String(value || "—")}</div>
            {user?.emailVerified && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <CheckCircle2 className="h-3 w-3 text-green-500" />
                Đã xác thực
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      name: "name",
      label: "Tên",
      type: "custom",
      render: (value) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-1/10">
            <User className="h-5 w-5 text-chart-1" />
          </div>
          <div className="font-medium">{String(value || "—")}</div>
        </div>
      ),
    },
    {
      name: "roles",
      label: "Vai trò",
      type: "custom",
      render: (value) => {
        if (!value || !Array.isArray(value)) return <span className="text-muted-foreground">—</span>
        return (
          <div className="flex flex-wrap gap-2">
            {value.map((role: { name: string; displayName?: string }) => (
              <Badge
                key={role.name}
                variant="outline"
                className="inline-flex items-center gap-1.5 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary border-primary/20 hover:bg-primary/20 transition-colors"
              >
                <Shield className="h-3.5 w-3.5" />
                {role.displayName || role.name}
              </Badge>
            ))}
          </div>
        )
      },
    },
    {
      name: "isActive",
      label: "Trạng thái",
      type: "custom",
      render: (value) => (
        <div className="flex items-center gap-2">
          {value ? (
            <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20 hover:bg-green-500/20">
              <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
              Đang hoạt động
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20">
              <XCircle className="mr-1.5 h-3.5 w-3.5" />
              Đã vô hiệu hóa
            </Badge>
          )}
        </div>
      ),
    },
    {
      name: "bio",
      label: "Giới thiệu",
      type: "custom",
      render: (value) => (
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-2/10">
            <FileText className="h-5 w-5 text-chart-2" />
          </div>
          <div className="flex-1 text-sm leading-relaxed">{String(value || "—")}</div>
        </div>
      ),
    },
    {
      name: "phone",
      label: "Số điện thoại",
      type: "custom",
      render: (value) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-3/10">
            <Phone className="h-5 w-5 text-chart-3" />
          </div>
          <div className="font-medium">{String(value || "—")}</div>
        </div>
      ),
    },
    {
      name: "address",
      label: "Địa chỉ",
      type: "custom",
      render: (value) => (
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-4/10">
            <MapPin className="h-5 w-5 text-chart-4" />
          </div>
          <div className="flex-1 font-medium">{String(value || "—")}</div>
        </div>
      ),
    },
    {
      name: "emailVerified",
      label: "Email đã xác thực",
      type: "date",
    },
    {
      name: "createdAt",
      label: "Ngày tạo",
      type: "custom",
      render: (value) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-5/10">
            <Calendar className="h-5 w-5 text-chart-5" />
          </div>
          <div className="font-medium">
            {value ? formatDateVi(value as string) : "—"}
          </div>
        </div>
      ),
    },
    {
      name: "updatedAt",
      label: "Cập nhật lần cuối",
      type: "custom",
      render: (value) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
            <Clock className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="font-medium">
            {value ? formatDateVi(value as string) : "—"}
          </div>
        </div>
      ),
    },
  ]


  // Split fields into sections - remove basic fields since they're in header
  const contactFields = detailFields.filter(f => 
    ["phone", "address", "bio"].includes(String(f.name))
  )
  const metadataFields = detailFields.filter(f => 
    ["emailVerified", "createdAt", "updatedAt"].includes(String(f.name))
  )

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 lg:p-8">
        <div className="h-64 bg-muted/50 rounded-xl animate-pulse" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4 md:p-6 lg:p-8">
        <div className="text-center">
          <p className="text-muted-foreground">Không tìm thấy người dùng</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 lg:p-8">
      {/* Back Button */}
      {backUrl && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(backUrl)}
          className="self-start"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Quay lại danh sách
        </Button>
      )}

      {/* Hero Header Section with Avatar */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-background via-background/95 to-background/90 backdrop-blur-sm shadow-xl"
      >
        {/* Gradient background decoration */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-chart-1/5 pointer-events-none" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        
        <div className="relative p-6 md:p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {/* Avatar */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5, type: "spring" }}
              className="relative"
            >
              <div className="relative">
                <Avatar className="h-24 w-24 md:h-32 md:w-32 border-4 border-background shadow-xl">
                  <AvatarImage 
                    src={user.avatar || undefined} 
                    alt={user.name || user.email}
                    referrerPolicy="no-referrer"
                    crossOrigin="anonymous"
                    onError={(e) => {
                      console.warn("Failed to load avatar image:", user.avatar, e)
                      setAvatarError(true)
                    }}
                    onLoad={() => {
                      console.log("Avatar image loaded successfully:", user.avatar)
                      setAvatarError(false)
                    }}
                  />
                  <AvatarFallback className="text-2xl md:text-3xl font-bold bg-gradient-to-br from-primary to-chart-1 text-primary-foreground">
                    {getUserInitials(user.name, user.email)}
                  </AvatarFallback>
                </Avatar>
                {user.isActive && (
                  <div className="absolute bottom-0 right-0 h-6 w-6 md:h-8 md:w-8 rounded-full bg-green-500 border-4 border-background shadow-lg flex items-center justify-center">
                    <CheckCircle2 className="h-3 w-3 md:h-4 md:w-4 text-white" />
                  </div>
                )}
              </div>
            </motion.div>

            {/* User Info */}
            <div className="flex-1 space-y-3">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                  {user.name || "Chưa có tên"}
                </h1>
                <p className="text-muted-foreground mt-1 flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  {user.email}
                </p>
              </div>

              {/* Roles */}
              {user.roles && user.roles.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  {user.roles.map((role: { name: string; displayName?: string }) => (
                    <Badge
                      key={role.name}
                      variant="outline"
                      className="inline-flex items-center gap-1.5 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary border-primary/20 hover:bg-primary/20 transition-all hover:scale-105"
                    >
                      <Shield className="h-3.5 w-3.5" />
                      {role.displayName || role.name}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Status */}
              <div className="flex items-center gap-3 pt-2">
                {user.isActive ? (
                  <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20 hover:bg-green-500/20">
                    <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                    Đang hoạt động
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20">
                    <XCircle className="mr-1.5 h-3.5 w-3.5" />
                    Đã vô hiệu hóa
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Edit Button */}
          <div className="absolute top-4 right-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/admin/users/${userId}/edit`)}
              className="shadow-lg backdrop-blur-sm border-2 hover:border-primary/50 transition-all"
            >
              <Edit className="mr-2 h-4 w-4" />
              Chỉnh sửa
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Use ResourceDetailPage for the rest */}
      <ResourceDetailPage<UserDetailData>
        data={user}
        isLoading={false}
        fields={[]}
        title=""
        description=""
        backUrl={undefined}
        backLabel=""
        editLabel=""
        sections={[
          {
            title: "Thông tin liên hệ",
            description: "Thông tin liên lạc và giới thiệu",
            fields: contactFields,
          },
          {
            title: "Thông tin hệ thống",
            description: "Thông tin về tài khoản và thời gian",
            fields: metadataFields,
          },
        ]}
      />
    </div>
  )
}

