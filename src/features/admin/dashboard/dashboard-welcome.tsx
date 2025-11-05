"use client"

import { motion } from "framer-motion"
import { useSession } from "next-auth/react"
import {
  FileText,
  Activity,
  Calendar,
  Clock,
  Shield,
  Crown,
  Edit,
  User,
  AlertCircle,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useClientOnly } from "@/hooks/use-client-only"
import { usePermissions } from "@/hooks/use-permissions"
import { PERMISSIONS } from "@/lib/permissions"
import { isSuperAdmin } from "@/lib/permissions/permissions-helpers"
import { cn } from "@/lib/utils"

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.15,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 120,
      damping: 18,
    },
  },
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return "Chào buổi sáng"
  if (hour < 18) return "Chào buổi chiều"
  return "Chào buổi tối"
}

function getCurrentDate() {
  const date = new Date()
  const options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }
  return date.toLocaleDateString("vi-VN", options)
}

function getRoleInfo(roles: Array<{ name: string; displayName?: string }> = []) {
  const roleNames = roles.map(r => r.name)
  const displayNames = roles.map(r => r.displayName || r.name).join(", ")

  if (roleNames.includes("super_admin")) {
    return {
      label: "Super Admin",
      icon: Crown,
      textColor: "text-[#00cc44] dark:text-[#00ff88]",
      bgColor: "bg-[#00cc44]/10 dark:bg-[#00ff88]/10",
      borderColor: "border-[#00cc44]/20 dark:border-[#00ff88]/20",
      description: "Quyền truy cập đầy đủ vào hệ thống"
    }
  }
  if (roleNames.includes("admin")) {
    return {
      label: "Admin",
      icon: Shield,
      textColor: "text-chart-1 dark:text-chart-2",
      bgColor: "bg-chart-1/10 dark:bg-chart-2/10",
      borderColor: "border-chart-1/20 dark:border-chart-2/20",
      description: "Quản trị viên hệ thống"
    }
  }
  if (roleNames.includes("editor")) {
    return {
      label: "Editor",
      icon: Edit,
      textColor: "text-chart-3 dark:text-chart-4",
      bgColor: "bg-chart-3/10 dark:bg-chart-4/10",
      borderColor: "border-chart-3/20 dark:border-chart-4/20",
      description: "Biên tập viên nội dung"
    }
  }
  if (roleNames.includes("author")) {
    return {
      label: "Author",
      icon: FileText,
      textColor: "text-chart-4 dark:text-chart-5",
      bgColor: "bg-chart-4/10 dark:bg-chart-5/10",
      borderColor: "border-chart-4/20 dark:border-chart-5/20",
      description: "Tác giả bài viết"
    }
  }
  return {
    label: displayNames || "Người dùng",
    icon: User,
    textColor: "text-muted-foreground",
    bgColor: "bg-muted/50",
    borderColor: "border-border",
    description: "Thành viên hệ thống"
  }
}



