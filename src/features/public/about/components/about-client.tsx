"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  GraduationCap, 
  Target,
  Eye,
  Users,
  Building2,
  Award,
  BookOpen,
  MapPin,
  Phone,
  Mail,
  Clock,
  ArrowRight,
  CheckCircle2
} from "lucide-react"
import Link from "next/link"
import { appFeatures } from "@/lib/config/app-features"
import { getResourceMainRoute } from "@/lib/permissions/route-helpers"
import { Logo } from "../../../../../public/svg/Logo"

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
const ABOUT_ROUTES = {
  home: getRouteFromFeature("home") || "/",
  contact: getRouteFromFeature("contact") || "/lien-he",
  blog: getRouteFromFeature("blog") || "/bai-viet",
} as const

export interface AboutClientProps {
  // Có thể thêm props từ server component nếu cần
}

export function AboutClient({}: AboutClientProps) {
  const campuses = [
    {
      name: "Trụ sở chính",
      address: "36 Tôn Thất Đạm, Phường Sài Gòn, TP.Hồ Chí Minh",
      icon: Building2,
    },
    {
      name: "Cơ sở Hàm Nghi",
      address: "39 Hàm Nghi, Phường Sài Gòn, TP. Hồ Chí Minh",
      icon: Building2,
    },
    {
      name: "Cơ sở Hoàng Diệu",
      address: "56 Hoàng Diệu 2, Phường Thủ Đức, TP. Hồ Chí Minh",
      icon: Building2,
    },
  ]

  const achievements = [
    {
      title: "Chứng nhận kiểm định Chương trình đào tạo",
      description: "Theo tiêu chuẩn AUN-QA",
      icon: Award,
    },
    {
      title: "Chứng nhận kiểm định Cơ sở giáo dục",
      description: "Theo tiêu chuẩn MOET",
      icon: Award,
    },
    {
      title: "Chứng nhận hệ thống quản lý",
      description: "Theo tiêu chuẩn ISO 21001:2018",
      icon: Award,
    },
  ]

  const values = [
    "Chất lượng giáo dục hàng đầu",
    "Đổi mới và sáng tạo",
    "Trách nhiệm xã hội",
    "Hợp tác quốc tế",
    "Phát triển bền vững",
  ]

  return (
    <div className="relative isolate bg-background">
      {/* Hero Section */}
      <section className="py-12 sm:py-16 lg:py-20 bg-card border-b border-border">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
              <GraduationCap className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-card-foreground mb-4 sm:mb-6">
              Về Trường Đại học Ngân hàng TP.HCM
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed">
              Trường Đại học Ngân hàng Thành phố Hồ Chí Minh (Ho Chi Minh University of Banking - HUB) 
              là trường đại học công lập trực thuộc Ngân hàng Nhà nước Việt Nam
            </p>
          </div>
        </div>
      </section>

      {/* Overview Section */}
      <section className="py-12 sm:py-16 lg:py-20 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
              <div>
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-6">
                  Tổng quan về HUB
                </h2>
                <div className="prose prose-sm sm:prose-base md:prose-lg text-foreground leading-relaxed dark:prose-invert">
                  <p className="mb-4">
                    Trường Đại học Ngân hàng Thành phố Hồ Chí Minh (HUB) là một trong những 
                    trường đại học hàng đầu về đào tạo nguồn nhân lực chất lượng cao trong lĩnh vực 
                    ngân hàng, tài chính và kinh tế tại Việt Nam.
                  </p>
                  <p className="mb-4">
                    Với hơn 50 năm hình thành và phát triển, HUB đã khẳng định vị thế của mình 
                    trong hệ thống giáo dục đại học Việt Nam, đóng góp quan trọng vào việc đào tạo 
                    nguồn nhân lực chất lượng cao cho ngành ngân hàng và tài chính.
                  </p>
                  <p className="text-muted-foreground">
                    Trường luôn nỗ lực không ngừng để nâng cao chất lượng đào tạo, nghiên cứu khoa học 
                    và phục vụ cộng đồng, góp phần vào sự phát triển bền vững của đất nước.
                  </p>
                </div>
              </div>
              <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/10 to-secondary/10 p-8 sm:p-12">
                <div className="aspect-video flex items-center justify-center">
                  <Logo className="h-32 w-32 sm:h-40 sm:w-40 lg:h-48 lg:w-48 text-primary" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Vision & Mission Section */}
      <section className="py-12 sm:py-16 lg:py-20 bg-card">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-card-foreground mb-4">
                Tầm nhìn - Sứ mệnh
              </h2>
              <p className="text-lg text-muted-foreground">
                Định hướng phát triển và giá trị cốt lõi của HUB
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
              <Card className="border-border">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Eye className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-xl font-bold text-card-foreground">
                      Tầm nhìn
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-muted-foreground leading-relaxed">
                    Trở thành trường đại học hàng đầu về đào tạo, nghiên cứu khoa học trong lĩnh vực 
                    ngân hàng, tài chính và kinh tế tại Việt Nam và khu vực, được công nhận quốc tế.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 rounded-lg bg-secondary/10 flex items-center justify-center">
                      <Target className="h-6 w-6 text-secondary" />
                    </div>
                    <CardTitle className="text-xl font-bold text-card-foreground">
                      Sứ mệnh
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-muted-foreground leading-relaxed">
                    Đào tạo nguồn nhân lực chất lượng cao, có phẩm chất đạo đức, năng lực chuyên môn 
                    và kỹ năng nghề nghiệp, đáp ứng yêu cầu phát triển của ngành ngân hàng, tài chính 
                    và nền kinh tế.
                  </CardDescription>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-12 sm:py-16 lg:py-20 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-4">
                Hệ giá trị
              </h2>
              <p className="text-lg text-muted-foreground">
                Những giá trị cốt lõi định hình văn hóa và hoạt động của HUB
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {values.map((value, index) => (
                <Card key={index} className="border-border">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <p className="text-foreground font-medium">{value}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Achievements Section */}
      <section className="py-12 sm:py-16 lg:py-20 bg-card">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-card-foreground mb-4">
                Thành tựu & Chứng nhận
              </h2>
              <p className="text-lg text-muted-foreground">
                Những dấu mốc quan trọng trong hành trình phát triển của HUB
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {achievements.map((achievement, index) => {
                const Icon = achievement.icon
                return (
                  <Card key={index} className="border-border">
                    <CardHeader>
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                      <CardTitle className="text-lg font-semibold text-card-foreground">
                        {achievement.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-muted-foreground">
                        {achievement.description}
                      </CardDescription>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Campuses Section */}
      <section className="py-12 sm:py-16 lg:py-20 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-4">
                Cơ sở đào tạo
              </h2>
              <p className="text-lg text-muted-foreground">
                HUB có 3 cơ sở đào tạo tại TP. Hồ Chí Minh
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {campuses.map((campus, index) => {
                const Icon = campus.icon
                return (
                  <Card key={index} className="border-border">
                    <CardHeader>
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <CardTitle className="text-lg font-semibold text-card-foreground">
                          {campus.name}
                        </CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-start gap-3">
                        <MapPin className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                        <p className="text-muted-foreground leading-relaxed">
                          {campus.address}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Contact CTA Section */}
      <section className="py-12 sm:py-16 lg:py-20 bg-card">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <Card className="border-border bg-background">
              <CardHeader className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6 mx-auto">
                  <Mail className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-2xl sm:text-3xl font-bold text-card-foreground mb-4">
                  Liên hệ với chúng tôi
                </CardTitle>
                <CardDescription className="text-lg text-muted-foreground">
                  Có câu hỏi? Chúng tôi luôn sẵn sàng hỗ trợ bạn
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 dark:bg-muted border border-border">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Phone className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-card-foreground">Hotline Đào tạo</p>
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
                    <Link href={ABOUT_ROUTES.contact}>
                      <Mail className="h-4 w-4 mr-2" />
                      Gửi tin nhắn
                    </Link>
                  </Button>
                  <Button variant="outline" size="lg" asChild>
                    <Link href={ABOUT_ROUTES.home}>
                      <ArrowRight className="h-4 w-4 mr-2" />
                      Về trang chủ
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

