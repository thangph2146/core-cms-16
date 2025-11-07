"use client"

import { useState, useEffect } from "react"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { Eye, EyeOff } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import Image from "next/image"
import Link from "next/link"

// Map NextAuth error codes thành thông báo tiếng Việt
const ERROR_MESSAGES: Record<string, string> = {
  AccessDenied: "Tài khoản của bạn đã bị vô hiệu hóa hoặc đã bị xóa. Vui lòng liên hệ quản trị viên để được hỗ trợ.",
  Configuration: "Có lỗi cấu hình hệ thống. Vui lòng thử lại sau.",
  Verification: "Liên kết xác minh không hợp lệ hoặc đã hết hạn.",
  Default: "Đã xảy ra lỗi khi đăng nhập. Vui lòng thử lại.",
}

export function SignIn({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  
  // Đọc error từ query parameter ngay khi component mount
  // Sử dụng useMemo để tránh setState trong effect
  const initialError = searchParams?.get("error") 
    ? (ERROR_MESSAGES[searchParams.get("error")!] || ERROR_MESSAGES.Default)
    : null
  
  const [error, setError] = useState<string | null>(initialError)

  // Xóa error param khỏi URL sau khi đọc (chỉ chạy 1 lần khi có error)
  useEffect(() => {
    if (!searchParams || !initialError) return
    
    // Xóa error param khỏi URL để tránh hiển thị lại khi refresh
    const newUrl = new URL(window.location.href)
    newUrl.searchParams.delete("error")
    router.replace(newUrl.pathname + newUrl.search, { scroll: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Chỉ chạy 1 lần khi mount - searchParams và router không cần trong deps

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const email = formData.get("email") as string
    const password = formData.get("password") as string

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError("Email hoặc mật khẩu không đúng")
        setIsLoading(false)
      } else {
        // Sử dụng callbackUrl từ query params hoặc fallback về dashboard
        const callbackUrl = searchParams?.get("callbackUrl")
        let redirectUrl = "/admin/dashboard"
        
        if (callbackUrl) {
          try {
            const decoded = decodeURIComponent(callbackUrl)
            // Validate callbackUrl: phải bắt đầu bằng / và không phải auth route
            if (decoded.startsWith("/") && !decoded.startsWith("/auth")) {
              redirectUrl = decoded
            }
          } catch {
            // Nếu decode fail, sử dụng fallback
          }
        }
        
        router.push(redirectUrl)
        router.refresh()
      }
    } catch {
      setError("Đã xảy ra lỗi. Vui lòng thử lại.")
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    setError(null)
    try {
      // Sử dụng callbackUrl từ query params hoặc fallback về dashboard
      const callbackUrl = searchParams?.get("callbackUrl")
      let redirectUrl = "/admin/dashboard"
      
      if (callbackUrl) {
        try {
          const decoded = decodeURIComponent(callbackUrl)
          // Validate callbackUrl: phải bắt đầu bằng / và không phải auth route
          if (decoded.startsWith("/") && !decoded.startsWith("/auth")) {
            redirectUrl = decoded
          }
        } catch {
          // Nếu decode fail, sử dụng fallback
        }
      }
      
      await signIn("google", { callbackUrl: redirectUrl })
    } catch {
      setError("Đã xảy ra lỗi khi đăng nhập bằng Google. Vui lòng thử lại.")
      setIsLoading(false)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form onSubmit={handleSubmit} className="p-6 md:p-8">
            <FieldGroup>
              <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">Chào mừng trở lại</h1>
              </div>
              {error && (
                <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="example@email.com"
                  required
                  disabled={isLoading}
                />
              </Field>
              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor="password">Mật khẩu</FieldLabel>
                  <Link
                    href="/forgot-password"
                    className="ml-auto text-sm underline-offset-2 hover:underline"
                  >
                    Quên mật khẩu?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Nhập mật khẩu của bạn"
                    required
                    disabled={isLoading}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </Field>
              <Field>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Đang đăng nhập..." : "Đăng nhập"}
                </Button>
              </Field>
              <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">
                Hoặc tiếp tục với
              </FieldSeparator>
              <Field className="flex justify-center">
                <Button
                  variant="outline"
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                  className="w-full"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    className="mr-2 h-5 w-5"
                  >
                    <path
                      d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                      fill="currentColor"
                    />
                  </svg>
                  Đăng nhập bằng Google
                </Button>
              </Field>
              <FieldDescription className="text-center">
                Chưa có tài khoản? <Link href="/auth/sign-up" className="underline-offset-2 hover:underline">Đăng ký</Link>
              </FieldDescription>
            </FieldGroup>
          </form>
          <div className="bg-muted relative hidden md:block">
            <Image
              src="https://ui.shadcn.com/placeholder.svg"
              alt="Hình ảnh"
              width={500}
              height={500}
              loading="eager"
              className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
            />    
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
