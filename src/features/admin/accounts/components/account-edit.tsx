import { getCurrentUserProfile } from "../server/queries"
import { AccountEditClient } from "./account-edit.client"
import { getAuthInfo } from "@/features/admin/resources/server"
import { NotFoundMessage } from "@/features/admin/resources/components"

export interface AccountEditProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSuccess?: () => void
  variant?: "dialog" | "sheet" | "page"
  backUrl?: string
  backLabel?: string
}

export async function AccountEdit({
  open = true,
  onOpenChange,
  onSuccess,
  variant = "dialog",
  backUrl,
  backLabel = "Quay lại",
}: AccountEditProps) {
  const authInfo = await getAuthInfo()

  if (!authInfo.actorId) {
    return (
      <NotFoundMessage
        resourceName="tài khoản"
        description="Bạn cần đăng nhập để chỉnh sửa thông tin tài khoản"
      />
    )
  }

  // Theo chuẩn Next.js 16: không cache admin data
  const account = await getCurrentUserProfile(authInfo.actorId)

  if (!account) {
    return <NotFoundMessage resourceName="tài khoản" />
  }

  return (
    <AccountEditClient
      account={account}
      open={open}
      onOpenChange={onOpenChange}
      onSuccess={onSuccess}
      variant={variant}
      backUrl={backUrl}
      backLabel={backLabel}
    />
  )
}

