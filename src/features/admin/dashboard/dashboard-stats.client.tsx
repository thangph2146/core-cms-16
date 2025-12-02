"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { Calendar, BarChart3, PieChart, LineChart } from "lucide-react";
import {
  Line,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  BarChart,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useClientOnly } from "@/hooks/use-client-only";
import { usePermissions } from "@/hooks/use-permissions";
import { PERMISSIONS, isSuperAdmin } from "@/lib/permissions";
import type { DashboardStatsData } from "./server/queries";
import { ScrollArea } from "@/components/ui/scroll-area";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.15,
    },
  },
};

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
};

// Extended Chart colors - sử dụng CSS variables và bổ sung thêm màu
// Đảm bảo đủ màu cho tất cả resources (11 resources)
// Ưu tiên màu sắc rõ ràng và phân biệt tốt cho các mục quan trọng
// CSS variables chứa hex colors, sử dụng trực tiếp
const CHART_COLORS = [
  "var(--chart-1)",              // Người dùng - Primary blue (#1f3368 / #3d5a9e)
  "var(--chart-2)",              // Bài viết - Primary red (#a71b29 / #c9444f)
  "var(--chart-3)",              // Bình luận - Dark gray (#3b3939 / #6b6b6b)
  "var(--chart-4)",              // Danh mục - Light blue (#6b8cae)
  "var(--chart-5)",              // Thẻ - Pink red (#c94857 / #e57580)
  "hsl(217, 91%, 60%)",          // Tin nhắn - Bright blue (#3b82f6)
  "hsl(45, 93%, 47%)",           // Thông báo - Yellow (#eab308)
  "hsl(270, 91%, 65%)",          // Yêu cầu liên hệ - Purple (#a855f7)
  "hsl(142, 71%, 45%)",          // Học sinh - Green (#22c55e)
  "hsl(25, 95%, 53%)",           // Phiên đăng nhập - Orange (#f97316)
  "hsl(0, 84%, 60%)",            // Vai trò - Red (#ef4444)
  "hsl(199, 89%, 48%)",          // Cyan - #06b6d4
  "hsl(262, 83%, 58%)",          // Indigo - #6366f1
  "hsl(340, 82%, 52%)",          // Pink - #ec4899
  "hsl(142, 76%, 36%)",          // Emerald - #10b981
];

// Màu sắc đặc biệt cho các mục quan trọng - đảm bảo hiển thị rõ ràng và đầy đủ
// Sử dụng màu từ CSS variables để tương thích với theme (light/dark mode)
const IMPORTANT_RESOURCE_COLORS: Record<string, string> = {
  users: "var(--chart-1)",       // Người dùng - màu primary blue
  posts: "var(--chart-2)",       // Bài viết - màu secondary red
  categories: "var(--chart-4)",  // Danh mục - màu accent blue
};

// Enhanced Custom Tooltip component
interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name?: string;
    value?: number;
    color?: string;
    dataKey?: string;
  }>;
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const total = payload.reduce((sum, entry) => sum + (entry.value || 0), 0);
    
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-background/95 backdrop-blur-md border border-border/50 rounded-xl shadow-2xl p-4 min-w-[200px]"
      >
        <p className="text-sm font-bold mb-3 text-foreground border-b border-border/50 pb-2">
          {label}
        </p>
        <div className="space-y-2">
          {payload.map((entry, index) => {
            const percentage = total > 0 ? ((entry.value || 0) / total) * 100 : 0;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-xs font-medium text-muted-foreground truncate">
                    {entry.name ?? ""}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span
                    className="text-sm font-bold"
                    style={{ color: entry.color }}
                  >
                    {entry.value?.toLocaleString("vi-VN") ?? "0"}
                  </span>
                  {payload.length > 1 && (
                    <span className="text-xs text-muted-foreground">
                      ({percentage.toFixed(1)}%)
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
        {payload.length > 1 && (
          <div className="mt-3 pt-2 border-t border-border/50 flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Tổng cộng</span>
            <span className="text-sm font-bold text-foreground">
              {total.toLocaleString("vi-VN")}
            </span>
          </div>
        )}
      </motion.div>
    );
  }
  return null;
};

// Enhanced Pie Chart Tooltip
interface CustomPieTooltipProps {
  active?: boolean;
  payload?: Array<{
    name?: string;
    value?: number;
    color?: string;
  }>;
}

const CustomPieTooltip = ({ active, payload }: CustomPieTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    const value = typeof data.value === "number" ? data.value : 0;
    
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-background/95 backdrop-blur-md border border-border/50 rounded-xl shadow-2xl p-4"
      >
        <div className="flex items-center gap-2 mb-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: data.color }}
          />
          <p className="text-sm font-bold text-foreground">{data.name}</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">
            Tỷ lệ: <span className="font-semibold text-foreground">{value}%</span>
          </p>
        </div>
      </motion.div>
    );
  }
  return null;
};

