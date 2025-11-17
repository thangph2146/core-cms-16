"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  HelpCircle, 
  BookOpen, 
  MessageSquare, 
  Mail, 
  Phone, 
  ArrowRight,
  CheckCircle2,
  FileText,
  Users,
  GraduationCap,
  Shield,
  Bell
} from "lucide-react"
import Link from "next/link"
import { appFeatures } from "@/lib/config/app-features"
import { getResourceMainRoute } from "@/lib/permissions/route-helpers"

/**
 * Helper function để lấy route từ appFeatures
 */
function getRouteFromFeature(key: string): string | null {
  const feature = appFeatures.find((f) => f.key === key)
  if (!feature?.navigation) return null

  const nav = feature.navigation
  if (nav.href) return nav.href

  if (nav.resourceName) {
    const route = getResourceMainRoute(nav.resourceName)
    return route?.path || null
  }

  return null
}

// Routes constants - Lấy từ appFeatures
const HELP_ROUTES = {
  home: getRouteFromFeature("home") || "/",
  contact: getRouteFromFeature("contact") || "/contact",
  blog: getRouteFromFeature("blog") || "/bai-viet",
} as const

export interface HelpClientProps {
  // Có thể thêm props từ server component nếu cần
}

export function HelpClient({}: HelpClientProps) {
  const faqItems = [
    {
      question: "Làm thế nào để đăng nhập vào hệ thống?",
      answer: "Bạn có thể đăng nhập bằng tài khoản đã được cấp bởi nhà trường. Nếu chưa có tài khoản, vui lòng liên hệ Phòng Công tác Sinh viên để được hỗ trợ.",
    },
    {
      question: "Làm sao để xem điểm số của sinh viên?",
      answer: "Sau khi đăng nhập, bạn có thể truy cập vào mục 'Học tập' để xem điểm số, lịch học và lịch thi của sinh viên.",
    },
    {
      question: "Làm thế nào để liên hệ với giảng viên?",
      answer: "Bạn có thể sử dụng tính năng 'Tin nhắn' trong hệ thống để gửi tin nhắn trực tiếp cho giảng viên hoặc cố vấn học tập.",
    },
    {
      question: "Tôi quên mật khẩu, phải làm gì?",
      answer: "Vui lòng sử dụng tính năng 'Quên mật khẩu' trên trang đăng nhập hoặc liên hệ trực tiếp với Phòng Công tác Sinh viên để được hỗ trợ đặt lại mật khẩu.",
    },
    {
      question: "Làm sao để nhận thông báo từ nhà trường?",
      answer: "Hệ thống sẽ tự động gửi thông báo đến email và hiển thị trong mục 'Thông báo' sau khi bạn đăng nhập. Bạn có thể bật thông báo để nhận cập nhật kịp thời.",
    },
  ]

  const guideSections = [
    {
      icon: Users,
      title: "Đăng nhập và Tài khoản",
      description: "Hướng dẫn đăng nhập, quản lý tài khoản và bảo mật",
      items: [
        "Cách đăng nhập vào hệ thống",
        "Quản lý thông tin tài khoản",
        "Đổi mật khẩu và bảo mật",
        "Xử lý sự cố đăng nhập",
      ],
    },
    {
      icon: GraduationCap,
      title: "Theo dõi Học tập",
      description: "Xem điểm số, lịch học và tiến độ học tập của sinh viên",
      items: [
        "Xem điểm số và bảng điểm",
        "Lịch học và lịch thi",
        "Tiến độ học tập",
        "Thông tin môn học",
      ],
    },
    {
      icon: MessageSquare,
      title: "Giao tiếp với Nhà trường",
      description: "Liên hệ với giảng viên, cố vấn và nhận thông báo",
      items: [
        "Gửi tin nhắn cho giảng viên",
        "Nhận và xem thông báo",
        "Tham gia trao đổi",
        "Liên hệ hỗ trợ",
      ],
    },
    {
      icon: Shield,
      title: "Bảo mật và Quyền riêng tư",
      description: "Bảo vệ thông tin cá nhân và dữ liệu học tập",
      items: [
        "Chính sách bảo mật",
        "Quyền riêng tư dữ liệu",
        "Bảo vệ tài khoản",
        "Báo cáo sự cố bảo mật",
      ],
    },
  ]

  return (
    <div className="relative isolate bg-background">
      {/* Hero Section */}
      <section className="py-12 sm:py-16 lg:py-20 bg-card border-b border-border">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
              <HelpCircle className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-card-foreground mb-4 sm:mb-6">
              Trung tâm Trợ giúp
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed mb-8">
              Tìm câu trả lời cho các câu hỏi thường gặp và hướng dẫn sử dụng hệ thống
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild>
                <Link href={HELP_ROUTES.contact}>
                  <Mail className="h-4 w-4 mr-2" />
                  Liên hệ hỗ trợ
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href={HELP_ROUTES.home}>
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Về trang chủ
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Guide Sections */}
      <section className="py-12 sm:py-16 lg:py-20 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-4">
                Hướng dẫn Sử dụng
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Khám phá các tính năng và cách sử dụng hệ thống một cách hiệu quả
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
              {guideSections.map((section, index) => {
                const Icon = section.icon
                return (
                  <Card key={index} className="border-border hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Icon className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-xl font-bold text-card-foreground mb-2">
                            {section.title}
                          </CardTitle>
                          <CardDescription className="text-muted-foreground">
                            {section.description}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3">
                        {section.items.map((item, itemIndex) => (
                          <li key={itemIndex} className="flex items-start gap-3">
                            <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                            <span className="text-foreground">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-12 sm:py-16 lg:py-20 bg-card">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-card-foreground mb-4">
                Câu hỏi Thường gặp
              </h2>
              <p className="text-lg text-muted-foreground">
                Tìm câu trả lời nhanh cho các thắc mắc phổ biến
              </p>
            </div>

            <div className="space-y-4">
              {faqItems.map((faq, index) => (
                <Card key={index} className="border-border">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold text-card-foreground flex items-start gap-3">
                      <FileText className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      {faq.question}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed pl-8">
                      {faq.answer}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Contact Support Section */}
      <section className="py-12 sm:py-16 lg:py-20 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <Card className="border-border bg-card">
              <CardHeader className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6 mx-auto">
                  <MessageSquare className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-2xl sm:text-3xl font-bold text-card-foreground mb-4">
                  Vẫn cần hỗ trợ?
                </CardTitle>
                <CardDescription className="text-lg text-muted-foreground">
                  Nếu bạn không tìm thấy câu trả lời, hãy liên hệ với chúng tôi
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 dark:bg-muted border border-border">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Phone className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-card-foreground">Điện thoại</p>
                      <p className="text-muted-foreground">(028) 38 212 430</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 dark:bg-muted border border-border">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Mail className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-card-foreground">Email</p>
                      <p className="text-muted-foreground">dhnhtphcm@hub.edu.vn</p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button size="lg" asChild>
                    <Link href={HELP_ROUTES.contact}>
                      <Mail className="h-4 w-4 mr-2" />
                      Gửi tin nhắn
                    </Link>
                  </Button>
                  <Button variant="outline" size="lg" asChild>
                    <Link href={HELP_ROUTES.blog}>
                      <BookOpen className="h-4 w-4 mr-2" />
                      Xem bài viết
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  )
}

