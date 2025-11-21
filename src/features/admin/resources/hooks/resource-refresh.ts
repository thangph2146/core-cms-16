import { logger } from "@/lib/config"
import type { ResourceRefreshHandler } from "../types"

interface RunResourceRefreshOptions {
  refresh?: ResourceRefreshHandler
  resource?: string
}

/**
 * Helper để gọi refresh từ ResourceTableRefresh một cách an toàn
 * - Tránh crash UI khi refresh throw error
 * - Ghi log để dễ debug
 */
export async function runResourceRefresh({
  refresh,
  resource,
}: RunResourceRefreshOptions): Promise<void> {
  if (!refresh) return

  try {
    await refresh()
  } catch (error) {
    logger.error(
      resource ? `[${resource}] Failed to refresh resource table` : "Failed to refresh resource table",
      error as Error,
    )
  }
}

