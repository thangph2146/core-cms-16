import { prisma } from "@/lib/database"
import type { MessageWithRelations } from "./queries"
import {
  ApplicationError,
  NotFoundError,
  type AuthContext,
} from "@/features/admin/resources/server"
import { getSocketServer } from "@/lib/socket/state"
import { logger } from "@/lib/config"
import { emitGroupDeleted, emitGroupHardDeleted, emitGroupRestored } from "./events"

export interface CreateMessageInput {
  content: string
  subject?: string
  receiverId?: string | null // Nullable for group messages
  groupId?: string | null // For group messages
  parentId?: string | null
  type?: "NOTIFICATION" | "ANNOUNCEMENT" | "PERSONAL" | "SYSTEM"
}

export interface MarkMessagesAsReadInput {
  messageIds: string[]
  userId: string
}

export async function createMessage(ctx: AuthContext, input: CreateMessageInput): Promise<MessageWithRelations> {
  if (!input.content) {
    throw new ApplicationError("Content là bắt buộc", 400)
  }

  if (!ctx.actorId) {
    throw new ApplicationError("Unauthorized", 401)
  }

  // Validate: either receiverId (personal) or groupId (group) must be provided
  if (!input.receiverId && !input.groupId) {
    throw new ApplicationError("receiverId hoặc groupId là bắt buộc", 400)
  }

  if (input.receiverId && input.groupId) {
    throw new ApplicationError("Không thể có cả receiverId và groupId", 400)
  }

  // Verify receiver exists (for personal messages)
  if (input.receiverId) {
  const receiver = await prisma.user.findUnique({
    where: { id: input.receiverId },
  })

  if (!receiver) {
    throw new NotFoundError("Người nhận không tồn tại")
    }
  }

  // Verify group exists and user is a member (for group messages)
  if (input.groupId) {
    const groupMember = await prisma.groupMember.findFirst({
      where: {
        groupId: input.groupId,
        userId: ctx.actorId,
        leftAt: null,
      },
      include: {
        group: true,
      },
    })

    if (!groupMember) {
      throw new ApplicationError("Bạn không phải thành viên của nhóm này", 403)
    }
  }

  // Verify parent message exists if provided
  if (input.parentId) {
    const parentMessage = await prisma.message.findUnique({
      where: { id: input.parentId },
    })

    if (!parentMessage) {
      throw new NotFoundError("Tin nhắn gốc không tồn tại")
    }
  }

  const message = await prisma.message.create({
    data: {
      content: input.content.trim(),
      subject: input.subject || "PERSONAL",
      senderId: ctx.actorId,
      receiverId: input.receiverId || null,
      groupId: input.groupId || null,
      parentId: input.parentId || null,
      type: input.type || "PERSONAL",
      isRead: false,
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
  })

  // Emit socket event (tương tự notifications pattern)
  const io = getSocketServer()
  if (io) {
    try {
      const payload = {
        id: message.id,
        parentMessageId: message.parentId || undefined,
        content: message.content,
        fromUserId: message.senderId || ctx.actorId,
        toUserId: message.receiverId || undefined,
        groupId: message.groupId || undefined,
        timestamp: message.createdAt.getTime(),
      }

      if (input.groupId) {
        // Group message: emit đến tất cả members của group
        const groupMembers = await prisma.groupMember.findMany({
          where: {
            groupId: input.groupId,
            leftAt: null,
          },
          select: { userId: true },
        })

        const memberIds = groupMembers.map((m) => m.userId)
        memberIds.forEach((userId) => {
          io.to(`user:${userId}`).emit("message:new", payload)
        })

        logger.debug("Socket message:new emitted (group)", {
          messageId: message.id,
          groupId: input.groupId,
          memberCount: memberIds.length,
        })
      } else if (input.receiverId) {
        // Personal message: emit đến sender và receiver
        io.to(`user:${ctx.actorId}`).emit("message:new", payload)
        io.to(`user:${input.receiverId}`).emit("message:new", payload)
        
        logger.debug("Socket message:new emitted (personal)", {
          messageId: message.id,
          fromUserId: message.senderId,
          toUserId: message.receiverId,
        })
      }
    } catch (error) {
      logger.error("Failed to emit socket message", error instanceof Error ? error : new Error(String(error)))
    }
  }

  return message
}

export async function markMessageAsRead(ctx: AuthContext, messageId: string, userId: string) {
  if (!messageId || !userId) {
    throw new ApplicationError("Message ID and User ID are required", 400)
  }

  if (!ctx.actorId || ctx.actorId !== userId) {
    throw new ApplicationError("Unauthorized", 401)
  }

  // Verify message exists
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    select: { id: true, receiverId: true, groupId: true, isRead: true, senderId: true },
  })

  if (!message) {
    throw new NotFoundError("Message not found")
  }

  // For personal messages: check receiverId
  if (message.receiverId && message.receiverId !== userId) {
    throw new ApplicationError("Forbidden: You can only mark your own received messages as read", 403)
  }

  // For group messages: check if user is a member of the group
  if (message.groupId) {
    const member = await prisma.groupMember.findFirst({
      where: {
        groupId: message.groupId,
        userId: userId,
        leftAt: null,
      },
    })

    if (!member) {
      throw new ApplicationError("Forbidden: You must be a member of the group to mark messages as read", 403)
    }

    // Don't allow marking own messages as read in groups
    if (message.senderId === userId) {
      throw new ApplicationError("Forbidden: You cannot mark your own sent messages as read", 403)
    }
  }

  // For group messages: use MessageRead table
  if (message.groupId) {
    // Check if already read by this user
    const existingRead = await prisma.messageRead.findUnique({
      where: {
        messageId_userId: {
          messageId,
          userId,
        },
      },
    })

    if (existingRead) {
      // Already read, return message with reads
      return await prisma.message.findUnique({
        where: { id: messageId },
        include: {
          sender: { select: { id: true, name: true, email: true, avatar: true } },
          receiver: { select: { id: true, name: true, email: true, avatar: true } },
          reads: {
            include: {
              user: { select: { id: true, name: true, email: true, avatar: true } },
            },
          },
        },
      })
    }

    // Create MessageRead record
    await prisma.messageRead.create({
      data: {
        messageId,
        userId,
      },
    })

    // Return message with reads
    const messageWithReads = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        sender: { select: { id: true, name: true, email: true, avatar: true } },
        receiver: { select: { id: true, name: true, email: true, avatar: true } },
        reads: {
          include: {
            user: { select: { id: true, name: true, email: true, avatar: true } },
          },
        },
      },
    })

    // Emit socket event with readers data
    const io = getSocketServer()
    if (io && messageWithReads) {
      try {
        const readers = messageWithReads.reads
          ?.filter((read) => read.user)
          .map((read) => ({
            id: read.user.id,
            name: read.user.name,
            email: read.user.email,
            avatar: read.user.avatar,
          })) || []

        const payload = {
          id: messageWithReads.id,
          parentMessageId: messageWithReads.parentId || undefined,
          content: messageWithReads.content,
          fromUserId: messageWithReads.senderId || "",
          toUserId: messageWithReads.receiverId,
          groupId: messageWithReads.groupId || undefined,
          timestamp: messageWithReads.createdAt.getTime(),
          isRead: messageWithReads.isRead,
          readers, // Include readers array in payload
        }

        // Emit to all group members
        if (!messageWithReads.groupId) return messageWithReads
        const members = await prisma.groupMember.findMany({
          where: { groupId: messageWithReads.groupId, leftAt: null },
          select: { userId: true },
        })
        members.forEach((member) => {
          io.to(`user:${member.userId}`).emit("message:updated", payload)
        })
        logger.debug("Socket message:updated emitted (group with readers)", { messageId, groupId: messageWithReads.groupId, userId })
      } catch (error) {
        logger.error("Failed to emit socket message update", error instanceof Error ? error : new Error(String(error)))
      }
    }

    return messageWithReads
  }

  // For personal messages: use legacy isRead field
  // Skip update if already read
  if (message.isRead) {
    return await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        sender: { select: { id: true, name: true, email: true, avatar: true } },
        receiver: { select: { id: true, name: true, email: true, avatar: true } },
      },
    })
  }

  const updated = await prisma.message.update({
    where: { id: messageId },
    data: { isRead: true },
    include: {
      sender: { select: { id: true, name: true, email: true, avatar: true } },
      receiver: { select: { id: true, name: true, email: true, avatar: true } },
    },
  })

  // Emit socket event (tương tự notifications)
  const io = getSocketServer()
  if (io) {
    try {
      const payload = {
        id: updated.id,
        parentMessageId: updated.parentId || undefined,
        content: updated.content,
        fromUserId: updated.senderId || "",
        toUserId: updated.receiverId,
        groupId: updated.groupId || undefined,
        timestamp: updated.createdAt.getTime(),
        isRead: updated.isRead, // Include isRead status
      }
      
      // Emit to user for personal messages, or to all group members for group messages
      if (updated.groupId) {
        const members = await prisma.groupMember.findMany({
          where: { groupId: updated.groupId, leftAt: null },
          select: { userId: true },
        })
        members.forEach((member) => {
          io.to(`user:${member.userId}`).emit("message:updated", payload)
        })
        logger.debug("Socket message:updated emitted (group)", { messageId, groupId: updated.groupId, userId })
      } else {
        io.to(`user:${userId}`).emit("message:updated", payload)
        logger.debug("Socket message:updated emitted", { messageId, userId })
      }
    } catch (error) {
      logger.error("Failed to emit socket message update", error instanceof Error ? error : new Error(String(error)))
    }
  }

  return updated
}

