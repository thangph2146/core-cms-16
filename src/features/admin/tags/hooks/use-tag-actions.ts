/**
 * Custom hook để xử lý các actions của tags
 * Sử dụng useResourceActions dùng chung để đảm bảo consistency
 */

import { useResourceActions } from "@/features/admin/resources/hooks"
import { apiRoutes } from "@/lib/api/routes"
import { queryKeys } from "@/lib/query-keys"
import type { TagRow } from "../types"
import type { FeedbackVariant } from "@/components/dialogs"
import { TAG_MESSAGES } from "../constants/messages"

interface UseTagActionsOptions {
  canDelete: boolean
  canRestore: boolean
  canManage: boolean
  isSocketConnected?: boolean
  showFeedback: (variant: FeedbackVariant, title: string, description?: string, details?: string) => void
}

export function useTagActions({
  canDelete,
  canRestore,
  canManage,
  isSocketConnected,
  showFeedback,
}: UseTagActionsOptions) {
  return useResourceActions<TagRow>({
    resourceName: "tags",
    queryKeys: {
      all: () => queryKeys.adminTags.all(),
    },
    apiRoutes: {
      delete: (id) => apiRoutes.tags.delete(id),
      restore: (id) => apiRoutes.tags.restore(id),
      hardDelete: (id) => apiRoutes.tags.hardDelete(id),
      bulk: apiRoutes.tags.bulk,
    },
    messages: TAG_MESSAGES,
    getRecordName: (row) => row.name,
    permissions: {
      canDelete,
      canRestore,
      canManage,
    },
    showFeedback,
    isSocketConnected,
    getLogMetadata: (row) => ({
      tagId: row.id,
      tagName: row.name,
    }),
  })
}
