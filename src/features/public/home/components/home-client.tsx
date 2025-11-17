"use client"

import { Button } from "@/components/ui/button"
import Image from "next/image"
import Link from "next/link"
import { Users, MessageSquare, Bell, ArrowRight, GraduationCap, Check, Phone, Mail } from "lucide-react"
import { ContactForm } from "@/components/forms/contact-form"
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
const HOME_ROUTES = {
  signIn: "/auth/sign-in",
  signUp: "/auth/sign-up",
  help: getRouteFromFeature("help") || "/help",
} as const

export interface HomeClientProps {
  // Có thể thêm props từ server component nếu cần
}

export function HomeClient({}: HomeClientProps) {
  return (
    <div className="relative isolate bg-background">
      {/* Hero Section */}
      <section className="relative min-h-[300px] sm:min-h-[400px] lg:min-h-[500px] flex items-center justify-center overflow-hidden">
        {/* Background Image - No Gradient Overlay */}
        <div className="absolute inset-0 z-0">
          <Image
            src="https://s7ap1.scene7.com/is/image/rmit/fc-banner?wid=1440&hei=450&scl=1"
            alt="Trường Đại học Ngân hàng TP.HCM"
            width={1920}
            height={1080}
            className="w-full h-full object-cover"
            priority
            fetchPriority="high"
            sizes="100vw"
          />
        </div>

        {/* Text Overlay Box */}
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-30">
          <div className="max-w-7xl mx-auto">
            <div className="bg-white/90 backdrop-blur-md rounded-xl p-4 sm:p-6 lg:p-8 max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg shadow-xl border border-white/20">
              <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-slate-900 mb-3 sm:mb-4 leading-tight">
                Hệ thống Quản lý Sinh viên
              </h1>
              <p className="text-sm sm:text-base md:text-lg text-slate-700 leading-relaxed mb-4 sm:mb-6">
                Kết nối phụ huynh với Trường Đại học Ngân hàng Thành phố Hồ Chí
                Minh
              </p>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <Button size="sm" asChild>
                  <Link href={HOME_ROUTES.signIn}>
                    <Users className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    <span className="hidden xs:inline">Đăng nhập ngay</span>
                    <span className="xs:hidden">Đăng nhập</span>
                    <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 ml-1 sm:ml-2" />
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href={HOME_ROUTES.signUp}>
                    <MessageSquare className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    Đăng ký
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Overview Section */}
      <section className="py-12 bg-card">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-card-foreground mb-6 sm:mb-8 sm:text-left">
              Tổng quan Hệ thống
            </h2>
            <div className="prose prose-sm sm:prose-base md:prose-lg lg:prose-xl text-foreground leading-relaxed dark:prose-invert">
              <p className="mb-4 sm:mb-6 text-sm sm:text-base md:text-lg">
                Hệ thống Quản lý Sinh viên của Trường Đại học Ngân hàng Thành
                phố Hồ Chí Minh được thiết kế để tạo cầu nối giữa phụ huynh, gia
                đình và nhà trường. Chúng tôi hiểu rằng sự tham gia tích cực của
                gia đình đóng vai trò quan trọng trong thành công học tập của
                sinh viên ngành ngân hàng và tài chính.
              </p>
              <p className="mb-4 sm:mb-6 text-sm sm:text-base md:text-lg">
                Thông qua nền tảng này, phụ huynh có thể theo dõi tiến độ học
                tập, điểm số, lịch học và lịch thi của sinh viên. Đồng thời, phụ
                huynh có thể trao đổi thông tin trực tiếp với giảng viên, cố vấn
                học tập và nhận thông báo quan trọng từ nhà trường.
              </p>
              <p className="text-muted-foreground text-sm sm:text-base md:text-lg">
                Hệ thống được quản lý bởi Phòng Công tác Sinh viên - Trường Đại
                học Ngân hàng TP.HCM.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Guide & Register Section */}
      <section className="py-12 sm:py-16 lg:py-20 xl:py-24 bg-card">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col gap-8 sm:gap-12 lg:gap-16">
              {/* Top Row - Guide Section */}
              <div className="flex flex-col lg:flex-row gap-8 lg:gap-16 items-center">
                {/* Guide Content */}
                <div className="flex-1 w-full lg:max-w-lg xl:max-w-xl">
                  <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-primary mb-4 sm:mb-6 leading-tight">
                    Hướng dẫn cho Phụ huynh
                  </h3>
                  <p className="text-base sm:text-lg text-card-foreground mb-6 sm:mb-8 leading-relaxed">
                    Khám phá hướng dẫn toàn diện với thông tin cần thiết và tài
                    nguyên dành cho phụ huynh sinh viên Trường Đại học Ngân hàng
                    TP.HCM.
                  </p>
                  <Button variant="outline" size="lg" className="w-full sm:w-auto" asChild>
                    <Link href={HOME_ROUTES.help}>
                      Tìm hiểu ngay
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Link>
                  </Button>
                </div>

                {/* Guide Image */}
                <div className="relative overflow-hidden w-full lg:flex-1 h-[250px] sm:h-[300px] lg:h-[400px] xl:h-[450px]">
                  <Image
                    src="https://hub.edu.vn/DATA/IMAGES/2025/06/06/20250606095355z6676952814172_23a84367b5e409bfcea8b8e95ac6ba4c.jpg"
                    alt="Hướng dẫn cho phụ huynh"
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    priority
                    fetchPriority="high"
                  />
                </div>
              </div>

              {/* Bottom Row - Register Section */}
              <div className="flex flex-col lg:flex-row-reverse gap-8 lg:gap-16 items-center">
                {/* Register Content */}
                <div className="flex-1 w-full lg:max-w-lg xl:max-w-xl">
                  <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-card-foreground mb-4 sm:mb-6 leading-tight">
                    Đăng ký nhận tin tức
                  </h3>
                  <p className="text-base sm:text-lg text-card-foreground mb-6 sm:mb-8 leading-relaxed">
                    Cập nhật thông tin mới nhất về hoạt động của trường, bản tin
                    phụ huynh và các sự kiện dành cho phụ huynh sinh viên Trường
                    Đại học Ngân hàng TP.HCM.
                  </p>
                  <Button variant="outline" size="lg" className="w-full sm:w-auto" asChild>
                    <Link href={HOME_ROUTES.signUp}>
                      Đăng ký ngay
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Link>
                  </Button>
                </div>

                {/* Register Image */}
                <div className="relative overflow-hidden w-full lg:flex-1 h-[250px] sm:h-[300px] lg:h-[400px] xl:h-[450px]">
                  <Image
                    src="https://hub.edu.vn/DATA/IMAGES/2025/06/06/20250606095214z6676928339374_824596735893cad9e9d4402075fcccd2.jpg"
                    alt="Đăng ký nhận tin tức"
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    priority
                    fetchPriority="high"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Registration Form Section */}
      <section className="py-16 sm:py-20 lg:py-24 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col lg:flex-row gap-12 lg:gap-16">
              {/* Left Side - Contact Form */}
              <div className="flex-1">
                <div className="mb-8">
                  <h3 className="text-2xl lg:text-3xl font-bold text-foreground mb-4">
                    Tại sao chọn chúng tôi?
                  </h3>
                  <p className="text-lg text-muted-foreground leading-relaxed">
                    Chúng tôi cam kết mang đến trải nghiệm tốt nhất cho phụ huynh và sinh viên.
                  </p>
                </div>
                <div className="space-y-6">
                  {/* Quick Response */}
                  <div className="bg-card/60 backdrop-blur-sm rounded-2xl p-6 border border-border">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Check className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-card-foreground mb-2 text-lg">
                          Phản hồi nhanh
                        </h4>
                        <p className="text-muted-foreground">
                          Chúng tôi cam kết phản hồi mọi yêu cầu trong vòng 24 giờ làm việc.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Secure Communication */}
                  <div className="bg-card/60 backdrop-blur-sm rounded-2xl p-6 border border-border">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Bell className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-card-foreground mb-2 text-lg">
                          Bảo mật cao
                        </h4>
                        <p className="text-muted-foreground">
                          Thông tin cá nhân và dữ liệu học tập được mã hóa và bảo vệ an toàn.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="bg-muted/50 dark:bg-muted rounded-2xl p-6 border border-border">
                    <h4 className="font-semibold text-card-foreground mb-4 text-lg">
                      Thông tin liên hệ
                    </h4>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Phone className="h-5 w-5 text-primary" />
                        <span className="text-foreground">(028) 38 212 430</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Mail className="h-5 w-5 text-primary" />
                        <span className="text-foreground">dhnhtphcm@hub.edu.vn</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <GraduationCap className="h-5 w-5 text-primary" />
                        <span className="text-foreground">Trường Đại học Ngân hàng TP.HCM</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Side - Contact Form */}
              <div className="flex-1">
                <ContactForm />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