export async function markMessageAsUnread(ctx: AuthContext, messageId: string, userId: string) {
  if (!messageId || !userId) {
    throw new ApplicationError("Message ID and User ID are required", 400)
  }

  if (!ctx.actorId || ctx.actorId !== userId) {
    throw new ApplicationError("Unauthorized", 401)
  }

  // Verify message exists
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    select: { id: true, receiverId: true, groupId: true, isRead: true, senderId: true },
  })

  if (!message) {
    throw new NotFoundError("Message not found")
  }

  // For personal messages: check receiverId
  if (message.receiverId && message.receiverId !== userId) {
    throw new ApplicationError("Forbidden: You can only mark your own received messages as unread", 403)
  }

  // For group messages: check if user is a member of the group
  if (message.groupId) {
    const member = await prisma.groupMember.findFirst({
      where: {
        groupId: message.groupId,
        userId: userId,
        leftAt: null,
      },
    })

    if (!member) {
      throw new ApplicationError("Forbidden: You must be a member of the group to mark messages as unread", 403)
    }

    // Don't allow marking own messages as unread in groups
    if (message.senderId === userId) {
      throw new ApplicationError("Forbidden: You cannot mark your own sent messages as unread", 403)
    }
  }

  // Skip update if already unread
  if (!message.isRead) {
    return await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        sender: { select: { id: true, name: true, email: true, avatar: true } },
        receiver: { select: { id: true, name: true, email: true, avatar: true } },
      },
    })
  }

  const updated = await prisma.message.update({
    where: { id: messageId },
    data: { isRead: false },
    include: {
      sender: { select: { id: true, name: true, email: true, avatar: true } },
      receiver: { select: { id: true, name: true, email: true, avatar: true } },
    },
  })

  // Emit socket event
  const io = getSocketServer()
  if (io) {
    try {
      const payload = {
        id: updated.id,
        parentMessageId: updated.parentId || undefined,
        content: updated.content,
        fromUserId: updated.senderId || "",
        toUserId: updated.receiverId,
        groupId: updated.groupId || undefined,
        timestamp: updated.createdAt.getTime(),
        isRead: updated.isRead, // Include isRead status
      }
      
      // Emit to user for personal messages, or to all group members for group messages
      if (updated.groupId) {
        const members = await prisma.groupMember.findMany({
          where: { groupId: updated.groupId, leftAt: null },
          select: { userId: true },
        })
        members.forEach((member) => {
          io.to(`user:${member.userId}`).emit("message:updated", payload)
        })
        logger.debug("Socket message:updated emitted (group)", { messageId, groupId: updated.groupId, userId })
      } else {
        io.to(`user:${userId}`).emit("message:updated", payload)
        logger.debug("Socket message:updated emitted", { messageId, userId })
      }
    } catch (error) {
      logger.error("Failed to emit socket message update", error instanceof Error ? error : new Error(String(error)))
    }
  }

  return updated
}

