"use client"

/**
 * Guide Client Component
 * Hiển thị hướng dẫn sử dụng hệ thống với hình ảnh minh họa
 */

import Image from "next/image"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  UserPlus,
  LogIn,
  Download,
  LayoutDashboard,
  BarChart3,
  Users,
  FileEdit,
  Eye,
  Bell,
} from "lucide-react"

const guideImages = [
  // Đăng nhập & Đăng ký
  {
    id: "dang-ky",
    title: "Hướng dẫn Đăng ký Hệ thống",
    description: "Các bước chi tiết để đăng ký tài khoản mới trên hệ thống",
    imagePath: "/huong-dan-su-dung/dang-ky-he-thong.png",
    icon: UserPlus,
    category: "Đăng nhập & Đăng ký",
  },
  {
    id: "dang-nhap",
    title: "Hướng dẫn Đăng nhập Hệ thống",
    description: "Cách đăng nhập vào hệ thống và quản lý tài khoản",
    imagePath: "/huong-dan-su-dung/dang-nhap-he-thong.png",
    icon: LogIn,
    category: "Đăng nhập & Đăng ký",
  },
  // Dashboard
  {
    id: "dashboard",
    title: "Dashboard Hệ thống",
    description: "Tổng quan về giao diện dashboard và các tính năng chính",
    imagePath: "/huong-dan-su-dung/dashboard-he-thong.png",
    icon: LayoutDashboard,
    category: "Dashboard",
  },
  {
    id: "dashboard-thong-ke",
    title: "Dashboard Thống kê Hệ thống",
    description: "Xem các thống kê và báo cáo tổng quan về hệ thống",
    imagePath: "/huong-dan-su-dung/dashboard-thong-ke-he-thong.png",
    icon: BarChart3,
    category: "Dashboard",
  },
  // Quản lý Student
  {
    id: "quan-ly-student",
    title: "Quản lý Student",
    description: "Hướng dẫn quản lý danh sách sinh viên trong hệ thống",
    imagePath: "/huong-dan-su-dung/quan-ly-student.png",
    icon: Users,
    category: "Quản lý Student",
  },
  {
    id: "quan-ly-student-chi-tiet",
    title: "Chi tiết Student",
    description: "Xem thông tin chi tiết của một sinh viên",
    imagePath: "/huong-dan-su-dung/quan-ly-student-chi-tiet.png",
    icon: Eye,
    category: "Quản lý Student",
  },
  {
    id: "quan-ly-student-chinh-sua",
    title: "Chỉnh sửa Student",
    description: "Cách chỉnh sửa thông tin sinh viên trong hệ thống",
    imagePath: "/huong-dan-su-dung/quan-ly-student-chinh-sua.png",
    icon: FileEdit,
    category: "Quản lý Student",
  },
  // Thông báo
  {
    id: "thong-bao-realtime",
    title: "Thông báo Realtime Hệ thống",
    description: "Nhận và quản lý thông báo realtime từ hệ thống",
    imagePath: "/huong-dan-su-dung/thong-bao-realtime-he-thong.png",
    icon: Bell,
    category: "Thông báo",
  },
]

export function GuideClient() {
  const handleDownload = (imagePath: string, title: string) => {
    const link = document.createElement("a")
    link.href = imagePath
    link.download = `${title.replace(/\s+/g, "-").toLowerCase()}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Nhóm các hướng dẫn theo category
  const groupedGuides = guideImages.reduce((acc, guide) => {
    const category = guide.category || "Khác"
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(guide)
    return acc
  }, {} as Record<string, typeof guideImages>)

  const categories = Object.keys(groupedGuides)

  return (
    <div className="container mx-auto px-4">
      {/* Header */}
      <div className="text-center mb-8 md:mb-12">
        <h1 className="text-2xl md:text-2xl lg:text-3xl font-bold mb-3 md:mb-4">
          Hướng dẫn Sử dụng Hệ thống
        </h1>
        <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
          Khám phá các tính năng và cách sử dụng hệ thống một cách hiệu quả
        </p>
      </div>

      {/* Guide Cards by Category */}
      <div className="space-y-12 md:space-y-16 mb-8 md:mb-12">
        {categories.map((category) => (
          <div key={category} className="space-y-6 md:space-y-8">
            {/* Category Header */}
            <div className="border-b border-border pb-3">
              <h2 className="text-xl md:text-2xl font-semibold text-foreground">
                {category}
              </h2>
            </div>

            {/* Guide Cards Grid */}
            <div className="grid grid-cols-1 gap-6 md:gap-8">
              {groupedGuides[category].map((guide) => {
                const Icon = guide.icon
                return (
                  <Card
                    key={guide.id}
                    className="group overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 border-2 hover:border-primary/50"
                  >
                    <CardHeader className="pb-4">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-12 h-12 md:w-14 md:h-14 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                          <Icon className="w-6 h-6 md:w-7 md:h-7 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-xl md:text-2xl mb-2">{guide.title}</CardTitle>
                          <CardDescription className="text-sm md:text-base">
                            {guide.description}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Image Preview */}
                      <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-muted border-2 border-border group-hover:border-primary/50 transition-colors">
                        <Image
                          src={guide.imagePath}
                          alt={guide.title}
                          fill
                          className="object-contain p-2"
                          sizes="(max-width: 768px) 100vw, 100vw"
                        />
                      </div>

                      {/* Action Buttons */}
                      <div className="flex justify-center">
                        <Button
                          variant="outline"
                          className="gap-2"
                          onClick={() => handleDownload(guide.imagePath, guide.title)}
                        >
                          <Download className="w-4 h-4" />
                          Tải xuống
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Additional Info */}
      <Card className="bg-muted/50 border-dashed">
        <CardContent className="pt-6">
          <div className="text-center space-y-2">
            <p className="text-sm md:text-base text-muted-foreground">
              Cần hỗ trợ thêm? Vui lòng liên hệ với chúng tôi
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
              <span className="text-muted-foreground">📧 Email: support@hub.edu.vn</span>
              <span className="text-muted-foreground">📞 Hotline: 1900-xxxx</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
