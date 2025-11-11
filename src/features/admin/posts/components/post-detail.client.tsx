"use client"

import * as React from "react"
import { FileText, Hash, User, Calendar, Clock, Edit, Image as ImageIcon, Eye, EyeOff, CheckCircle2 } from "lucide-react"
import { ResourceDetailPage, type ResourceDetailField, type ResourceDetailSection } from "@/features/admin/resources/components"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import { formatDateVi } from "../utils"
import { Editor } from "@/components/blocks/editor-x/editor"
import type { SerializedEditorState } from "lexical"
import type { Prisma } from "@prisma/client"

export interface PostDetailData {
  id: string
  title: string
  slug: string
  content: Prisma.JsonValue
  excerpt: string | null
  image: string | null
  published: boolean
  publishedAt: string | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  author: {
    id: string
    name: string | null
    email: string
  }
  [key: string]: unknown
}

export interface PostDetailClientProps {
  postId: string
  post: PostDetailData
  backUrl?: string
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

export function PostDetailClient({ postId, post, backUrl = "/admin/posts" }: PostDetailClientProps) {
  const router = useRouter()

  const detailFields: ResourceDetailField<PostDetailData>[] = []

  const detailSections: ResourceDetailSection<PostDetailData>[] = [
    {
      id: "basic",
      title: "Thông tin cơ bản",
      description: "Thông tin chính về bài viết",
      fieldHeader: (
        <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg border border-border/50">
          <div className="flex-1">
            <h3 className="text-lg font-semibold">{post.title || "Chưa có tiêu đề"}</h3>
            <div className="flex items-center gap-2 mt-2">
              {post.published ? (
                <Badge variant="outline" className="inline-flex items-center gap-1.5 bg-green-100 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
                  <Eye className="h-3 w-3" />
                  Đã xuất bản
                </Badge>
              ) : (
                <Badge variant="outline" className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700">
                  <EyeOff className="h-3 w-3" />
                  Bản nháp
                </Badge>
              )}
              {post.deletedAt && (
                <Badge variant="outline" className="inline-flex items-center gap-1.5 bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800">
                  Đã xóa
                </Badge>
              )}
            </div>
          </div>
        </div>
      ),
      fieldsContent: (_fields, data) => {
        const postData = data as PostDetailData
        
        return (
          <Card className="border border-border/50 bg-card">
            <CardContent className="p-6">
              <div className="space-y-6">
                {/* Image, Title, Description Section */}
                <div className="space-y-4">
                  {/* Image */}
                  {postData.image && (
                    <div className="w-full">
                      <img
                        src={postData.image}
                        alt={postData.title}
                        className="w-full h-auto rounded-lg border border-border object-cover"
                        style={{ maxHeight: "400px" }}
                      />
                    </div>
                  )}

                  {/* Title */}
                  <div>
                    <h2 className="text-2xl font-bold text-foreground leading-tight">
                      {postData.title || "Chưa có tiêu đề"}
                    </h2>
                  </div>

                  {/* Excerpt/Description */}
                  {postData.excerpt && (
                    <div className="text-base leading-relaxed text-muted-foreground whitespace-pre-wrap">
                      {postData.excerpt}
                    </div>
                  )}
                </div>

                <Separator />

                {/* General Information Grid */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {/* Slug */}
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <Hash className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-muted-foreground mb-1.5">Slug</div>
                      <div className="text-sm font-medium text-foreground font-mono break-all">
                        {postData.slug || "—"}
                      </div>
                    </div>
                  </div>

                  {/* Author */}
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <User className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-muted-foreground mb-1.5">Tác giả</div>
                      <div className="space-y-0.5">
                        <div className="text-sm font-medium text-foreground">
                          {postData.author.name || "N/A"}
                        </div>
                        <div className="text-xs text-muted-foreground line-clamp-1">
                          {postData.author.email}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      },
    },
    {
      id: "content",
      title: "Nội dung",
      description: "Nội dung bài viết",
      fieldsContent: (_fields, data) => {
        const postData = data as PostDetailData
        
        // Parse content as SerializedEditorState
        let editorState: SerializedEditorState | null = null
        try {
          if (postData.content && typeof postData.content === "object") {
            editorState = postData.content as unknown as SerializedEditorState
          }
        } catch (error) {
          console.error("Failed to parse editor state:", error)
        }

        return (
          <div className="space-y-4">
            {editorState ? (
                <Editor
                  editorSerializedState={editorState}
                  onSerializedChange={() => {
                    // Read-only mode, no changes allowed
                  }}
                />
            ) : (
              <Card className="border border-border/50 bg-card p-5">
                <div className="text-sm text-muted-foreground">
                  Không có nội dung hoặc định dạng không hợp lệ
                </div>
              </Card>
            )}
          </div>
        )
      },
    },
    {
      id: "metadata",
      title: "Thông tin hệ thống",
      description: "Thông tin về trạng thái và thời gian",
      fieldsContent: (_fields, data) => {
        const postData = data as PostDetailData
        
        return (
          <div className="space-y-6">
            {/* Published Status */}
            <div className="grid gap-4 sm:grid-cols-2">
              <FieldItem icon={postData.published ? Eye : EyeOff} label="Trạng thái">
                <div className="flex items-center gap-2">
                  {postData.published ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-500" />
                      <span className="text-sm font-medium text-foreground">Đã xuất bản</span>
                    </>
                  ) : (
                    <>
                      <EyeOff className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                      <span className="text-sm font-medium text-foreground">Bản nháp</span>
                    </>
                  )}
                </div>
              </FieldItem>

              {postData.publishedAt && (
                <FieldItem icon={Calendar} label="Ngày xuất bản">
                  <div className="text-sm font-medium text-foreground">
                    {formatDateVi(postData.publishedAt)}
                  </div>
                </FieldItem>
              )}
            </div>

            <Separator />

            {/* Timestamps */}
            <div className="grid gap-4 sm:grid-cols-2">
              <FieldItem icon={Clock} label="Ngày tạo">
                <div className="text-sm font-medium text-foreground">
                  {formatDateVi(postData.createdAt)}
                </div>
              </FieldItem>

              <FieldItem icon={Clock} label="Cập nhật lần cuối">
                <div className="text-sm font-medium text-foreground">
                  {formatDateVi(postData.updatedAt)}
                </div>
              </FieldItem>
            </div>

            {postData.deletedAt && (
              <>
                <Separator />
                <FieldItem icon={Clock} label="Ngày xóa">
                  <div className="text-sm font-medium text-rose-600 dark:text-rose-400">
                    {formatDateVi(postData.deletedAt)}
                  </div>
                </FieldItem>
              </>
            )}
          </div>
        )
      },
    },
  ]

  return (
    <ResourceDetailPage<PostDetailData>
      title="Chi tiết bài viết"
      data={post}
      fields={detailFields}
      detailSections={detailSections}
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(backUrl)}
          >
            Quay lại
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => router.push(`/admin/posts/${postId}/edit`)}
          >
            <Edit className="mr-2 h-4 w-4" />
            Chỉnh sửa
          </Button>
        </div>
      }
    />
  )
}

