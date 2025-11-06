/**
 * Session Provider (NextAuth.js)
 * 
 * Theo Next.js 16 và NextAuth best practices:
 * - Cung cấp authentication state cho toàn bộ app
 * - Xử lý permission-based routing ở client-side
 * - Proxy (Edge Runtime) chỉ làm quick redirects dựa trên cookie `authjs.session-token` existence
 * - Layouts (Server Components) fetch session nhưng KHÔNG redirect (Partial Rendering)
 * - PermissionRouter (Client Component) xử lý validation và redirects chi tiết
 * 
 * Flow xử lý session và redirect (theo Next.js 16 docs):
 * 1. Proxy (Edge Runtime) -> Optimistic checks: 
 *    - Kiểm tra cookie `authjs.session-token` existence
 *    - Decrypt session để verify
 *    - Quick redirects nếu cần (chưa đăng nhập -> sign-in, đã đăng nhập -> dashboard)
 * 
 * 2. Layouts (Server Components) -> Fetch session với getSession():
 *    - KHÔNG redirect (tuân thủ Partial Rendering)
 *    - Chỉ fetch data và pass xuống children
 * 
 * 3. PermissionRouter (Client Component) -> Validate session và permissions:
 *    - Validate session với useSession() từ NextAuth
 *    - Check permissions chi tiết
 *    - Redirect nếu không có quyền truy cập
 */

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react"
import type { SessionProviderProps } from "next-auth/react"

export function SessionProvider({
  children,
  ...props
}: SessionProviderProps) {
  return (
    <NextAuthSessionProvider
      {...props}
      // Tối ưu: giảm số lần refetch session
      refetchInterval={5 * 60} // Refetch mỗi 5 phút (thay vì mặc định 0 = không refetch)
      refetchOnWindowFocus={false} // Không refetch khi focus window
    >
      {children}
    </NextAuthSessionProvider>
  )
}

