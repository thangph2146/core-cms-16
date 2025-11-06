/**
 * Loading Fallback Component
 * Hiển thị khi các providers đang khởi tạo (Suspense boundary)
 */
"use client"

import { Loader } from "@/components/ui/loader"

export function LoadingFallback() {
  return (
    <div className="w-[100vw] h-[100vh] flex items-center justify-center bg-background">
      <Loader />
    </div>
  )
}

