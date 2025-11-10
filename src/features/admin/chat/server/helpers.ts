/**
 * Helper Functions for Messages/Chat Server Logic
 */

import type { Prisma } from "@prisma/client"
import type { ListConversationsInput, MessageDetail } from "./queries"

export type MessageWithRelations = Prisma.MessageGetPayload<{
  include: {
    sender: {
      select: {
        id: true
        name: true
        email: true
        avatar: true
      }
    }
    receiver: {
      select: {
        id: true
        name: true
        email: true
        avatar: true
      }
    }
    parent: {
      select: {
        id: true
        content: true
        senderId: true
        receiverId: true
        createdAt: true
        isRead: true
        type: true
        parentId: true
      }
    }
  }
}>

/**
 * Map Prisma message record to MessageDetail format
 */
export function mapMessageRecord(message: MessageWithRelations): MessageDetail {
  return {
    id: message.id,
    content: message.content,
    subject: message.subject,
    senderId: message.senderId,
    receiverId: message.receiverId || null,
    groupId: message.groupId || null,
    timestamp: message.createdAt,
    isRead: message.isRead,
    type: message.type,
    parentId: message.parentId,
    parent: message.parent
      ? {
          id: message.parent.id,
          content: message.parent.content,
          subject: "",
          senderId: message.parent.senderId,
          receiverId: message.parent.receiverId || null,
          groupId: undefined,
          timestamp: message.parent.createdAt,
          isRead: message.parent.isRead,
          type: message.parent.type,
          parentId: message.parent.parentId,
          receiver: message.receiver
            ? {
                id: message.receiver.id,
                name: message.receiver.name,
                email: message.receiver.email,
                avatar: message.receiver.avatar,
              }
            : null,
        }
      : null,
    sender: message.sender
      ? {
          id: message.sender.id,
          name: message.sender.name,
          email: message.sender.email,
          avatar: message.sender.avatar,
        }
      : null,
    receiver: message.receiver
      ? {
          id: message.receiver.id,
          name: message.receiver.name,
          email: message.receiver.email,
          avatar: message.receiver.avatar,
        }
      : null,
  }
}

/**
 * Map conversation data
 */
export function mapConversationRecord(data: unknown) {
  // Placeholder for future use
  return data
}

/**
 * Build Prisma where clause for conversations
 */
export function buildConversationWhereClause(params: ListConversationsInput): Prisma.MessageWhereInput {
  const where: Prisma.MessageWhereInput = {
    deletedAt: null,
  }

  if (params.userId) {
    where.OR = [
      { senderId: params.userId },
      { receiverId: params.userId },
    ]
  }

  if (params.search) {
    const searchValue = params.search.trim()
    if (searchValue.length > 0) {
      where.content = { contains: searchValue, mode: "insensitive" }
    }
  }

  return where
}