export async function markMessagesAsRead(ctx: AuthContext, input: MarkMessagesAsReadInput): Promise<{ count: number }> {
  if (!input.messageIds || input.messageIds.length === 0) {
    return { count: 0 }
  }

  if (!ctx.actorId || ctx.actorId !== input.userId) {
    throw new ApplicationError("Unauthorized", 401)
  }

  const result = await prisma.message.updateMany({
    where: {
      id: { in: input.messageIds },
      receiverId: input.userId,
      isRead: false,
    },
    data: {
      isRead: true,
    },
  })

  // Emit socket events for updated messages
  if (result.count > 0) {
    const io = getSocketServer()
    if (io) {
      try {
        // Fetch full messages với isRead status
        const fullMessages = await prisma.message.findMany({
          where: {
            id: { in: input.messageIds },
            receiverId: input.userId,
          },
          select: { id: true, content: true, senderId: true, receiverId: true, parentId: true, createdAt: true, isRead: true },
          take: 50,
        })

        fullMessages.forEach((msg) => {
          const payload = {
            id: msg.id,
            parentMessageId: msg.parentId || undefined,
            content: msg.content,
            fromUserId: msg.senderId || "",
            toUserId: msg.receiverId,
            timestamp: msg.createdAt.getTime(),
            isRead: msg.isRead,
          }
          io.to(`user:${input.userId}`).emit("message:updated", payload)
        })

        logger.debug("Socket messages:updated emitted (bulk)", { userId: input.userId, count: fullMessages.length })
      } catch (error) {
        logger.error("Failed to emit socket messages update", error instanceof Error ? error : new Error(String(error)))
      }
    }
  }

  return { count: result.count }
}