export interface DashboardStatsClientProps {
  stats: DashboardStatsData;
}

export function DashboardStatsClient({ stats }: DashboardStatsClientProps) {
  const isMounted = useClientOnly();
  const { data: session } = useSession();
  const { hasPermission } = usePermissions();
  const userRoles = session?.roles || [];
  const isSuperAdminUser = isSuperAdmin(userRoles);

  // Get chart colors for categories
  const categoryDataWithColors = stats.categoryData.map((item, index) => ({
    ...item,
    color: CHART_COLORS[index % CHART_COLORS.length],
  }));

  // Permission checks for all resources
  const canViewUsers =
    isSuperAdminUser || hasPermission(PERMISSIONS.USERS_VIEW);
  const canViewPosts =
    isSuperAdminUser || hasPermission(PERMISSIONS.POSTS_VIEW);
  const canViewComments =
    isSuperAdminUser || hasPermission(PERMISSIONS.COMMENTS_VIEW);
  const canViewCategories =
    isSuperAdminUser || hasPermission(PERMISSIONS.CATEGORIES_VIEW);
  const canViewTags = isSuperAdminUser || hasPermission(PERMISSIONS.TAGS_VIEW);
  const canViewMessages =
    isSuperAdminUser || hasPermission(PERMISSIONS.MESSAGES_VIEW);
  const canViewNotifications =
    isSuperAdminUser || hasPermission(PERMISSIONS.NOTIFICATIONS_VIEW);
  const canViewContactRequests =
    isSuperAdminUser || hasPermission(PERMISSIONS.CONTACT_REQUESTS_VIEW);
  const canViewStudents =
    isSuperAdminUser || hasPermission(PERMISSIONS.STUDENTS_VIEW);
  const canViewSessions =
    isSuperAdminUser || hasPermission(PERMISSIONS.SESSIONS_VIEW);
  const canViewRoles =
    isSuperAdminUser || hasPermission(PERMISSIONS.ROLES_VIEW);
  const canViewDashboard =
    isSuperAdminUser || hasPermission(PERMISSIONS.DASHBOARD_VIEW);

  // Check if user has any permission to view stats
  const hasAnyStatsPermission =
    canViewUsers ||
    canViewPosts ||
    canViewComments ||
    canViewCategories ||
    canViewTags ||
    canViewMessages ||
    canViewNotifications ||
    canViewContactRequests ||
    canViewStudents ||
    canViewSessions ||
    canViewRoles ||
    canViewDashboard;

  // Define available chart resources with permissions
  // Đảm bảo chỉ hiển thị resources mà user có permission
  // Ưu tiên màu sắc rõ ràng cho các mục quan trọng (Người dùng, Bài viết, Danh mục)
  const availableResources = useMemo(
    () => {
      const allResources = [
        {
          key: "users",
          label: "Người dùng",
          permission: canViewUsers,
          // Sử dụng màu đặc biệt cho mục quan trọng
          color: IMPORTANT_RESOURCE_COLORS.users || CHART_COLORS[0],
          isImportant: true,
        },
        {
          key: "posts",
          label: "Bài viết",
          permission: canViewPosts,
          // Sử dụng màu đặc biệt cho mục quan trọng
          color: IMPORTANT_RESOURCE_COLORS.posts || CHART_COLORS[1],
          isImportant: true,
        },
        {
          key: "comments",
          label: "Bình luận",
          permission: canViewComments,
          color: CHART_COLORS[2],
          isImportant: false,
        },
        {
          key: "categories",
          label: "Danh mục",
          permission: canViewCategories,
          // Sử dụng màu đặc biệt cho mục quan trọng
          color: IMPORTANT_RESOURCE_COLORS.categories || CHART_COLORS[3],
          isImportant: true,
        },
        {
          key: "tags",
          label: "Thẻ",
          permission: canViewTags,
          color: CHART_COLORS[4],
          isImportant: false,
        },
        {
          key: "messages",
          label: "Tin nhắn",
          permission: canViewMessages,
          color: CHART_COLORS[5],
          isImportant: false,
        },
        {
          key: "notifications",
          label: "Thông báo",
          permission: canViewNotifications,
          color: CHART_COLORS[6],
          isImportant: false,
        },
        {
          key: "contactRequests",
          label: "Yêu cầu liên hệ",
          permission: canViewContactRequests,
          color: CHART_COLORS[7],
          isImportant: false,
        },
        {
          key: "students",
          label: "Học sinh",
          permission: canViewStudents,
          color: CHART_COLORS[8],
          isImportant: false,
        },
        {
          key: "sessions",
          label: "Phiên đăng nhập",
          permission: canViewSessions,
          color: CHART_COLORS[9],
          isImportant: false,
        },
        {
          key: "roles",
          label: "Vai trò",
          permission: canViewRoles,
          color: CHART_COLORS[10],
          isImportant: false,
        },
      ];
      
      // Chỉ trả về resources mà user có permission xem
      // Đảm bảo các mục quan trọng (users, posts, categories) luôn được ưu tiên hiển thị
      const filtered = allResources.filter((r) => r.permission);
      
      // Sắp xếp lại: các mục quan trọng lên đầu
      return filtered.sort((a, b) => {
        if (a.isImportant && !b.isImportant) return -1;
        if (!a.isImportant && b.isImportant) return 1;
        return 0;
      });
    },
    [
      canViewUsers,
      canViewPosts,
      canViewComments,
      canViewCategories,
      canViewTags,
      canViewMessages,
      canViewNotifications,
      canViewContactRequests,
      canViewStudents,
      canViewSessions,
      canViewRoles,
    ]
  );

  // State for selected resources in chart
  // Lazy initialization: chỉ tính toán khi component mount
  const [selectedResourcesState, setSelectedResources] = useState<Set<string>>(() => {
    // Khởi tạo với empty set, sẽ được sync sau khi availableResources được tính toán
    return new Set();
  });

  // State for chart type (line or bar)
  const [chartType, setChartType] = useState<"line" | "bar" | "composed">("composed");
  
  // State for hidden series in legend
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set());

  // Sync selected resources with available resources (filter out unavailable ones)
  // Đảm bảo chỉ chọn resources mà user có permission
  // Tự động chọn tất cả available resources nếu chưa có gì được chọn (initial state)
  const selectedResources = useMemo(() => {
    const availableKeys = new Set(availableResources.map((r) => r.key));
    
    // Lọc bỏ các resources không còn available (không có permission)
    const filtered = new Set(
      [...selectedResourcesState].filter((key) => availableKeys.has(key))
    );
    
    // Nếu chưa có selection nào và có available resources, tự động chọn tất cả
    // Điều này đảm bảo UX tốt khi component mount lần đầu
    if (filtered.size === 0 && availableKeys.size > 0 && selectedResourcesState.size === 0) {
      // Sử dụng setTimeout để tránh update state trong render
      // Nhưng vẫn trả về availableKeys để render ngay
      setTimeout(() => {
        setSelectedResources(availableKeys);
      }, 0);
      return availableKeys;
    }
    
    return filtered;
  }, [selectedResourcesState, availableResources]);

  // Toggle resource selection
  const toggleResource = (key: string) => {
    setSelectedResources((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Toggle series visibility in legend
  const toggleSeriesVisibility = (key: string) => {
    setHiddenSeries((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Select all / Deselect all
  const selectAll = () => {
    setSelectedResources(new Set(availableResources.map((r) => r.key)));
  };

  const deselectAll = () => {
    setSelectedResources(new Set());
  };

  if (!isMounted) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <div className="h-64 bg-muted/50 rounded-xl animate-pulse" />
      </div>
    );
  }

  // If user has no permissions, show empty state
  if (!hasAnyStatsPermission) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-4 md:p-6 lg:p-8">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-center">
              Không có quyền truy cập
            </CardTitle>
            <CardDescription className="text-center">
              Bạn không có quyền xem thống kê. Vui lòng liên hệ quản trị viên để
              được cấp quyền.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

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
        {/* Header */}
        <motion.div variants={itemVariants} className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-3">
                <BarChart3 className="h-8 w-8 text-primary" />
                <span className="bg-gradient-to-r from-primary via-primary/90 to-primary/70 bg-clip-text text-transparent">
                  Thống kê chi tiết
                </span>
              </h1>
              <p className="text-muted-foreground mt-2 flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {new Date().toLocaleDateString("vi-VN", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Main Charts Row */}
        {(canViewUsers ||
          canViewPosts ||
          canViewComments ||
          canViewCategories ||
          canViewTags ||
          canViewMessages ||
          canViewNotifications ||
          canViewContactRequests ||
          canViewStudents ||
          canViewSessions ||
          canViewRoles) && (
          <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
            {/* Line Chart - Monthly Trends */}
            {(canViewUsers ||
              canViewPosts ||
              canViewComments ||
              canViewCategories ||
              canViewTags ||
              canViewMessages ||
              canViewNotifications ||
              canViewContactRequests ||
              canViewStudents ||
              canViewSessions ||
              canViewRoles) && (
              <motion.div variants={itemVariants} className="lg:col-span-2 xl:col-span-2">
                <Card className="relative overflow-hidden backdrop-blur-md bg-card/80 border border-border shadow-lg">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-background" />
                  <CardHeader className="relative z-10">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                          <LineChart className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                          Xu hướng theo tháng
                        </CardTitle>
                        <CardDescription className="text-sm sm:text-base">
                          Thống kê các resources theo tháng
                        </CardDescription>
                      </div>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="gap-2 w-full sm:w-auto"
                            aria-label="Chọn resources để hiển thị trên biểu đồ"
                          >
                            <BarChart3 className="h-4 w-4" />
                            <span className="hidden sm:inline">Chọn mục hiển thị</span>
                            <span className="sm:hidden">Chọn</span>
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64" align="end">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="font-semibold text-sm">
                                Chọn resources
                              </h4>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 text-xs"
                                  onClick={selectAll}
                                >
                                  Tất cả
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 text-xs"
                                  onClick={deselectAll}
                                >
                                  Bỏ chọn
                                </Button>
                              </div>
                            </div>
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                              {availableResources.map((resource) => (
                                <div
                                  key={resource.key}
                                  className="flex items-center space-x-2 cursor-pointer hover:bg-muted/50 rounded-md p-2 -mx-2"
                                  onClick={() => toggleResource(resource.key)}
                                >
                                  <Checkbox
                                    id={resource.key}
                                    checked={selectedResources.has(
                                      resource.key
                                    )}
                                    onCheckedChange={() =>
                                      toggleResource(resource.key)
                                    }
                                  />
                                  <label
                                    htmlFor={resource.key}
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2 flex-1 cursor-pointer"
                                  >
                                    <div
                                      className="w-3 h-3 rounded-full"
                                      style={{
                                        backgroundColor: resource.color,
                                      }}
                                    />
                                    {resource.label}
                                  </label>
                                </div>
                              ))}
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </CardHeader>
                  <CardContent className="relative z-10">
                    {/* Chart Type Selector */}
                    <div className="flex items-center justify-end gap-2 mb-4">
                      <div className="inline-flex rounded-lg border border-border bg-muted/50 p-1">
                        <Button
                          variant={chartType === "line" ? "default" : "ghost"}
                          size="sm"
                          className="h-7 px-3 text-xs"
                          onClick={() => setChartType("line")}
                        >
                          <LineChart className="h-3 w-3 mr-1" />
                          Đường
                        </Button>
                        <Button
                          variant={chartType === "bar" ? "default" : "ghost"}
                          size="sm"
                          className="h-7 px-3 text-xs"
                          onClick={() => setChartType("bar")}
                        >
                          <BarChart3 className="h-3 w-3 mr-1" />
                          Cột
                        </Button>
                        <Button
                          variant={chartType === "composed" ? "default" : "ghost"}
                          size="sm"
                          className="h-7 px-3 text-xs"
                          onClick={() => setChartType("composed")}
                        >
                          <BarChart3 className="h-3 w-3 mr-1" />
                          Kết hợp
                        </Button>
                      </div>
                    </div>

                    {selectedResources.size === 0 ? (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="h-80 flex items-center justify-center text-muted-foreground"
                      >
                        <div className="text-center">
                          <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p className="text-sm font-medium">Vui lòng chọn ít nhất một resource để hiển thị</p>
                        </div>
                      </motion.div>
                    ) : (
                      <div className="h-64 sm:h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          {chartType === "line" ? (
                            <ComposedChart
                              data={stats.monthlyData}
                              margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                            >
                              <defs>
                                {availableResources
                                  .filter((r) => selectedResources.has(r.key))
                                  .map((resource) => (
                                    <linearGradient
                                      key={`gradient-${resource.key}`}
                                      id={`gradient-${resource.key}`}
                                      x1="0"
                                      y1="0"
                                      x2="0"
                                      y2="1"
                                    >
                                      <stop
                                        offset="0%"
                                        stopColor={resource.color}
                                        stopOpacity={0.3}
                                      />
                                      <stop
                                        offset="100%"
                                        stopColor={resource.color}
                                        stopOpacity={0}
                                      />
                                    </linearGradient>
                                  ))}
                              </defs>
                              <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="hsl(var(--border))"
                                opacity={0.2}
                                vertical={false}
                              />
                              <XAxis
                                dataKey="month"
                                stroke="hsl(var(--muted-foreground))"
                                fontSize={11}
                                tickLine={false}
                                axisLine={false}
                                tickMargin={8}
                              />
                              <YAxis
                                stroke="hsl(var(--muted-foreground))"
                                fontSize={11}
                                tickLine={false}
                                axisLine={false}
                                tickMargin={8}
                                width={50}
                              />
                              <Tooltip
                                content={<CustomTooltip />}
                                cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1, strokeDasharray: "5 5" }}
                              />
                              <Legend
                                wrapperStyle={{
                                  fontSize: "11px",
                                  paddingTop: "20px",
                                }}
                                iconType="circle"
                                iconSize={8}
                                onClick={(e) => {
                                  const dataKey = e.dataKey as string;
                                  if (dataKey) toggleSeriesVisibility(dataKey);
                                }}
                                formatter={(value, entry) => {
                                  const isHidden = hiddenSeries.has(entry.dataKey as string);
                                  return (
                                    <span
                                      style={{
                                        opacity: isHidden ? 0.5 : 1,
                                        cursor: "pointer",
                                        textDecoration: isHidden ? "line-through" : "none",
                                      }}
                                    >
                                      {value}
                                    </span>
                                  );
                                }}
                              />
                              {availableResources
                                .filter((r) => selectedResources.has(r.key) && !hiddenSeries.has(r.key))
                                .map((resource) => (
                                  <Line
                                    key={resource.key}
                                    type="monotone"
                                    dataKey={resource.key}
                                    stroke={resource.color}
                                    strokeWidth={2.5}
                                    dot={{ fill: resource.color, r: 4, strokeWidth: 2 }}
                                    activeDot={{ r: 7, strokeWidth: 2, stroke: resource.color }}
                                    name={resource.label}
                                    strokeDasharray={hiddenSeries.has(resource.key) ? "5 5" : "0"}
                                    opacity={hiddenSeries.has(resource.key) ? 0.3 : 1}
                                    animationDuration={300}
                                  />
                                ))}
                            </ComposedChart>
                          ) : chartType === "bar" ? (
                            <BarChart
                              data={stats.monthlyData}
                              margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                            >
                              <defs>
                                {availableResources
                                  .filter((r) => selectedResources.has(r.key))
                                  .map((resource) => (
                                    <linearGradient
                                      key={`gradient-${resource.key}`}
                                      id={`gradient-${resource.key}`}
                                      x1="0"
                                      y1="0"
                                      x2="0"
                                      y2="1"
                                    >
                                      <stop
                                        offset="0%"
                                        stopColor={resource.color}
                                        stopOpacity={0.8}
                                      />
                                      <stop
                                        offset="100%"
                                        stopColor={resource.color}
                                        stopOpacity={0.4}
                                      />
                                    </linearGradient>
                                  ))}
                              </defs>
                              <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="hsl(var(--border))"
                                opacity={0.2}
                                vertical={false}
                              />
                              <XAxis
                                dataKey="month"
                                stroke="hsl(var(--muted-foreground))"
                                fontSize={11}
                                tickLine={false}
                                axisLine={false}
                                tickMargin={8}
                              />
                              <YAxis
                                stroke="hsl(var(--muted-foreground))"
                                fontSize={11}
                                tickLine={false}
                                axisLine={false}
                                tickMargin={8}
                                width={50}
                              />
                              <Tooltip
                                content={<CustomTooltip />}
                                cursor={{ fill: "hsl(var(--muted))", opacity: 0.1 }}
                              />
                              <Legend
                                wrapperStyle={{
                                  fontSize: "11px",
                                  paddingTop: "20px",
                                }}
                                iconType="square"
                                iconSize={8}
                                onClick={(e) => {
                                  const dataKey = e.dataKey as string;
                                  if (dataKey) toggleSeriesVisibility(dataKey);
                                }}
                                formatter={(value, entry) => {
                                  const isHidden = hiddenSeries.has(entry.dataKey as string);
                                  return (
                                    <span
                                      style={{
                                        opacity: isHidden ? 0.5 : 1,
                                        cursor: "pointer",
                                        textDecoration: isHidden ? "line-through" : "none",
                                      }}
                                    >
                                      {value}
                                    </span>
                                  );
                                }}
                              />
                              {availableResources
                                .filter((r) => selectedResources.has(r.key) && !hiddenSeries.has(r.key))
                                .map((resource) => (
                                  <Bar
                                    key={resource.key}
                                    dataKey={resource.key}
                                    fill={`url(#gradient-${resource.key})`}
                                    stroke={resource.color}
                                    strokeWidth={1}
                                    name={resource.label}
                                    radius={[4, 4, 0, 0]}
                                    opacity={hiddenSeries.has(resource.key) ? 0.3 : 1}
                                    animationDuration={300}
                                  />
                                ))}
                            </BarChart>
                          ) : (
                            <ComposedChart
                              data={stats.monthlyData}
                              margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                            >
                              <defs>
                                {availableResources
                                  .filter((r) => selectedResources.has(r.key))
                                  .map((resource) => (
                                    <linearGradient
                                      key={`gradient-${resource.key}`}
                                      id={`gradient-${resource.key}`}
                                      x1="0"
                                      y1="0"
                                      x2="0"
                                      y2="1"
                                    >
                                      <stop
                                        offset="0%"
                                        stopColor={resource.color}
                                        stopOpacity={0.3}
                                      />
                                      <stop
                                        offset="100%"
                                        stopColor={resource.color}
                                        stopOpacity={0}
                                      />
                                    </linearGradient>
                                  ))}
                              </defs>
                              <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="hsl(var(--border))"
                                opacity={0.2}
                                vertical={false}
                              />
                              <XAxis
                                dataKey="month"
                                stroke="hsl(var(--muted-foreground))"
                                fontSize={11}
                                tickLine={false}
                                axisLine={false}
                                tickMargin={8}
                              />
                              <YAxis
                                stroke="hsl(var(--muted-foreground))"
                                fontSize={11}
                                tickLine={false}
                                axisLine={false}
                                tickMargin={8}
                                width={50}
                              />
                              <Tooltip
                                content={<CustomTooltip />}
                                cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1, strokeDasharray: "5 5" }}
                              />
                              <Legend
                                wrapperStyle={{
                                  fontSize: "11px",
                                  paddingTop: "20px",
                                }}
                                iconType="circle"
                                iconSize={8}
                                onClick={(e) => {
                                  const dataKey = e.dataKey as string;
                                  if (dataKey) toggleSeriesVisibility(dataKey);
                                }}
                                formatter={(value, entry) => {
                                  const isHidden = hiddenSeries.has(entry.dataKey as string);
                                  return (
                                    <span
                                      style={{
                                        opacity: isHidden ? 0.5 : 1,
                                        cursor: "pointer",
                                        textDecoration: isHidden ? "line-through" : "none",
                                      }}
                                    >
                                      {value}
                                    </span>
                                  );
                                }}
                              />
                              {availableResources
                                .filter((r) => selectedResources.has(r.key) && !hiddenSeries.has(r.key))
                                .map((resource, index) => {
                                  // Show first 3 as bars, rest as lines
                                  if (index < 3) {
                                    return (
                                      <Bar
                                        key={resource.key}
                                        dataKey={resource.key}
                                        fill={`url(#gradient-${resource.key})`}
                                        stroke={resource.color}
                                        strokeWidth={1}
                                        name={resource.label}
                                        radius={[4, 4, 0, 0]}
                                        opacity={hiddenSeries.has(resource.key) ? 0.3 : 0.6}
                                        animationDuration={300}
                                      />
                                    );
                                  }
                                  return (
                                    <Line
                                      key={resource.key}
                                      type="monotone"
                                      dataKey={resource.key}
                                      stroke={resource.color}
                                      strokeWidth={2.5}
                                      dot={{ fill: resource.color, r: 4, strokeWidth: 2 }}
                                      activeDot={{ r: 7, strokeWidth: 2, stroke: resource.color }}
                                      name={resource.label}
                                      strokeDasharray={hiddenSeries.has(resource.key) ? "5 5" : "0"}
                                      opacity={hiddenSeries.has(resource.key) ? 0.3 : 1}
                                      animationDuration={300}
                                    />
                                  );
                                })}
                            </ComposedChart>
                          )}
                        </ResponsiveContainer>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Pie Chart - Categories */}
            {canViewCategories && (
              <motion.div variants={itemVariants} className="xl:col-span-1">
                <Card className="relative overflow-hidden backdrop-blur-md bg-card/80 border border-border shadow-lg">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-background" />
                  <CardHeader className="relative z-10">
                    <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                      <PieChart className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                      Phân bố danh mục
                    </CardTitle>
                    <CardDescription className="text-sm sm:text-base">
                      Tỷ lệ bài viết theo từng danh mục
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="relative z-10">
                    {categoryDataWithColors.length === 0 ? (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="h-64 sm:h-80 flex items-center justify-center text-muted-foreground"
                      >
                        <div className="text-center">
                          <PieChart className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p className="text-sm font-medium">Chưa có dữ liệu danh mục</p>
                        </div>
                      </motion.div>
                    ) : (
                      <div className="space-y-6">
                        {/* Enhanced Donut Chart */}
                        <div className="flex items-center justify-center relative">
                          <ResponsiveContainer width="100%" height={280}>
                            <RechartsPieChart>
                              <defs>
                                {categoryDataWithColors.map((entry, index) => (
                                  <linearGradient
                                    key={`pie-gradient-${index}`}
                                    id={`pie-gradient-${index}`}
                                    x1="0"
                                    y1="0"
                                    x2="1"
                                    y2="1"
                                  >
                                    <stop
                                      offset="0%"
                                      stopColor={entry.color}
                                      stopOpacity={1}
                                    />
                                    <stop
                                      offset="100%"
                                      stopColor={entry.color}
                                      stopOpacity={0.7}
                                    />
                                  </linearGradient>
                                ))}
                              </defs>
                              <Pie
                                data={categoryDataWithColors}
                                cx="50%"
                                cy="50%"
                                innerRadius={70}
                                outerRadius={110}
                                paddingAngle={3}
                                dataKey="value"
                                label={false}
                                labelLine={false}
                                animationBegin={0}
                                animationDuration={600}
                                animationEasing="ease-out"
                              >
                                {categoryDataWithColors.map((entry, index) => (
                                  <Cell
                                    key={`cell-${index}`}
                                    fill={`url(#pie-gradient-${index})`}
                                    stroke="oklch(var(--background))"
                                    strokeWidth={3}
                                    style={{
                                      filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.1))",
                                    }}
                                  />
                                ))}
                              </Pie>
                              <Tooltip content={<CustomPieTooltip />} />
                            </RechartsPieChart>
                          </ResponsiveContainer>
                          {/* Center label showing total */}
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="text-center">
                              <div className="text-2xl font-bold text-foreground">
                                {stats.overview.totalPosts}
                              </div>
                              <div className="text-xs text-muted-foreground font-medium">
                                Tổng bài viết
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Enhanced Legend with values and animations */}
                        <ScrollArea className="h-[200px]">
                        <div className="flex flex-col gap-3 px-4">
                          <AnimatePresence>
                            {categoryDataWithColors.map((item, index) => {
                              const count = Math.round(
                                (item.value / 100) * stats.overview.totalPosts
                              );
                              return (
                                <motion.div
                                  key={item.name}
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -10 }}
                                  transition={{ delay: index * 0.05 }}
                                  className="flex items-center gap-3 p-3 rounded-lg bg-background/50 border border-border/50 hover:bg-background/80 hover:border-border transition-all group cursor-pointer"
                                >
                                  <div
                                    className="w-4 h-4 rounded-full flex-shrink-0 shadow-sm"
                                    style={{ backgroundColor: item.color }}
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-semibold truncate text-foreground">
                                      {item.name}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs mt-0.5">
                                      <span className="text-muted-foreground font-medium">
                                        {item.value}%
                                      </span>
                                      <span className="text-muted-foreground">•</span>
                                      <span className="font-semibold text-foreground">
                                        {count.toLocaleString("vi-VN")} bài viết
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    <div className="text-xs font-bold text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                                      #{index + 1}
                                    </div>
                                  </div>
                                </motion.div>
                              );
                              })}
                            </AnimatePresence>
                          </div>
                          </ScrollArea>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
