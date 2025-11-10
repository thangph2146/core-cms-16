import type { Contact, Group, GroupMember, Message, MessageType } from "@/components/chat/types"
import { isMessageUnreadByUser } from "@/components/chat/utils/message-helpers"

type DateLike = Date | string | number | null | undefined

interface MessageUserLike {
  id: string
  name: string | null
  email: string
  avatar: string | null
}

export interface MessageDetailLike {
  id: string
  content: string
  subject?: string | null
  senderId: string | null
  receiverId: string | null
  groupId?: string | null
  timestamp: DateLike
  isRead: boolean
  type?: string | null
  parentId?: string | null
  sender?: MessageUserLike | null
  receiver?: MessageUserLike | null
  readers?: MessageUserLike[]
}

interface GroupMemberLike {
  id: string
  groupId: string
  userId: string
  role: string
  joinedAt: DateLike
  leftAt?: DateLike | null
  user?: MessageUserLike | null
}

interface MessageSummaryLike {
  content?: string | null
  createdAt?: DateLike | null
}

export interface GroupListItemLike {
  id: string
  name: string
  description?: string | null
  avatar?: string | null
  createdById: string
  createdAt: DateLike
  updatedAt: DateLike
  deletedAt?: DateLike | null
  members: GroupMemberLike[]
  memberCount?: number
  lastMessage?: MessageSummaryLike | null
}

function parseDate(value: DateLike): Date | undefined {
  if (value instanceof Date) return value
  if (typeof value === "number") {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? undefined : date
  }
  if (typeof value === "string") {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? undefined : date
  }
  return undefined
}

export function ensureDate(value: DateLike, fallback?: DateLike): Date {
  const parsed = parseDate(value)
  if (parsed) return parsed

  const fallbackParsed = parseDate(fallback)
  if (fallbackParsed) return fallbackParsed

  return new Date()
}

function optionalDate(value: DateLike): Date | undefined {
  return parseDate(value)
}

function mapMember(member: GroupMemberLike): GroupMember {
  return {
    id: member.id,
    groupId: member.groupId,
    userId: member.userId,
    role: member.role as GroupMember["role"],
    joinedAt: ensureDate(member.joinedAt),
    leftAt: member.leftAt ? ensureDate(member.leftAt) : null,
    user: member.user
      ? {
          id: member.user.id,
          name: member.user.name,
          email: member.user.email,
          avatar: member.user.avatar,
        }
      : undefined,
  }
}

function castMessageType(type?: string | null): MessageType | undefined {
  if (!type) return undefined
  return type as MessageType
}

export function mapMessageDetailToMessage(detail: MessageDetailLike): Message {
  return {
    id: detail.id,
    content: detail.content,
    subject: detail.subject ?? undefined,
    senderId: detail.senderId,
    receiverId: detail.receiverId,
    groupId: detail.groupId ?? null,
    timestamp: ensureDate(detail.timestamp),
    isRead: detail.isRead,
    type: castMessageType(detail.type),
    parentId: detail.parentId ?? null,
    sender: detail.sender ?? null,
    receiver: detail.receiver ?? null,
    readers: detail.readers,
  }
}

export function mapGroupListItemToContact({
  groupData,
  messages = [],
  currentUserId,
}: {
  groupData: GroupListItemLike
  messages?: MessageDetailLike[]
  currentUserId: string
}): Contact {
  const mappedMessages = messages.map(mapMessageDetailToMessage)

  const groupMembers: GroupMember[] = (groupData.members || []).map(mapMember)

  const group: Group = {
    id: groupData.id,
    name: groupData.name,
    description: groupData.description ?? undefined,
    avatar: groupData.avatar ?? null,
    createdById: groupData.createdById,
    createdAt: ensureDate(groupData.createdAt),
    updatedAt: ensureDate(groupData.updatedAt),
    members: groupMembers,
    memberCount: groupData.memberCount ?? groupMembers.length,
  }

  const unreadCount = mappedMessages.filter((msg) => isMessageUnreadByUser(msg, currentUserId)).length

  return {
    id: groupData.id,
    name: groupData.name,
    image: groupData.avatar ?? null,
    lastMessage: groupData.lastMessage?.content ?? "",
    lastMessageTime: ensureDate(groupData.lastMessage?.createdAt, groupData.updatedAt),
    unreadCount,
    isOnline: false,
    messages: mappedMessages,
    type: "GROUP",
    group,
    isDeleted: Boolean(groupData.deletedAt),
  }
}

