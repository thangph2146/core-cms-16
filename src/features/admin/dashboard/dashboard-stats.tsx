"use client"

import { motion } from "framer-motion"
import {
    TrendingUp,
    TrendingDown,
    Users,
    FileText,
    MessageSquare,
    Calendar,
    BarChart3,
    PieChart,
    LineChart,
    Activity,
    ArrowUpRight,
    Eye,
    MousePointerClick
} from "lucide-react"
import {
    Line,
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
    Area,
    AreaChart
} from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useClientOnly } from "@/hooks/use-client-only"
import { cn } from "@/lib/utils"

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
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

// Sample data for charts
const monthlyData = [
    { month: "Tháng 1", users: 1200, posts: 380, comments: 2100, views: 15200 },
    { month: "Tháng 2", users: 1250, posts: 420, comments: 2400, views: 16800 },
    { month: "Tháng 3", users: 1320, posts: 450, comments: 2600, views: 18500 },
    { month: "Tháng 4", users: 1400, posts: 480, comments: 2800, views: 20100 },
    { month: "Tháng 5", users: 1450, posts: 510, comments: 3000, views: 22000 },
    { month: "Tháng 6", users: 1500, posts: 540, comments: 3200, views: 23800 },
]

// Category data - colors will be set dynamically based on theme
const categoryData = [
    { name: "Công nghệ", value: 35 },
    { name: "Giáo dục", value: 25 },
    { name: "Kinh doanh", value: 20 },
    { name: "Sức khỏe", value: 12 },
    { name: "Khác", value: 8 },
]

const topPosts = [
    { title: "Hướng dẫn React 2024", views: 15420, likes: 892, comments: 234 },
    { title: "Next.js 15 Best Practices", views: 12890, likes: 756, comments: 189 },
    { title: "TypeScript Advanced Tips", views: 11230, likes: 634, comments: 156 },
    { title: "Database Optimization", views: 9870, likes: 523, comments: 142 },
    { title: "API Design Patterns", views: 8650, likes: 467, comments: 128 },
]

const trafficData = [
    { time: "00:00", visitors: 120 },
    { time: "04:00", visitors: 80 },
    { time: "08:00", visitors: 350 },
    { time: "12:00", visitors: 680 },
    { time: "16:00", visitors: 920 },
    { time: "20:00", visitors: 750 },
    { time: "24:00", visitors: 280 },
]

// Chart colors from CSS variables
const CHART_COLORS = [
    "oklch(var(--chart-1))",
    "oklch(var(--chart-2))",
    "oklch(var(--chart-3))",
    "oklch(var(--chart-4))",
    "oklch(var(--chart-5))",
]

// Custom tooltip component
interface CustomTooltipProps {
    active?: boolean
    payload?: Array<{
        name?: string
        value?: number
        color?: string
    }>
    label?: string
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-background border border-border rounded-lg shadow-lg p-3 backdrop-blur-sm">
                <p className="text-sm font-semibold mb-2">{label}</p>
                {payload.map((entry, index) => (
                    <p key={index} className="text-xs" style={{ color: entry.color }}>
                        {`${entry.name ?? ""}: ${entry.value?.toLocaleString() ?? ""}`}
                    </p>
                ))}
            </div>
        )
    }
    return null
}

