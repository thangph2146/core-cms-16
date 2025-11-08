import type { Metadata } from "next"
import { SignIn } from "@/components/forms"

/**
 * Sign In Page Metadata
 * 
 * Theo Next.js 16 best practices:
 * - Metadata được merge với auth layout và root layout
 * - Title sử dụng template từ root: "Đăng nhập | CMS"
 */
export const metadata: Metadata = {
  title: "Đăng nhập",
  description: "Đăng nhập vào hệ thống quản trị CMS",
}

export default function SignInPage() {
  return <SignIn />
}

