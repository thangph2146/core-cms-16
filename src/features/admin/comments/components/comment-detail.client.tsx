"use client"

import * as React from "react"
import { useQueryClient } from "@tanstack/react-query"
import { MessageSquare, User, Mail, FileText, Calendar, Clock, ExternalLink } from "lucide-react"
import { 
  ResourceDetailPage, 
  FieldItem,
  type ResourceDetailField, 
  type ResourceDetailSection 
} from "@/features/admin/resources/components"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { formatDateVi } from "../utils"
import { apiClient } from "@/lib/api/axios"
import { apiRoutes } from "@/lib/api/routes"
import { resourceLogger } from "@/lib/config"
import { useResourceNavigation, useResourceDetailData } from "@/features/admin/resources/hooks"
import { queryKeys } from "@/lib/query-keys"
import type { CommentRow } from "../types"
import type { DataTableResult } from "@/components/tables"

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
  commentId: string
  comment: CommentDetailData
  backUrl?: string
  canApprove?: boolean
}

// Status field with Switch
interface StatusFieldProps {
  approved: boolean
  canApprove: boolean
  onToggle: (newStatus: boolean) => void
  isToggling: boolean
}

const StatusField = ({ approved, canApprove, onToggle, isToggling }: StatusFieldProps) => {
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

export function CommentDetailClient({ commentId, comment, backUrl = "/admin/comments", canApprove = false }: CommentDetailClientProps) {
  const queryClient = useQueryClient()
  const { navigateBack, router } = useResourceNavigation({
    queryClient,
    invalidateQueryKey: queryKeys.adminComments.all(),
  })

  // Ưu tiên sử dụng React Query cache nếu có (dữ liệu mới nhất sau khi edit), fallback về props
  // Chỉ log sau khi fetch từ API xong để đảm bảo data mới nhất
  const { data: detailData, isFetched, isFromApi, fetchedData } = useResourceDetailData({
    initialData: comment,
    resourceId: commentId,
    detailQueryKey: queryKeys.adminComments.detail,
    resourceName: "comments",
    fetchOnMount: true, // Luôn fetch khi mount để đảm bảo data fresh
  })

  // useRef để track logged state (tránh duplicate logs trong React Strict Mode)
  const loggedDataKeyRef = React.useRef<string | null>(null)

  const [isToggling, setIsToggling] = React.useState(false)
  const [approved, setApproved] = React.useState(detailData.approved)

  // Sync approved state when detailData changes
  React.useEffect(() => {
    setApproved(detailData.approved)
  }, [detailData.approved])

  // Log detail action và data structure (chỉ log sau khi fetch từ API xong)
  // Sử dụng fetchedData (data từ API) thay vì detailData để đảm bảo log data mới nhất
  React.useEffect(() => {
    // Chỉ log khi đã fetch xong, data từ API (isFromApi = true), và có fetchedData
    if (!isFetched || !isFromApi || !fetchedData) return
    
    // Tạo unique key từ data để đảm bảo chỉ log khi data thực sự thay đổi
    const dataKey = `${commentId}-${fetchedData.updatedAt || fetchedData.createdAt || ""}`
    
    // Nếu đã log cho data key này rồi, skip
    if (loggedDataKeyRef.current === dataKey) return
    
    // Mark as logged
    loggedDataKeyRef.current = dataKey

    resourceLogger.detailAction({
      resource: "comments",
      action: "load-detail",
      resourceId: commentId,
      recordData: fetchedData as Record<string, unknown>,
    })

    resourceLogger.dataStructure({
      resource: "comments",
      dataType: "detail",
      structure: {
        fields: fetchedData as Record<string, unknown>,
      },
    })
  }, [commentId, isFetched, isFromApi, fetchedData?.id, fetchedData?.updatedAt, fetchedData?.createdAt])

  const handleToggleApprove = React.useCallback(
    async (newStatus: boolean) => {
      if (!canApprove || isToggling) return

      resourceLogger.detailAction({
        resource: "comments",
        action: newStatus ? "approve" : "unapprove",
        resourceId: commentId,
        recordData: detailData as Record<string, unknown>,
        authorName: detailData.authorName,
      })

      setIsToggling(true)
      
      // Theo chuẩn Next.js 16: không update cache manually, chỉ invalidate
      // Socket events sẽ tự động update cache nếu có

      try {
        if (newStatus) {
          await apiClient.post(apiRoutes.comments.approve(commentId))
        } else {
          await apiClient.post(apiRoutes.comments.unapprove(commentId))
        }
        
        // Invalidate queries để refresh data từ server
        // Socket events sẽ tự động update cache nếu có
        await queryClient.invalidateQueries({ queryKey: queryKeys.adminComments.all() })
        await queryClient.invalidateQueries({ queryKey: queryKeys.adminComments.detail(commentId) })
        
        setApproved(newStatus)
      } catch (error) {
        resourceLogger.detailAction({
          resource: "comments",
          action: newStatus ? "approve" : "unapprove",
          resourceId: commentId,
          recordData: detailData as Record<string, unknown>,
          error: error instanceof Error ? error.message : "Unknown error",
        })
        
        // Invalidate queries để refresh data từ server
        await queryClient.invalidateQueries({ queryKey: queryKeys.adminComments.all() })
        await queryClient.invalidateQueries({ queryKey: queryKeys.adminComments.detail(commentId) })
      } finally {
        setIsToggling(false)
      }
    },
    [canApprove, commentId, isToggling, detailData.authorName, queryClient],
  )

  const detailFields: ResourceDetailField<CommentDetailData>[] = []

  const detailSections: ResourceDetailSection<CommentDetailData>[] = [
    {
      id: "basic",
      title: "Thông tin cơ bản",
      description: "Thông tin về bình luận, người bình luận, bài viết và thời gian",
      fieldsContent: (_fields, data) => {
        const commentData = (data || detailData) as CommentDetailData
        
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
      data={detailData}
      fields={detailFields}
      detailSections={detailSections}
      title={`Bình luận từ ${detailData.authorName || detailData.authorEmail}`}
      description={`Chi tiết bình luận trong bài viết "${detailData.postTitle}"`}
      backUrl={backUrl}
      backLabel="Quay lại danh sách"
    />
  )
}
