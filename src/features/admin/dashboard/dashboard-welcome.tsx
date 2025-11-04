"use client"

import { motion } from "framer-motion"
import { useSession } from "next-auth/react"
import { 
  Users, 
  FileText, 
  MessageSquare, 
  Bell,
  TrendingUp,
  Activity,
  Zap,
  ArrowRight,
  Calendar,
  Clock,
  Shield,
  Crown,
  Edit,
  User,
  BarChart3,
  Settings,
  Tag,
  FolderTree,
  AlertCircle,
  MessageCircle,
  UserCheck,
  GraduationCap,
  KeyRound,
  Sparkles
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
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
      gradient: "from-[#00cc44] to-[#00ff88] dark:from-[#00ff88] dark:to-[#00cc44]",
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

// Chart colors mapping for stats
const chartColors = [
  { chart: "chart-1", iconColor: "text-chart-1", bg: "bg-chart-1/10", border: "border-chart-1/20", glow: "shadow-chart-1/20" },
  { chart: "chart-2", iconColor: "text-chart-2", bg: "bg-chart-2/10", border: "border-chart-2/20", glow: "shadow-chart-2/20" },
  { chart: "chart-3", iconColor: "text-chart-3", bg: "bg-chart-3/10", border: "border-chart-3/20", glow: "shadow-chart-3/20" },
  { chart: "chart-4", iconColor: "text-chart-4", bg: "bg-chart-4/10", border: "border-chart-4/20", glow: "shadow-chart-4/20" },
  { chart: "chart-5", iconColor: "text-chart-5", bg: "bg-chart-5/10", border: "border-chart-5/20", glow: "shadow-chart-5/20" },
]

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

  // Stats based on permissions - using chart colors from theme
  const allStats = [
    { title: "Tổng người dùng", value: "1,234", change: "+12.5%", icon: Users, permission: PERMISSIONS.USERS_VIEW, href: "/admin/users" },
    { title: "Bài viết", value: "456", change: "+8.2%", icon: FileText, permission: PERMISSIONS.POSTS_VIEW, href: "/admin/posts" },
    { title: "Bình luận", value: "2,341", change: "+15.3%", icon: MessageCircle, permission: PERMISSIONS.COMMENTS_VIEW, href: "/admin/comments" },
    { title: "Tin nhắn", value: "89", change: "+5.1%", icon: MessageSquare, permission: PERMISSIONS.MESSAGES_VIEW, href: "/admin/messages" },
    { title: "Thông báo", value: "23", change: "+2.3%", icon: Bell, permission: PERMISSIONS.NOTIFICATIONS_VIEW, href: "/admin/notifications" },
    { title: "Danh mục", value: "45", change: "+3.1%", icon: FolderTree, permission: PERMISSIONS.CATEGORIES_VIEW, href: "/admin/categories" },
    { title: "Thẻ", value: "128", change: "+6.2%", icon: Tag, permission: PERMISSIONS.TAGS_VIEW, href: "/admin/tags" },
    { title: "Yêu cầu liên hệ", value: "67", change: "+4.7%", icon: UserCheck, permission: PERMISSIONS.CONTACT_REQUESTS_VIEW, href: "/admin/contact-requests" },
    { title: "Học sinh", value: "892", change: "+9.8%", icon: GraduationCap, permission: PERMISSIONS.STUDENTS_VIEW, href: "/admin/students" },
    { title: "Vai trò", value: "12", change: "0%", icon: KeyRound, permission: PERMISSIONS.ROLES_VIEW, href: "/admin/roles" },
  ]

  const availableStats = allStats
    .filter(stat => isSuperAdminUser || hasPermission(stat.permission))
    .map((stat, index) => ({
      ...stat,
      ...chartColors[index % chartColors.length]
    }))

  // Quick actions with theme colors
  const allQuickActions = [
    { title: "Tạo bài viết mới", description: "Viết và xuất bản bài viết", icon: FileText, href: "/admin/posts/new", permission: PERMISSIONS.POSTS_CREATE, priority: 1 },
    { title: "Quản lý người dùng", description: "Xem và quản lý tất cả người dùng", icon: Users, href: "/admin/users", permission: PERMISSIONS.USERS_VIEW, priority: 2 },
    { title: "Xem thống kê", description: "Phân tích và báo cáo chi tiết", icon: BarChart3, href: "/admin/dashboard/stats", permission: PERMISSIONS.DASHBOARD_VIEW, priority: 3 },
    { title: "Quản lý bình luận", description: "Duyệt và quản lý bình luận", icon: MessageCircle, href: "/admin/comments", permission: PERMISSIONS.COMMENTS_VIEW, priority: 4 },
    { title: "Quản lý danh mục", description: "Tạo và chỉnh sửa danh mục", icon: FolderTree, href: "/admin/categories", permission: PERMISSIONS.CATEGORIES_VIEW, priority: 5 },
    { title: "Quản lý thẻ", description: "Tạo và chỉnh sửa thẻ", icon: Tag, href: "/admin/tags", permission: PERMISSIONS.TAGS_VIEW, priority: 6 },
    { title: "Yêu cầu liên hệ", description: "Xem và xử lý yêu cầu liên hệ", icon: UserCheck, href: "/admin/contact-requests", permission: PERMISSIONS.CONTACT_REQUESTS_VIEW, priority: 7 },
    { title: "Quản lý vai trò", description: "Cấu hình vai trò và quyền hạn", icon: KeyRound, href: "/admin/roles", permission: PERMISSIONS.ROLES_VIEW, priority: 8 },
    { title: "Cài đặt hệ thống", description: "Quản lý cấu hình hệ thống", icon: Settings, href: "/admin/settings", permission: PERMISSIONS.SETTINGS_VIEW, priority: 9 },
  ]

  const availableQuickActions = allQuickActions
    .filter(action => isSuperAdminUser || hasPermission(action.permission))
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 6)
    .map((action, index) => ({
      ...action,
      ...chartColors[index % chartColors.length]
    }))

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
                    `bg-gradient-to-r ${roleInfo.gradient}`,
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

        {/* Stats Grid */}
        {availableStats.length > 0 && (
          <motion.div variants={itemVariants} className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <Sparkles className="h-6 w-6 text-[#00cc44] dark:text-[#00ff88]" />
                  Tổng quan thống kê
                </h2>
                <p className="text-sm text-muted-foreground mt-1">Dữ liệu tổng hợp theo thời gian thực</p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {availableStats.map((stat, index) => {
                const Icon = stat.icon
                const StatCard = (
                  <Card className={cn(
                    "relative overflow-hidden border transition-all duration-300 group cursor-pointer",
                    "backdrop-blur-sm bg-card/80 hover:bg-card",
                    stat.border,
                    "hover:shadow-2xl hover:shadow-[var(--highlight-color)]/20",
                    "hover:scale-[1.02] hover:-translate-y-1"
                  )}>
                    {/* Glass morphism effect */}
                    <div className="absolute inset-0 bg-gradient-to-br from-background/50 to-background/30 backdrop-blur-sm" />
                    
                    {/* Animated gradient border */}
                    <div 
                      className={cn(
                        "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300",
                        `bg-gradient-to-r ${stat.bg.replace("/10", "/20")}`
                      )}
                      style={{ maskImage: "linear-gradient(to bottom, transparent, black)" }}
                    />
                    
                    {/* Glow effect */}
                    <div className={cn(
                      "absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-30 group-hover:opacity-50 transition-opacity duration-300",
                      stat.bg
                    )} />
                    
                    {/* Top accent bar */}
                    <div className={cn(
                      "absolute top-0 left-0 w-full h-1 bg-gradient-to-r transition-all",
                      stat.bg.replace("/10", "")
                    )} />
                    
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative z-10">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        {stat.title}
                      </CardTitle>
                      <div className={cn(
                        "p-2.5 rounded-xl transition-all duration-300 shadow-lg backdrop-blur-sm",
                        "group-hover:scale-110 group-hover:rotate-6",
                        stat.bg,
                        "border border-border/50"
                      )}>
                        <Icon className={cn("h-5 w-5", stat.iconColor)} />
                      </div>
                    </CardHeader>
                    <CardContent className="relative z-10">
                      <div className="text-3xl font-bold mb-2 tracking-tight bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                        {stat.value}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <TrendingUp className="h-3.5 w-3.5 text-[#00cc44] dark:text-[#00ff88]" />
                        <span className="font-semibold text-[#00cc44] dark:text-[#00ff88]">{stat.change}</span>
                        <span>so với tháng trước</span>
                      </div>
                    </CardContent>
                  </Card>
                )

                return (
                  <motion.div
                    key={stat.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * index, duration: 0.5 }}
                  >
                    {stat.href ? (
                      <Link href={stat.href} className="block">
                        {StatCard}
                      </Link>
                    ) : (
                      StatCard
                    )}
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        )}

        {/* Quick Actions */}
        {availableQuickActions.length > 0 && (
          <motion.div variants={itemVariants} className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <Zap className="h-6 w-6 text-primary" />
                  Thao tác nhanh
                </h2>
                <p className="text-sm text-muted-foreground mt-1">Các tác vụ thường dùng</p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {availableQuickActions.map((action, index) => {
                const Icon = action.icon
                return (
                  <motion.div
                    key={action.title}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 + 0.1 * index, duration: 0.5 }}
                    whileHover={{ scale: 1.03, y: -4 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Link href={action.href}>
                      <Card className={cn(
                        "relative overflow-hidden border transition-all duration-300 h-full group cursor-pointer",
                        "backdrop-blur-sm bg-card/80 hover:bg-card",
                        action.border,
                        "hover:shadow-2xl hover:shadow-[var(--highlight-color)]/20"
                      )}>
                        {/* Glass morphism */}
                        <div className="absolute inset-0 bg-gradient-to-br from-background/50 to-background/30 backdrop-blur-sm" />
                        
                        {/* Glow effect */}
                        <div className={cn(
                          "absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity duration-300",
                          action.bg
                        )} />
                        
                        {/* Accent bar */}
                        <div className={cn(
                          "absolute top-0 left-0 w-full h-1 bg-gradient-to-r transition-all",
                          action.bg.replace("/10", "")
                        )} />
                        
                        <CardHeader className="relative z-10">
                          <div className="flex items-center justify-between mb-4">
                            <div className={cn(
                              "p-4 rounded-xl transition-all duration-300 shadow-lg backdrop-blur-sm",
                              "group-hover:scale-110 group-hover:rotate-6",
                              action.bg,
                              "border border-border/50"
                            )}>
                              <Icon className={cn("h-6 w-6", action.iconColor)} />
                            </div>
                            <ArrowRight className={cn(
                              "h-5 w-5 opacity-40 transition-all duration-300",
                              "group-hover:translate-x-2 group-hover:opacity-100",
                              action.iconColor
                            )} />
                          </div>
                          <CardTitle className="text-lg font-semibold mb-1">{action.title}</CardTitle>
                          <CardDescription className="text-xs">{action.description}</CardDescription>
                        </CardHeader>
                      </Card>
                    </Link>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        )}

        {/* Welcome Message for Limited Permissions */}
        {!isSuperAdminUser && availableStats.length === 0 && (
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
