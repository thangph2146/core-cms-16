import { getSession } from "@/lib/auth/auth-server"
import { PublicHeader } from "@/components/headers"
import { PermissionGate } from "@/components/shared"

/**
 * Auth Layout
 * 
 * Theo Next.js 16 best practices và NextAuth docs:
 * - Layouts KHÔNG nên làm auth checks và redirects (vì Partial Rendering)
 * - Layouts chỉ fetch user data và pass xuống children components
 * - Auth redirects được xử lý bởi Proxy (proxy.ts) sớm trong request pipeline
 * - PermissionRouter ở client-side sẽ xử lý redirects nếu cần
 * 
 * Theo Next.js 16 docs về Partial Rendering:
 * - Layouts được render một cách độc lập, có thể cache và revalidate riêng
 * - Redirects trong layouts có thể gây ra issues với Partial Rendering
 * - Nên fetch data và pass xuống children, không redirect
 * 
 * Cung cấp UI chung (header, container) cho các trang auth
 */
export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Chỉ fetch session data, KHÔNG check auth và redirect
  // Proxy (proxy.ts) đã xử lý redirects sớm trong request pipeline:
  // - Kiểm tra cookie `authjs.session-token` existence
  // - Decrypt session để verify
  // - Redirect về dashboard nếu đã đăng nhập
  // 
  // Layout này chỉ cung cấp UI structure cho children
  // PermissionRouter ở client-side sẽ validate session và redirect nếu cần
  await getSession()

  return (
    <>
      <PublicHeader />
      <div className="bg-muted flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-sm md:max-w-4xl">
        <PermissionGate>
          {children}
        </PermissionGate>
        </div>
      </div>
    </>
  )
}

