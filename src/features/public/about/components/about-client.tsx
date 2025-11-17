"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ArrowRight
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useState, useEffect, useRef } from "react"
import type React from "react"
import { appFeatures } from "@/lib/config/app-features"
import { getResourceMainRoute } from "@/lib/permissions/route-helpers"
import { Timeline } from "@/components/ui/timeline"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"

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

/**
 * Helper function để highlight "HUB" trong text với màu secondary
 */
function highlightHUB(text: string): React.ReactNode {
  const parts = text.split(/(HUB)/gi)
  return parts.map((part, index) =>
    part.toUpperCase() === 'HUB' ? (
      <span key={index} className="font-bold text-secondary">
        {part}
      </span>
    ) : (
      part
    )
  )
}

export function AboutClient() {
  const [showMoreDialog, setShowMoreDialog] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isMobile, setIsMobile] = useState(false)
  const [currentLeaderIndex, setCurrentLeaderIndex] = useState(0)
  const [leaderCarouselIndices, setLeaderCarouselIndices] = useState<Record<number, number>>({})
  const leaderCarouselRefs = useRef<Record<number, HTMLDivElement | null>>({})

  // Detect screen size: xl = 1280px
  useEffect(() => {
    const checkScreen = () => {
      setIsMobile(window.innerWidth < 1280) // xl breakpoint
    }

    checkScreen()
    window.addEventListener("resize", checkScreen)
    return () => window.removeEventListener("resize", checkScreen)
  }, [])

  const coreValues = [
    {
      title: "CHÍNH TRỰC",
      description: "Chính trực trong mọi hành động. HUB luôn nhất quán giữa Tư duy - Lời nói - Hành động.",
      color: "#A41034",
    },
    {
      title: "ĐOÀN KẾT",
      description: "Đoàn kết tạo nên sự thống nhất để có sức mạnh tổng hợp. HUB lấy phương châm đảm bảo sự hài hòa lợi ích giữa các bên có liên quan để cùng nhau phát triển.",
      color: "#1F3368",
    },
    {
      title: "TIÊN PHONG",
      description: "Tiên phong để tạo ra và dẫn dắt xu hướng. HUB tiên phong trong ứng dụng thành tựu khoa học công nghệ vào các hoạt động đào tạo, nghiên cứu, quản lý, điều hành.",
      color: "#CE395D",
    },
  ]

  const educationPhilosophy = [
    {
      title: "Khai phóng",
      description: "HUB tạo môi trường giáo dục giúp người học tự khai phá tiềm năng của bản thân; lĩnh hội kiến thức chuyên môn sâu của ngành học trên nền tảng kiến thức tổng quát toàn diện; phát triển năng lực trí tuệ và kỹ năng cá nhân; định hình các giá trị sống tích cực hướng tới giáo dục con người tự chủ, sáng tạo, công dân có trách nhiệm.",
      color: "#A41034",
    },
    {
      title: "Liên ngành",
      description: "HUB hướng đến đào tạo người học có hiểu biết liên ngành nhằm tránh những thiên kiến trong việc ra quyết định, tăng khả năng kết nối các chuyên gia, mở rộng cơ hội việc làm.",
      color: "#1F3368",
    },
    {
      title: "Trải nghiệm",
      description: "HUB triển khai mô hình đào tạo \"trưởng thành qua trải nghiệm\". Qua trải nghiệm, người học sẽ hiểu biết sâu sắc hơn về lý thuyết, hình thành tư duy thực tiễn, năng lực thực thi, từ đó thích nghi và cải tạo môi trường.",
      color: "#CE395D",
    },
  ]

  const facilities = [
    { number: "3", label: "Cơ sở đào tạo" },
    { number: "131", label: "Giảng đường" },
    { number: "328", label: "Phòng KTX" },
    { number: "15", label: "Phòng máy thực hành" },
  ]

  const facilityImages = [
    {
      src: "https://hub.edu.vn/DATA/IMAGES/2024/12/31/20241231235059-1khuanvientruonghoc.jpg",
      alt: "HUB tham gia Ngày Hội TVTS hướng nghiệp",
      title: "HUB tham gia Ngày Hội TVTS hướng nghiệp"
    },
    {
      src: "https://hub.edu.vn/DATA/IMAGES/2024/12/31/20241231235033-1khuanvientruonghoc.jpg",
      alt: "Khuôn viên trường học",
      title: "Khuôn viên trường học"
    },
    {
      src: "https://hub.edu.vn/DATA/IMAGES/2024/12/31/20241231235033-1vehub.jpg",
      alt: "HUB tham gia Ngày Hội TVTS hướng nghiệp",
      title: "HUB tham gia Ngày Hội TVTS hướng nghiệp"
    },
    {
      src: "https://hub.edu.vn/DATA/IMAGES/2024/12/31/20241231235059-1khuanvientruonghoc.jpg",
      alt: "Khuôn viên trường học 2",
      title: "Khuôn viên trường học 2"
    },
  ]

  const departments = [
    { name: "Khoa sau Đại học", url: "https://khoasdh.hub.edu.vn/" },
    { name: "Khoa Ngân hàng", url: "https://khoanh.hub.edu.vn/" },
    { name: "Khoa Tài chính", url: "https://khoatc.hub.edu.vn/" },
    { name: "Khoa Quản trị kinh doanh", url: "https://khoaqtkd.hub.edu.vn/" },
    { name: "Khoa Kế toán - Kiểm toán", url: "https://khoaktkt.hub.edu.vn/" },
    { name: "Khoa Hệ thống thông tin quản lý", url: "https://khoahtttql.hub.edu.vn/" },
    { name: "Khoa Ngoại ngữ", url: "https://khoangoaingu.hub.edu.vn/" },
    { name: "Khoa Kinh tế Quốc tế", url: "https://khoaktqt.hub.edu.vn/" },
    { name: "Khoa Luật kinh tế", url: "https://khoalkt.hub.edu.vn/" },
    { name: "Khoa Khoa học - Xã hội", url: "https://khoakhxh.hub.edu.vn/" },
    { name: "Khoa Khoa học dữ liệu trong kinh doanh", url: "https://khoakhdltkd.hub.edu.vn/" },
    { name: "Khoa Giáo dục thể chất và Quốc phòng", url: "https://bomongdtc.hub.edu.vn/" },
  ]

  const historyTimeline = [
    {
      year: "2020 đến nay",
      image: "https://hub.edu.vn/DATA/IMAGES/2025/03/26/20250326085755z6442765605666_40dd44e04e50609ca5e451d3950e986a.jpg",
      description: "Ngày 09/6/2020, Thống đốc Ngân hàng Nhà nước ký quyết định số 1068/QĐ-NHNN công nhận Hội đồng Trường Đại học Ngân hàng TP. Hồ Chí Minh nhiệm kỳ 2020 -2025. Từ giai đoạn này, Trường Đại học Ngân hàng Tp. Hồ Chí Minh hoạt động theo mô hình quản trị đại học theo luật giáo dục đại học"
    },
    {
      year: "2003 - 2020",
      image: "https://hub.edu.vn/DATA/IMAGES/2025/03/26/20250326090452z6442812662205_d2cfb019f8affa945d7cc12b6b092275.jpg",
      description: "Thủ tướng Chính phủ ký quyết định số 174/2003/QĐ-TTg ngày 20/8/2003, thành lập Trường Đại học Ngân hàng TP. Hồ Chí Minh. Từ đây, Trường Đại học Ngân hàng TP. Hồ Chí Minh chính thức hoạt động là Trường đại học độc lập trực thuộc Ngân hàng Nhà nước Việt Nam"
    },
    {
      year: "1998 - 2003",
      image: "https://hub.edu.vn/DATA/IMAGES/2025/03/26/20250326085938202503211040542003z.jpg",
      description: "Thủ tướng Chính phủ ký quyết định số 30/1998/QĐ-TTg ngày 9/2/1998, thành lập Học viện Ngân hàng trực thuộc Ngân hàng Nhà nước Việt Nam trên cơ sở tổ chức lại Trung tâm Đào tạo và Nghiên cứu khoa học Ngân hàng, trong đó Học viện Ngân hàng - Phân viện TP. Hồ Chí Minh đóng tại TP. Hồ Chí Minh."
    },
    {
      year: "1993 - 1998",
      image: "https://hub.edu.vn/DATA/IMAGES/2025/03/21/2025032110474693-98.jpg",
      description: "Thủ tướng Chính phủ ký quyết định số: 112/TTg ngày 23/3/1993 thành lập Trung tâm Đào tạo và Nghiên cứu khoa học Ngân hàng trực thuộc Ngân hàng Nhà nước Việt Nam, trong đó có Trung tâm Đào tạo và Nghiên cứu khoa học Ngân hàng - Chi nhánh TPHCM, trên cơ sở nhập hai trường: Trường Cao cấp Nghiệp vụ Ngân hàng TPHCM và Trường Trung học Ngân hàng III Trung ương (Trực thuộc Ngân hàng Nhà nước Việt Nam, tại TPHCM)."
    },
    {
      year: "1986 - 1993",
      image: "https://hub.edu.vn/DATA/IMAGES/2025/03/26/20250326090650z6442821071933_19260dfa8dccda5113a5d3a7c130811a.jpg",
      description: "Tổng giám đốc Ngân hàng Nhà nước Việt Nam ký quyết định số: 169/NH-QĐ ngày 23/3/1986, thành lập Trường Cao cấp nghiệp vụ Ngân hàng - TP. Hồ Chí Minh."
    },
    {
      year: "1980 - 1986",
      image: "https://hub.edu.vn/DATA/IMAGES/2025/03/26/20250326090355z6427652151045_b9119b0039e6088c31b096dc4db9458c.jpg",
      description: "Thủ tướng Chính phủ ký quyết định số: 149/TTG ngày 8/5/1980, cho phép Cơ sở II Trường Cao cấp Nghiệp vụ Ngân hàng được đào tạo hệ Đại học chính quy chuyên ngành Ngân hàng."
    },
    {
      year: "1976 - 1980",
      image: "https://hub.edu.vn/DATA/IMAGES/2025/03/21/202503211030011976z6425431889823_dd12533007a93f960907b2ea3628db2a.jpg",
      description: "Ngày 16/12/1976 Tổng giám đốc Ngân hàng Nhà nước Việt Nam đã ký quyết định số: 1229/NH TCCB thành lập Cơ sở II Trường Cao cấp Nghiệp vụ Ngân hàng và Trường Trung học Ngân hàng 3 TW tại TPHCM. Nhiệm vụ chính là đào tạo hệ trung học chuyên nghiệp, đại học chuyên tu, đại học tại chức, bổ túc sau trung học, đào tạo hệ ngắn hạn về quản lý và nghiệp vụ cho hệ thống ngân hàng mới được thành lập ở các tỉnh phía Nam."
    },
  ]

  const leaderGenerations = [
    {
      period: "BAN LÃNH ĐẠO ĐƯƠNG NHIỆM",
      year: "2020 đến nay",
      leaders: [
        { name: "NGƯT.PGS.TS. ĐOÀN THANH HÀ", image: "https://hub.edu.vn/DATA/IMAGES/2025/02/17/20250217222605DOANTHANHHA2.jpg", position: "BÍ THƯ ĐẢNG ỦY\nCHỦ TỊCH HỘI ĐỒNG TRƯỜNG" },
        { name: "PGS. TS. NGUYỄN ĐỨC TRUNG", image: "https://hub.edu.vn/DATA/IMAGES/2025/02/17/20250217222643NGUYENDUCTRUNG.jpg", position: "PHÓ BÍ THƯ ĐẢNG ỦY\nPHÓ CHỦ TỊCH HỘI ĐỒNG TRƯỜNG\nHIỆU TRƯỞNG" },
        { name: "PGS.TS. HẠ THỊ THIỀU DAO", image: "https://hub.edu.vn/DATA/IMAGES/2025/02/17/20250217222705HATHITHIEUDAO.jpg", position: "PHÓ HIỆU TRƯỞNG" },
        { name: "TS. NGUYỄN TRẦN PHÚC", image: "https://hub.edu.vn/DATA/IMAGES/2025/02/17/20250217222727NGUYENTRANPHUC.jpg", position: "PHÓ HIỆU TRƯỞNG" },
      ]
    },
    {
      period: "6/2020 - 12/2021",
      year: "6/2020 - 12/2021",
      leaders: [
        { name: "NGƯT.PGS.TS. ĐOÀN THANH HÀ", image: "https://hub.edu.vn/DATA/IMAGES/2025/02/17/20250217222247DOANTHANHHA2.jpg", position: "BÍ THƯ ĐẢNG ỦY (TỪ 01/2017)\nCHỦ TỊCH HỘI ĐỒNG TRƯỜNG" },
        { name: "TS. BÙI HỮU TOÀN", image: "https://hub.edu.vn/DATA/IMAGES/2025/02/17/20250217222318BUIHUUTOAN.jpg", position: "BÍ THƯ ĐÁNG ỦY (ĐÉN 01/2021)\nHIỆU TRƯỞNG" },
        { name: "PGS. TS. NGUYỄN ĐỨC TRUNG", image: "https://hub.edu.vn/DATA/IMAGES/2025/02/17/20250217222347NGUYENDUCTRUNG.jpg", position: "PHÓ HIỆU TRƯỞNG" },
        { name: "PGS.TS. HẠ THỊ THIỀU DAO", image: "https://hub.edu.vn/DATA/IMAGES/2025/02/17/20250217222410HATHITHIEUDAO.jpg", position: "PHÓ HIỆU TRƯỞNG" },
        { name: "TS. NGUYỄN TRẦN PHÚC", image: "https://hub.edu.vn/DATA/IMAGES/2025/02/17/20250217222453NGUYENTRANPHUC.jpg", position: "PHÓ HIỆU TRƯỞNG\n(TỪ 01/2021)" },
      ]
    },
    {
      period: "3/2018 - 6/2020",
      year: "3/2018 - 6/2020",
      leaders: [
        { name: "TS. BÙI HỮU TOÀN", image: "https://hub.edu.vn/DATA/IMAGES/2025/02/17/20250217221823BUIHUUTOAN.jpg", position: "BÍ THƯ ĐẢNG ỦY\nQ. HIỆU TRƯỞNG (3/2018 0 10/2019)\nHIỆU TRƯỞNG (10/2019)" },
        { name: "PGS. TS. NGUYỄN ĐỨC TRUNG", image: "https://hub.edu.vn/DATA/IMAGES/2025/02/17/20250217221859NGUYENDUCTRUNG.jpg", position: "PHÓ HIỆU TRƯỞNG" },
        { name: "NGƯT.PGS.TS. ĐOÀN THANH HÀ", image: "https://hub.edu.vn/DATA/IMAGES/2025/02/17/20250217222003DOANTHANHHA2.jpg", position: "PHÓ HIỆU TRƯỞNG" },
        { name: "PGS. TS. HẠ THỊ THIỀU DAO", image: "https://hub.edu.vn/DATA/IMAGES/2025/02/17/20250217222146HATHITHIEUDAO.jpg", position: "PHÓ HIỆU TRƯỞNG\n(TỪ 4/2020)" },
      ]
    },
    {
      period: "2013 - 2018",
      year: "2013 - 2018",
      leaders: [
        { name: "NGƯT. PGS. TS. LÝ HOÀNG ÁNH", image: "https://hub.edu.vn/DATA/IMAGES/2025/02/17/20250217221259LYHOANGANH.jpg", position: "HIỆU TRƯỞNG\n2013 - 2018" },
        { name: "PGS. TS. LÊ SĨ ĐỒNG", image: "https://hub.edu.vn/DATA/IMAGES/2025/02/17/20250217221358LESIDONG.jpg", position: "PHÓ HIỆU TRƯỞNG\n2013 - 2017" },
        { name: "NGƯT.PGS.TS. ĐOÀN THANH HÀ", image: "https://hub.edu.vn/DATA/IMAGES/2025/02/17/20250217221504DOANTHANHHA.jpg", position: "Phó Hiệu trưởng\n2014 - 2018" },
        { name: "ThS. LÊ TẤN PHÁT", image: "https://hub.edu.vn/DATA/IMAGES/2025/02/17/20250217221526LETANPHAT.jpg", position: "Phó Hiệu trưởng\n2013 - 2016" },
      ]
    },
    {
      period: "2008 - 2013",
      year: "2008 - 2013",
      leaders: [
        { name: "NGND. PGS. TS. NGÔ HƯỚNG", image: "https://hub.edu.vn/DATA/IMAGES/2025/02/17/20250217220843NGOHUONG.jpg", position: "HIỆU TRƯỞNG\n2008 - 2013" },
        { name: "NGƯT.TS. HỒ DIỆU", image: "https://hub.edu.vn/DATA/IMAGES/2025/02/17/20250217220924HODIEU.jpg", position: "PHÓ HIỆU TRƯỞNG\n2008 - 2013" },
        { name: "NGƯT.PGS.TS. NGUYỄN THỊ NHUNG", image: "https://hub.edu.vn/DATA/IMAGES/2025/02/17/20250217220953NGUYENTHINHUNG.jpg", position: "Phó Hiệu trưởng\n2008 - 2012" },
        { name: "ThS. LÊ TẤN PHÁT", image: "https://hub.edu.vn/DATA/IMAGES/2025/02/17/20250217221047LETANPHAT.jpg", position: "Phó Hiệu trưởng\n2008 - 2013" },
        { name: "PGS. TS. LÝ HOÀNG ÁNH", image: "https://hub.edu.vn/DATA/IMAGES/2025/02/17/20250217221150LYHOANGANH.jpg", position: "PHÓ HIỆU TRƯỞNG\n2011 - 2013" },
      ]
    },
    {
      period: "2003 - 2008",
      year: "2003 - 2008",
      leaders: [
        { name: "NGND.TS. NGUYỄN VĂN HÀ", image: "https://hub.edu.vn/DATA/IMAGES/2025/02/17/20250217220632NGUYENVANHA.jpg", position: "HIỆU TRƯỞNG\n2003 - 2008" },
        { name: "NGND. PGS. TS. NGÔ HƯỚNG", image: "https://hub.edu.vn/DATA/IMAGES/2025/02/17/20250217220656NGOHUONG.jpg", position: "PHÓ HIỆU TRƯỞNG\n2003 - 2008" },
        { name: "NGƯT.TS. HỒ DIỆU", image: "https://hub.edu.vn/DATA/IMAGES/2025/02/17/20250217220727HODIEU.jpg", position: "PHÓ HIỆU TRƯỞNG\n2003 - 2008" },
        { name: "NGƯT.PGS.TS. NGUYỄN THỊ NHUNG", image: "https://hub.edu.vn/DATA/IMAGES/2025/02/17/20250217220758NGUYENTHINHUNG.jpg", position: "PHÓ HIỆU TRƯỞNG\n2003 - 2008" },
      ]
    },
    {
      period: "1998 - 2003",
      year: "1998 - 2003",
      leaders: [
        { name: "NGND.TS. NGUYỄN VĂN HÀ", image: "https://hub.edu.vn/DATA/IMAGES/2025/02/17/20250217214056NGUYENVANHA.jpg", position: "GIÁM ĐỐC\n1998 - 2003" },
        { name: "NGND. PGS. TS. NGÔ HƯỚNG", image: "https://hub.edu.vn/DATA/IMAGES/2025/02/17/20250217214126NGOHUONG.jpg", position: "PHÓ GIÁM ĐỐC\n1998 - 2003" },
        { name: "NGƯT.TS. HỒ DIỆU", image: "https://hub.edu.vn/DATA/IMAGES/2025/02/17/20250217214155HODIEU.jpg", position: "PHÓ GIÁM ĐỐC\n1998 - 2003" },
        { name: "CÔ NGUYỄN THỊ ẢNH", image: "https://hub.edu.vn/DATA/IMAGES/2025/02/17/20250217214220NGUYENTHIANH.jpg", position: "PHÓ GIÁM ĐỐC\n1998 - 1999" },
        { name: "NGƯT.PGS.TS. NGUYỄN THỊ NHUNG", image: "https://hub.edu.vn/DATA/IMAGES/2025/02/17/20250217214328NGUYENTHINHUNG.jpg", position: "PHÓ GIÁM ĐỐC\n1999 - 2003" },
      ]
    },
    {
      period: "1993 - 1998",
      year: "1993 - 1998",
      leaders: [
        { name: "NGƯT. TRẦN MINH HOÀNG", image: "https://hub.edu.vn/DATA/IMAGES/2025/02/17/20250217213530TRANMINHHOANG.jpg", position: "GIÁM ĐỐC\n1993 - 1998" },
        { name: "PGS. TS. LÊ VĂN TỀ", image: "https://hub.edu.vn/DATA/IMAGES/2025/02/17/20250217213622LEVANTE.jpg", position: "PHÓ GIÁM ĐỐC\n1993 - 1994" },
        { name: "NGND.TS. NGUYỄN VĂN HÀ", image: "https://hub.edu.vn/DATA/IMAGES/2025/02/17/20250217213647NGUYENVANHA.jpg", position: "PHÓ GIÁM ĐỐC\n1993 - 1998" },
        { name: "NGND. PGS. TS. NGÔ HƯỚNG", image: "https://hub.edu.vn/DATA/IMAGES/2025/02/17/20250217213746NGOHUONG.jpg", position: "PHÓ GIÁM ĐỐC\n1993 - 1998" },
        { name: "CÔ NGUYỄN THỊ ẢNH", image: "https://hub.edu.vn/DATA/IMAGES/2025/02/17/20250217213841NGUYENTHIANH.jpg", position: "PHÓ GIÁM ĐỐC\n1993 - 1998" },
        { name: "NGƯT.TS. HỒ DIỆU", image: "https://hub.edu.vn/DATA/IMAGES/2025/02/17/20250217213945HODIEU.jpg", position: "PHÓ GIÁM ĐỐC\n1997 - 1998" },
      ]
    },
    {
      period: "1976 - 1993",
      year: "1976 - 1993",
      leaders: [
        { name: "TS. LÊ ĐÌNH THU", image: "https://hub.edu.vn/DATA/IMAGES/2025/02/17/20250217212641ledinhthu.jpg", position: "PHÓ HIỆU TRƯỜNG\n1976 - 1978" },
        { name: "THẦY MAI PHÊ", image: "https://hub.edu.vn/DATA/IMAGES/2025/02/17/20250217212847MAIPHE.jpg", position: "PHỤ TRÁCH\n1978 - 1982" },
        { name: "TS. NGUYỄN HỮU PHÙNG", image: "https://hub.edu.vn/DATA/IMAGES/2025/02/17/20250217213016NGUYENHUUPHUNG.jpg", position: "HIỆU TRƯỞNG\n1982 - 1987" },
        { name: "THẦY NGUYỄN THANH PHONG", image: "https://hub.edu.vn/DATA/IMAGES/2025/02/17/20250217213104NGUYENTHANHPHONG.jpg", position: "HIỆU TRƯỞNG\n1987 - 1993" },
        { name: "PGS. TS. LÊ VĂN TỀ", image: "https://hub.edu.vn/DATA/IMAGES/2025/02/17/20250217213204LEVANTE.jpg", position: "PHÓ HIỆU TRƯỞNG\n1981 - 1993" },
        { name: "NGƯT. TRẦN MINH HOÀNG", image: "https://hub.edu.vn/DATA/IMAGES/2025/02/17/20250217213338TRANMINHHOANG.jpg", position: "PHÓ HIỆU TRƯỞNG\n1987 - 1993" },
        { name: "NGND.TS. NGUYỄN VĂN HÀ", image: "https://hub.edu.vn/DATA/IMAGES/2025/02/17/20250217213427NGUYENVANHA.jpg", position: "PHÓ HIỆU TRƯỞNG\n1987 - 1993" },
      ]
    },
  ]

  // Navigation function for leader generations
  const goToLeader = (index: number) => {
    setCurrentLeaderIndex(index)
    setLeaderCarouselIndices((prev) => ({ ...prev, [index]: 0 }))
  }

  // Tính số hình hiển thị mỗi lần: mobile=1, tablet=2, desktop=4
  const getLeadersPerSlide = () => {
    if (typeof window === 'undefined') return 4
    if (window.innerWidth < 640) return 1 // mobile
    if (window.innerWidth < 1024) return 2 // tablet
    return 4 // desktop
  }

  const [leadersPerSlide, setLeadersPerSlide] = useState(4)

  useEffect(() => {
    const updateLeadersPerSlide = () => {
      const newLeadersPerSlide = getLeadersPerSlide()
      setLeadersPerSlide(newLeadersPerSlide)
      
      // Reset carousel indices khi số lượng leaders per slide thay đổi
      setLeaderCarouselIndices((prev) => {
        const updated: Record<number, number> = {}
        Object.keys(prev).forEach((key) => {
          const genIndex = parseInt(key)
          const leaders = leaderGenerations[genIndex]?.leaders || []
          const totalSlides = Math.ceil(leaders.length / newLeadersPerSlide)
          updated[genIndex] = Math.min(prev[genIndex] || 0, totalSlides - 1)
        })
        return updated
      })
    }
    updateLeadersPerSlide()
    window.addEventListener("resize", updateLeadersPerSlide)
    return () => window.removeEventListener("resize", updateLeadersPerSlide)
  }, [])

  // Tính số slide cho thế hệ lãnh đạo hiện tại
  const getTotalLeaderSlides = (generationIndex: number) => {
    const leaders = leaderGenerations[generationIndex]?.leaders || []
    return Math.ceil(leaders.length / leadersPerSlide)
  }

  // Navigation cho leader carousel - sử dụng scroll
  const nextLeaderCarousel = (generationIndex: number) => {
    const carouselEl = leaderCarouselRefs.current[generationIndex]
    if (carouselEl) {
      const slideWidth = carouselEl.clientWidth
      const currentScroll = carouselEl.scrollLeft
      const nextScroll = currentScroll + slideWidth
      carouselEl.scrollTo({
        left: nextScroll,
        behavior: 'smooth'
      })
    }
  }

  const prevLeaderCarousel = (generationIndex: number) => {
    const carouselEl = leaderCarouselRefs.current[generationIndex]
    if (carouselEl) {
      const slideWidth = carouselEl.clientWidth
      const currentScroll = carouselEl.scrollLeft
      const prevScroll = currentScroll - slideWidth
      carouselEl.scrollTo({
        left: prevScroll,
        behavior: 'smooth'
      })
    }
  }

  const goToLeaderSlide = (generationIndex: number, slideIndex: number) => {
    const carouselEl = leaderCarouselRefs.current[generationIndex]
    if (carouselEl) {
      const slideWidth = carouselEl.clientWidth
      carouselEl.scrollTo({
        left: slideIndex * slideWidth,
        behavior: 'smooth'
      })
    }
  }

  // Lấy các lãnh đạo hiển thị trong một slide cụ thể
  const getLeadersForSlide = (generationIndex: number, slideIndex: number): (typeof leaderGenerations[0]['leaders'][0] | null)[] => {
    const leaders = leaderGenerations[generationIndex]?.leaders || []
    const startIndex = slideIndex * leadersPerSlide
    const endIndex = startIndex + leadersPerSlide
    const slideLeaders: (typeof leaderGenerations[0]['leaders'][0] | null)[] = leaders.slice(startIndex, endIndex)
    
    // Đảm bảo luôn có đủ số lượng để hiển thị (fill với null nếu thiếu)
    while (slideLeaders.length < leadersPerSlide) {
      slideLeaders.push(null)
    }
    
    return slideLeaders
  }

  // Tính số slide: mobile = số hình ảnh, desktop = số hình ảnh / 2
  const totalSlides = isMobile
    ? facilityImages.length
    : Math.ceil(facilityImages.length / 2)

  const nextImage = () => {
    if (isMobile) {
      // Mobile: chuyển 1 hình mỗi lần
      setCurrentImageIndex((prev) => (prev + 1) % facilityImages.length)
    } else {
      // Desktop: chuyển 2 hình mỗi lần
      setCurrentImageIndex((prev) => {
        const next = prev + 2
        if (next >= facilityImages.length) {
          return facilityImages.length % 2 === 0 ? 0 : facilityImages.length - 2
        }
        return next
      })
    }
  }

  const prevImage = () => {
    if (isMobile) {
      // Mobile: chuyển 1 hình mỗi lần
      setCurrentImageIndex((prev) => (prev - 1 + facilityImages.length) % facilityImages.length)
    } else {
      // Desktop: chuyển 2 hình mỗi lần
      setCurrentImageIndex((prev) => {
        const prevIndex = prev - 2
        if (prevIndex < 0) {
          return facilityImages.length % 2 === 0
            ? facilityImages.length - 2
            : Math.max(0, facilityImages.length - 2)
        }
        return prevIndex
      })
    }
  }

  const goToSlide = (slideIndex: number) => {
    if (isMobile) {
      setCurrentImageIndex(slideIndex)
    } else {
      setCurrentImageIndex(slideIndex * 2)
    }
  }

  // Lấy hình ảnh hiện tại để hiển thị
  const getCurrentImages = () => {
    if (isMobile) {
      // Mobile: chỉ trả về 1 hình
      return [facilityImages[currentImageIndex], null]
    } else {
      // Desktop: trả về 2 hình
      const firstIndex = currentImageIndex
      const secondIndex = firstIndex + 1 < facilityImages.length ? firstIndex + 1 : null
      return [facilityImages[firstIndex], secondIndex !== null ? facilityImages[secondIndex] : null]
    }
  }

  // Convert historyTimeline to Timeline format
  const timelineData = historyTimeline.map((item) => ({
    title: item.year,
    content: (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
        {/* Image - Chiếm 2/3 trên desktop */}
        <div className="relative w-full lg:col-span-2 overflow-hidden rounded-lg sm:rounded-xl">
          <div className="aspect-[16/10] sm:aspect-[16/9] relative w-full">
            <Image
              src={item.image}
              alt={item.year}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 66vw"
            />
          </div>
        </div>

        {/* Description - Chiếm 1/3 trên desktop */}
        <div className="flex flex-col justify-center lg:col-span-1">
          <div className="prose prose-sm sm:prose-base md:prose-lg text-foreground leading-relaxed dark:prose-invert max-w-none">
            {item.description ? (
              <p className="text-xs sm:text-sm md:text-base lg:text-lg text-muted-foreground leading-relaxed">
                {item.description}
              </p>
            ) : (
              <p className="text-xs sm:text-sm md:text-base text-muted-foreground italic">
                Đang cập nhật thông tin...
              </p>
            )}
          </div>
        </div>
      </div>
    ),
  }))

  return (
    <div className="relative isolate bg-background">
      {/* Overview Section */}
      <section className="py-8 sm:py-12 lg:py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            {/* Header Section - 2 columns */}
            <div className="border-b-2 border-primary mb-6 sm:mb-8 pb-6 sm:pb-8">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 sm:gap-8">
                <div>
                  <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground">
                    Tổng quan về <span className="text-secondary font-bold">HUB</span>
                  </h2>
                </div>
                <div>
                  <div className="prose prose-sm sm:prose-base text-foreground leading-relaxed dark:prose-invert mb-4">
                    <p className="text-sm sm:text-base md:text-lg text-muted-foreground">
                      Trường Đại học Ngân hàng Thành phố Hồ Chí Minh (Ho Chi Minh University of Banking - <span className="font-bold text-secondary">HUB</span>)
                      là trường đại học công lập trực thuộc Ngân hàng Nhà nước Việt Nam được thành lập từ ngày <strong className="text-foreground">16/12/1976</strong>.
                    </p>
                  </div>
                  <h3 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-semibold text-foreground mt-4">
                    <span className="text-secondary font-bold">H</span>EIGHTENING{" "}
                    <span className="text-secondary font-bold">U</span>NIQUE{" "}
                    <span className="text-secondary font-bold">B</span>RILLIANCE
                  </h3>
                </div>
              </div>
            </div>

            {/* Image and Statistics - 2 columns */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 sm:gap-8 lg:gap-12">
              {/* Image */}
              <div className="relative w-full overflow-hidden rounded-xl sm:rounded-2xl border border-border">
                <div className="aspect-[4/3] relative w-full">
                  <Image
                    src="https://fileserver2.hub.edu.vn/IMAGES/2025/03/26/2025032609060018.jpg"
                    alt="Tổng quan về HUB"
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 50vw"
                    priority
                  />
                </div>
              </div>

              {/* Statistics List */}
              <div className="space-y-4 sm:space-y-6">
                <div>
                  <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-primary mb-2">
                    49<span className="text-xl sm:text-2xl md:text-3xl lg:text-4xl">+ năm</span>
                  </h2>
                  <p className="text-xs sm:text-sm md:text-base text-muted-foreground leading-relaxed">
                    Xây dựng và phát triển với 16 ngành và 03 cơ sở sở đào tạo!
                  </p>
                </div>

                <div>
                  <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-primary mb-2">
                    17.500<span className="text-xl sm:text-2xl md:text-3xl lg:text-4xl">+</span>
                  </h2>
                  <p className="text-xs sm:text-sm md:text-base text-muted-foreground leading-relaxed">
                    Sinh viên đang theo học ở các bậc đào tạo từ đại học, thạc sĩ, tiến sĩ
                  </p>
                </div>

                <div>
                  <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-primary mb-2">
                    500
                  </h2>
                  <p className="text-xs sm:text-sm md:text-base text-muted-foreground leading-relaxed">
                    Cán bộ, giảng viên, nhân viên, trong đó có 38 Giáo sư, Phó Giáo sư, 197 Tiến sĩ và 238 Thạc sĩ
                  </p>
                </div>

                <div>
                  <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-primary mb-2">
                    66.000<span className="text-xl sm:text-2xl md:text-3xl lg:text-4xl">+</span>
                  </h2>
                  <p className="text-xs sm:text-sm md:text-base text-muted-foreground leading-relaxed">
                    Cử nhân, thạc sĩ, tiến sĩ đã được <span className="font-bold text-secondary">HUB</span> đào tạo
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About HUB Section */}
      <section className="py-12 sm:py-16 lg:py-20 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground uppercase mb-6 sm:mb-8">
              Về <span className="text-secondary font-bold">HUB</span>
            </h2>

            <div className="mb-6 sm:mb-8">
              <div className="prose prose-sm sm:prose-base md:prose-lg text-foreground leading-relaxed dark:prose-invert">
                <p className="text-sm sm:text-base md:text-lg text-muted-foreground mb-4">
                  Trường Đại học Ngân hàng TPHCM với truyền thống gần 50 năm hình thành và phát triển và là Trường Đại học công lập trực thuộc Ngân hàng nhà nước Việt Nam. Với đội ngũ Giáo sư – Phó giáo sư – Tiến sĩ đạt hơn 54% tổng số giảng viên của trường tham gia giảng dạy trong 16 ngành đại học, 09 Chương trình thạc sĩ và 03 Ngành tiến sĩ. Đặc biệt, 100% CTĐT của Trường Đại học Ngân hàng Tp.HCM đã được kiểm định chất lượng giáo dục theo chuẩn trong nước và quốc tế ( MOET, AUN - QA). <span className="font-bold text-secondary">HUB</span> đã ký kết hợp tác chiến lược về đào tạo và liên kết quốc tế với hơn 80 trường danh tiếng trên thế giới như ĐH Quốc gia Singapore, ĐH Bolton (Anh),  Adelaide (Úc), Toulon Pháp, City U (Mỹ)…. và hơn 200 doanh nghiệp, hiệp hội nghề nghiệp trong nước. <span className="font-bold text-secondary">HUB</span> đầu tư 03 cơ sở đào tạo (02 tại trung tâm Q1, 01 tại Thủ Đức) rộng hơn 11ha đã hoàn thiện cơ sở vật chất để phục vụ người học bao gồm: 131 giảng đường, 328 phòng KTX và hệ sinh thái sân thi đấu bóng đá, bóng chuyền, bóng rổ, tennis, Pickle ball, bóng bàn, cầu lông và hồ bơi có mái che, phòng học thông minh, 100% phòng học có điều hòa, cùng hệ thống căn tin chất lượng cao đảm bảo một môi trường học tập – vui chơi – rèn luyện đầy đủ và an toàn cho người học. Đảm bảo cho sinh viên 1 ngôi trường học tập hạnh phúc!
                </p>
              </div>
              <button
                onClick={() => setShowMoreDialog(true)}
                className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors font-medium mt-4"
              >
                <span>Xem thêm</span>
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>

            <div className="relative w-full overflow-hidden rounded-xl sm:rounded-2xl border border-border">
              <div className="aspect-video relative w-full">
                <Image
                  src="https://fileserver2.hub.edu.vn/IMAGES/2024/12/31/20241231170332vehub.jpg"
                  alt="Về HUB"
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, (max-width: 1200px) 90vw, 1200px"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Dialog for "Xem thêm" */}
        <Dialog open={showMoreDialog} onOpenChange={setShowMoreDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground uppercase">
                Về <span className="text-secondary">HUB</span>
              </DialogTitle>
            </DialogHeader>
            <DialogDescription asChild>
              <div className="prose prose-sm sm:prose-base md:prose-lg text-foreground leading-relaxed dark:prose-invert max-w-none">
                <p className="text-sm sm:text-base md:text-lg text-muted-foreground mb-4">
                  Trường Đại học Ngân hàng TP. Hồ Chí Minh đang đào tạo 16 ngành đại học với hơn 16.000 sinh viên, 09 Chương trình Thạc sĩ với gần 2000 học viên cao học và nghiên cứu sinh, 03 ngành Tiến sĩ với 50 nghiên cứu sinh; có gần 108 đối tác quốc tế là các Trường đại học lớn trên thế giới như Đại học Bolton, Angela Ruskin, Posmouth (UK) đều thuộc top 30 nước Anh, EM Normandie (Ý), Tuolouse (Pháp), Monash, Griffit, Macquire và Addelaide (Úc), đều là các trường top 1.5% thế giới, đặc biệt là trường Đại học Quốc gia Singapore (NUS) và Đại học Hong Kong (HKU) là top 5 Châu Á; và các tổ chức, cơ quan ngoại giao như: Hội đồng Anh, ACCA, lãnh sự quán Anh, Pháp, Luxemburg, DSIK…, cùng nhiều hiệp hội nghề nghiệp: Hiệp hội Ngân hàng, Hiệp hội Block chain, Logistics, Internet, Thương mại điện tử cũng như hệ thống Ngân hàng – doanh nghiệp rộng lớn và hơn 60.000 cựu người học trong mạng lưới <span className="font-bold text-secondary">HUB</span> Alumni thành đạt. Mạng lưới cựu người học cửa Trường rộng khắp góp phần tạo nên hệ giá trị sinh thái bền vững hỗ trợ nhiều hoạt động thiết thực, mang lại giá trị thực tiễn cao.
                </p>
                <p className="text-sm sm:text-base md:text-lg text-muted-foreground mb-4">
                  Đội ngũ nhân sự của <span className="font-bold text-secondary">HUB</span> với trên 500 cán bộ, giảng viên, nhân viên. Trong đó, 235 giảng viên có chức danh Giáo sư/Phó Giáo sư/Tiến sĩ, thuộc Top 3 trường khối kinh tế về số lượng Giáo sư/Phó Giáo sư/Tiến sĩ. Đội ngũ Giảng viên <span className="font-bold text-secondary">HUB</span> vừa là các chuyên gia, nhà nghiên cứu, nhà quản lý giàu kinh nghiệm, vừa là những thầy cô tận tâm với sinh viên. Quan trọng hơn là đội ngũ chất lượng cao này được phát triển đồng đều ở tất cả các lĩnh vực đào tạo của Trường. Theo đó, Trường không chỉ có số lượng lớn GS-TS kinh tế mà còn có số lượng GS-TS cao bậc nhất Việt Nam chuyên sâu về AI, Khoa học dữ liệu, Công nghệ tài chính (38 GS-TS). Điều này giúp phục vụ hiệu quả quá trình đào tạo chuyển đổi số cho đất nước và ngành Ngân hàng.
                </p>
                <p className="text-sm sm:text-base md:text-lg text-muted-foreground mb-4">
                  <span className="font-bold text-secondary">HUB</span> có 03 cơ sở đào tạo với 02 cơ sở tại trung tâm Q1 TP. HCM và 01 cơ sở tại Thủ Đức có tổng diện tích lên đến hơn 11 hecta được đầu tư xây dựng khang trang – hiện đại theo chiến lược Xanh – Hiện đại – Bề thế: từ hệ thống giảng đường, phòng Lab thực hành, chuyển đổi số, thư viện thực – thư viện số, phòng học thông minh, đến nhà thi đấu cũng như sân vận động đạt chuẩn quốc tế. Trường đã và đang thực hiện đúng định hướng mô hình "công viên trong đại học" – sẵn sàng hướng tới là một trong những Đại học đầu tiên thực hiện báo cáo quản trị theo chuẩn ESG.
                </p>
                <p className="text-sm sm:text-base md:text-lg text-muted-foreground mb-4">
                  Trường Đại học Ngân hàng TP. Hồ Chí Minh đã kiểm định 100% chương trình đào tạo theo tiêu chuẩn quốc tế AUN – QA và MOET. Không dừng lại ở kiểm định cấp CTĐT, Trường đã hoàn thành những bước cuối cùng để kiểm định cấp CSGD theo chuẩn quốc tế AUN-QA vào tháng 6/2025, trở thành top 11 trường đạt chuẩn kiểm định quốc tế cấp CSGD trong 224 Đại học tại Việt Nam. Đi theo đúng định hướng "đào tạo công dân chuẩn toàn cầu, am hiểu Việt Nam". Chứng nhận Hệ thống quản lý chất lượng theo tiêu chuẩn ISO 9001:2015 của Tổ chức Afnor Cộng hòa Pháp.
                </p>
                <p className="text-sm sm:text-base md:text-lg text-muted-foreground">
                  Trường Đại học Ngân hàng TP. Hồ Chí Minh tiếp tục khẳng định vị thế là Trường Đại học lớn ở Việt Nam, đào tạo đa ngành, xây dựng hệ sinh thái hạnh phúc trong cộng đồng người học và cung ứng nguồn nhân lực chất lượng cao cho ngành Ngân hàng, doanh nghiệp và xã hội.
                </p>
              </div>
            </DialogDescription>
          </DialogContent>
        </Dialog>
      </section>

      {/* Vision & Mission Section */}
      <section className="py-12 sm:py-16 lg:py-20 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            {/* Header Section - 2 columns */}
            <div className="border-b-2 border-primary mb-6 sm:mb-8 pb-6 sm:pb-8">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 sm:gap-8">
                <div>
                  <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground">
                    Tầm nhìn - Sứ mệnh
                  </h2>
                </div>
                <div>
                  <div className="prose prose-sm sm:prose-base text-foreground leading-relaxed dark:prose-invert">
                    <p className="text-sm sm:text-base md:text-lg text-muted-foreground">
                      Đại học Ngân hàng hướng đến mục tiêu hiện thực hóa tầm nhìn và sứ mệnh theo định hướng đề ra, góp phần xây dựng một trường đại học uy tín trong khu vực và trường quốc tế.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Image and Content - 2 columns */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 sm:gap-8 lg:gap-12">
              {/* Image */}
              <div className="relative w-full overflow-hidden rounded-xl sm:rounded-2xl border border-border">
                <div className="aspect-[4/3] relative w-full">
                  <Image
                    src="https://fileserver2.hub.edu.vn/IMAGES/2025/04/10/2025041010270420250326090935tamhhinsumenh.jpg"
                    alt="Tầm nhìn - Sứ mệnh"
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 50vw"
                  />
                </div>
              </div>

              {/* Content */}
              <div className="space-y-6 sm:space-y-8">
                <div>
                  <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-3 sm:mb-4">
                    Tầm nhìn
                  </h3>
                  <p className="text-sm sm:text-base md:text-lg text-muted-foreground leading-relaxed">
                    <span className="font-bold text-secondary">HUB</span> định hướng trở thành đại học đa ngành và liên ngành nằm trong nhóm các đại học có uy tín ở khu vực Đông Nam Á. <span className="font-bold text-secondary">HUB</span> tiên phong ứng dụng công nghệ số trong đào tạo, nghiên cứu và giải quyết các vấn đề liên ngành.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-3 sm:mb-4">
                    Sứ mệnh
                  </h3>
                  <p className="text-sm sm:text-base md:text-lg text-muted-foreground leading-relaxed">
                    <span className="font-bold text-secondary">HUB</span> cung cấp cho xã hội và ngành ngân hàng nguồn nhân lực chất lượng cao, các nghiên cứu có tầm ảnh hưởng, cùng với dịch vụ tư vấn và hoạt động phục vụ cộng đồng. <span className="font-bold text-secondary">HUB</span> kiến tạo hệ sinh thái giáo dục, mang đến cơ hội học tập suốt đời, phát triển con người toàn diện, sáng tạo, với tinh thần phụng sự.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Values Section */}
      <section className="py-12 sm:py-16 lg:py-20 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 sm:gap-8 lg:gap-12 items-end">
              {/* Content */}
              <div>
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-4 sm:mb-6">
                  Hệ giá trị cốt lõi
                </h2>
                <div className="space-y-4 sm:space-y-6">
                  {coreValues.map((value, index) => (
                    <div key={index} className={index < coreValues.length - 1 ? "pb-4 sm:pb-6 border-b border-border" : ""}>
                      <h3
                        className="text-lg sm:text-xl md:text-2xl font-bold mb-2 sm:mb-3"
                        style={{ color: value.color }}
                      >
                        {value.title}
                      </h3>
                      <p className="text-sm sm:text-base md:text-lg text-muted-foreground leading-relaxed">
                        {highlightHUB(value.description)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Image - Only show on xl screens */}
              <div className="hidden xl:block relative w-full overflow-hidden rounded-2xl p-2">
                <div className="aspect-[9/10] relative w-full">
                  <Image
                    src="https://fileserver2.hub.edu.vn/IMAGES/2025/03/26/2025032609105720241231170442trietlygiaoduc.png"
                    alt="Hệ giá trị cốt lõi"
                    fill
                    className="object-cover"
                    sizes="(max-width: 1280px) 100vw, 50vw"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Education Philosophy Section */}
      <section className="py-12 sm:py-16 lg:py-20 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 sm:gap-8 lg:gap-12 items-end">
              {/* Content */}
              <div>
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-4 sm:mb-6">
                  Triết lý giáo dục
                </h2>
                <div className="space-y-4 sm:space-y-6">
                  {educationPhilosophy.map((philosophy, index) => (
                    <div key={index} className={index < educationPhilosophy.length - 1 ? "pb-4 sm:pb-6 border-b border-border" : ""}>
                      <h3
                        className="text-lg sm:text-xl md:text-2xl font-bold mb-2 sm:mb-3"
                        style={{ color: philosophy.color }}
                      >
                        {philosophy.title}
                      </h3>
                      <p className="text-sm sm:text-base md:text-lg text-muted-foreground leading-relaxed">
                        {highlightHUB(philosophy.description)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Image - Only show on xl screens */}
              <div className="hidden xl:block relative w-full overflow-hidden rounded-2xl p-2">
                <div className="aspect-[9/10] relative w-full">
                  <Image
                    src="https://fileserver2.hub.edu.vn/IMAGES/2025/03/26/2025032609084220241231170442trietlygiaoduc.png"
                    alt="Triết lý giáo dục"
                    fill
                    className="object-cover"
                    sizes="(max-width: 1280px) 100vw, 50vw"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Organization Structure Section */}
      <section className="py-12 sm:py-16 lg:py-20 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            {/* Header Section - 2 columns */}
            <div className="border-b-2 border-primary mb-6 sm:mb-8 pb-6 sm:pb-8">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 sm:gap-8">
                <div>
                  <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground">
                    Bộ máy tổ chức
                  </h2>
                </div>
                <div>
                  <div className="prose prose-sm sm:prose-base text-foreground leading-relaxed dark:prose-invert">
                    <p className="text-sm sm:text-base md:text-lg text-muted-foreground">
                      Bộ máy tổ chức của Đại học Ngân hàng TP.HCM được xây dựng theo hướng tinh gọn, hiệu lực, hiệu quả, phù hợp với quy định của pháp luật và điều kiện thực tiễn của trường.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Image */}
            <div className="relative w-full overflow-hidden rounded-xl sm:rounded-2xl p-1 sm:p-2">
              <div className="relative w-full aspect-[16/12]">
                <Image
                  src="https://fileserver2.hub.edu.vn/IMAGES/2025/09/22/20250922082406Bộ-máy-tổ-chức-2.png"
                  alt="Bộ máy tổ chức"
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, (max-width: 1200px) 90vw, 1200px"
                />
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* Facilities Section */}
      <section className="py-12 sm:py-16 lg:py-20 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            {/* Header Section - 2 columns */}
            <div className="border-b-2 border-primary mb-6 sm:mb-8 pb-6 sm:pb-8">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 sm:gap-8">
                <div>
                  <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground">
                    Cơ sở vật chất
                  </h2>
                </div>
                <div>
                  <div className="prose prose-sm sm:prose-base text-foreground leading-relaxed dark:prose-invert mb-4">
                    <p className="text-sm sm:text-base md:text-lg text-muted-foreground">
                      Trường Đại học Ngân hàng TP.HCM (<span className="font-bold text-secondary">HUB</span>) có cơ sở vật chất khang trang, hiện đại với không gian xanh, thoáng mát, đáp ứng nhu cầu học tập, nghiên cứu, sinh hoạt, rèn luyện thể thao… của hơn 12.000 người
                    </p>
                  </div>
                  <h3 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-semibold text-foreground mt-4">
                    <span className="text-secondary font-bold">H</span>EIGHTENING{" "}
                    <span className="text-secondary font-bold">U</span>NIQUE{" "}
                    <span className="text-secondary font-bold">B</span>RILLIANCE
                  </h3>
                </div>
              </div>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8">
              {facilities.map((facility, index) => (
                <div key={index} className="text-center">
                  <div className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-primary mb-1 sm:mb-2">
                    {facility.number}
                  </div>
                  <div className="text-xs sm:text-sm md:text-base text-muted-foreground">
                    {facility.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Content */}
            <div className="prose prose-sm sm:prose-base md:prose-lg text-foreground leading-relaxed dark:prose-invert">
              <p className="text-sm sm:text-base md:text-lg text-muted-foreground mb-4">
                Trường Đại học Ngân hàng TP.HCM (<span className="font-bold text-secondary">HUB</span>) có 3 cơ sở đào tạo, gồm 02 cơ sở tọa lạc tại Trung tâm Quận 1, Tp. Hồ Chí Minh và 01 cơ sở tại Quận Thủ Đức với tổng diện tích đất hơn 9,4 ha, diện tích xây dựng hơn 52,000 m2 đảm bảo nhu cầu dạy và học của hơn 12.000 người.
              </p>
              <p className="text-sm sm:text-base md:text-lg text-muted-foreground mb-4">
                <span className="font-bold text-secondary">HUB</span> tự hào về cơ sở vật chất khang trang, hiện đại với không gian xanh, sạch, thoáng mát, đáp ứng việc học tập, nghiên cứu, sinh hoạt, rèn luyện văn thể mỹ. Với gần 150 phòng học, phòng máy giảng đường đều được trang bị đầy đủ thiết bị căn bản cho việc học tập, hệ thống điều hòa không khí, tivi/máy chiếu hiện đại, trang thiết bị được tăng cường đầu tư theo hướng tích hợp, tăng tương tác giữa giáo viên với người học nhằm xây dựng không gian lớp học thân hiện và hiệu quả.
              </p>
              <p className="text-sm sm:text-base md:text-lg text-muted-foreground mb-4">
                Ngoài không gian học tập, Nhà trường có hệ thống phụ trợ phục vụ công tác học tập, rèn luyện thể dục thể thao (cụm khu liên hợp thể dục thi thao, sân bóng đá, hồ bơi, tennis, cầu lông, pickleball...), căn tin, siêu thị tiện ích, Hội trường lớn hiện đại tại cơ sở Thủ Đức với sức chứa 900 chỗ là nơi tổ chức các sự kiện lớn của Trường, các Khoa, các CLB, Trung tâm Thông tin Thư viện hiện đại, trẻ trung, Ký túc xá rộng rãi và tiện nghi.
              </p>
              <p className="text-sm sm:text-base md:text-lg text-muted-foreground">
                Thư viện, trung tâm học liệu với diện tích sàn 6,666 m2 ; với gần 47,000 đầu sách, giáo trình, tài liệu tham khảo tiếng Việt và tiếng nước ngoài, gần 359,000 bản sách các loại, 20 máy tính trang bị riêng cho Thư viện được nối mạng tốc độ cao dùng để tra cứu internet và truy cập các cơ sở dữ liệu, phục vụ 600 người đọc cùng một thời điểm.
              </p>
            </div>

            {/* Image Gallery/Carousel - 2 images per slide */}
            <div className="mt-8 sm:mt-12 lg:mt-16 relative">
              <div className="relative w-full overflow-hidden bg-muted/20">
                {/* Image Container - Grid 2 columns (xl only) */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-2 sm:gap-3 md:gap-4 p-2 sm:p-3 md:p-4">
                  {getCurrentImages().map((image, idx) => {
                    if (!image) return null
                    const actualIndex = currentImageIndex + idx
                    return (
                      <div
                        key={`${currentImageIndex}-${idx}`}
                        className="relative aspect-[16/10] w-full overflow-hidden rounded-lg sm:rounded-xl"
                      >
                        <Image
                          src={image.src}
                          alt={image.alt}
                          fill
                          className="object-cover transition-transform duration-300 hover:scale-105"
                          sizes="(max-width: 768px) 100vw, 50vw"
                          quality={100}
                          priority={actualIndex < 2}
                          loading={actualIndex < 2 ? "eager" : "lazy"}
                        />
                        {/* Caption for each image */}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/60 to-transparent p-3 sm:p-4">
                          <h3 className="text-xs sm:text-sm md:text-base font-semibold text-white line-clamp-2">
                            {image.title}
                          </h3>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Navigation Buttons - Desktop (xl only) */}
                <div className="hidden xl:block absolute inset-y-0 left-0 right-0 z-20 pointer-events-none">
                  <button
                    onClick={prevImage}
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background/90 text-foreground rounded-full p-2 shadow-lg transition-all pointer-events-auto"
                    aria-label="Slide trước"
                  >
                    <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background/90 text-foreground rounded-full p-2 shadow-lg transition-all pointer-events-auto"
                    aria-label="Slide tiếp theo"
                  >
                    <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
                  </button>
                </div>
              </div>

              {/* Pagination Dots */}
              <div className="flex justify-center items-center gap-2 mt-4 sm:mt-6">
                {Array.from({ length: totalSlides }).map((_, slideIndex) => {
                  const isActive = isMobile
                    ? currentImageIndex === slideIndex
                    : Math.floor(currentImageIndex / 2) === slideIndex
                  return (
                    <button
                      key={slideIndex}
                      onClick={() => goToSlide(slideIndex)}
                      className={`transition-all rounded-full ${isActive
                          ? "w-8 h-2 sm:w-10 sm:h-2.5 bg-secondary"
                          : "w-2 h-2 sm:w-2.5 sm:h-2.5 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                        }`}
                      aria-label={`Đi tới slide ${slideIndex + 1}`}
                      aria-current={isActive ? "true" : "false"}
                    />
                  )
                })}
              </div>

              {/* Mobile/Tablet Navigation Buttons */}
              <div className="xl:hidden flex justify-center items-center gap-4 mt-4">
                <button
                  onClick={prevImage}
                  className="bg-background border border-border hover:bg-muted text-foreground rounded-full p-2 shadow-md transition-all"
                  aria-label="Hình ảnh trước"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <span className="text-xs sm:text-sm text-muted-foreground">
                  {currentImageIndex + 1} / {facilityImages.length}
                </span>
                <button
                  onClick={nextImage}
                  className="bg-background border border-border hover:bg-muted text-foreground rounded-full p-2 shadow-md transition-all"
                  aria-label="Hình ảnh tiếp theo"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Faculty & Scientists Section */}
      <section className="py-12 sm:py-16 lg:py-20 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            {/* Header Section - 2 columns */}
            <div className="border-b-2 border-primary mb-6 sm:mb-8 pb-6 sm:pb-8">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 sm:gap-8">
                <div>
                  <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground">
                    Đội ngũ Giảng viên - Nhà khoa học
                  </h2>
                </div>
                <div>
                  <div className="prose prose-sm sm:prose-base text-foreground leading-relaxed dark:prose-invert">
                    <p className="text-sm sm:text-base md:text-lg text-muted-foreground">
                      <span className="font-bold text-secondary">HUB</span> có gần 500 cán bộ, giảng viên, nhân viên. Đội ngũ giảng viên bao gồm: 38 Giáo sư, Phó Giáo sư, 184 Tiến sĩ và 238 Thạc sĩ được đào tạo tại các trường đại học có uy tín trong và ngoài nước, vừa là các chuyên gia, nhà nghiên cứu giàu kinh nghiệm, vừa là những thầy cô tận tâm với sinh viên. Trường có đội ngũ 100 giáo sư, tiến sĩ thỉnh giảng đến từ các trường đại học, viện nghiên cứu, tổ chức tài chính, doanh nghiệp trong và ngoài nước:
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-8 sm:mb-12 lg:mb-16">
              <div className="text-center">
                <div className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-primary mb-1 sm:mb-2">
                  38
                </div>
                <div className="text-xs sm:text-sm md:text-base text-muted-foreground">
                  Giáo sư, Phó Giáo sư
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-primary mb-1 sm:mb-2">
                  237
                </div>
                <div className="text-xs sm:text-sm md:text-base text-muted-foreground">
                  Tiến sĩ
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-primary mb-1 sm:mb-2">
                  87
                </div>
                <div className="text-xs sm:text-sm md:text-base text-muted-foreground">
                  PGS- TS Thỉnh giảng
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-primary mb-1 sm:mb-2">
                  500
                </div>
                <div className="text-xs sm:text-sm md:text-base text-muted-foreground">
                  Giảng viên cơ hữu
                </div>
              </div>
            </div>

            {/* Departments List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3">
              {departments.map((department, index) => (
                <Link
                  key={index}
                  href={department.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-4 sm:p-5 bg-card border border-border rounded-lg sm:rounded-xl hover:bg-muted/50 hover:border-primary/50 transition-all group"
                >
                  <span className="text-sm sm:text-base md:text-lg font-medium text-foreground group-hover:text-primary transition-colors">
                    {department.name}
                  </span>
                  <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Tradition Corner Section */}
      <section className="py-12 sm:py-16 lg:py-20 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            {/* Header Section - 2 columns */}
            <div className="border-b-2 border-primary mb-6 sm:mb-8 pb-6 sm:pb-8">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 sm:gap-8">
                <div>
                  <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground">
                    Góc truyền thống
                  </h2>
                </div>
                <div>
                  <div className="prose prose-sm sm:prose-base text-foreground leading-relaxed dark:prose-invert">
                    <p className="text-sm sm:text-base md:text-lg text-muted-foreground">
                      Đại học Ngân hàng có lịch sử hình thành và phát triển lâu đời, với nhiều truyền thống quý báu được gìn giữ và phát huy qua nhiều thế hệ.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* History Timeline */}
            <div className="mt-8">
              <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground text-center mb-6 sm:mb-8">
                Lịch sử hình thành
              </h3>

              {/* Timeline Component */}
              <div className="[&>div]:bg-background [&>div]:dark:bg-background [&>div>div:first-child]:hidden [&_h3]:text-foreground [&_h3]:dark:text-foreground [&_p]:text-muted-foreground [&_p]:dark:text-muted-foreground [&>div]:px-2 [&>div]:sm:px-4 [&>div]:md:px-6 [&>div]:lg:px-8 [&>div>div]:py-4 [&>div>div]:sm:py-6 [&>div>div]:md:py-8 [&>div>div]:lg:py-12 [&>div>div>div]:pt-3 [&>div>div>div]:sm:pt-4 [&>div>div>div]:md:pt-6 [&>div>div>div]:lg:pt-10 [&>div>div>div]:pb-3 [&>div>div>div]:sm:pb-4 [&>div>div>div]:md:pb-6 [&>div>div>div]:lg:pb-10 [&>div>div>div>div]:gap-2 [&>div>div>div>div]:sm:gap-3 [&>div>div>div>div]:md:gap-4 [&>div>div>div>div]:lg:gap-6 [&>div>div>div>div>div]:pl-8 [&>div>div>div>div>div]:sm:pl-10 [&>div>div>div>div>div]:md:pl-12 [&>div>div>div>div>div]:pr-2 [&>div>div>div>div>div]:sm:pr-3 [&>div>div>div>div>div]:md:pr-4 [&>div>div>div>div>div>h3]:text-base [&>div>div>div>div>div>h3]:sm:text-lg [&>div>div>div>div>div>h3]:md:text-xl [&>div>div>div>div>div>h3]:lg:text-2xl [&>div>div>div>div>div>h3]:mb-2 [&>div>div>div>div>div>h3]:sm:mb-3 [&>div>div>div>div>div>h3]:md:mb-4 [&>div>div>div>div>div>div]:pl-0 [&>div>div>div>div>div>div]:sm:pl-0 [&>div>div>div>div>div>div]:md:pl-0 [&>div>div>div>div>div>div]:pr-0 [&>div>div>div>div>div>div]:sm:pr-0 [&>div>div>div>div>div>div]:md:pr-0">
                <Timeline data={timelineData} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Leaders Section */}
      <section className="py-12 sm:py-16 lg:py-20 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="text-center mb-8 sm:mb-12">
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground">
                Các thế hệ lãnh đạo
              </h2>
            </div>

            {/* Horizontal Timeline Navigation */}
            <div className="relative overflow-hidden mb-6 sm:mb-8">
              <div className="flex gap-2 sm:gap-3 md:gap-4 overflow-x-auto pb-4 scrollbar-hide">
                {leaderGenerations.map((generation, index) => (
                  <button
                    key={index}
                    onClick={() => goToLeader(index)}
                    className={`flex flex-col items-center gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4 rounded-lg sm:rounded-xl transition-all flex-shrink-0 min-w-[140px] sm:min-w-[160px] md:min-w-[180px] ${
                      currentLeaderIndex === index
                        ? "bg-primary text-primary-foreground"
                        : "bg-card border border-border hover:bg-muted/50 text-foreground"
                    }`}
                  >
                    <span
                      className={`w-3 h-3 sm:w-4 sm:h-4 rounded-full ${
                        currentLeaderIndex === index
                          ? "bg-primary-foreground"
                          : "bg-primary"
                      }`}
                    />
                    <h3
                      className={`text-xs sm:text-sm md:text-base font-semibold text-center ${
                        currentLeaderIndex === index
                          ? "text-primary-foreground"
                          : "text-foreground"
                      }`}
                    >
                      {generation.period}
                    </h3>
                  </button>
                ))}
              </div>
            </div>

            {/* Leader Carousel */}
            <div className="relative">
              <div className="relative w-full bg-card border border-border rounded-xl sm:rounded-2xl">
                <div className={`relative ${
                  leadersPerSlide === 4 ? 'p-2 sm:p-4 md:p-6' : 'p-4 sm:p-6 md:p-8'
                }`}>
                  {leaderGenerations[currentLeaderIndex]?.leaders && leaderGenerations[currentLeaderIndex].leaders.length > 0 ? (
                    <>
                      {/* Leader Grid with Scroll */}
                      <ScrollArea className="w-full">
                        <div className={`flex gap-4 sm:gap-6 ${
                          leadersPerSlide === 4 ? 'gap-2 sm:gap-3 md:gap-4' : ''
                        } pb-4`}>
                          {leaderGenerations[currentLeaderIndex].leaders.map((leader, idx) => (
                            <div
                              key={idx}
                              className="flex flex-col items-center text-center flex-shrink-0"
                              style={{
                                width: leadersPerSlide === 1 ? '280px' :
                                       leadersPerSlide === 2 ? 'calc(20% - 0.5rem)' :
                                       leadersPerSlide === 4 ? 'calc(25% - 0.75rem)' :
                                       'calc(33.333% - 1rem)',
                                minWidth: leadersPerSlide === 1 ? '280px' :
                                         leadersPerSlide === 2 ? '200px' :
                                         leadersPerSlide === 4 ? '180px' :
                                         '200px',
                                maxWidth: leadersPerSlide === 1 ? '280px' :
                                         leadersPerSlide === 2 ? 'calc(50% - 0.5rem)' :
                                         leadersPerSlide === 4 ? 'calc(25% - 0.75rem)' :
                                         'calc(33.333% - 1rem)'
                              }}
                            >
                              {/* Leader Image */}
                              <div className="relative w-full aspect-[3/4] mb-4 sm:mb-6 overflow-hidden rounded-lg sm:rounded-xl border border-border">
                                <Image
                                  src={leader.image}
                                  alt={leader.name}
                                  fill
                                  className="object-cover"
                                  sizes="(max-width: 640px) 280px, (max-width: 1024px) 50vw, 25vw"
                                />
                              </div>
                              {/* Leader Info */}
                              <h4 className="text-sm sm:text-base md:text-lg font-bold text-foreground mb-2 sm:mb-3">
                                {leader.name}
                              </h4>
                              <div className="prose prose-sm sm:prose-base text-foreground dark:prose-invert">
                                <p className="text-xs sm:text-sm md:text-base text-muted-foreground whitespace-pre-line">
                                  {leader.position}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                        <ScrollBar orientation="horizontal" />
                      </ScrollArea>
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-sm sm:text-base text-muted-foreground">
                        Thông tin lãnh đạo sẽ được cập nhật...
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

