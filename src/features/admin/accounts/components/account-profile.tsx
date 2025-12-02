import { getCurrentUserProfile } from "../server/queries"
import { getAuthInfo } from "@/features/admin/resources/server"
import { AccountProfileClient } from "./account-profile.client"
import { NotFoundMessage } from "@/features/admin/resources/components"

export interface AccountProfileProps {
  variant?: "page" | "dialog" | "sheet"
}

export async function AccountProfile({ variant = "page" }: AccountProfileProps) {
  const authInfo = await getAuthInfo()

  if (!authInfo.actorId) {
    return (
      <NotFoundMessage
        resourceName="tài khoản"
        description="Bạn cần đăng nhập để xem thông tin tài khoản"
      />
    )
  }

  // Theo chuẩn Next.js 16: không cache admin data
  const account = await getCurrentUserProfile(authInfo.actorId)

  if (!account) {
    return <NotFoundMessage resourceName="tài khoản" />
  }

  return (
    <AccountProfileClient
      account={account}
      variant={variant}
    />
  )
}