export async function markConversationAsRead(
  ctx: AuthContext,
  userId: string,
  otherUserId: string
): Promise<{ count: number }> {
  if (!ctx.actorId || ctx.actorId !== userId) {
    throw new ApplicationError("Unauthorized", 401)
  }

  const result = await prisma.message.updateMany({
    where: {
      senderId: otherUserId,
      receiverId: userId,
      isRead: false,
      deletedAt: null,
    },
    data: {
      isRead: true,
    },
  })

  // Emit socket events for updated messages
  if (result.count > 0) {
    const io = getSocketServer()
    if (io) {
      try {
        // Fetch updated messages để emit
        const updatedMessages = await prisma.message.findMany({
          where: {
            senderId: otherUserId,
            receiverId: userId,
            isRead: true,
            deletedAt: null,
          },
          select: { id: true, content: true, senderId: true, receiverId: true, parentId: true, createdAt: true, isRead: true },
          orderBy: { createdAt: "desc" },
          take: 50, // Limit để tránh quá nhiều events
        })

        updatedMessages.forEach((msg) => {
          const payload = {
            id: msg.id,
            parentMessageId: msg.parentId || undefined,
            content: msg.content,
            fromUserId: msg.senderId || "",
            toUserId: msg.receiverId,
            timestamp: msg.createdAt.getTime(),
            isRead: msg.isRead,
          }
          io.to(`user:${userId}`).emit("message:updated", payload)
        })

        logger.debug("Socket messages:updated emitted (conversation)", {
          userId,
          otherUserId,
          count: updatedMessages.length,
        })
      } catch (error) {
        logger.error("Failed to emit socket messages update", error instanceof Error ? error : new Error(String(error)))
      }
    }
  }

  return { count: result.count }
}

export async function markGroupMessagesAsRead(
  ctx: AuthContext,
  userId: string,
  groupId: string
): Promise<{ count: number }> {
  if (!ctx.actorId || ctx.actorId !== userId) {
    throw new ApplicationError("Unauthorized", 401)
  }

  // Verify user is a member of the group
  const member = await prisma.groupMember.findFirst({
    where: {
      groupId,
      userId,
      leftAt: null,
    },
  })

  if (!member) {
    throw new ApplicationError("Forbidden: You must be a member of the group", 403)
  }

  // Get all unread messages in the group that the user hasn't read yet
  const unreadMessages = await prisma.message.findMany({
    where: {
      groupId,
      deletedAt: null,
      senderId: { not: userId }, // Don't mark own messages as read
      reads: {
        none: {
          userId,
        },
      },
    },
    select: { id: true },
  })

  if (unreadMessages.length === 0) {
    return { count: 0 }
  }

  // Create MessageRead records for all unread messages
  const messageIds = unreadMessages.map((msg) => msg.id)
  await prisma.messageRead.createMany({
    data: messageIds.map((messageId) => ({
      messageId,
      userId,
    })),
    skipDuplicates: true, // Skip if already exists
  })

  // Fetch updated messages with reads to emit socket events
  const updatedMessages = await prisma.message.findMany({
    where: {
      id: { in: messageIds },
    },
    include: {
      reads: {
        include: {
          user: { select: { id: true, name: true, email: true, avatar: true } },
        },
      },
    },
  })

  // Emit socket events for updated messages
  const io = getSocketServer()
  if (io && updatedMessages.length > 0) {
    try {
      const members = await prisma.groupMember.findMany({
        where: { groupId, leftAt: null },
        select: { userId: true },
      })

      updatedMessages.forEach((msg) => {
        const readers = msg.reads
          ?.filter((read) => read.user)
          .map((read) => ({
            id: read.user.id,
            name: read.user.name,
            email: read.user.email,
            avatar: read.user.avatar,
          })) || []

        const payload = {
          id: msg.id,
          parentMessageId: msg.parentId || undefined,
          content: msg.content,
          fromUserId: msg.senderId || "",
          toUserId: msg.receiverId,
          groupId: msg.groupId || undefined,
          timestamp: msg.createdAt.getTime(),
          isRead: msg.isRead,
          readers, // Include readers array
        }

        // Emit to all group members
        members.forEach((member) => {
          io.to(`user:${member.userId}`).emit("message:updated", payload)
        })
      })

      logger.debug("Socket messages:updated emitted (group mark all as read)", {
        userId,
        groupId,
        count: updatedMessages.length,
      })
    } catch (error) {
      logger.error("Failed to emit socket messages update", error instanceof Error ? error : new Error(String(error)))
    }
  }

  return { count: messageIds.length }
}

export interface CreateGroupInput {
  name: string
  description?: string
  avatar?: string | null
  memberIds: string[]
}