export function DashboardWelcome() {
  const { data: session } = useSession()
  const { hasPermission } = usePermissions()
  const isMounted = useClientOnly()
  const user = session?.user
  const userRoles = session?.roles || []
  const isSuperAdminUser = isSuperAdmin(userRoles)

  const greeting = getGreeting()
  const currentDate = getCurrentDate()
  const roleInfo = getRoleInfo(userRoles)




  if (!isMounted) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <div className="h-64 bg-muted/50 rounded-xl animate-pulse" />
      </div>
    )
  }

  const RoleIcon = roleInfo.icon

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 lg:p-8 relative overflow-hidden">
      {/* Background gradient effects */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#00cc44]/5 dark:bg-[#00ff88]/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        className="flex flex-1 flex-col gap-8 relative z-10"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Welcome Header with Role Badge */}
        <motion.div variants={itemVariants} className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3 flex-wrap">
                <motion.h1
                  className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6 }}
                >
                  <span className="bg-gradient-to-r from-primary via-primary/90 to-primary/70 bg-clip-text text-transparent">
                    {greeting}
                  </span>
                  {user?.name && (
                    <span className="bg-gradient-to-r from-[#00cc44] to-[#00ff88] dark:from-[#00ff88] dark:to-[#00cc44] bg-clip-text text-transparent">
                      {`, ${user.name}`}
                    </span>
                  )}
                  <span className="ml-2">👋</span>
                </motion.h1>
              </div>
              <motion.p
                className="text-muted-foreground flex items-center gap-2 text-base md:text-lg"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.6 }}
              >
                <Calendar className="h-5 w-5" />
                {currentDate}
              </motion.p>
              <motion.div
                className="flex flex-wrap items-center gap-3"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.6 }}
              >
                <Badge
                  variant="outline"
                  className={cn(
                    "px-4 py-2 border-2 gap-2 font-semibold shadow-lg backdrop-blur-sm",
                    roleInfo.bgColor,
                    roleInfo.textColor,
                    roleInfo.borderColor,
                    "hover:scale-105 hover:shadow-xl transition-all duration-300"
                  )}
                >
                  <RoleIcon className="h-4 w-4" />
                  <span>{roleInfo.label}</span>
                </Badge>
                <span className="text-sm md:text-base text-muted-foreground">
                  {roleInfo.description}
                </span>
              </motion.div>
            </div>
            <motion.div
              className="flex items-center gap-3 px-5 py-3 rounded-xl backdrop-blur-md bg-card/80 border border-border/50 shadow-lg hover:shadow-xl transition-all"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5, duration: 0.6 }}
            >
              <div className="relative">
                <Activity className="h-5 w-5 text-[#00cc44] dark:text-[#00ff88]" />
                <div className="absolute inset-0 h-5 w-5 text-[#00cc44] dark:text-[#00ff88] animate-ping opacity-20" />
              </div>
              <span className="font-semibold text-sm">Hệ thống hoạt động tốt</span>
            </motion.div>
          </div>
        </motion.div>

        {/* Welcome Message for Limited Permissions */}
        {!isSuperAdminUser && (
          <motion.div
            variants={itemVariants}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="relative overflow-hidden backdrop-blur-md bg-card/80 border border-primary/20 shadow-xl">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-background" />
              <CardHeader className="relative z-10">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <AlertCircle className="h-6 w-6 text-primary" />
                  Chào mừng đến với hệ thống!
                </CardTitle>
                <CardDescription className="text-base">
                  Bạn đang sử dụng tài khoản với quyền hạn hạn chế. Vui lòng liên hệ quản trị viên để được cấp thêm quyền truy cập.
                </CardDescription>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="space-y-2 text-sm">
                  <p className="text-muted-foreground font-medium">
                    Với quyền hiện tại, bạn có thể:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                    {hasPermission(PERMISSIONS.MESSAGES_VIEW) && (
                      <li>Xem và quản lý tin nhắn</li>
                    )}
                    {hasPermission(PERMISSIONS.NOTIFICATIONS_VIEW) && (
                      <li>Xem thông báo</li>
                    )}
                    {hasPermission(PERMISSIONS.DASHBOARD_VIEW) && (
                      <li>Xem dashboard tổng quan</li>
                    )}
                  </ul>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Recent Activity / Info Card */}
        <motion.div
          variants={itemVariants}
          className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
        >
          {isSuperAdminUser && (
            <Card className="md:col-span-2 relative overflow-hidden backdrop-blur-md bg-card/80 border border-primary/20 shadow-lg">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-background" />
              <CardHeader className="relative z-10">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Clock className="h-6 w-6 text-primary" />
                  Hoạt động gần đây
                </CardTitle>
                <CardDescription className="text-base">
                  Các hoạt động và sự kiện mới nhất trong hệ thống
                </CardDescription>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <motion.div
                      key={i}
                      className="flex items-center gap-3 p-4 rounded-xl bg-background/50 border border-border/50 backdrop-blur-sm hover:bg-background/70 transition-all duration-300 hover:shadow-md"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + i * 0.1 }}
                    >
                      <div className="h-2.5 w-2.5 rounded-full bg-[#00cc44] dark:bg-[#00ff88] animate-pulse shadow-lg shadow-[#00cc44]/50 dark:shadow-[#00ff88]/50" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold">Hoạt động mẫu {i}</p>
                        <p className="text-xs text-muted-foreground">Vừa xong</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

        </motion.div>
      </motion.div>
    </div>
  )
}
