import { prisma } from "@/lib/database"
import { mapMessageRecord } from "./helpers"

export interface ListConversationsInput {
  userId: string
  page?: number
  limit?: number
  search?: string
}

export interface ListGroupsInput {
  userId: string
  page?: number
  limit?: number
  search?: string
  includeDeleted?: boolean // Include deleted groups
}

export interface ConversationListItem {
  id: string
  otherUser: {
    id: string
    name: string | null
    email: string
    avatar: string | null
    isOnline?: boolean
  }
  lastMessage: {
    id: string
    content: string
    timestamp: Date
    senderId: string | null
    isRead: boolean
  } | null
  unreadCount: number
  updatedAt: Date
}

export interface ListConversationsResult {
  data: ConversationListItem[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface MessageDetail {
  id: string
  content: string
  subject: string
  senderId: string | null
  receiverId: string | null
  groupId?: string | null
  timestamp: Date
  isRead: boolean
  type: string
  parentId: string | null
  parent?: MessageDetail | null
  sender?: {
    id: string
    name: string | null
    email: string
    avatar: string | null
  } | null
  receiver?: {
    id: string
    name: string | null
    email: string
    avatar: string | null
  } | null
  readers?: {
    id: string
    name: string | null
    email: string
    avatar: string | null
  }[] // List of users who have read this message (for group messages)
}

export async function listConversations(params: ListConversationsInput): Promise<ListConversationsResult> {
  const { userId, page = 1, limit = 50, search } = params

  // If search is provided, first find matching users
  let matchingUserIds: string[] | undefined = undefined
  if (search && search.trim().length > 0) {
    const searchValue = search.trim()
    const matchingUsers = await prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: searchValue, mode: "insensitive" } },
          { email: { contains: searchValue, mode: "insensitive" } },
        ],
      },
      select: { id: true },
    })
    matchingUserIds = matchingUsers.map((u) => u.id)
    
    // If no users match, return empty result
    if (matchingUserIds.length === 0) {
      return {
        data: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
        },
      }
    }
  }

  // Get distinct conversation partners
  const [sentMessages, receivedMessages] = await Promise.all([
    prisma.message.findMany({
      where: {
        senderId: userId,
        deletedAt: null,
        ...(matchingUserIds ? { receiverId: { in: matchingUserIds } } : {}),
      },
      select: {
        receiverId: true,
        receiver: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
      distinct: ["receiverId"],
    }),
    prisma.message.findMany({
      where: {
        receiverId: userId,
        deletedAt: null,
        ...(matchingUserIds ? { senderId: { in: matchingUserIds } } : {}),
      },
      select: {
        senderId: true,
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
      distinct: ["senderId"],
    }),
  ])

  // Combine and deduplicate conversation partners
  const conversationMap = new Map<string, ConversationListItem>()

  // Process sent messages
  sentMessages.forEach((msg) => {
    if (msg.receiverId && msg.receiver) {
      const key = msg.receiverId
      if (!conversationMap.has(key)) {
        conversationMap.set(key, {
          id: key,
          otherUser: {
            id: msg.receiver.id,
            name: msg.receiver.name,
            email: msg.receiver.email,
            avatar: msg.receiver.avatar,
          },
          lastMessage: null,
          unreadCount: 0,
          updatedAt: new Date(),
        })
      }
    }
  })

  // Process received messages
  receivedMessages.forEach((msg) => {
    if (msg.senderId && msg.sender) {
      const key = msg.senderId
      if (!conversationMap.has(key)) {
        conversationMap.set(key, {
          id: key,
          otherUser: {
            id: msg.sender.id,
            name: msg.sender.name,
            email: msg.sender.email,
            avatar: msg.sender.avatar,
          },
          lastMessage: null,
          unreadCount: 0,
          updatedAt: new Date(),
        })
      }
    }
  })

  // Get last message and unread count for each conversation
  const conversationIds = Array.from(conversationMap.keys())
  const conversations = await Promise.all(
    conversationIds.map(async (otherUserId) => {
      const [lastMessage, unreadCount] = await Promise.all([
        prisma.message.findFirst({
          where: {
            OR: [
              { senderId: userId, receiverId: otherUserId },
              { senderId: otherUserId, receiverId: userId },
            ],
            deletedAt: null,
          },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            content: true,
            createdAt: true,
            senderId: true,
            isRead: true,
          },
        }),
        prisma.message.count({
          where: {
            senderId: otherUserId,
            receiverId: userId,
            isRead: false,
            deletedAt: null,
          },
        }),
      ])

      const conversation = conversationMap.get(otherUserId)!
      conversation.lastMessage = lastMessage
        ? {
            id: lastMessage.id,
            content: lastMessage.content,
            timestamp: lastMessage.createdAt,
            senderId: lastMessage.senderId,
            isRead: lastMessage.isRead,
          }
        : null
      conversation.unreadCount = unreadCount
      conversation.updatedAt = lastMessage?.createdAt || conversation.updatedAt

      return conversation
    })
  )

  // Sort by updatedAt desc
  conversations.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())

  // Apply pagination
  const total = conversations.length
  const totalPages = Math.ceil(total / limit)
  const paginatedConversations = conversations.slice((page - 1) * limit, page * limit)

  return {
    data: paginatedConversations,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  }
}

export async function getMessagesBetweenUsers(
  userId: string,
  otherUserId: string,
  limit: number = 100
): Promise<MessageDetail[]> {
  const messages = await prisma.message.findMany({
    where: {
      OR: [
        { senderId: userId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: userId },
      ],
      deletedAt: null,
    },
    include: {
      sender: {
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
        },
      },
      receiver: {
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
        },
      },
      parent: {
        select: {
          id: true,
          content: true,
          senderId: true,
          receiverId: true,
          createdAt: true,
          isRead: true,
          type: true,
          parentId: true,
        },
      },
      reads: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
    take: limit,
  })

  return messages.map(mapMessageRecord)
}

