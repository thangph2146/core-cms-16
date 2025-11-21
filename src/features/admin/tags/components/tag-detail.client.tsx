"use client"

import * as React from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Tag, Hash, Calendar, Clock, Edit } from "lucide-react"
import { 
  ResourceDetailPage, 
  FieldItem,
  type ResourceDetailField, 
  type ResourceDetailSection 
} from "@/features/admin/resources/components"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useResourceRouter } from "@/hooks/use-resource-segment"
import { queryKeys } from "@/lib/query-keys"
import { formatDateVi } from "../utils"

export interface TagDetailData {
  id: string
  name: string
  slug: string
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  [key: string]: unknown
}

export interface TagDetailClientProps {
  tagId: string
  tag: TagDetailData
  backUrl?: string
}

export function TagDetailClient({ tagId, tag, backUrl = "/admin/tags" }: TagDetailClientProps) {
  const router = useResourceRouter()
  const queryClient = useQueryClient()
  
  const handleBack = async () => {
    // Invalidate React Query cache để đảm bảo list page có data mới nhất
    await queryClient.invalidateQueries({ queryKey: queryKeys.adminTags.all(), refetchType: "all" })
    // Refetch ngay lập tức để đảm bảo data được cập nhật
    await queryClient.refetchQueries({ queryKey: queryKeys.adminTags.all(), type: "all" })
  }

  const detailFields: ResourceDetailField<TagDetailData>[] = []

  const detailSections: ResourceDetailSection<TagDetailData>[] = [
    {
      id: "basic",
      title: "Thông tin cơ bản",
      description: "Thông tin chính về thẻ tag và thời gian",
      fieldsContent: (_fields, data) => {
        const tagData = data as TagDetailData
        
        return (
          <div className="space-y-6">
            {/* Name & Slug */}
            <div className="grid gap-4 sm:grid-cols-2">
              <FieldItem icon={Tag} label="Tên thẻ tag">
                <div className="text-sm font-medium text-foreground">
                  {tagData.name || "—"}
                </div>
              </FieldItem>

              <FieldItem icon={Hash} label="Slug">
                <div className="text-sm font-medium text-foreground font-mono">
                  {tagData.slug || "—"}
                </div>
              </FieldItem>
            </div>

            <Separator />

            {/* Timestamps */}
            <div className="grid gap-4 sm:grid-cols-2">
              <FieldItem icon={Calendar} label="Ngày tạo">
                <div className="text-sm font-medium text-foreground">
                  {tagData.createdAt ? formatDateVi(tagData.createdAt) : "—"}
                </div>
              </FieldItem>

              <FieldItem icon={Clock} label="Cập nhật lần cuối">
                <div className="text-sm font-medium text-foreground">
                  {tagData.updatedAt ? formatDateVi(tagData.updatedAt) : "—"}
                </div>
              </FieldItem>
            </div>
          </div>
        )
      },
    },
  ]

  return (
    <ResourceDetailPage<TagDetailData>
      data={tag}
      fields={detailFields}
      detailSections={detailSections}
      title={tag.name}
      description={`Chi tiết thẻ tag ${tag.slug}`}
      backUrl={backUrl}
      backLabel="Quay lại danh sách"
      onBack={handleBack}
      actions={
        <Button
          variant="outline"
          onClick={() => router.push(`/admin/tags/${tagId}/edit`)}
          className="gap-2"
        >
          <Edit className="h-4 w-4" />
          Chỉnh sửa
        </Button>
      }
    />
  )
}