export function DashboardStats() {
    const isMounted = useClientOnly()

    // Get chart colors for categories
    const categoryDataWithColors = categoryData.map((item, index) => ({
        ...item,
        color: CHART_COLORS[index % CHART_COLORS.length]
    }))

    if (!isMounted) {
        return (
            <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
                <div className="h-64 bg-muted/50 rounded-xl animate-pulse" />
            </div>
        )
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
                                <Calendar className="h-4 w-4" />
                                {new Date().toLocaleDateString("vi-VN", {
                                    weekday: "long",
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric"
                                })}
                            </p>
                        </div>
                    </div>
                </motion.div>

                {/* Overview Cards */}
                <motion.div variants={itemVariants} className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {[
                        { title: "Tổng người dùng", value: "1,234", change: "+12.5%", trend: "up", icon: Users, bgColor: "bg-chart-1/10", borderColor: "border-chart-1/20", iconColor: "text-chart-1", barColor: "bg-chart-1" },
                        { title: "Tổng bài viết", value: "456", change: "+8.2%", trend: "up", icon: FileText, bgColor: "bg-chart-2/10", borderColor: "border-chart-2/20", iconColor: "text-chart-2", barColor: "bg-chart-2" },
                        { title: "Tổng bình luận", value: "2,341", change: "+15.3%", trend: "up", icon: MessageSquare, bgColor: "bg-chart-3/10", borderColor: "border-chart-3/20", iconColor: "text-chart-3", barColor: "bg-chart-3" },
                        { title: "Lượt xem", value: "45.2K", change: "+22.1%", trend: "up", icon: Eye, bgColor: "bg-chart-4/10", borderColor: "border-chart-4/20", iconColor: "text-chart-4", barColor: "bg-chart-4" },
                    ].map((stat, index) => {
                        const Icon = stat.icon
                        return (
                            <motion.div
                                key={stat.title}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 * index }}
                            >
                                <Card className={cn(
                                    "relative overflow-hidden border transition-all duration-300 hover:shadow-xl group cursor-pointer",
                                    stat.borderColor,
                                    "hover:border-primary/50",
                                    "backdrop-blur-sm bg-card/80 hover:bg-card"
                                )}>
                                    <div className={cn(
                                        "absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-30 group-hover:opacity-50 transition-opacity",
                                        stat.bgColor
                                    )} />
                                    <div className={cn(
                                        "absolute top-0 left-0 w-full h-1 bg-gradient-to-r",
                                        stat.barColor
                                    )} />
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                                        <CardTitle className="text-sm font-medium text-muted-foreground">
                                            {stat.title}
                                        </CardTitle>
                                        <div className={cn(
                                            "p-2.5 rounded-xl transition-all group-hover:scale-110 group-hover:rotate-6 shadow-lg backdrop-blur-sm",
                                            stat.bgColor,
                                            "border border-border/50"
                                        )}>
                                            <Icon className={cn("h-5 w-5", stat.iconColor)} />
                                        </div>
                                    </CardHeader>
                                    <CardContent className="relative z-10">
                                        <div className="text-3xl font-bold mb-2 tracking-tight">{stat.value}</div>
                                        <div className="flex items-center gap-1.5 text-xs">
                                            {stat.trend === "up" ? (
                                                <TrendingUp className="h-3.5 w-3.5 text-[#00cc44] dark:text-[#00ff88]" />
                                            ) : (
                                                <TrendingDown className="h-3.5 w-3.5 text-destructive" />
                                            )}
                                            <span className={cn(
                                                "font-semibold",
                                                stat.trend === "up" ? "text-[#00cc44] dark:text-[#00ff88]" : "text-destructive"
                                            )}>
                                                {stat.change}
                                            </span>
                                            <span className="text-muted-foreground">so với tháng trước</span>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        )
                    })}
                </motion.div>

                {/* Main Charts Row */}
                <div className="grid gap-6 lg:grid-cols-2">
                    {/* Line Chart - Monthly Trends */}
                    <motion.div variants={itemVariants}>
                        <Card className="relative overflow-hidden backdrop-blur-md bg-card/80 border border-border shadow-lg">
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-background" />
                            <CardHeader className="relative z-10">
                                <CardTitle className="flex items-center gap-2 text-xl">
                                    <LineChart className="h-6 w-6 text-primary" />
                                    Xu hướng theo tháng
                                </CardTitle>
                                <CardDescription className="text-base">
                                    Thống kê người dùng, bài viết, bình luận và lượt xem
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="relative z-10">
                                <div className="h-80">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <ComposedChart data={monthlyData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                                            <XAxis 
                                                dataKey="month" 
                                                stroke="hsl(var(--muted-foreground))"
                                                fontSize={12}
                                                tickLine={{ stroke: "hsl(var(--border))" }}
                                            />
                                            <YAxis 
                                                stroke="hsl(var(--muted-foreground))"
                                                fontSize={12}
                                                tickLine={{ stroke: "hsl(var(--border))" }}
                                            />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Legend 
                                                wrapperStyle={{ fontSize: "12px", paddingTop: "20px" }}
                                                iconType="circle"
                                            />
                                            <Area 
                                                type="monotone" 
                                                dataKey="views" 
                                                fill={CHART_COLORS[3]}
                                                fillOpacity={0.2}
                                                stroke={CHART_COLORS[3]}
                                                strokeWidth={2}
                                                name="Lượt xem"
                                            />
                                            <Line 
                                                type="monotone" 
                                                dataKey="users" 
                                                stroke={CHART_COLORS[0]}
                                                strokeWidth={2}
                                                dot={{ fill: CHART_COLORS[0], r: 4 }}
                                                activeDot={{ r: 6 }}
                                                name="Người dùng"
                                            />
                                            <Line 
                                                type="monotone" 
                                                dataKey="posts" 
                                                stroke={CHART_COLORS[1]}
                                                strokeWidth={2}
                                                dot={{ fill: CHART_COLORS[1], r: 4 }}
                                                activeDot={{ r: 6 }}
                                                name="Bài viết"
                                            />
                                            <Line 
                                                type="monotone" 
                                                dataKey="comments" 
                                                stroke={CHART_COLORS[2]}
                                                strokeWidth={2}
                                                dot={{ fill: CHART_COLORS[2], r: 4 }}
                                                activeDot={{ r: 6 }}
                                                name="Bình luận"
                                            />
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Pie Chart - Categories */}
                    <motion.div variants={itemVariants}>
                        <Card className="relative overflow-hidden backdrop-blur-md bg-card/80 border border-border shadow-lg">
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-background" />
                            <CardHeader className="relative z-10">
                                <CardTitle className="flex items-center gap-2 text-xl">
                                    <PieChart className="h-6 w-6 text-primary" />
                                    Phân bố danh mục
                                </CardTitle>
                                <CardDescription className="text-base">
                                    Tỷ lệ bài viết theo từng danh mục
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="relative z-10">
                                <div className="space-y-6">
                                    {/* Donut Chart */}
                                    <div className="flex items-center justify-center">
                                        <ResponsiveContainer width="100%" height={320}>
                                            <RechartsPieChart>
                                                <Pie
                                                    data={categoryDataWithColors}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={60}
                                                    outerRadius={100}
                                                    paddingAngle={2}
                                                    dataKey="value"
                                                    label={false}
                                                >
                                                    {categoryDataWithColors.map((entry, index) => (
                                                        <Cell 
                                                            key={`cell-${index}`} 
                                                            fill={entry.color}
                                                            stroke="oklch(var(--background))"
                                                            strokeWidth={2}
                                                        />
                                                    ))}
                                                </Pie>
                                                <Tooltip 
                                                    content={({ active, payload }) => {
                                                        if (active && payload && payload.length) {
                                                            const data = payload[0]
                                                            const value = typeof data.value === "number" ? data.value : 0
                                                            const count = Math.round((value / 100) * 456)
                                                            return (
                                                                <div className="bg-background border border-border rounded-lg shadow-lg p-3 backdrop-blur-sm">
                                                                    <p className="text-sm font-semibold mb-1">{data.name}</p>
                                                                    <p className="text-xs text-muted-foreground">
                                                                        {value}% • {count} bài viết
                                                                    </p>
                                                                </div>
                                                            )
                                                        }
                                                        return null
                                                    }}
                                                />
                                            </RechartsPieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    
                                    {/* Enhanced Legend with values */}
                                    <div className="grid grid-cols-2 gap-4">
                                        {categoryDataWithColors.map((item, index) => {
                                            const count = Math.round((item.value / 100) * 456)
                                            return (
                                                <div 
                                                    key={item.name} 
                                                    className="flex items-center gap-3 p-3 rounded-lg bg-background/50 border border-border/50 hover:bg-background/70 transition-all group cursor-pointer"
                                                >
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-sm font-semibold truncate">{item.name}</div>
                                                        <div className="flex items-center gap-2 text-xs">
                                                            <span className="text-muted-foreground">{item.value}%</span>
                                                            <span className="text-muted-foreground">•</span>
                                                            <span className="font-medium">{count} bài viết</span>
                                                        </div>
                                                    </div>
                                                    <div className="text-xs font-bold text-muted-foreground">
                                                        #{index + 1}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>

                {/* Traffic Chart */}
                <motion.div variants={itemVariants}>
                    <Card className="relative overflow-hidden backdrop-blur-md bg-card/80 border border-border shadow-lg">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-background" />
                        <CardHeader className="relative z-10">
                            <CardTitle className="flex items-center gap-2 text-xl">
                                <Activity className="h-6 w-6 text-primary" />
                                Lưu lượng truy cập theo giờ
                            </CardTitle>
                            <CardDescription className="text-base">
                                Số lượt truy cập trong 24 giờ qua
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="relative z-10">
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={trafficData}>
                                        <defs>
                                            <linearGradient id="trafficGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#00cc44" stopOpacity={0.8} />
                                                <stop offset="95%" stopColor="#00ff88" stopOpacity={0.2} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                                        <XAxis 
                                            dataKey="time" 
                                            stroke="hsl(var(--muted-foreground))"
                                            fontSize={12}
                                            tickLine={{ stroke: "hsl(var(--border))" }}
                                        />
                                        <YAxis 
                                            stroke="hsl(var(--muted-foreground))"
                                            fontSize={12}
                                            tickLine={{ stroke: "hsl(var(--border))" }}
                                        />
                                        <Tooltip 
                                            content={({ active, payload }) => {
                                                if (active && payload && payload.length) {
                                                    const value = typeof payload[0].value === "number" ? payload[0].value : 0
                                                    return (
                                                        <div className="bg-background border border-border rounded-lg shadow-lg p-3 backdrop-blur-sm">
                                                            <p className="text-sm font-semibold mb-1">{payload[0].payload.time}</p>
                                                            <p className="text-xs" style={{ color: "#00cc44" }}>
                                                                {`${value} lượt truy cập`}
                                                            </p>
                                                        </div>
                                                    )
                                                }
                                                return null
                                            }}
                                        />
                                        <Area 
                                            type="monotone" 
                                            dataKey="visitors" 
                                            stroke="#00cc44"
                                            strokeWidth={2}
                                            fill="url(#trafficGradient)"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Top Posts Table */}
                <motion.div variants={itemVariants}>
                    <Card className="relative overflow-hidden backdrop-blur-md bg-card/80 border border-border shadow-lg">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-background" />
                        <CardHeader className="relative z-10">
                            <CardTitle className="flex items-center gap-2 text-xl">
                                <FileText className="h-6 w-6 text-primary" />
                                Bài viết phổ biến nhất
                            </CardTitle>
                            <CardDescription className="text-base">
                                Top 5 bài viết có lượt xem cao nhất
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="relative z-10">
                            <div className="space-y-4">
                                {topPosts.map((post, index) => (
                                    <motion.div
                                        key={post.title}
                                        className="flex items-center gap-4 p-4 rounded-xl bg-background/50 border border-border/50 backdrop-blur-sm hover:bg-background/70 transition-all duration-300 hover:shadow-md"
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.5 + index * 0.1 }}
                                    >
                                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold">
                                            {index + 1}
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-semibold text-sm mb-1">{post.title}</div>
                                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                                <div className="flex items-center gap-1">
                                                    <Eye className="h-3 w-3" />
                                                    {post.views.toLocaleString()}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <MousePointerClick className="h-3 w-3" />
                                                    {post.likes}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <MessageSquare className="h-3 w-3" />
                                                    {post.comments}
                                                </div>
                                            </div>
                                        </div>
                                        <ArrowUpRight className="h-5 w-5 text-muted-foreground opacity-50" />
                                    </motion.div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </motion.div>
        </div>
    )
}
