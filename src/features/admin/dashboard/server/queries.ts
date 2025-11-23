import { cache } from "react"
import { prisma } from "@/lib/database"

export interface DashboardStatsData {
  overview: {
    totalUsers: number
    totalPosts: number
    totalComments: number
    totalCategories: number
    totalTags: number
    totalMessages: number
    totalNotifications: number
    totalContactRequests: number
    totalStudents: number
    totalSessions: number
    totalRoles: number
    usersChange: number
    postsChange: number
    commentsChange: number
    categoriesChange: number
    tagsChange: number
    messagesChange: number
    notificationsChange: number
    contactRequestsChange: number
    studentsChange: number
    sessionsChange: number
    rolesChange: number
  }
  monthlyData: Array<{
    month: string
    users: number
    posts: number
    comments: number
    categories: number
    tags: number
    messages: number
    notifications: number
    contactRequests: number
    students: number
    sessions: number
    roles: number
  }>
  categoryData: Array<{
    name: string
    value: number
  }>
  topPosts: Array<{
    id: string
    title: string
    slug: string
    comments: number
  }>
}

/**
 * Calculate percentage change between current and previous period
 */
function calculateChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return ((current - previous) / previous) * 100
}

/**
 * Get dashboard statistics from database (non-cached)
 * Fetches real data from Prisma based on schema.prisma
 * 
 * Theo chuẩn Next.js 16: không cache admin data - luôn fetch fresh data
 */
