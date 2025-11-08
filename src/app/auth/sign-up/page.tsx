import type { Metadata } from "next"
import { SignUpForm } from "@/components/forms"

/**
 * Sign Up Page Metadata
 * 
 * Theo Next.js 16 best practices:
 * - Metadata được merge với auth layout và root layout
 * - Title sử dụng template từ root: "Đăng ký | CMS"
 */
export const metadata: Metadata = {
  title: "Đăng ký",
  description: "Đăng ký tài khoản mới cho hệ thống quản trị CMS",
}

export default function SignUpPage() {
  return <SignUpForm />
}

