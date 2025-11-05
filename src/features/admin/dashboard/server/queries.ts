import { cache } from "react"

export interface DashboardStatsData {
  overview: {
    totalUsers: number
    totalPosts: number
    totalComments: number
    totalViews: number
    usersChange: number
    postsChange: number
    commentsChange: number
    viewsChange: number
  }
  monthlyData: Array<{
    month: string
    users: number
    posts: number
    comments: number
    views: number
  }>
  categoryData: Array<{
    name: string
    value: number
  }>
  topPosts: Array<{
    title: string
    views: number
    likes: number
    comments: number
  }>
  trafficData: Array<{
    time: string
    visitors: number
  }>
}

/**
 * Get dashboard statistics
 * 
 * TODO: Implement real data fetching from database
 * Hiện tại trả về sample data, nhưng structure đã sẵn sàng cho real data
 */
export const getDashboardStatsCached = cache(async (): Promise<DashboardStatsData> => {
  // TODO: Fetch real data from database
  // const [userCount, postCount, commentCount, viewCount] = await Promise.all([
  //   prisma.user.count({ where: { deletedAt: null } }),
  //   prisma.post.count({ where: { deletedAt: null } }),
  //   prisma.comment.count({ where: { deletedAt: null } }),
  //   prisma.view.count(),
  // ])

  // Sample data structure - sẽ được thay thế bằng real data
  return {
    overview: {
      totalUsers: 1234,
      totalPosts: 456,
      totalComments: 2341,
      totalViews: 45200,
      usersChange: 12.5,
      postsChange: 8.2,
      commentsChange: 15.3,
      viewsChange: 22.1,
    },
    monthlyData: [
      { month: "Tháng 1", users: 1200, posts: 380, comments: 2100, views: 15200 },
      { month: "Tháng 2", users: 1250, posts: 420, comments: 2400, views: 16800 },
      { month: "Tháng 3", users: 1320, posts: 450, comments: 2600, views: 18500 },
      { month: "Tháng 4", users: 1400, posts: 480, comments: 2800, views: 20100 },
      { month: "Tháng 5", users: 1450, posts: 510, comments: 3000, views: 22000 },
      { month: "Tháng 6", users: 1500, posts: 540, comments: 3200, views: 23800 },
    ],
    categoryData: [
      { name: "Công nghệ", value: 35 },
      { name: "Giáo dục", value: 25 },
      { name: "Kinh doanh", value: 20 },
      { name: "Sức khỏe", value: 12 },
      { name: "Khác", value: 8 },
    ],
    topPosts: [
      { title: "Hướng dẫn React 2024", views: 15420, likes: 892, comments: 234 },
      { title: "Next.js 15 Best Practices", views: 12890, likes: 756, comments: 189 },
      { title: "TypeScript Advanced Tips", views: 11230, likes: 634, comments: 156 },
      { title: "Database Optimization", views: 9870, likes: 523, comments: 142 },
      { title: "API Design Patterns", views: 8650, likes: 467, comments: 128 },
    ],
    trafficData: [
      { time: "00:00", visitors: 120 },
      { time: "04:00", visitors: 80 },
      { time: "08:00", visitors: 350 },
      { time: "12:00", visitors: 680 },
      { time: "16:00", visitors: 920 },
      { time: "20:00", visitors: 750 },
      { time: "24:00", visitors: 280 },
    ],
  }
})

