/**
 * Custom hook để xử lý các actions của posts
 * Sử dụng useResourceActions dùng chung để đảm bảo consistency
 */

import { useResourceActions } from "@/features/admin/resources/hooks"
import { apiRoutes } from "@/lib/api/routes"
import { queryKeys } from "@/lib/query-keys"
import type { PostRow } from "../types"
import type { FeedbackVariant } from "@/components/dialogs"
import { POST_MESSAGES } from "../constants/messages"

interface UsePostActionsOptions {
  canDelete: boolean
  canRestore: boolean
  canManage: boolean
  showFeedback: (variant: FeedbackVariant, title: string, description?: string, details?: string) => void
}

export function usePostActions({
  canDelete,
  canRestore,
  canManage,
  showFeedback,
}: UsePostActionsOptions) {
  return useResourceActions<PostRow>({
    resourceName: "posts",
    queryKeys: {
      all: () => queryKeys.adminPosts.all(),
    },
    apiRoutes: {
      delete: (id) => apiRoutes.posts.delete(id),
      restore: (id) => apiRoutes.posts.restore(id),
      hardDelete: (id) => apiRoutes.posts.hardDelete(id),
      bulk: apiRoutes.posts.bulk,
    },
    messages: POST_MESSAGES,
    getRecordName: (row) => row.title,
    permissions: {
      canDelete,
      canRestore,
      canManage,
    },
    showFeedback,
    getLogMetadata: (row) => ({
      postId: row.id,
      postTitle: row.title,
    }),
  })
}