export async function getDashboardStats(): Promise<DashboardStatsData> {
  const now = new Date()
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  // Fetch current counts
  const [
    totalUsers,
    totalPosts,
    totalComments,
    totalCategories,
    totalTags,
    totalMessages,
    totalNotifications,
    totalContactRequests,
    totalStudents,
    totalSessions,
    totalRoles,
  ] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.post.count({ where: { deletedAt: null } }),
    prisma.comment.count({ where: { deletedAt: null } }),
    prisma.category.count({ where: { deletedAt: null } }),
    prisma.tag.count({ where: { deletedAt: null } }),
    prisma.message.count({ where: { deletedAt: null } }),
    prisma.notification.count(),
    prisma.contactRequest.count({ where: { deletedAt: null } }),
    prisma.student.count({ where: { deletedAt: null } }),
    prisma.session.count({ where: { isActive: true } }),
    prisma.role.count({ where: { deletedAt: null } }),
  ])

  // Fetch previous month counts for change calculation
  const [
    previousUsers,
    previousPosts,
    previousComments,
    previousCategories,
    previousTags,
    previousMessages,
    previousNotifications,
    previousContactRequests,
    previousStudents,
    previousSessions,
    previousRoles,
  ] = await Promise.all([
    prisma.user.count({
      where: {
        deletedAt: null,
        createdAt: { lt: currentMonthStart },
      },
    }),
    prisma.post.count({
      where: {
        deletedAt: null,
        createdAt: { lt: currentMonthStart },
      },
    }),
    prisma.comment.count({
      where: {
        deletedAt: null,
        createdAt: { lt: currentMonthStart },
      },
    }),
    prisma.category.count({
      where: {
        deletedAt: null,
        createdAt: { lt: currentMonthStart },
      },
    }),
    prisma.tag.count({
      where: {
        deletedAt: null,
        createdAt: { lt: currentMonthStart },
      },
    }),
    prisma.message.count({
      where: {
        deletedAt: null,
        createdAt: { lt: currentMonthStart },
      },
    }),
    prisma.notification.count({
      where: {
        createdAt: { lt: currentMonthStart },
      },
    }),
    prisma.contactRequest.count({
      where: {
        deletedAt: null,
        createdAt: { lt: currentMonthStart },
      },
    }),
    prisma.student.count({
      where: {
        deletedAt: null,
        createdAt: { lt: currentMonthStart },
      },
    }),
    prisma.session.count({
      where: {
        isActive: true,
        createdAt: { lt: currentMonthStart },
      },
    }),
    prisma.role.count({
      where: {
        deletedAt: null,
        createdAt: { lt: currentMonthStart },
      },
    }),
  ])

  // Calculate changes
  const usersChange = calculateChange(totalUsers, previousUsers)
  const postsChange = calculateChange(totalPosts, previousPosts)
  const commentsChange = calculateChange(totalComments, previousComments)
  const categoriesChange = calculateChange(totalCategories, previousCategories)
  const tagsChange = calculateChange(totalTags, previousTags)
  const messagesChange = calculateChange(totalMessages, previousMessages)
  const notificationsChange = calculateChange(totalNotifications, previousNotifications)
  const contactRequestsChange = calculateChange(totalContactRequests, previousContactRequests)
  const studentsChange = calculateChange(totalStudents, previousStudents)
  const sessionsChange = calculateChange(totalSessions, previousSessions)
  const rolesChange = calculateChange(totalRoles, previousRoles)

  // Fetch monthly data for last 6 months
  const monthlyData = []
  const monthNames = ["Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6"]
  
  for (let i = 5; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
    
    const [users, posts, comments, categories, tags, messages, notifications, contactRequests, students, sessions, roles] = await Promise.all([
      prisma.user.count({
        where: {
          deletedAt: null,
          createdAt: { gte: monthStart, lte: monthEnd },
        },
      }),
      prisma.post.count({
        where: {
          deletedAt: null,
          createdAt: { gte: monthStart, lte: monthEnd },
        },
      }),
      prisma.comment.count({
        where: {
          deletedAt: null,
          createdAt: { gte: monthStart, lte: monthEnd },
        },
      }),
      prisma.category.count({
        where: {
          deletedAt: null,
          createdAt: { gte: monthStart, lte: monthEnd },
        },
      }),
      prisma.tag.count({
        where: {
          deletedAt: null,
          createdAt: { gte: monthStart, lte: monthEnd },
        },
      }),
      prisma.message.count({
        where: {
          deletedAt: null,
          createdAt: { gte: monthStart, lte: monthEnd },
        },
      }),
      prisma.notification.count({
        where: {
          createdAt: { gte: monthStart, lte: monthEnd },
        },
      }),
      prisma.contactRequest.count({
        where: {
          deletedAt: null,
          createdAt: { gte: monthStart, lte: monthEnd },
        },
      }),
      prisma.student.count({
        where: {
          deletedAt: null,
          createdAt: { gte: monthStart, lte: monthEnd },
        },
      }),
      prisma.session.count({
        where: {
          isActive: true,
          createdAt: { gte: monthStart, lte: monthEnd },
        },
      }),
      prisma.role.count({
        where: {
          deletedAt: null,
          createdAt: { gte: monthStart, lte: monthEnd },
        },
      }),
    ])

    monthlyData.push({
      month: monthNames[5 - i] || `Tháng ${now.getMonth() - i + 1}`,
      users,
      posts,
      comments,
      categories,
      tags,
      messages,
      notifications,
      contactRequests,
      students,
      sessions,
      roles,
    })
  }

  // Fetch category data (posts per category)
  // Category.posts is PostCategory[], so we query PostCategory with post relation
  const postCategories = await prisma.postCategory.findMany({
    include: {
      post: {
        select: { id: true, deletedAt: true },
      },
      category: {
        select: { id: true, name: true, deletedAt: true },
      },
    },
  })

  // Filter and group: only count posts and categories that are not deleted
  const categoryPostCountMap = new Map<string, number>()
  
  for (const pc of postCategories) {
    if (pc.post.deletedAt === null && pc.category.deletedAt === null) {
      const currentCount = categoryPostCountMap.get(pc.categoryId) || 0
      categoryPostCountMap.set(pc.categoryId, currentCount + 1)
    }
  }

  // Get all active categories
  const categories = await prisma.category.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true },
  })

  const categoryData = categories
    .map((cat) => {
      const postCount = categoryPostCountMap.get(cat.id) || 0
      return {
        name: cat.name,
        value: totalPosts > 0 ? Math.round((postCount / totalPosts) * 100) : 0,
      }
    })
    .filter((cat) => cat.value > 0) // Only show categories with posts
    .sort((a, b) => b.value - a.value)

  // Fetch top posts by comment count
  const topPosts = await prisma.post.findMany({
    where: { deletedAt: null },
    include: {
      comments: {
        where: { deletedAt: null },
        select: { id: true },
      },
    },
    orderBy: {
      comments: {
        _count: "desc",
      },
    },
    take: 5,
  })

  const topPostsData = topPosts.map((post) => ({
    id: post.id,
    title: post.title,
    slug: post.slug,
    comments: post.comments.length,
  }))

      return {
        overview: {
          totalUsers,
          totalPosts,
          totalComments,
          totalCategories,
          totalTags,
          totalMessages,
          totalNotifications,
          totalContactRequests,
          totalStudents,
          totalSessions,
          totalRoles,
          usersChange,
          postsChange,
          commentsChange,
          categoriesChange,
          tagsChange,
          messagesChange,
          notificationsChange,
          contactRequestsChange,
          studentsChange,
          sessionsChange,
          rolesChange,
        },
        monthlyData,
        categoryData,
        topPosts: topPostsData,
      }
}

/**
 * Cached version (deprecated - chỉ giữ lại để tương thích ngược)
 * @deprecated Sử dụng getDashboardStats() thay vì getDashboardStatsCached()
 */
export const getDashboardStatsCached = cache(async (): Promise<DashboardStatsData> => {
  return getDashboardStats()
})