export async function createGroup(ctx: AuthContext, input: CreateGroupInput) {
  if (!input.name?.trim()) {
    throw new ApplicationError("Tên nhóm là bắt buộc", 400)
  }

  if (!ctx.actorId) {
    throw new ApplicationError("Unauthorized", 401)
  }

  if (!input.memberIds || input.memberIds.length === 0) {
    throw new ApplicationError("Phải có ít nhất một thành viên", 400)
  }

  // Verify all members exist
  const members = await prisma.user.findMany({
    where: {
      id: { in: input.memberIds },
      deletedAt: null,
    },
  })

  if (members.length !== input.memberIds.length) {
    throw new ApplicationError("Một hoặc nhiều thành viên không tồn tại", 400)
  }

  // Create group with creator as owner
  const group = await prisma.group.create({
    data: {
      name: input.name.trim(),
      description: input.description?.trim() || null,
      avatar: input.avatar || null,
      createdById: ctx.actorId,
      members: {
        create: [
          // Creator as owner
          {
            userId: ctx.actorId,
            role: "OWNER",
          },
          // Other members
          ...input.memberIds
            .filter((id) => id !== ctx.actorId)
            .map((userId) => ({
              userId,
              role: "MEMBER" as const,
            })),
        ],
      },
    },
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
  })

  return group
}

export interface AddGroupMembersInput {
  groupId: string
  memberIds: string[]
}

export async function addGroupMembers(ctx: AuthContext, input: AddGroupMembersInput) {
  if (!ctx.actorId) {
    throw new ApplicationError("Unauthorized", 401)
  }

  // Verify user is member of group
  const userMember = await prisma.groupMember.findFirst({
    where: {
      groupId: input.groupId,
      userId: ctx.actorId,
      leftAt: null,
      role: { in: ["OWNER", "ADMIN"] },
    },
  })

  if (!userMember) {
    throw new ApplicationError("Bạn không có quyền thêm thành viên", 403)
  }

  // Verify group exists
  const group = await prisma.group.findUnique({
    where: { id: input.groupId },
  })

  if (!group) {
    throw new NotFoundError("Nhóm không tồn tại")
  }

  // Verify all members exist and not already in group
  const existingMembers = await prisma.groupMember.findMany({
    where: {
      groupId: input.groupId,
      userId: { in: input.memberIds },
      leftAt: null,
    },
  })

  const existingMemberIds = existingMembers.map((m) => m.userId)
  const newMemberIds = input.memberIds.filter((id) => !existingMemberIds.includes(id))

  if (newMemberIds.length === 0) {
    throw new ApplicationError("Tất cả thành viên đã có trong nhóm", 400)
  }

  // Verify users exist
  const users = await prisma.user.findMany({
    where: {
      id: { in: newMemberIds },
      deletedAt: null,
    },
  })

  if (users.length !== newMemberIds.length) {
    throw new ApplicationError("Một hoặc nhiều thành viên không tồn tại", 400)
  }

  // Add members
  await prisma.groupMember.createMany({
    data: newMemberIds.map((userId) => ({
      groupId: input.groupId,
      userId,
      role: "MEMBER",
    })),
  })

  // Emit socket event for group update
  const io = getSocketServer()
  if (io) {
    try {
      const groupMembers = await prisma.groupMember.findMany({
        where: {
          groupId: input.groupId,
          leftAt: null,
        },
        select: { userId: true },
      })

      const memberIds = groupMembers.map((m) => m.userId)
      const group = await prisma.group.findUnique({
        where: { id: input.groupId },
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
      })

      if (group) {
        const payload = {
          id: group.id,
          name: group.name,
          description: group.description,
          avatar: group.avatar,
          memberCount: group.members.length,
        }

        memberIds.forEach((userId) => {
          io.to(`user:${userId}`).emit("group:updated", payload)
        })
      }
    } catch (error) {
      logger.error("Failed to emit socket group update", error instanceof Error ? error : new Error(String(error)))
    }
  }

  return { count: newMemberIds.length }
}

export interface UpdateGroupInput {
  groupId: string
  name?: string
  description?: string
  avatar?: string | null
}

export async function updateGroup(ctx: AuthContext, input: UpdateGroupInput) {
  if (!ctx.actorId) {
    throw new ApplicationError("Unauthorized", 401)
  }

  // Verify user is owner or admin
  const userMember = await prisma.groupMember.findFirst({
    where: {
      groupId: input.groupId,
      userId: ctx.actorId,
      leftAt: null,
      role: { in: ["OWNER", "ADMIN"] },
    },
  })

  if (!userMember) {
    throw new ApplicationError("Bạn không có quyền chỉnh sửa nhóm", 403)
  }

  // Verify group exists
  const group = await prisma.group.findUnique({
    where: { id: input.groupId },
  })

  if (!group) {
    throw new NotFoundError("Nhóm không tồn tại")
  }

  // Update group
  const updated = await prisma.group.update({
    where: { id: input.groupId },
    data: {
      ...(input.name && { name: input.name.trim() }),
      ...(input.description !== undefined && { description: input.description?.trim() || null }),
      ...(input.avatar !== undefined && { avatar: input.avatar }),
    },
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
  })

  // Emit socket event
  const io = getSocketServer()
  if (io) {
    try {
      const groupMembers = await prisma.groupMember.findMany({
        where: {
          groupId: input.groupId,
          leftAt: null,
        },
        select: { userId: true },
      })

      const memberIds = groupMembers.map((m) => m.userId)
      const payload = {
        id: updated.id,
        name: updated.name,
        description: updated.description,
        avatar: updated.avatar,
        memberCount: updated.members.length,
      }

      memberIds.forEach((userId) => {
        io.to(`user:${userId}`).emit("group:updated", payload)
      })
    } catch (error) {
      logger.error("Failed to emit socket group update", error instanceof Error ? error : new Error(String(error)))
    }
  }

  return updated
}

