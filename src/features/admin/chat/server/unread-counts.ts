import { prisma } from "@/lib/database"
import { cache } from "react"

export async function getTotalUnreadMessagesCount(userId: string): Promise<number> {
  // Count personal messages (receiverId = userId và isRead = false)
  const personalUnreadCount = await prisma.message.count({
    where: {
      receiverId: userId,
      isRead: false,
      deletedAt: null,
      groupId: null, // Chỉ personal messages
    },
  })

  // Count group messages (user chưa đọc - không có trong MessageRead)
  // Lấy tất cả groups mà user là member
  const userGroupMemberships = await prisma.groupMember.findMany({
    where: {
      userId,
      leftAt: null, // Chỉ groups đang active
    },
    select: {
      groupId: true,
    },
  })

  const groupIds = userGroupMemberships.map((gm) => gm.groupId)

  let groupUnreadCount = 0
  if (groupIds.length > 0) {
    // Count messages trong groups mà user chưa đọc
    // (senderId != userId và không có trong MessageRead)
    groupUnreadCount = await prisma.message.count({
      where: {
        groupId: { in: groupIds },
        senderId: { not: userId },
        deletedAt: null,
        reads: {
          none: {
            userId,
          },
        },
      },
    })
  }

  return personalUnreadCount + groupUnreadCount
}

export const getTotalUnreadMessagesCountCached = cache(getTotalUnreadMessagesCount)

