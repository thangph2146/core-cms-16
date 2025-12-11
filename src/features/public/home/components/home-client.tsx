"use client";

import {
  Users,
  MessageSquare,
  Bell,
  ArrowRight,
  GraduationCap,
  Check,
  Phone,
  Mail,
} from "lucide-react";
import { ContactForm } from "@/components/forms/contact-form";
import { getRouteFromFeature } from "@/lib/utils";
import { Section } from "./section";
import { SectionWithImage } from "./section-with-image";
import { SectionText } from "./section-text";
import { HeroSection } from "./hero-section";
import { ContactSection } from "./contact-section";

// Routes constants - Lấy từ appFeatures
const HOME_ROUTES = {
  signIn: "/auth/sign-in",
  signUp: "/auth/sign-up",
  help: getRouteFromFeature("help") || "/help",
} as const;

export type HomeClientProps = Record<string, never>;

export function HomeClient({}: HomeClientProps) {
  return (
    <div className="relative isolate bg-background">
      {/* Hero Section */}
      <HeroSection
        title="Hệ thống Kết nối Phụ huynh"
        description="Kết nối phụ huynh với Trường Đại học Ngân hàng Thành phố Hồ Chí Minh"
        backgroundImage={{
          src: "https://s7ap1.scene7.com/is/image/rmit/fc-banner?wid=1440&hei=450&scl=1",
          alt: "Trường Đại học Ngân hàng TP.HCM",
          width: 1920,
          height: 1080,
        }}
        buttons={[
          {
            href: HOME_ROUTES.signIn,
            text: "Đăng nhập ngay",
            variant: "default",
            size: "sm",
            leftIcon: <Users className="h-3 w-3 sm:h-4 sm:w-4" />,
            rightIcon: <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4" />,
            responsiveText: {
              mobile: "Đăng nhập",
              desktop: "Đăng nhập ngay",
            },
          },
          {
            href: HOME_ROUTES.signUp,
            text: "Đăng ký",
            variant: "outline",
            size: "sm",
            leftIcon: <MessageSquare className="h-3 w-3 sm:h-4 sm:w-4" />,
          },
        ]}
      />

      {/* Overview Section */}
      <Section>
        <SectionText
          title="Tổng quan về Hệ thống"
          paragraphs={[
            "Hệ thống Quản lý Sinh viên của Trường Đại học Ngân hàng Thành phố Hồ Chí Minh được thiết kế để tạo cầu nối giữa phụ huynh, gia đình và nhà trường. Chúng tôi hiểu rằng sự tham gia tích cực của gia đình đóng vai trò quan trọng trong thành công học tập của sinh viên ngành ngân hàng và tài chính.",
            "Thông qua nền tảng này, phụ huynh có thể theo dõi tiến độ học tập, điểm số, lịch học và lịch thi của sinh viên. Đồng thời, phụ huynh có thể trao đổi thông tin trực tiếp với giảng viên, cố vấn học tập và nhận thông báo quan trọng từ nhà trường.",
            {
              text: "Hệ thống được quản lý bởi Phòng Công tác Sinh viên - Trường Đại học Ngân hàng TP.HCM.",
              className: "text-muted-foreground",
            },
          ]}
        />
      </Section>

      {/* Guide & Register Section */}
      <Section padding="py-0">
          {/* Top Row - Guide Section */}
          <SectionWithImage
            title="Hướng dẫn cho Phụ huynh"
            description="Khám phá hướng dẫn toàn diện với thông tin cần thiết và tài nguyên dành cho phụ huynh sinh viên Trường Đại học Ngân hàng TP.HCM."
            image={{
              src: "https://hub.edu.vn/DATA/IMAGES/2025/06/06/20250606095355z6676952814172_23a84367b5e409bfcea8b8e95ac6ba4c.jpg",
              alt: "Hướng dẫn cho phụ huynh",
            }}
            button={{
              href: HOME_ROUTES.help,
              text: "Tìm hiểu ngay",
              variant: "outline",
              size: "sm",
            }}
          />

          {/* Bottom Row - Register Section */}
          <SectionWithImage
            title="Đăng ký nhận tin tức"
            description="Cập nhật thông tin mới nhất về hoạt động của trường, bản tin phụ huynh và các sự kiện dành cho phụ huynh sinh viên Trường Đại học Ngân hàng TP.HCM."
            image={{
              src: "https://hub.edu.vn/DATA/IMAGES/2025/06/06/20250606095214z6676928339374_824596735893cad9e9d4402075fcccd2.jpg",
              alt: "Đăng ký nhận tin tức",
            }}
            button={{
              href: HOME_ROUTES.signUp,
              text: "Đăng ký ngay",
              variant: "outline",
              size: "sm",
            }}
            reverse
          />
      </Section>

      {/* Registration Form Section */}
      <Section
        padding="py-16 sm:py-20 lg:py-24"
        background="bg-background"
      >
        <ContactSection
          title="Tại sao chọn chúng tôi?"
          description="Chúng tôi cam kết mang đến trải nghiệm tốt nhất cho phụ huynh và sinh viên."
          contactInfo={{
            title: "Thông tin liên hệ",
            items: [
              {
                icon: <Phone className="h-5 w-5 text-primary" />,
                text: "(028) 38 212 430",
              },
              {
                icon: <Mail className="h-5 w-5 text-primary" />,
                text: "dhnhtphcm@hub.edu.vn",
              },
              {
                icon: <GraduationCap className="h-5 w-5 text-primary" />,
                text: "Trường Đại học Ngân hàng TP.HCM",
              },
            ],
          }}
          formComponent={<ContactForm />}
        />
      </Section>
    </div>
  );
}