export async function deleteGroup(ctx: AuthContext, groupId: string) {
  if (!ctx.actorId) {
    throw new ApplicationError("Unauthorized", 401)
  }

  // Verify user is owner
  const userMember = await prisma.groupMember.findFirst({
    where: {
      groupId,
      userId: ctx.actorId,
      leftAt: null,
      role: "OWNER",
    },
  })

  if (!userMember) {
    throw new ApplicationError("Chỉ chủ nhóm mới có quyền xóa nhóm", 403)
  }

  // Verify group exists
  const group = await prisma.group.findUnique({
    where: { id: groupId },
  })

  if (!group) {
    throw new NotFoundError("Nhóm không tồn tại")
  }

  if (group.deletedAt) {
    throw new ApplicationError("Nhóm đã bị xóa", 400)
  }

  // Soft delete group
  const deleted = await prisma.group.update({
    where: { id: groupId },
    data: {
      deletedAt: new Date(),
    },
  })

  // Emit socket event
  await emitGroupDeleted(groupId)

  return deleted
}

export async function hardDeleteGroup(ctx: AuthContext, groupId: string) {
  if (!ctx.actorId) {
    throw new ApplicationError("Unauthorized", 401)
  }

  // Verify user is owner
  const userMember = await prisma.groupMember.findFirst({
    where: {
      groupId,
      userId: ctx.actorId,
      leftAt: null,
      role: "OWNER",
    },
  })

  if (!userMember) {
    throw new ApplicationError("Chỉ chủ nhóm mới có quyền xóa vĩnh viễn nhóm", 403)
  }

  // Verify group exists
  const group = await prisma.group.findUnique({
    where: { id: groupId },
  })

  if (!group) {
    throw new NotFoundError("Nhóm không tồn tại")
  }

  // Get members before deletion (for socket event)
  const groupMembers = await prisma.groupMember.findMany({
    where: {
      groupId,
      leftAt: null,
    },
    select: { userId: true },
  })

  const memberIds = groupMembers.map((m) => m.userId)

  // Hard delete group (cascade will delete members and messages)
  await prisma.group.delete({
    where: { id: groupId },
  })

  // Emit socket event (using cached memberIds)
  await emitGroupHardDeleted(groupId, memberIds)

  return { success: true }
}

export async function restoreGroup(ctx: AuthContext, groupId: string) {
  if (!ctx.actorId) {
    throw new ApplicationError("Unauthorized", 401)
  }

  // Verify user is owner
  const userMember = await prisma.groupMember.findFirst({
    where: {
      groupId,
      userId: ctx.actorId,
      leftAt: null,
      role: "OWNER",
    },
  })

  if (!userMember) {
    throw new ApplicationError("Chỉ chủ nhóm mới có quyền khôi phục nhóm", 403)
  }

  // Verify group exists and is deleted
  const group = await prisma.group.findUnique({
    where: { id: groupId },
  })

  if (!group) {
    throw new NotFoundError("Nhóm không tồn tại")
  }

  if (!group.deletedAt) {
    throw new ApplicationError("Nhóm chưa bị xóa", 400)
  }

  // Restore group
  const restored = await prisma.group.update({
    where: { id: groupId },
    data: {
      deletedAt: null,
    },
  })

  // Emit socket event
  await emitGroupRestored(groupId)

  return restored
}

export interface RemoveGroupMemberInput {
  groupId: string
  memberId: string
}

