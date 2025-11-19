"use client"

import { ContactForm } from "@/components/forms/contact-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Mail, 
  Phone, 
  GraduationCap, 
  MapPin,
  Clock,
} from "lucide-react"
import { getRouteFromFeature } from "@/lib/utils"

// Routes constants - Lấy từ appFeatures
const _CONTACT_ROUTES = {
  home: getRouteFromFeature("home") || "/",
  help: getRouteFromFeature("help") || "/huong-dan-su-dung",
} as const

export type ContactClientProps = Record<string, never>

export function ContactClient({}: ContactClientProps) {
  return (
    <div className="relative isolate bg-background">
      {/* Main Content */}
      <section className="py-6">
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

