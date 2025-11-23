/**
 * Server Component: Post Edit
 * 
 * Fetches post data và pass xuống client component
 * Pattern: Server Component (data fetching) → Client Component (UI/interactions)
 */

import { getPostById } from "../server/queries"
import { serializePostDetail } from "../server/helpers"
import { PostEditClient } from "./post-edit.client"
import type { PostEditData } from "./post-edit.client"
import { NotFoundMessage } from "@/features/admin/resources/components"
import { getActiveUsersForSelect } from "@/features/admin/users/server/queries"
import { getActiveCategoriesForSelect } from "@/features/admin/categories/server/queries"
import { getActiveTagsForSelect } from "@/features/admin/tags/server/queries"
import { getAuthInfo } from "@/features/admin/resources/server"

export interface PostEditProps {
  postId: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSuccess?: () => void
  variant?: "dialog" | "sheet" | "page"
  backUrl?: string
  backLabel?: string
}

export async function PostEdit({
  postId,
  open = true,
  onOpenChange,
  onSuccess,
  variant = "dialog",
  backUrl,
  backLabel = "Quay lại",
}: PostEditProps) {
  const post = await getPostById(postId)

  if (!post) {
    return <NotFoundMessage resourceName="bài viết" />
  }

  const { isSuperAdminUser } = await getAuthInfo()
  
  // Fetch options in parallel
  const [usersOptions, categoriesOptions, tagsOptions] = await Promise.all([
    // Chỉ fetch users options nếu là super admin
    isSuperAdminUser ? getActiveUsersForSelect(100) : Promise.resolve([]),
    getActiveCategoriesForSelect(100),
    getActiveTagsForSelect(100),
  ])

  const postForEdit: PostEditData = {
    ...serializePostDetail(post),
    authorId: post.author.id,
    categoryIds: post.categories?.map((c) => c.id) || [],
    tagIds: post.tags?.map((t) => t.id) || [],
  }

  return (
    <PostEditClient
      post={postForEdit}
      open={open}
      onOpenChange={onOpenChange}
      onSuccess={onSuccess}
      variant={variant}
      backUrl={backUrl}
      backLabel={backLabel}
      postId={postId}
      users={usersOptions}
      categories={categoriesOptions}
      tags={tagsOptions}
      isSuperAdmin={isSuperAdminUser}
    />
  )
}

