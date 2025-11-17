"use client"

import { ContactForm } from "@/components/forms/contact-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Mail, 
  Phone, 
  GraduationCap, 
  MapPin,
  Clock,
  MessageSquare
} from "lucide-react"
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
const CONTACT_ROUTES = {
  home: getRouteFromFeature("home") || "/",
  help: getRouteFromFeature("help") || "/huong-dan-su-dung",
} as const

export interface ContactClientProps {
  // Có thể thêm props từ server component nếu cần
}

export function ContactClient({}: ContactClientProps) {
  return (
    <div className="relative isolate bg-background">
      {/* Hero Section */}
      <section className="py-12 sm:py-16 lg:py-20 bg-card border-b border-border">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
              <MessageSquare className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-card-foreground mb-4 sm:mb-6">
              Liên hệ với chúng tôi
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed">
              Chúng tôi luôn sẵn sàng lắng nghe và hỗ trợ bạn. Hãy gửi tin nhắn cho chúng tôi!
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-12 sm:py-16 lg:py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
              {/* Left Side - Contact Information */}
              <div className="lg:col-span-1">
                <div className="space-y-6">
                  <Card className="border-border">
                    <CardHeader>
                      <CardTitle className="text-xl font-bold text-card-foreground flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Phone className="h-5 w-5 text-primary" />
                        </div>
                        Thông tin liên hệ
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-lg bg-muted/50 dark:bg-muted flex items-center justify-center flex-shrink-0">
                          <Phone className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-card-foreground mb-1">Điện thoại</p>
                          <p className="text-muted-foreground">(028) 38 212 430</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-lg bg-muted/50 dark:bg-muted flex items-center justify-center flex-shrink-0">
                          <Mail className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-card-foreground mb-1">Email</p>
                          <p className="text-muted-foreground">dhnhtphcm@hub.edu.vn</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-lg bg-muted/50 dark:bg-muted flex items-center justify-center flex-shrink-0">
                          <MapPin className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-card-foreground mb-1">Địa chỉ</p>
                          <p className="text-muted-foreground">
                            Trường Đại học Ngân hàng TP.HCM
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-lg bg-muted/50 dark:bg-muted flex items-center justify-center flex-shrink-0">
                          <Clock className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-card-foreground mb-1">Giờ làm việc</p>
                          <p className="text-muted-foreground">
                            Thứ 2 - Thứ 6: 7:30 - 17:00
                            <br />
                            Thứ 7: 7:30 - 12:00
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-border bg-muted/30">
                    <CardHeader>
                      <CardTitle className="text-lg font-semibold text-card-foreground flex items-center gap-2">
                        <GraduationCap className="h-5 w-5 text-primary" />
                        Về chúng tôi
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-muted-foreground leading-relaxed">
                        Trường Đại học Ngân hàng TP.HCM cam kết mang đến dịch vụ tốt nhất cho 
                        phụ huynh và sinh viên. Chúng tôi luôn sẵn sàng hỗ trợ và giải đáp mọi thắc mắc.
                      </CardDescription>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Right Side - Contact Form */}
              <div className="lg:col-span-2">
                <ContactForm />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

