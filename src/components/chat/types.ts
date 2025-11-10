export type MessageType = "NOTIFICATION" | "ANNOUNCEMENT" | "PERSONAL" | "SYSTEM"
export type GroupRole = "OWNER" | "ADMIN" | "MEMBER"
export type ChatType = "PERSONAL" | "GROUP"

export interface Message {
  id: string
  content: string
  subject?: string
  senderId: string | null
  receiverId: string | null // Nullable for group messages
  groupId?: string | null // For group messages
  timestamp: Date
  isRead: boolean
  type?: MessageType
  parentId?: string | null
}

export interface Group {
  id: string
  name: string
  description?: string
  avatar?: string | null
  createdById: string
  createdAt: Date
  updatedAt: Date
  members: GroupMember[]
  memberCount?: number
}

export interface GroupMember {
  id: string
  groupId: string
  userId: string
  role: GroupRole
  joinedAt: Date
  leftAt?: Date | null
  user?: {
    id: string
    name: string | null
    email: string
    avatar: string | null
  }
}

export interface Contact {
  id: string
  name: string
  email?: string
  image?: string | null
  lastMessage: string
  lastMessageTime: Date
  unreadCount: number
  isOnline: boolean
  messages: Message[]
  type?: ChatType // "PERSONAL" | "GROUP"
  group?: Group // For group chats
  isDeleted?: boolean // True if group is deleted
}

export type ChatFilterType = "ACTIVE" | "DELETED"

export interface ChatTemplateProps {
  contacts: Contact[]
  currentUserId: string
  role?: string | null
  onNewConversation?: (contact: Contact) => void
  onNewGroup?: (group: Group) => void
}