export async function removeGroupMember(ctx: AuthContext, input: RemoveGroupMemberInput) {
  if (!ctx.actorId) {
    throw new ApplicationError("Unauthorized", 401)
  }

  // Verify user is owner or admin
  const userMember = await prisma.groupMember.findFirst({
    where: {
      groupId: input.groupId,
      userId: ctx.actorId,
      leftAt: null,
      role: { in: ["OWNER", "ADMIN"] },
    },
  })

  if (!userMember) {
    throw new ApplicationError("Bạn không có quyền xóa thành viên", 403)
  }

  // Cannot remove owner
  const targetMember = await prisma.groupMember.findFirst({
    where: {
      groupId: input.groupId,
      userId: input.memberId,
      leftAt: null,
    },
  })

  if (!targetMember) {
    throw new NotFoundError("Thành viên không tồn tại trong nhóm")
  }

  if (targetMember.role === "OWNER") {
    throw new ApplicationError("Không thể xóa chủ nhóm", 400)
  }

  // Remove member (set leftAt)
  await prisma.groupMember.update({
    where: { id: targetMember.id },
    data: {
      leftAt: new Date(),
    },
  })

  // Emit socket event
  const io = getSocketServer()
  if (io) {
    try {
      const groupMembers = await prisma.groupMember.findMany({
        where: {
          groupId: input.groupId,
          leftAt: null,
        },
        select: { userId: true },
      })

      const memberIds = groupMembers.map((m) => m.userId)
      const group = await prisma.group.findUnique({
        where: { id: input.groupId },
        include: {
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
      })

      if (group) {
        const payload = {
          id: group.id,
          name: group.name,
          description: group.description,
          avatar: group.avatar,
          memberCount: group.members.length,
        }

        memberIds.forEach((userId) => {
          io.to(`user:${userId}`).emit("group:updated", payload)
        })
        io.to(`user:${input.memberId}`).emit("group:removed", { groupId: input.groupId })
      }
    } catch (error) {
      logger.error("Failed to emit socket group update", error instanceof Error ? error : new Error(String(error)))
    }
  }

  return { success: true }
}

export interface UpdateGroupMemberRoleInput {
  groupId: string
  memberId: string
  role: "ADMIN" | "MEMBER"
}

export async function updateGroupMemberRole(ctx: AuthContext, input: UpdateGroupMemberRoleInput) {
  if (!ctx.actorId) {
    throw new ApplicationError("Unauthorized", 401)
  }

  // Verify user is owner
  const userMember = await prisma.groupMember.findFirst({
    where: {
      groupId: input.groupId,
      userId: ctx.actorId,
      leftAt: null,
      role: "OWNER",
    },
  })

  if (!userMember) {
    throw new ApplicationError("Chỉ chủ nhóm mới có quyền thay đổi vai trò", 403)
  }

  // Verify target member exists
  const targetMember = await prisma.groupMember.findFirst({
    where: {
      groupId: input.groupId,
      userId: input.memberId,
      leftAt: null,
    },
  })

  if (!targetMember) {
    throw new NotFoundError("Thành viên không tồn tại trong nhóm")
  }

  // Cannot change owner role
  if (targetMember.role === "OWNER") {
    throw new ApplicationError("Không thể thay đổi vai trò của chủ nhóm", 400)
  }

  // Update role
  await prisma.groupMember.update({
    where: { id: targetMember.id },
    data: {
      role: input.role,
    },
  })

  // Emit socket event
  const io = getSocketServer()
  if (io) {
    try {
      const groupMembers = await prisma.groupMember.findMany({
        where: {
          groupId: input.groupId,
          leftAt: null,
        },
        select: { userId: true },
      })

      const memberIds = groupMembers.map((m) => m.userId)
      const group = await prisma.group.findUnique({
        where: { id: input.groupId },
        include: {
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
      })

      if (group) {
        const payload = {
          id: group.id,
          name: group.name,
          description: group.description,
          avatar: group.avatar,
          memberCount: group.members.length,
        }

        memberIds.forEach((userId) => {
          io.to(`user:${userId}`).emit("group:updated", payload)
        })
      }
    } catch (error) {
      logger.error("Failed to emit socket group update", error instanceof Error ? error : new Error(String(error)))
    }
  }

  return { success: true }
}

export async function softDeleteMessage(ctx: AuthContext, messageId: string) {
  if (!ctx.actorId) {
    throw new ApplicationError("Unauthorized", 401)
  }

  // Verify message exists
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    select: { id: true, senderId: true, receiverId: true, groupId: true, deletedAt: true },
  })

  if (!message) {
    throw new NotFoundError("Tin nhắn không tồn tại")
  }

  // Verify user is sender or receiver (for personal messages) or group member (for group messages)
  if (message.groupId) {
    const groupMember = await prisma.groupMember.findFirst({
      where: {
        groupId: message.groupId,
        userId: ctx.actorId,
        leftAt: null,
      },
    })

    if (!groupMember) {
      throw new ApplicationError("Bạn không có quyền xóa tin nhắn này", 403)
    }
  } else {
    if (message.senderId !== ctx.actorId && message.receiverId !== ctx.actorId) {
      throw new ApplicationError("Bạn không có quyền xóa tin nhắn này", 403)
    }
  }

  if (message.deletedAt) {
    throw new ApplicationError("Tin nhắn đã bị xóa", 400)
  }

  // Soft delete message
  const deleted = await prisma.message.update({
    where: { id: messageId },
    data: {
      deletedAt: new Date(),
    },
  })

  // Emit socket event
  const io = getSocketServer()
  if (io) {
    try {
      if (message.groupId) {
        const groupMembers = await prisma.groupMember.findMany({
          where: {
            groupId: message.groupId,
            leftAt: null,
          },
          select: { userId: true },
        })

        const memberIds = groupMembers.map((m) => m.userId)
        memberIds.forEach((userId) => {
          io.to(`user:${userId}`).emit("message:deleted", { id: messageId, groupId: message.groupId })
        })
      } else if (message.senderId && message.receiverId) {
        io.to(`user:${message.senderId}`).emit("message:deleted", { id: messageId })
        io.to(`user:${message.receiverId}`).emit("message:deleted", { id: messageId })
      }
    } catch (error) {
      logger.error("Failed to emit socket message delete", error instanceof Error ? error : new Error(String(error)))
    }
  }

  return deleted
}