export async function getMessagesForGroup(
  groupId: string,
  userId: string,
  limit: number = 100
): Promise<MessageDetail[]> {
  // Verify user is a member of the group
  const groupMember = await prisma.groupMember.findFirst({
    where: {
      groupId,
      userId,
      leftAt: null,
    },
  })

  if (!groupMember) {
    return []
  }

  const messages = await prisma.message.findMany({
    where: {
      groupId,
      deletedAt: null,
    },
    include: {
      sender: {
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
        },
      },
      receiver: {
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
        },
      },
      parent: {
        select: {
          id: true,
          content: true,
          senderId: true,
          receiverId: true,
          createdAt: true,
          isRead: true,
          type: true,
          parentId: true,
        },
      },
      reads: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
    take: limit,
  })

  return messages.map(mapMessageRecord)
}

export async function getMessageById(id: string): Promise<MessageDetail | null> {
  const message = await prisma.message.findUnique({
    where: { id },
    include: {
      sender: {
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
        },
      },
      receiver: {
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
        },
      },
      parent: {
        select: {
          id: true,
          content: true,
          senderId: true,
          receiverId: true,
          createdAt: true,
          isRead: true,
          type: true,
          parentId: true,
        },
      },
      reads: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
        },
      },
    },
  })

  if (!message) {
    return null
  }

  return mapMessageRecord(message)
}

export async function listGroups(input: ListGroupsInput) {
  const page = input.page || 1
  const limit = input.limit || 50
  const skip = (page - 1) * limit

  // Build search filter for group name if search is provided
  const groupSearchFilter = input.search && input.search.trim().length > 0
    ? { name: { contains: input.search.trim(), mode: "insensitive" as const } }
    : undefined

  const where: {
    userId: string
    leftAt: null
    group: {
      deletedAt?: null | { not: null }
      name?: { contains: string; mode: "insensitive" }
    }
  } = {
    userId: input.userId,
    leftAt: null,
    group: {
      ...(input.includeDeleted
        ? {} // Include all groups (deleted and active)
        : { deletedAt: null }), // Only active groups
      ...(groupSearchFilter ? groupSearchFilter : {}),
    },
  }

  const groupMembers = await prisma.groupMember.findMany({
    where,
    include: {
      group: {
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
          members: {
            where: { leftAt: null },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  avatar: true,
                },
              },
            },
          },
          messages: {
            where: { deletedAt: null },
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              id: true,
              content: true,
              createdAt: true,
              senderId: true,
            },
          },
        },
      },
    },
    orderBy: {
      group: {
        updatedAt: "desc",
      },
    },
    skip,
    take: limit,
  })

  const total = await prisma.groupMember.count({ where })

  const groupIds = groupMembers.map((gm) => gm.group.id)
  let unreadCountMap = new Map<string, number>()
  if (groupIds.length > 0) {
    const unreadCounts = await prisma.message.groupBy({
      by: ["groupId"],
      where: {
        groupId: { in: groupIds },
        deletedAt: null,
        senderId: { not: input.userId },
        reads: {
          none: {
            userId: input.userId,
          },
        },
      },
      _count: {
        _all: true,
      },
    })

    unreadCountMap = new Map(
      unreadCounts
        .filter((item): item is typeof item & { groupId: string } => Boolean(item.groupId))
        .map((item) => [item.groupId, item._count._all])
    )
  }

  return {
    data: groupMembers.map((gm) => ({
      id: gm.group.id,
      name: gm.group.name,
      description: gm.group.description,
      avatar: gm.group.avatar,
      createdById: gm.group.createdById,
      createdAt: gm.group.createdAt,
      updatedAt: gm.group.updatedAt,
      deletedAt: gm.group.deletedAt,
      creator: gm.group.creator,
      members: gm.group.members.map((m) => ({
        id: m.id,
        groupId: m.groupId,
        userId: m.userId,
        role: m.role,
        joinedAt: m.joinedAt,
        leftAt: m.leftAt,
        user: m.user,
      })),
      lastMessage: gm.group.messages[0] || null,
      memberCount: gm.group.members.length,
      unreadCount: unreadCountMap.get(gm.group.id) ?? 0,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}

export async function getGroup(groupId: string, userId: string) {
  const groupMember = await prisma.groupMember.findFirst({
    where: {
      groupId,
      userId,
      leftAt: null,
      group: {
        deletedAt: null,
      },
    },
    include: {
      group: {
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
          members: {
            where: { leftAt: null },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  avatar: true,
                },
              },
            },
          },
        },
      },
    },
  })

  if (!groupMember) {
    return null
  }

  return {
    id: groupMember.group.id,
    name: groupMember.group.name,
    description: groupMember.group.description,
    avatar: groupMember.group.avatar,
    createdById: groupMember.group.createdById,
    createdAt: groupMember.group.createdAt,
    updatedAt: groupMember.group.updatedAt,
    creator: groupMember.group.creator,
    members: groupMember.group.members.map((m) => ({
      id: m.id,
      groupId: m.groupId,
      userId: m.userId,
      role: m.role,
      joinedAt: m.joinedAt,
      leftAt: m.leftAt,
      user: m.user,
    })),
    memberCount: groupMember.group.members.length,
    userRole: groupMember.role,
  }
}

// Re-export helpers
export { mapMessageRecord, mapConversationRecord, type MessageWithRelations } from "./helpers"
