export interface NotificationRow {
  id: string
  userId: string
  userEmail: string | null
  userName: string | null
  kind: string
  title: string
  description: string | null
  isRead: boolean
  actionUrl: string | null
  createdAt: string
  readAt: string | null
  expiresAt: string | null
}

