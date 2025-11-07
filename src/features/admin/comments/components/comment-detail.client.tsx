"use client"

import * as React from "react"
import { MessageSquare, User, Mail, FileText, Calendar, Clock, ExternalLink } from "lucide-react"
import { ResourceDetailPage, type ResourceDetailField, type ResourceDetailSection } from "@/features/admin/resources/components"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { formatDateVi } from "../utils"
import { apiClient } from "@/lib/api/axios"
import { apiRoutes } from "@/lib/api/routes"

export interface CommentDetailData {
  id: string
  content: string
  approved: boolean
  authorId: string
  authorName: string | null
  authorEmail: string
  postId: string
  postTitle: string
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  [key: string]: unknown
}

export interface CommentDetailClientProps {
  comment: CommentDetailData
  backUrl?: string
  canApprove?: boolean
}

// Reusable field item component
interface FieldItemProps {
  icon: React.ComponentType<{ className?: string }>
  label: string
  children: React.ReactNode
  iconColor?: string
}

const FieldItem = ({ icon: Icon, label, children, iconColor = "bg-muted" }: FieldItemProps) => (
  <div className="flex items-start gap-3">
    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconColor}`}>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </div>
    <div className="flex-1 min-w-0">
      <div className="text-xs font-medium text-muted-foreground mb-1.5">{label}</div>
      {children}
    </div>
  </div>
)

// Status field with Switch
interface StatusFieldProps {
  approved: boolean
  commentId: string
  canApprove: boolean
  onToggle: (newStatus: boolean) => void
  isToggling: boolean
}

const StatusField = ({ approved, commentId, canApprove, onToggle, isToggling }: StatusFieldProps) => {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
        <MessageSquare className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-muted-foreground mb-1.5">Trạng thái duyệt</div>
        <div className="flex items-center gap-2">
          <Switch
            checked={approved}
            disabled={isToggling || !canApprove}
            onCheckedChange={onToggle}
            aria-label={approved ? "Hủy duyệt bình luận" : "Duyệt bình luận"}
          />
          <span className="text-sm text-foreground">
            {approved ? "Đã duyệt" : "Chờ duyệt"}
          </span>
        </div>
      </div>
    </div>
  )
}

export function CommentDetailClient({ comment, backUrl = "/admin/comments", canApprove = false }: CommentDetailClientProps) {
  const [isToggling, setIsToggling] = React.useState(false)
  const [approved, setApproved] = React.useState(comment.approved)

  // Sync approved state when comment prop changes
  React.useEffect(() => {
    setApproved(comment.approved)
  }, [comment.approved])

  const handleToggleApprove = React.useCallback(
    async (newStatus: boolean) => {
      if (!canApprove || isToggling) return

      setIsToggling(true)
      try {
        if (newStatus) {
          await apiClient.post(apiRoutes.comments.approve(comment.id))
        } else {
          await apiClient.post(apiRoutes.comments.unapprove(comment.id))
        }
        setApproved(newStatus)
      } catch (error) {
        console.error("Error toggling approve status:", error)
        // Revert state on error
        setApproved(!newStatus)
      } finally {
        setIsToggling(false)
      }
    },
    [canApprove, comment.id, isToggling],
  )

  const detailFields: ResourceDetailField<CommentDetailData>[] = []

  const detailSections: ResourceDetailSection<CommentDetailData>[] = [
    {
      id: "basic",
      title: "Thông tin cơ bản",
      description: "Thông tin về bình luận, người bình luận, bài viết và thời gian",
      fieldsContent: (_fields, data) => {
        const commentData = data as CommentDetailData
        
        return (
          <div className="space-y-6">
            {/* Content Card */}
            <Card className="border border-border/50 bg-card p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-foreground mb-2">Nội dung</h3>
                  <div className="text-sm leading-relaxed whitespace-pre-wrap text-foreground break-words">
                    {commentData.content || "—"}
                  </div>
                </div>
              </div>
            </Card>

            {/* Status */}
            <StatusField 
              approved={approved} 
              commentId={comment.id}
              canApprove={canApprove}
              onToggle={handleToggleApprove}
              isToggling={isToggling}
            />

            <Separator />

            {/* Author Info */}
            <div className="grid gap-4 sm:grid-cols-2">
              <FieldItem icon={User} label="Người bình luận">
                <div className="text-sm font-medium text-foreground truncate">
                  {commentData.authorName || commentData.authorEmail || "—"}
                </div>
              </FieldItem>

              <FieldItem icon={Mail} label="Email">
                <a
                  href={`mailto:${commentData.authorEmail}`}
                  className="text-sm font-medium text-primary hover:underline truncate block transition-colors"
                >
                  {commentData.authorEmail || "—"}
                </a>
              </FieldItem>
            </div>

            <Separator />

            {/* Post Info */}
            <FieldItem icon={FileText} label="Bài viết">
              {commentData.postId ? (
                <a
                  href={`/admin/posts/${commentData.postId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 hover:underline transition-colors"
                >
                  <span className="truncate">{commentData.postTitle || "—"}</span>
                  <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-50 group-hover:opacity-100 transition-opacity" />
                </a>
              ) : (
                <div className="text-sm font-medium text-foreground truncate">{commentData.postTitle || "—"}</div>
              )}
            </FieldItem>

            <Separator />

            {/* Timestamps */}
            <div className="grid gap-4 sm:grid-cols-2">
              <FieldItem icon={Calendar} label="Ngày tạo">
                <div className="text-sm font-medium text-foreground">
                  {commentData.createdAt ? formatDateVi(commentData.createdAt) : "—"}
                </div>
              </FieldItem>

              <FieldItem icon={Clock} label="Cập nhật lần cuối">
                <div className="text-sm font-medium text-foreground">
                  {commentData.updatedAt ? formatDateVi(commentData.updatedAt) : "—"}
                </div>
              </FieldItem>
            </div>
          </div>
        )
      },
    },
  ]

  return (
    <ResourceDetailPage<CommentDetailData>
      data={comment}
      fields={detailFields}
      detailSections={detailSections}
      title={`Bình luận từ ${comment.authorName || comment.authorEmail}`}
      description={`Chi tiết bình luận trong bài viết "${comment.postTitle}"`}
      backUrl={backUrl}
      backLabel="Quay lại danh sách"
    />
  )
}