export async function hardDeleteMessage(ctx: AuthContext, messageId: string) {
  if (!ctx.actorId) {
    throw new ApplicationError("Unauthorized", 401)
  }

  // Verify message exists
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    select: { id: true, senderId: true, receiverId: true, groupId: true },
  })

  if (!message) {
    throw new NotFoundError("Tin nhắn không tồn tại")
  }

  // Verify user is sender or receiver (for personal messages) or group member (for group messages)
  if (message.groupId) {
    const groupMember = await prisma.groupMember.findFirst({
      where: {
        groupId: message.groupId,
        userId: ctx.actorId,
        leftAt: null,
        role: { in: ["OWNER", "ADMIN"] },
      },
    })

    if (!groupMember) {
      throw new ApplicationError("Chỉ quản trị viên mới có quyền xóa vĩnh viễn tin nhắn trong nhóm", 403)
    }
  } else {
    if (message.senderId !== ctx.actorId && message.receiverId !== ctx.actorId) {
      throw new ApplicationError("Bạn không có quyền xóa tin nhắn này", 403)
    }
  }

  // Hard delete message
  await prisma.message.delete({
    where: { id: messageId },
  })

  // Emit socket event
  const io = getSocketServer()
  if (io) {
    try {
      if (message.groupId) {
        const groupMembers = await prisma.groupMember.findMany({
          where: {
            groupId: message.groupId,
            leftAt: null,
          },
          select: { userId: true },
        })

        const memberIds = groupMembers.map((m) => m.userId)
        memberIds.forEach((userId) => {
          io.to(`user:${userId}`).emit("message:hard-deleted", { id: messageId, groupId: message.groupId })
        })
      } else if (message.senderId && message.receiverId) {
        io.to(`user:${message.senderId}`).emit("message:hard-deleted", { id: messageId })
        io.to(`user:${message.receiverId}`).emit("message:hard-deleted", { id: messageId })
      }
    } catch (error) {
      logger.error("Failed to emit socket message hard delete", error instanceof Error ? error : new Error(String(error)))
    }
  }

  return { success: true }
}

export async function restoreMessage(ctx: AuthContext, messageId: string) {
  if (!ctx.actorId) {
    throw new ApplicationError("Unauthorized", 401)
  }

  // Verify message exists and is deleted
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    select: { id: true, senderId: true, receiverId: true, groupId: true, deletedAt: true },
  })

  if (!message) {
    throw new NotFoundError("Tin nhắn không tồn tại")
  }

  if (!message.deletedAt) {
    throw new ApplicationError("Tin nhắn chưa bị xóa", 400)
  }

  // Verify user is sender or receiver (for personal messages) or group member (for group messages)
  if (message.groupId) {
    const groupMember = await prisma.groupMember.findFirst({
      where: {
        groupId: message.groupId,
        userId: ctx.actorId,
        leftAt: null,
      },
    })

    if (!groupMember) {
      throw new ApplicationError("Bạn không có quyền khôi phục tin nhắn này", 403)
    }
  } else {
    if (message.senderId !== ctx.actorId && message.receiverId !== ctx.actorId) {
      throw new ApplicationError("Bạn không có quyền khôi phục tin nhắn này", 403)
    }
  }

  // Restore message
  const restored = await prisma.message.update({
    where: { id: messageId },
    data: {
      deletedAt: null,
    },
  })

  // Emit socket event
  const io = getSocketServer()
  if (io) {
    try {
      if (message.groupId) {
        const groupMembers = await prisma.groupMember.findMany({
          where: {
            groupId: message.groupId,
            leftAt: null,
          },
          select: { userId: true },
        })

        const memberIds = groupMembers.map((m) => m.userId)
        memberIds.forEach((userId) => {
          io.to(`user:${userId}`).emit("message:restored", { id: messageId, groupId: message.groupId })
        })
      } else if (message.senderId && message.receiverId) {
        io.to(`user:${message.senderId}`).emit("message:restored", { id: messageId })
        io.to(`user:${message.receiverId}`).emit("message:restored", { id: messageId })
      }
    } catch (error) {
      logger.error("Failed to emit socket message restore", error instanceof Error ? error : new Error(String(error)))
    }
  }

  return restored
}

// Re-export for backward compatibility
export { ApplicationError, NotFoundError, type AuthContext }

