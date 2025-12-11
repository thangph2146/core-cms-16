import { PrismaClient, Prisma } from "@prisma/client"
import bcrypt from "bcryptjs"

import { DEFAULT_ROLES } from "../src/lib/permissions"

const prisma = new PrismaClient()

// Helper functions để generate random data
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)]
}

function randomItems<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => 0.5 - Math.random())
  return shuffled.slice(0, Math.min(count, array.length))
}

// Vietnamese names
const vietnameseFirstNames = [
  "An", "Bình", "Cường", "Dung", "Em", "Phương", "Giang", "Hoa", "Hùng", "Lan",
  "Minh", "Nga", "Oanh", "Phong", "Quang", "Sơn", "Thảo", "Uyên", "Vinh", "Yến",
  "Đức", "Hạnh", "Khang", "Linh", "Mai", "Nam", "Nhung", "Oanh", "Phúc", "Quyên"
]

const vietnameseLastNames = [
  "Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Vũ", "Đặng", "Bùi", "Đỗ", "Hồ",
  "Ngô", "Dương", "Lý", "Võ", "Phan", "Trương", "Vương", "Tăng", "Lưu", "Đinh"
]

function generateVietnameseName(): string {
  const lastName = randomItem(vietnameseLastNames)
  const firstName = randomItem(vietnameseFirstNames)
  return `${lastName} ${firstName}`
}

function generateEmail(name: string, index: number): string {
  const normalized = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, ".")
    .replace(/đ/g, "d")
  return `${normalized}${index}@hub.edu.vn`
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

const postTitles = [
  "Hướng dẫn sử dụng Next.js 16",
  "TypeScript Best Practices",
  "React Server Components Explained",
  "Prisma ORM Tutorial",
  "TailwindCSS Tips and Tricks",
  "Database Design Principles",
  "API Security Best Practices",
  "Authentication và Authorization",
  "State Management trong React",
  "Performance Optimization",
  "Testing Strategies",
  "CI/CD Pipeline Setup",
  "Docker và Containerization",
  "Microservices Architecture",
  "GraphQL vs REST API",
  "WebSocket Real-time Communication",
  "Progressive Web Apps",
  "Serverless Architecture",
  "Cloud Computing Basics",
  "DevOps Practices",
  "Code Review Guidelines",
  "Agile Development",
  "Version Control với Git",
  "Code Refactoring",
  "Design Patterns",
  "SOLID Principles",
  "Clean Code Practices",
  "Error Handling Strategies",
  "Logging và Monitoring",
  "Backup và Recovery"
]

const commentContents = [
  "Bài viết rất hay và hữu ích!",
  "Cảm ơn tác giả đã chia sẻ.",
  "Tôi đã thử và thấy rất dễ sử dụng.",
  "Có thể chia sẻ thêm về cách customize không?",
  "Rất thích cách giải thích chi tiết.",
  "Mong chờ bài viết tiếp theo!",
  "Có vẻ rất mạnh mẽ. Cảm ơn bạn!",
  "Tôi đã học được nhiều điều mới.",
  "Có thể giải thích thêm về cách optimize không?",
  "Rất hữu ích cho dự án của tôi.",
  "Bài viết này rất chi tiết.",
  "Tôi có một số câu hỏi. Có thể hỗ trợ không?",
  "Excellent work!",
  "Great tutorial!",
  "Very helpful, thanks!",
  "This is exactly what I needed.",
  "Clear and concise explanation.",
  "Well written article.",
  "Looking forward to more content.",
  "Keep up the good work!"
]

const contactRequestSubjects = [
  "Câu hỏi về hệ thống",
  "Yêu cầu hỗ trợ kỹ thuật",
  "Góp ý về tính năng mới",
  "Lỗi nghiêm trọng cần xử lý",
  "Vấn đề đã được giải quyết",
  "Yêu cầu tài liệu",
  "Hỏi về pricing",
  "Feature request",
  "Bug report",
  "Technical support"
]

const notificationTitles = [
  "Chào mừng đến với hệ thống!",
  "Bạn có tin nhắn mới",
  "Thông báo quan trọng",
  "Bài viết đã được duyệt",
  "Cảnh báo bảo mật",
  "Thông tin học sinh",
  "Yêu cầu liên hệ mới",
  "Cập nhật hệ thống",
  "Bảo trì hệ thống",
  "Thông báo mới"
]

const groupNames = [
  "Nhóm Phát Triển",
  "Nhóm Biên Tập",
  "Nhóm Marketing",
  "Nhóm Hỗ Trợ",
  "Nhóm Quản Lý",
  "Nhóm Nghiên Cứu",
  "Nhóm Đào Tạo",
  "Nhóm Chất Lượng"
]

// Sample content data phù hợp với Lexical Editor
const samplePostContent = {
  root: {
    children: [
      {
        children: [
          {
            detail: 0,
            format: 0,
            mode: "normal",
            style: "",
            text: "Chào mừng đến với Content Editor! 🚀",
            type: "text",
            version: 1,
          },
        ],
        direction: "ltr",
        format: "",
        indent: 0,
        type: "heading",
        tag: "h1",
        version: 1,
      },
      {
        children: [
          {
            detail: 0,
            format: 0,
            mode: "normal",
            style: "",
            text: "Đây là một bài viết mẫu được tạo bởi seed script. Nội dung này được thiết kế để tương thích với Lexical Editor được sử dụng trong core-cms.",
            type: "text",
            version: 1,
          },
        ],
        direction: "ltr",
        format: "",
        indent: 0,
        type: "paragraph",
        version: 1,
      },
      {
        children: [
          {
            detail: 0,
            format: 0,
            mode: "normal",
            style: "",
            text: "Tính năng chính của Content Editor:",
            type: "text",
            version: 1,
          },
        ],
        direction: "ltr",
        format: "",
        indent: 0,
        type: "heading",
        tag: "h2",
        version: 1,
      },
      {
        children: [
          {
            children: [
              {
                children: [
                  {
                    detail: 0,
                    format: 0,
                    mode: "normal",
                    style: "",
                    text: "WYSIWYG Editor với Lexical",
                    type: "text",
                    version: 1,
                  },
                ],
                direction: "ltr",
                format: "",
                indent: 0,
                type: "listitem",
                version: 1,
              },
              {
                children: [
                  {
                    detail: 0,
                    format: 0,
                    mode: "normal",
                    style: "",
                    text: "Hỗ trợ nhiều định dạng văn bản",
                    type: "text",
                    version: 1,
                  },
                ],
                direction: "ltr",
                format: "",
                indent: 0,
                type: "listitem",
                version: 1,
              },
              {
                children: [
                  {
                    detail: 0,
                    format: 0,
                    mode: "normal",
                    style: "",
                    text: "Tích hợp hình ảnh và media",
                    type: "text",
                    version: 1,
                  },
                ],
                direction: "ltr",
                format: "",
                indent: 0,
                type: "listitem",
                version: 1,
              },
              {
                children: [
                  {
                    detail: 0,
                    format: 0,
                    mode: "normal",
                    style: "",
                    text: "Quản lý categories và tags",
                    type: "text",
                    version: 1,
                  },
                ],
                direction: "ltr",
                format: "",
                indent: 0,
                type: "listitem",
                version: 1,
              },
            ],
            direction: "ltr",
            format: "",
            indent: 0,
            type: "list",
            listType: "bullet",
            version: 1,
          },
        ],
        direction: "ltr",
        format: "",
        indent: 0,
        type: "paragraph",
        version: 1,
      },
      {
        children: [
          {
            detail: 0,
            format: 0,
            mode: "normal",
            style: "",
            text: "Hệ thống được xây dựng với NestJS và Prisma, đảm bảo hiệu suất cao và dễ bảo trì.",
            type: "text",
            version: 1,
          },
        ],
        direction: "ltr",
        format: "",
        indent: 0,
        type: "paragraph",
        version: 1,
      },
    ],
    direction: "ltr",
    format: "",
    indent: 0,
    type: "root",
    version: 1,
  },
}

const samplePostContent2 = {
  root: {
    children: [
      {
        children: [
          {
            detail: 0,
            format: 0,
            mode: "normal",
            style: "",
            text: "Hướng dẫn sử dụng Content Editor",
            type: "text",
            version: 1,
          },
        ],
        direction: "ltr",
        format: "",
        indent: 0,
        type: "heading",
        tag: "h1",
        version: 1,
      },
      {
        children: [
          {
            detail: 0,
            format: 0,
            mode: "normal",
            style: "",
            text: "Trong bài viết này, chúng ta sẽ tìm hiểu cách sử dụng Content Editor một cách hiệu quả nhất.",
            type: "text",
            version: 1,
          },
        ],
        direction: "ltr",
        format: "",
        indent: 0,
        type: "paragraph",
        version: 1,
      },
      {
        children: [
          {
            detail: 0,
            format: 0,
            mode: "normal",
            style: "",
            text: "Bước 1: Tạo nội dung mới",
            type: "text",
            version: 1,
          },
        ],
        direction: "ltr",
        format: "",
        indent: 0,
        type: "heading",
        tag: "h2",
        version: 1,
      },
      {
        children: [
          {
            detail: 0,
            format: 0,
            mode: "normal",
            style: "",
            text: "Để tạo nội dung mới, bạn cần truy cập vào trang editor và bắt đầu nhập nội dung. Sử dụng thanh công cụ để định dạng văn bản theo ý muốn.",
            type: "text",
            version: 1,
          },
        ],
        direction: "ltr",
        format: "",
        indent: 0,
        type: "paragraph",
        version: 1,
      },
    ],
    direction: "ltr",
    format: "",
    indent: 0,
    type: "root",
    version: 1,
  },
}

const ROLE_NAMES = {
  SUPER_ADMIN: DEFAULT_ROLES.SUPER_ADMIN.name,
  ADMIN: DEFAULT_ROLES.ADMIN.name,
  EDITOR: DEFAULT_ROLES.EDITOR.name,
  AUTHOR: DEFAULT_ROLES.AUTHOR.name,
  USER: DEFAULT_ROLES.USER.name,
  PARENT: DEFAULT_ROLES.PARENT.name,
} as const

type RoleKey = keyof typeof ROLE_NAMES
type DefaultRoleKey = RoleKey

const ROLE_DESCRIPTIONS: Record<RoleKey, string> = {
  SUPER_ADMIN: "Toàn quyền hệ thống, có thể thực hiện mọi thao tác.",
  ADMIN: "Quản trị viên, quản lý nội dung và người dùng.",
  EDITOR: "Biên tập viên, tạo và chỉnh sửa nội dung.",
  AUTHOR: "Tác giả, quản lý nội dung của riêng mình.",
  USER: "Người dùng thông thường với quyền hạn cơ bản, có thể quản lý tài khoản cá nhân.",
  PARENT: "Phụ huynh học sinh, truy cập thông tin liên quan học sinh, có thể quản lý tài khoản cá nhân.",
}

type RoleConfig<T extends RoleKey = RoleKey> = {
  key: T
  name: string
  displayName: string
  description: string
  permissions: string[]
}

const defaultRoleConfigs: RoleConfig<DefaultRoleKey>[] = (
  Object.entries(DEFAULT_ROLES) as Array<[DefaultRoleKey, (typeof DEFAULT_ROLES)[DefaultRoleKey]]>
).map(([key, role]) => ({
  key,
  name: role.name,
  displayName: role.displayName,
  description: ROLE_DESCRIPTIONS[key],
  permissions: [...role.permissions],
}))

const roleConfigs: RoleConfig[] = defaultRoleConfigs

const resetDatabase = async () => {
  await prisma.$transaction(
    async (tx) => {
      await tx.messageRead.deleteMany()
      await tx.groupMember.deleteMany()
      await tx.group.deleteMany()
      await tx.notification.deleteMany()
      await tx.message.deleteMany()
      await tx.comment.deleteMany()
      await tx.postTag.deleteMany()
      await tx.postCategory.deleteMany()
      await tx.post.deleteMany()
      await tx.tag.deleteMany()
      await tx.category.deleteMany()
      await tx.student.deleteMany()
      await tx.contactRequest.deleteMany()
      await tx.userRole.deleteMany()
      await tx.session.deleteMany()
      await tx.account.deleteMany()
      await tx.role.deleteMany()
      // E-commerce cleanup
      await tx.giftCodeUsage.deleteMany()
      await tx.giftCode.deleteMany()
      await tx.cartItem.deleteMany()
      await tx.cart.deleteMany()
      await tx.orderItem.deleteMany()
      await tx.order.deleteMany()
      await tx.inventory.deleteMany()
      await tx.productVariant.deleteMany()
      await tx.productImage.deleteMany()
      await tx.productCategory.deleteMany()
      await tx.product.deleteMany()
      await tx.user.deleteMany()
    },
    {
      timeout: 60000, // 60 seconds
    }
  )
}

async function main() {
  console.log("🌱 Bắt đầu seed database...")

  console.log("🧹 Đang xóa dữ liệu cũ...")
  await resetDatabase()
  console.log("🧼 Đã xóa dữ liệu cũ")

  const roles = await Promise.all(
    roleConfigs.map((role) =>
      prisma.role.upsert({
        where: { name: role.name },
        update: {
          displayName: role.displayName,
          description: role.description,
          permissions: role.permissions,
          isActive: true,
        },
        create: {
          name: role.name,
          displayName: role.displayName,
          description: role.description,
          permissions: role.permissions,
          isActive: true,
        },
      })
    )
  )

  const roleMap = new Map(roles.map((role) => [role.name, role]))

  const getRoleId = (roleName: string) => {
    const role = roleMap.get(roleName)
    if (!role) {
      throw new Error(`Không tìm thấy role đã seed: ${roleName}`)
    }
    return role.id
  }

  const totalPermissions = roles.reduce((sum, role) => sum + role.permissions.length, 0)
  console.log(`✅ Đã cấu hình ${roles.length} roles với tổng ${totalPermissions} quyền được gán`)

  const hashedPassword = await bcrypt.hash("password123", 10)

  // Helper function để tạo structured address
  function generateStructuredAddress() {
    const cities = ["Hà Nội", "Hồ Chí Minh", "Đà Nẵng", "Hải Phòng", "Cần Thơ"]
    const districts = ["Quận 1", "Quận 2", "Quận 3", "Quận Hoàn Kiếm", "Quận Ba Đình", "Quận Hai Bà Trưng"]
    const wards = ["Phường 1", "Phường 2", "Phường 3", "Phường Tràng Tiền", "Phường Lý Thái Tổ", "Phường Cửa Đông"]
    
    return {
      address: `${randomInt(1, 999)} Đường ${generateVietnameseName()}`,
      city: randomItem(cities),
      district: randomItem(districts),
      ward: randomItem(wards),
      postalCode: `${randomInt(10000, 99999)}`,
    }
  }

  // Helper functions cho product data
  const generateShippingInfo = () => ({
    freeShipping: Math.random() > 0.5,
    estimatedDays: randomInt(1, 7),
    methods: randomItems(["Giao hàng nhanh", "Giao hàng tiêu chuẩn", "Giao hàng tiết kiệm"], randomInt(1, 3)),
  })

  const generatePromotionBanner = () => {
    const banners = [
      "🎉 Giảm giá lên đến 30%",
      "🚚 Miễn phí vận chuyển cho đơn hàng trên 500,000đ",
      "⚡ Flash sale - Chỉ hôm nay!",
      "🎁 Mua 2 tặng 1 - Áp dụng cho sản phẩm được chọn",
      "💳 Giảm thêm 5% khi thanh toán online",
    ]
    return Math.random() > 0.4 ? randomItem(banners) : null
  }

  const generateBranchAvailability = () => {
    const branches = [
      { name: "Chi nhánh Hà Nội", address: "123 Đường Láng, Đống Đa, Hà Nội" },
      { name: "Chi nhánh Hồ Chí Minh", address: "456 Nguyễn Huệ, Quận 1, TP.HCM" },
      { name: "Chi nhánh Đà Nẵng", address: "789 Lê Duẩn, Hải Châu, Đà Nẵng" },
      { name: "Chi nhánh Hải Phòng", address: "321 Lạch Tray, Ngô Quyền, Hải Phòng" },
    ]
    return {
      branches: randomItems(branches, randomInt(2, 4)).map((branch) => ({
        name: branch.name,
        address: branch.address,
        hasStock: Math.random() > 0.3,
      })),
    }
  }

  const generatePaymentPromotion = () => {
    const methods = [
      { name: "Ví điện tử", discount: 5, description: "Giảm 5% khi thanh toán bằng ví điện tử" },
      { name: "Thẻ tín dụng", discount: 3, description: "Giảm 3% khi thanh toán bằng thẻ tín dụng" },
      { name: "Chuyển khoản", discount: 2, description: "Giảm 2% khi chuyển khoản ngân hàng" },
      { name: "Trả góp 0%", discount: 0, description: "Trả góp 0% lãi suất trong 6 tháng" },
    ]
    return Math.random() > 0.3 ? { methods: randomItems(methods, randomInt(1, 3)) } : null
  }

  const generateProductVariants = (basePrice: number) => {
    const variants: Array<{
      name: string
      value: string | null
      type: string
      price: number | null
      sku: string | null
      stock: number | null
      imageUrl: string | null
      order: number
      isDefault: boolean
    }> = []

    // Version variants (30% products)
    if (Math.random() > 0.7) {
      randomItems(["2024", "2025", "Pro", "Max", "Plus"], randomInt(2, 4)).forEach((version, index) => {
        variants.push({
          name: version,
          value: version.toLowerCase(),
          type: "version",
          price: index === 0 ? null : basePrice * (1 + index * 0.1),
          sku: null,
          stock: randomInt(5, 50),
          imageUrl: null,
          order: index,
          isDefault: index === 0,
        })
      })
    }

    // Color variants (40% products)
    if (Math.random() > 0.6) {
      const colors = [
        { name: "Đen", value: "#000000" },
        { name: "Trắng", value: "#FFFFFF" },
        { name: "Xám", value: "#808080" },
        { name: "Xanh dương", value: "#0066CC" },
        { name: "Đỏ", value: "#CC0000" },
        { name: "Vàng", value: "#FFD700" },
      ]
      const versionCount = variants.filter((v) => v.type === "version").length
      randomItems(colors, randomInt(2, 5)).forEach((color, index) => {
        variants.push({
          name: color.name,
          value: color.value,
          type: "color",
          price: null,
          sku: null,
          stock: randomInt(10, 100),
          imageUrl: null,
          order: versionCount + index,
          isDefault: index === 0 && versionCount === 0,
        })
      })
    }

    return variants
  }

  // Tạo main users (6 users) với đầy đủ thông tin cho checkout
  const superAdminAddress = generateStructuredAddress()
  const superAdminUser = await prisma.user.upsert({
    where: { email: "superadmin@hub.edu.vn" },
    update: {},
    create: {
      email: "superadmin@hub.edu.vn",
      name: "Super Administrator",
      password: hashedPassword,
      phone: "0912345678",
      address: JSON.stringify(superAdminAddress), // Store as JSON string for structured address
    },
  })

  const adminAddress = generateStructuredAddress()
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@hub.edu.vn" },
    update: {},
    create: {
      email: "admin@hub.edu.vn",
      name: "Administrator",
      password: hashedPassword,
      phone: "0912345679",
      address: JSON.stringify(adminAddress),
    },
  })

  const editorAddress = generateStructuredAddress()
  const editorUser = await prisma.user.upsert({
    where: { email: "editor@hub.edu.vn" },
    update: {},
    create: {
      email: "editor@hub.edu.vn",
      name: "Editor",
      password: hashedPassword,
      phone: "0912345680",
      address: JSON.stringify(editorAddress),
    },
  })

  const authorAddress = generateStructuredAddress()
  const authorUser = await prisma.user.upsert({
    where: { email: "author@hub.edu.vn" },
    update: {},
    create: {
      email: "author@hub.edu.vn",
      name: "Author",
      password: hashedPassword,
      phone: "0912345681",
      address: JSON.stringify(authorAddress),
    },
  })

  const regularUserAddress = generateStructuredAddress()
  const regularUser = await prisma.user.upsert({
    where: { email: "user@hub.edu.vn" },
    update: {},
    create: {
      email: "user@hub.edu.vn",
      name: "Regular User",
      password: hashedPassword,
      phone: "0912345682",
      address: JSON.stringify(regularUserAddress),
    },
  })

  const parentUserAddress = generateStructuredAddress()
  const parentUser = await prisma.user.upsert({
    where: { email: "parent@hub.edu.vn" },
    update: {},
    create: {
      email: "parent@hub.edu.vn",
      name: "Parent User",
      password: hashedPassword,
      phone: "0912345683",
      address: JSON.stringify(parentUserAddress),
    },
  })

  // Tạo thêm users (20+ users với các roles khác nhau)
  const additionalUsers = []
  const roleDistribution = [
    { role: ROLE_NAMES.ADMIN, count: 3 },
    { role: ROLE_NAMES.EDITOR, count: 5 },
    { role: ROLE_NAMES.AUTHOR, count: 5 },
    { role: ROLE_NAMES.USER, count: 7 },
    { role: ROLE_NAMES.PARENT, count: 5 },
  ]

  let userIndex = 1
  for (const { role, count } of roleDistribution) {
    for (let i = 0; i < count; i++) {
      const name = generateVietnameseName()
      const email = generateEmail(name, userIndex++)
      const phone = `09${String(10000000 + userIndex).slice(-8)}` // Generate valid phone number
      const userAddress = generateStructuredAddress()
      const user = await prisma.user.create({
        data: {
          email,
          name,
          password: hashedPassword,
          phone,
          address: JSON.stringify(userAddress), // Store structured address as JSON
        },
      })
      additionalUsers.push({ user, role })
    }
  }

  // Gán roles cho tất cả users
  await prisma.userRole.createMany({
    data: [
      {
        userId: superAdminUser.id,
        roleId: getRoleId(ROLE_NAMES.SUPER_ADMIN),
      },
      {
        userId: adminUser.id,
        roleId: getRoleId(ROLE_NAMES.ADMIN),
      },
      {
        userId: editorUser.id,
        roleId: getRoleId(ROLE_NAMES.EDITOR),
      },
      {
        userId: authorUser.id,
        roleId: getRoleId(ROLE_NAMES.AUTHOR),
      },
      {
        userId: regularUser.id,
        roleId: getRoleId(ROLE_NAMES.USER),
      },
      {
        userId: parentUser.id,
        roleId: getRoleId(ROLE_NAMES.PARENT),
      },
      ...additionalUsers.map(({ user, role }) => ({
        userId: user.id,
        roleId: getRoleId(role),
      })),
    ],
    skipDuplicates: true,
  })

  const allUsers = [
    superAdminUser,
    adminUser,
    editorUser,
    authorUser,
    regularUser,
    parentUser,
    ...additionalUsers.map(({ user }) => user),
  ]

  console.log(`✅ Đã tạo ${allUsers.length} users`)

  const categories = await Promise.all([
    prisma.category.upsert({
      where: { slug: "huong-dan" },
      update: {},
      create: {
        name: "Hướng dẫn",
        slug: "huong-dan",
        description: "Các bài viết hướng dẫn sử dụng hệ thống",
      },
    }),
    prisma.category.upsert({
      where: { slug: "cong-nghe" },
      update: {},
      create: {
        name: "Công nghệ",
        slug: "cong-nghe",
        description: "Tin tức và xu hướng công nghệ",
      },
    }),
    prisma.category.upsert({
      where: { slug: "seo" },
      update: {},
      create: {
        name: "SEO",
        slug: "seo",
        description: "Tối ưu hóa công cụ tìm kiếm",
      },
    }),
    prisma.category.upsert({
      where: { slug: "ui-ux" },
      update: {},
      create: {
        name: "UI/UX",
        slug: "ui-ux",
        description: "Thiết kế giao diện và trải nghiệm người dùng",
      },
    }),
    prisma.category.upsert({
      where: { slug: "tutorial" },
      update: {},
      create: {
        name: "Tutorial",
        slug: "tutorial",
        description: "Hướng dẫn chi tiết từng bước",
      },
    }),
    prisma.category.upsert({
      where: { slug: "tin-tuc" },
      update: {},
      create: {
        name: "Tin tức",
        slug: "tin-tuc",
        description: "Tin tức mới nhất về công nghệ và phát triển",
      },
    }),
    prisma.category.upsert({
      where: { slug: "best-practices" },
      update: {},
      create: {
        name: "Best Practices",
        slug: "best-practices",
        description: "Các thực hành tốt nhất trong phát triển phần mềm",
      },
    }),
  ])

  console.log("✅ Đã tạo categories")

  const tags = await Promise.all([
    prisma.tag.upsert({
      where: { slug: "content-editor" },
      update: {},
      create: {
        name: "Content Editor",
        slug: "content-editor",
      },
    }),
    prisma.tag.upsert({
      where: { slug: "wysiwyg" },
      update: {},
      create: {
        name: "WYSIWYG",
        slug: "wysiwyg",
      },
    }),
    prisma.tag.upsert({
      where: { slug: "lexical" },
      update: {},
      create: {
        name: "Lexical",
        slug: "lexical",
      },
    }),
    prisma.tag.upsert({
      where: { slug: "react" },
      update: {},
      create: {
        name: "React",
        slug: "react",
      },
    }),
    prisma.tag.upsert({
      where: { slug: "nextjs" },
      update: {},
      create: {
        name: "Next.js",
        slug: "nextjs",
      },
    }),
    prisma.tag.upsert({
      where: { slug: "tailwindcss" },
      update: {},
      create: {
        name: "TailwindCSS",
        slug: "tailwindcss",
      },
    }),
    prisma.tag.upsert({
      where: { slug: "nestjs" },
      update: {},
      create: {
        name: "NestJS",
        slug: "nestjs",
      },
    }),
    prisma.tag.upsert({
      where: { slug: "prisma" },
      update: {},
      create: {
        name: "Prisma",
        slug: "prisma",
      },
    }),
    prisma.tag.upsert({
      where: { slug: "typescript" },
      update: {},
      create: {
        name: "TypeScript",
        slug: "typescript",
      },
    }),
    prisma.tag.upsert({
      where: { slug: "javascript" },
      update: {},
      create: {
        name: "JavaScript",
        slug: "javascript",
      },
    }),
    prisma.tag.upsert({
      where: { slug: "database" },
      update: {},
      create: {
        name: "Database",
        slug: "database",
      },
    }),
    prisma.tag.upsert({
      where: { slug: "api" },
      update: {},
      create: {
        name: "API",
        slug: "api",
      },
    }),
  ])

  console.log("✅ Đã tạo tags")

  const post1 = await prisma.post.upsert({
    where: { slug: "chao-mung-den-voi-content-editor" },
    update: {},
    create: {
      title: "Chào mừng đến với Content Editor! 🚀",
      content: samplePostContent,
      excerpt:
        "Đây là một bài viết mẫu được tạo bởi seed script. Nội dung này được thiết kế để tương thích với Lexical Editor được sử dụng trong core-cms.",
      slug: "chao-mung-den-voi-content-editor",
      image: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&h=400&fit=crop",
      published: true,
      publishedAt: new Date(),
      authorId: superAdminUser.id,
    },
  })

  const post2 = await prisma.post.upsert({
    where: { slug: "huong-dan-su-dung-content-editor" },
    update: {},
    create: {
      title: "Hướng dẫn sử dụng Content Editor",
      content: samplePostContent2,
      excerpt: "Trong bài viết này, chúng ta sẽ tìm hiểu cách sử dụng Content Editor một cách hiệu quả nhất.",
      slug: "huong-dan-su-dung-content-editor",
      image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=400&fit=crop",
      published: true,
      publishedAt: new Date(),
      authorId: editorUser.id,
    },
  })

  const post3 = await prisma.post.upsert({
    where: { slug: "tich-hop-lexical-voi-nestjs" },
    update: {},
    create: {
      title: "Tích hợp Lexical với NestJS và Prisma",
      content: samplePostContent,
      excerpt: "Hướng dẫn chi tiết về cách tích hợp Lexical Editor với NestJS backend và Prisma ORM.",
      slug: "tich-hop-lexical-voi-nestjs",
      image: "https://images.unsplash.com/photo-1551650975-87deedd944c3?w=800&h=400&fit=crop",
      published: true,
      publishedAt: new Date(),
      authorId: authorUser.id,
    },
  })

  // Thêm nhiều posts hơn
  const post4 = await prisma.post.upsert({
    where: { slug: "nextjs-16-features-overview" },
    update: {},
    create: {
      title: "Next.js 16: Tổng quan các tính năng mới",
      content: samplePostContent2,
      excerpt: "Khám phá các tính năng mới trong Next.js 16 và cách chúng cải thiện trải nghiệm phát triển.",
      slug: "nextjs-16-features-overview",
      image: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&h=400&fit=crop",
      published: true,
      publishedAt: new Date(),
      authorId: editorUser.id,
    },
  })

  const post5 = await prisma.post.upsert({
    where: { slug: "react-server-components-guide" },
    update: {},
    create: {
      title: "Hướng dẫn React Server Components",
      content: samplePostContent,
      excerpt: "Tìm hiểu về React Server Components và cách sử dụng chúng trong Next.js để tối ưu hiệu suất.",
      slug: "react-server-components-guide",
      image: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&h=400&fit=crop",
      published: true,
      publishedAt: new Date(),
      authorId: authorUser.id,
    },
  })

  const post6 = await prisma.post.upsert({
    where: { slug: "prisma-best-practices" },
    update: {},
    create: {
      title: "Prisma Best Practices: Tối ưu hóa Database Queries",
      content: samplePostContent2,
      excerpt: "Các thực hành tốt nhất khi làm việc với Prisma ORM để đảm bảo hiệu suất và bảo mật.",
      slug: "prisma-best-practices",
      image: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&h=400&fit=crop",
      published: false, // Draft post
      authorId: editorUser.id,
    },
  })

  const post7 = await prisma.post.upsert({
    where: { slug: "typescript-advanced-patterns" },
    update: {},
    create: {
      title: "TypeScript Advanced Patterns và Tips",
      content: samplePostContent,
      excerpt: "Khám phá các pattern nâng cao trong TypeScript để viết code type-safe và maintainable hơn.",
      slug: "typescript-advanced-patterns",
      image: "https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=800&h=400&fit=crop",
      published: true,
      publishedAt: new Date(),
      authorId: superAdminUser.id,
    },
  })

  const post8 = await prisma.post.upsert({
    where: { slug: "api-design-principles" },
    update: {},
    create: {
      title: "Nguyên tắc thiết kế API RESTful",
      content: samplePostContent2,
      excerpt: "Hướng dẫn thiết kế API RESTful theo best practices, bao gồm versioning, error handling và documentation.",
      slug: "api-design-principles",
      image: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&h=400&fit=crop",
      published: true,
      publishedAt: new Date(),
      authorId: adminUser.id,
    },
  })

  // Tạo thêm posts (để có trên 25 posts)
  const additionalPosts = []
  const authors = [superAdminUser, adminUser, editorUser, authorUser, ...additionalUsers.filter((u) => u.role === ROLE_NAMES.EDITOR || u.role === ROLE_NAMES.AUTHOR).map((u) => u.user)]

  for (let i = 0; i < 20; i++) {
    const title = postTitles[i % postTitles.length] + ` ${i > 0 ? `- Phần ${i + 1}` : ""}`
    const slug = generateSlug(title) + (i > 0 ? `-${i}` : "")
    const author = randomItem(authors)
    const published = Math.random() > 0.3 // 70% published, 30% draft
    const publishedAt = published ? new Date(Date.now() - randomInt(0, 30) * 24 * 60 * 60 * 1000) : null

    const post = await prisma.post.create({
      data: {
        title,
        content: Math.random() > 0.5 ? samplePostContent : samplePostContent2,
        excerpt: `Đây là excerpt cho bài viết "${title}". Nội dung chi tiết sẽ được hiển thị trong bài viết.`,
        slug,
        image: `https://images.unsplash.com/photo-${1555066931 + i}?w=800&h=400&fit=crop`,
        published,
        publishedAt,
        authorId: author.id,
      },
    })
    additionalPosts.push(post)
  }

  const allPosts = [post1, post2, post3, post4, post5, post6, post7, post8, ...additionalPosts]

  console.log(`✅ Đã tạo ${allPosts.length} posts`)

  // Liên kết posts với categories và tags
  const postCategoryData = []
  const postTagData = []

  for (const post of allPosts) {
    // Mỗi post có 1-3 categories
    const categoryCount = randomInt(1, 3)
    const selectedCategories = randomItems(categories, categoryCount)
    postCategoryData.push(
      ...selectedCategories.map((category) => ({
        postId: post.id,
        categoryId: category.id,
      }))
    )

    // Mỗi post có 2-5 tags
    const tagCount = randomInt(2, 5)
    const selectedTags = randomItems(tags, tagCount)
    postTagData.push(
      ...selectedTags.map((tag) => ({
        postId: post.id,
        tagId: tag.id,
      }))
    )
  }

  await prisma.postCategory.createMany({
    data: postCategoryData,
    skipDuplicates: true,
  })

  await prisma.postTag.createMany({
    data: postTagData,
    skipDuplicates: true,
  })

  console.log(`✅ Đã liên kết ${allPosts.length} posts với categories và tags`)

  // Tạo comments cho các posts (đảm bảo authors và posts tồn tại)
  const commentsData = []
  const commentAuthors = allUsers.filter((u) => u.id !== superAdminUser.id && u.id) // Exclude super admin, ensure valid IDs

  if (commentAuthors.length === 0) {
    console.log("⚠️  Không có authors để tạo comments, bỏ qua")
  } else {
    // Tạo ít nhất 3-5 comments cho mỗi post
    for (const post of allPosts) {
      if (!post.id) continue // Skip nếu post không có ID
      
      const commentCount = randomInt(3, 8)
      for (let i = 0; i < commentCount; i++) {
        const author = randomItem(commentAuthors)
        if (!author.id) continue // Skip nếu author không có ID
        
        const content = randomItem(commentContents)
        const approved = Math.random() > 0.3 // 70% approved, 30% pending

        commentsData.push({
          content,
          approved,
          authorId: author.id,
          postId: post.id,
        })
      }
    }
  }

  await prisma.comment.createMany({
    data: commentsData,
  })

  console.log(`✅ Đã tạo ${commentsData.length} comments`)

  const parents = [parentUser, ...additionalUsers.filter((u) => u.role === ROLE_NAMES.PARENT).map((u) => u.user)]
  console.log(`✅ Đã tạo parents (${parents.length})`)

  // Tạo students (ít nhất 25 students) - đảm bảo parents có ID
  const studentSeedData = []
  const validParents = parents.filter((parent) => parent.id)
  if (validParents.length === 0) {
    console.log("⚠️  Không có parents để tạo students, bỏ qua")
  } else {
    for (let i = 1; i <= 25; i++) {
      const code = `STU-${1000 + i}`
      const name = generateVietnameseName()
      const parent = randomItem(validParents)
      if (!parent.id) continue // Skip nếu parent không có ID
      
      studentSeedData.push({
        code,
        name,
        parentId: parent.id,
      })
    }
  }

  await Promise.all(
    studentSeedData.map((student) =>
      prisma.student.upsert({
        where: { studentCode: student.code },
        update: {
          userId: student.parentId,
          name: student.name,
          email: `${student.code.toLowerCase()}@example.com`,
        },
        create: {
          userId: student.parentId,
          studentCode: student.code,
          name: student.name,
          email: `${student.code.toLowerCase()}@example.com`,
        },
      })
    )
  )

  const createdStudents = await prisma.student.findMany({
    where: {
      studentCode: {
        in: studentSeedData.map((student) => student.code),
      },
    },
    orderBy: { studentCode: "asc" },
  })

  console.log(`✅ Đã tạo ${createdStudents.length} students`)

  // Tạo Contact Requests (ít nhất 25 requests) - đảm bảo assigned users có ID
  const contactRequestsData = []
  const statuses: Array<"NEW" | "IN_PROGRESS" | "RESOLVED" | "CLOSED"> = ["NEW", "IN_PROGRESS", "RESOLVED", "CLOSED"]
  const priorities: Array<"LOW" | "MEDIUM" | "HIGH" | "URGENT"> = ["LOW", "MEDIUM", "HIGH", "URGENT"]
  const assignableUsers = [adminUser, editorUser, ...additionalUsers.filter((u) => u.role === ROLE_NAMES.ADMIN || u.role === ROLE_NAMES.EDITOR).map((u) => u.user)].filter((u) => u.id)

  for (let i = 0; i < 25; i++) {
    const name = generateVietnameseName()
    const email = `contact${i + 1}@example.com`
    const phone = `09${String(i).padStart(8, "0")}`
    const subject = randomItem(contactRequestSubjects)
    const content = `Nội dung yêu cầu liên hệ số ${i + 1}. ${randomItem(commentContents)}`
    const status = randomItem(statuses)
    const priority = randomItem(priorities)
    const isRead = status !== "NEW" && Math.random() > 0.2
    const assignedToId = status !== "NEW" && Math.random() > 0.3 && assignableUsers.length > 0 
      ? randomItem(assignableUsers).id 
      : null

    contactRequestsData.push({
      name,
      email,
      phone,
      subject,
      content,
      status,
      priority,
      isRead,
      assignedToId,
    })
  }

  const contactRequests = await prisma.contactRequest.createMany({
    data: contactRequestsData,
  })

  console.log(`✅ Đã tạo ${contactRequests.count} contact requests`)

  // Tạo Notifications (ít nhất 25 notifications) - đảm bảo users và posts có ID
  const notificationsData = []
  const notificationKinds: Array<"SYSTEM" | "MESSAGE" | "ANNOUNCEMENT" | "SUCCESS" | "WARNING" | "INFO" | "ALERT"> = [
    "SYSTEM",
    "MESSAGE",
    "ANNOUNCEMENT",
    "SUCCESS",
    "WARNING",
    "INFO",
    "ALERT",
  ]

  const validUsersForNotifications = allUsers.filter((u) => u.id)
  const validPostsForUrls = allPosts.filter((post) => post.id)

  // Tạo ít nhất 3-5 notifications cho mỗi user
  for (const user of validUsersForNotifications) {
    if (!user.id) continue // Skip nếu user không có ID
    
    const notificationCount = randomInt(3, 6)
    for (let i = 0; i < notificationCount; i++) {
      const kind = randomItem(notificationKinds)
      const title = randomItem(notificationTitles)
      const description = `Mô tả cho thông báo "${title}". Đây là thông báo số ${i + 1} cho user ${user.name || "Unknown"}.`
      const isRead = Math.random() > 0.4 // 60% unread, 40% read
      const readAt = isRead ? new Date(Date.now() - randomInt(1, 7) * 24 * 60 * 60 * 1000) : null
      
      // Đảm bảo actionUrl có valid post ID nếu cần
      const actionUrlOptions = [
        "/admin/dashboard",
        "/admin/posts",
        "/admin/messages",
        "/admin/students",
        "/admin/contact-requests",
      ]
      if (validPostsForUrls.length > 0) {
        actionUrlOptions.push(`/admin/posts/${randomItem(validPostsForUrls).id}`)
      }
      const actionUrl = randomItem(actionUrlOptions)

      notificationsData.push({
        userId: user.id,
        kind,
        title,
        description,
        isRead,
        readAt,
        actionUrl,
      })
    }
  }

  const notifications = await prisma.notification.createMany({
    data: notificationsData,
  })

  console.log(`✅ Đã tạo ${notifications.count} notifications`)

  // Tạo Groups (ít nhất 5 groups)
  const groups = []
  const groupDescriptions = [
    "Nhóm dành cho các developer trong hệ thống",
    "Nhóm dành cho các editor và author",
    "Nhóm marketing và truyền thông",
    "Nhóm hỗ trợ khách hàng",
    "Nhóm quản lý dự án",
    "Nhóm nghiên cứu và phát triển",
    "Nhóm đào tạo",
    "Nhóm kiểm soát chất lượng",
  ]

  const validUsersForGroups = allUsers.filter((u) => u.id)
  if (validUsersForGroups.length === 0) {
    console.log("⚠️  Không có users để tạo groups, bỏ qua")
  } else {
    for (let i = 0; i < 5; i++) {
      const name = groupNames[i] || `Nhóm ${i + 1}`
      const description = groupDescriptions[i] || `Mô tả cho ${name}`
      const creator = randomItem(validUsersForGroups)
      
      if (!creator.id) continue // Skip nếu creator không có ID

      const group = await prisma.group.create({
        data: {
          name,
          description,
          createdById: creator.id,
        },
      })
      groups.push(group)

      // Thêm members cho mỗi group (3-8 members, đảm bảo không trùng)
      const memberCount = randomInt(3, Math.min(8, validUsersForGroups.length))
      const selectedMembers = randomItems(validUsersForGroups, memberCount)

      await prisma.groupMember.createMany({
        data: selectedMembers
          .filter((member) => member.id) // Chỉ lấy members có ID
          .map((member, index) => ({
            groupId: group.id,
            userId: member.id!,
            role: (index === 0 ? "OWNER" : index < 3 ? randomItem(["ADMIN", "MEMBER"]) : "MEMBER") as "OWNER" | "ADMIN" | "MEMBER",
          })),
      })
    }
  }

  console.log(`✅ Đã tạo ${groups.length} groups với members`)

  // Tạo Messages (Personal và Group) - ít nhất 25 messages
  const messages = []
  const messageSubjects = [
    "Câu hỏi về quyền truy cập",
    "Yêu cầu review bài viết",
    "Thông báo về phiên bản mới",
    "Hướng dẫn sử dụng",
    "Cập nhật hệ thống",
    "Thông báo quan trọng",
    "Yêu cầu hỗ trợ",
    "Phản hồi",
  ]

  // Tạo personal messages (15 messages) - đảm bảo sender và receiver khác nhau và có ID
  const validUsers = allUsers.filter((u) => u.id)
  if (validUsers.length < 2) {
    console.log("⚠️  Không đủ users để tạo messages, bỏ qua")
  } else {
    for (let i = 0; i < 15; i++) {
      const sender = randomItem(validUsers)
      const receiver = randomItem(validUsers.filter((u) => u.id !== sender.id))
      
      if (!sender.id || !receiver.id) continue // Skip nếu không có valid IDs
      
      const subject = randomItem(messageSubjects)
      const content = randomItem(commentContents) + ` (Message ${i + 1})`
      const type = "PERSONAL"
      const isRead = Math.random() > 0.4

      const message = await prisma.message.create({
        data: {
          senderId: sender.id,
          receiverId: receiver.id,
          subject,
          content,
          type,
          isRead,
        },
      })
      messages.push(message)

      if (isRead) {
        await prisma.messageRead.create({
          data: {
            messageId: message.id,
            userId: receiver.id,
          },
        })
      }
    }
  }

  // Tạo group messages (10 messages) - đảm bảo group và sender có ID
  if (groups.length === 0) {
    console.log("⚠️  Không có groups để tạo group messages, bỏ qua")
  } else {
    const validUsers = allUsers.filter((u) => u.id)
    for (let i = 0; i < 10; i++) {
      const group = randomItem(groups)
      if (!group.id) continue // Skip nếu group không có ID
      
      const sender = randomItem(validUsers)
      if (!sender.id) continue // Skip nếu sender không có ID
      
      const subject = randomItem(messageSubjects)
      const content = randomItem(commentContents) + ` (Group message ${i + 1})`
      const type = randomItem(["ANNOUNCEMENT", "NOTIFICATION"])

      const message = await prisma.message.create({
        data: {
          senderId: sender.id,
          groupId: group.id,
          subject,
          content,
          type: type as "NOTIFICATION" | "ANNOUNCEMENT" | "PERSONAL" | "SYSTEM",
        },
      })
      messages.push(message)

      // Tạo message reads cho một số members
      const groupMembers = await prisma.groupMember.findMany({
        where: { groupId: group.id, leftAt: null },
      })
      if (groupMembers.length > 0) {
        const readCount = randomInt(1, Math.min(groupMembers.length, 5))
        const readers = randomItems(groupMembers, readCount)

        await prisma.messageRead.createMany({
          data: readers.map((member) => ({
            messageId: message.id,
            userId: member.userId,
          })),
        })
      }
    }
  }

  console.log(`✅ Đã tạo ${messages.length} messages với reads`)

  // Tạo Sessions (ít nhất 25 sessions)
  const sessionsData = []
  const userAgents = [
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)",
    "Mozilla/5.0 (Android 11; Mobile; rv:68.0) Gecko/68.0",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
  ]

  // Tạo 2-3 sessions cho mỗi user - đảm bảo users có ID
  const validUsersForSessions = allUsers.filter((u) => u.id)
  for (const user of validUsersForSessions) {
    if (!user.id) continue // Skip nếu user không có ID
    
    const sessionCount = randomInt(2, 4)
    for (let i = 0; i < sessionCount; i++) {
      const isActive = Math.random() > 0.3 // 70% active
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + randomInt(1, 30))
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - randomInt(1, 10))

      sessionsData.push({
        userId: user.id,
        accessToken: `access_token_${user.id}_${Date.now()}_${i}`,
        refreshToken: `refresh_token_${user.id}_${Date.now()}_${i}`,
        userAgent: randomItem(userAgents),
        ipAddress: `192.168.1.${randomInt(100, 255)}`,
        isActive,
        expiresAt: isActive ? futureDate : pastDate,
      })
    }
  }

  await prisma.session.createMany({
    data: sessionsData,
  })

  console.log(`✅ Đã tạo ${sessionsData.length} sessions`)

  // Tạo Products (ít nhất 30 products)
  const productNames = [
    "Laptop Dell XPS 15",
    "iPhone 15 Pro Max",
    "Samsung Galaxy S24",
    "MacBook Pro M3",
    "iPad Air 2024",
    "Sony WH-1000XM5",
    "AirPods Pro 2",
    "Samsung 4K TV 55 inch",
    "Logitech MX Master 3S",
    "Keychron K8 Pro",
    "Monitor LG UltraWide 34",
    "Webcam Logitech C920",
    "Microphone Blue Yeti",
    "Gaming Chair Ergonomic",
    "Standing Desk Adjustable",
    "USB-C Hub Multiport",
    "External SSD 1TB",
    "Wireless Mouse Logitech",
    "Mechanical Keyboard RGB",
    "Monitor Stand Dual",
    "Laptop Stand Aluminum",
    "Cable Management Kit",
    "Desk Mat Large",
    "Monitor Light Bar",
    "Webcam Privacy Cover",
    "USB-C Cable 2m",
    "Power Bank 20000mAh",
    "Wireless Charger",
    "Laptop Sleeve 15 inch",
    "Backpack Laptop 17 inch",
  ]

  const productDescriptions = [
    "Laptop cao cấp với màn hình OLED 15 inch, CPU Intel Core i9, RAM 32GB, SSD 1TB",
    "Điện thoại flagship với chip A17 Pro, camera 48MP, pin 4422mAh",
    "Điện thoại Android với màn hình Dynamic AMOLED 6.7 inch, camera 200MP",
    "Laptop Apple với chip M3 Pro, màn hình Liquid Retina XDR 16 inch",
    "Tablet Apple với chip M2, màn hình 10.9 inch, hỗ trợ Apple Pencil",
    "Tai nghe chống ồn chủ động với công nghệ noise cancellation",
    "Tai nghe không dây với chip H2, chống ồn chủ động",
    "TV 4K với công nghệ QLED, HDR10+, Smart TV",
    "Chuột không dây với công nghệ MagSpeed, pin 70 ngày",
    "Bàn phím cơ với switch Gateron, RGB backlight",
    "Màn hình ultrawide 34 inch, độ phân giải 3440x1440, 144Hz",
    "Webcam Full HD 1080p với autofocus, micro tích hợp",
    "Microphone USB với 4 pattern modes, chất lượng studio",
    "Ghế gaming với đệm memory foam, hỗ trợ lưng",
    "Bàn đứng điều chỉnh chiều cao điện, mặt bàn 160x80cm",
    "Hub USB-C với 7 cổng: HDMI, USB 3.0, SD card, PD charging",
    "Ổ cứng ngoài SSD tốc độ cao, đọc/ghi 1050MB/s",
    "Chuột không dây với sensor 16000 DPI, pin 2 năm",
    "Bàn phím cơ với switch Cherry MX, RGB per-key",
    "Giá đỡ màn hình kép, chịu lực 9kg/màn hình",
    "Giá đỡ laptop nhôm, điều chỉnh góc độ, tản nhiệt",
    "Bộ quản lý dây cáp với velcro straps, clips",
    "Tấm lót bàn lớn 90x40cm, chống nước, dễ vệ sinh",
    "Đèn thanh màn hình với điều khiển không dây, chống chói",
    "Nắp che webcam với thiết kế slide, bảo vệ privacy",
    "Cáp USB-C dài 2m, hỗ trợ data transfer và charging",
    "Pin dự phòng 20000mAh, hỗ trợ fast charging, 2 cổng",
    "Sạc không dây 15W, tương thích Qi, LED indicator",
    "Túi đựng laptop 15 inch, chống nước, có ngăn phụ",
    "Ba lô laptop 17 inch, chống nước, có ngăn chống sốc",
  ]

  const productStatuses: Array<"ACTIVE" | "DRAFT" | "INACTIVE" | "ARCHIVED"> = [
    "ACTIVE",
    "DRAFT",
    "INACTIVE",
    "ARCHIVED",
  ]

  const products = []
  for (let i = 0; i < 30; i++) {
    const name = productNames[i] || `Sản phẩm ${i + 1}`
    const slug = generateSlug(name) + (i > 0 ? `-${i}` : "")
    const sku = `SKU-${1000 + i}`
    const price = randomInt(100000, 50000000) // 100k - 50M VND
    const compareAtPrice = Math.random() > 0.5 ? randomInt(price + 100000, price + 1000000) : null
    const stock = randomInt(0, 100)
    const status = randomItem(productStatuses)
    const featured = Math.random() > 0.7 // 30% featured
    const description = productDescriptions[i] || `Mô tả chi tiết cho ${name}`
    const shortDescription = description.substring(0, 150) + "..."
    const categoryIds = randomItems(categories, randomInt(1, 3)).map((c) => c.id)

    // Generate product metadata
    const shippingInfo = generateShippingInfo()
    const promotionBanner = generatePromotionBanner()
    const branchAvailability = generateBranchAvailability()
    const paymentPromotion = generatePaymentPromotion()

    const product = await prisma.product.create({
      data: {
        name,
        slug,
        sku,
        description,
        shortDescription,
        price,
        compareAtPrice,
        stock,
        status,
        featured,
        shippingInfo: shippingInfo as Prisma.InputJsonValue,
        promotionBanner,
        branchAvailability: branchAvailability as Prisma.InputJsonValue,
        paymentPromotion: paymentPromotion as Prisma.InputJsonValue,
      },
    })

    // Link product với categories
    if (categoryIds.length > 0) {
      await prisma.productCategory.createMany({
        data: categoryIds.map((categoryId) => ({
          productId: product.id,
          categoryId,
        })),
        skipDuplicates: true,
      })
    }

    // Tạo product images (1-3 images per product)
    const imageCount = randomInt(1, 3)
    for (let j = 0; j < imageCount; j++) {
      await prisma.productImage.create({
        data: {
          productId: product.id,
          url: `https://images.unsplash.com/photo-${1555066931 + i * 10 + j}?w=800&h=800&fit=crop`,
          alt: `${name} - Hình ${j + 1}`,
          order: j,
          isPrimary: j === 0,
        },
      })
    }

    // Tạo product variants (version, color)
    const variants = generateProductVariants(price)
    if (variants.length > 0) {
      await prisma.productVariant.createMany({
        data: variants.map((variant) => ({
          productId: product.id,
          name: variant.name,
          value: variant.value,
          type: variant.type,
          price: variant.price ? new Prisma.Decimal(variant.price) : null,
          sku: variant.sku,
          stock: variant.stock,
          imageUrl: variant.imageUrl,
          order: variant.order,
          isDefault: variant.isDefault,
        })),
      })
    }

    // Tạo inventory record
    await prisma.inventory.create({
      data: {
        productId: product.id,
        quantity: stock,
        lowStockThreshold: 10,
      },
    })

    products.push(product)
  }

  console.log(`✅ Đã tạo ${products.length} products với images, categories, variants, và metadata`)

  // Tạo Orders (ít nhất 20 orders)
  const orderStatuses: Array<"PENDING" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED"> = [
    "PENDING",
    "PROCESSING",
    "SHIPPED",
    "DELIVERED",
    "CANCELLED",
  ]

  const paymentStatuses: Array<"PENDING" | "PAID" | "REFUNDED" | "FAILED"> = [
    "PENDING",
    "PAID",
    "REFUNDED",
    "FAILED",
  ]

  const paymentMethods = ["cod", "bank_transfer", "credit_card", "e_wallet"]

  const orders = []
  for (let i = 0; i < 20; i++) {
    const validUsersForOrders = allUsers.filter((u) => u.id)
    // 70% orders có customerId (logged in users), 30% là guest orders
    const hasCustomer = Math.random() > 0.3 && validUsersForOrders.length > 0
    const customer = hasCustomer ? randomItem(validUsersForOrders) : null
    
    // Nếu có customer, dùng thông tin từ user, nếu không thì generate random
    let customerName: string
    let customerEmail: string
    let customerPhone: string | null
    let shippingAddress: {
      address: string
      city: string
      district: string
      ward: string
      postalCode?: string
    }
    
    if (customer && customer.id) {
      // Use customer info from user
      customerName = customer.name || generateVietnameseName()
      customerEmail = customer.email
      customerPhone = customer.phone
      
      // Parse address from user if available, otherwise generate
      try {
        const parsedAddress = customer.address ? JSON.parse(customer.address) : null
        if (parsedAddress && typeof parsedAddress === "object" && parsedAddress.address) {
          shippingAddress = parsedAddress
        } else {
          shippingAddress = generateStructuredAddress()
        }
      } catch {
        // If address is not JSON, generate new one
        shippingAddress = generateStructuredAddress()
      }
    } else {
      // Guest order - generate random info
      customerName = generateVietnameseName()
      customerEmail = generateEmail(customerName, i + 100)
      customerPhone = `09${String(10000000 + i).slice(-8)}`
      shippingAddress = generateStructuredAddress()
    }
    
    const orderNumber = `ORD-${Date.now()}-${i}`
    const status = randomItem(orderStatuses)
    const paymentStatus = randomItem(paymentStatuses)
    const paymentMethod = randomItem(paymentMethods)
    const customerId = customer?.id || null

    // Tạo order với 1-5 items (chỉ dùng products có stock > 0 hoặc trackInventory = false)
    // Trong seed, chúng ta sẽ giả định tất cả products đều có thể order
    if (products.length === 0) {
      continue // Skip nếu không có products
    }
    
    const itemCount = randomInt(1, Math.min(5, products.length))
    const selectedProducts = randomItems(products, itemCount)
    let subtotal = 0

    const orderItems = selectedProducts.map((product) => {
      const quantity = randomInt(1, 3)
      const price = parseFloat(product.price.toString())
      const total = price * quantity
      subtotal += total
      return {
        productId: product.id,
        productName: product.name,
        productSku: product.sku,
        quantity,
        price,
        total,
      }
    })

    // Ensure values don't exceed Decimal(10,2) max: 99,999,999.99
    // Limit subtotal to prevent overflow (max 50M to leave room for tax/shipping)
    const maxSubtotal = 50000000
    const limitedSubtotal = Math.min(subtotal, maxSubtotal)
    const tax = Math.round(limitedSubtotal * 0.1) // 10% tax
    const shipping = randomInt(20000, 50000) // 20k - 50k shipping
    const discount = Math.random() > 0.7 ? Math.round(limitedSubtotal * 0.1) : 0 // 30% có discount
    let finalTotal = limitedSubtotal + tax + shipping - discount
    
    // Final safety check - ensure total doesn't exceed max
    const maxValue = 99999999.99
    let finalSubtotal = limitedSubtotal
    let finalTax = tax
    let finalShipping = shipping
    let finalDiscount = discount
    
    if (finalTotal > maxValue) {
      // Scale everything down proportionally
      const scale = maxValue / finalTotal
      finalSubtotal = Math.round(limitedSubtotal * scale)
      finalTax = Math.round(tax * scale)
      finalShipping = Math.round(shipping * scale)
      finalDiscount = Math.round(discount * scale)
      finalTotal = maxValue
      
      // Update order items with scaled prices
      orderItems.forEach((item, index) => {
        const scaledPrice = parseFloat(selectedProducts[index].price.toString()) * scale
        item.price = scaledPrice
        item.total = scaledPrice * item.quantity
      })
    }

    // Billing address thường giống shipping address (90% cases)
    const useSameBillingAddress = Math.random() > 0.1
    const billingAddress = useSameBillingAddress ? shippingAddress : generateStructuredAddress()

    const order = await prisma.order.create({
      data: {
        orderNumber,
        customerId,
        customerName,
        customerEmail,
        customerPhone: customerPhone || null,
        status,
        paymentStatus,
        paymentMethod,
        shippingAddress: shippingAddress as Prisma.InputJsonValue,
        billingAddress: billingAddress as Prisma.InputJsonValue,
        subtotal: finalSubtotal,
        tax: finalTax,
        shipping: finalShipping,
        discount: finalDiscount,
        total: finalTotal,
        notes: Math.random() > 0.7 ? `Ghi chú cho đơn hàng ${orderNumber}` : null,
      },
    })

    // Tạo order items (đã được scale nếu cần)
    await prisma.orderItem.createMany({
      data: orderItems.map((item) => ({
        orderId: order.id,
        productId: item.productId,
        productName: item.productName,
        productSku: item.productSku,
        quantity: item.quantity,
        price: Math.min(item.price, maxValue), // Ensure price doesn't exceed max
        total: Math.min(item.total, maxValue), // Ensure total doesn't exceed max
      })),
    })

    orders.push(order)
  }

  console.log(`✅ Đã tạo ${orders.length} orders với items`)

  // Tạo Gift Codes (ít nhất 10 gift codes)
  const giftCodes = []
  const giftCodeData = [
    {
      code: "WELCOME10",
      description: "Giảm 10% cho khách hàng mới",
      discountType: "PERCENTAGE" as const,
      discountValue: 10,
      minOrderAmount: 100000,
      maxDiscount: 50000,
      usageLimit: 100,
      userLimit: 1,
      validFrom: new Date(),
      validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
      isActive: true,
    },
    {
      code: "SAVE50K",
      description: "Giảm 50,000 VND cho đơn hàng từ 500,000 VND",
      discountType: "FIXED_AMOUNT" as const,
      discountValue: 50000,
      minOrderAmount: 500000,
      usageLimit: 50,
      userLimit: 2,
      validFrom: new Date(),
      validUntil: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
      isActive: true,
    },
    {
      code: "SUMMER20",
      description: "Giảm 20% mùa hè",
      discountType: "PERCENTAGE" as const,
      discountValue: 20,
      minOrderAmount: 200000,
      maxDiscount: 200000,
      usageLimit: 200,
      validFrom: new Date(),
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      isActive: true,
    },
    {
      code: "VIP100K",
      description: "Giảm 100,000 VND cho khách VIP",
      discountType: "FIXED_AMOUNT" as const,
      discountValue: 100000,
      minOrderAmount: 1000000,
      usageLimit: 20,
      validFrom: new Date(),
      validUntil: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 180 days
      isActive: true,
    },
    {
      code: "FLASH30",
      description: "Flash sale giảm 30%",
      discountType: "PERCENTAGE" as const,
      discountValue: 30,
      minOrderAmount: 300000,
      maxDiscount: 300000,
      usageLimit: 100,
      validFrom: new Date(),
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      isActive: true,
    },
    {
      code: "NEWUSER15",
      description: "Giảm 15% cho người dùng mới",
      discountType: "PERCENTAGE" as const,
      discountValue: 15,
      minOrderAmount: 150000,
      maxDiscount: 150000,
      usageLimit: 500,
      userLimit: 1,
      validFrom: new Date(),
      validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      isActive: true,
    },
    {
      code: "FREESHIP",
      description: "Miễn phí vận chuyển (giảm 30,000 VND)",
      discountType: "FIXED_AMOUNT" as const,
      discountValue: 30000,
      minOrderAmount: 200000,
      usageLimit: null, // Unlimited
      validFrom: new Date(),
      validUntil: null, // No expiration
      isActive: true,
    },
    {
      code: "BIRTHDAY25",
      description: "Giảm 25% sinh nhật",
      discountType: "PERCENTAGE" as const,
      discountValue: 25,
      minOrderAmount: 250000,
      maxDiscount: 250000,
      usageLimit: 50,
      validFrom: new Date(),
      validUntil: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // 45 days
      isActive: true,
    },
    {
      code: "EXPIRED",
      description: "Mã đã hết hạn (để test)",
      discountType: "PERCENTAGE" as const,
      discountValue: 10,
      usageLimit: 10,
      validFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      validUntil: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // Yesterday
      isActive: true,
    },
    {
      code: "INACTIVE",
      description: "Mã đã bị vô hiệu hóa (để test)",
      discountType: "PERCENTAGE" as const,
      discountValue: 10,
      usageLimit: 10,
      validFrom: new Date(),
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      isActive: false,
    },
  ]

  for (const codeData of giftCodeData) {
    const giftCode = await prisma.giftCode.create({
      data: codeData,
    })
    giftCodes.push(giftCode)
  }

  console.log(`✅ Đã tạo ${giftCodes.length} gift codes`)

  // Tạo một số gift code usages cho orders đã có (để test)
  const ordersWithGiftCode = orders.slice(0, 5) // 5 orders đầu tiên
  const activeGiftCodes = giftCodes.filter((gc) => gc.isActive && (!gc.validUntil || new Date(gc.validUntil) > new Date()))

  for (let i = 0; i < ordersWithGiftCode.length && i < activeGiftCodes.length; i++) {
    const order = ordersWithGiftCode[i]
    const giftCode = activeGiftCodes[i]

    // Tính discount cho order này
    let discount = 0
    if (giftCode.discountType === "PERCENTAGE") {
      discount = (parseFloat(order.subtotal.toString()) * parseFloat(giftCode.discountValue.toString())) / 100
      if (giftCode.maxDiscount) {
        discount = Math.min(discount, parseFloat(giftCode.maxDiscount.toString()))
      }
    } else {
      discount = parseFloat(giftCode.discountValue.toString())
    }
    discount = Math.min(discount, parseFloat(order.subtotal.toString()))
    discount = Math.round(discount)

    // Tạo usage record
    await prisma.giftCodeUsage.create({
      data: {
        giftCodeId: giftCode.id,
        orderId: order.id,
        userId: order.customerId,
        discount,
      },
    })

    // Update used count
    await prisma.giftCode.update({
      where: { id: giftCode.id },
      data: { usedCount: { increment: 1 } },
    })
  }

  console.log(`✅ Đã tạo ${ordersWithGiftCode.length} gift code usages`)

  console.log("🎉 Seed database hoàn thành!")
  const publishedPosts = allPosts.filter((post) => post.published).length
  const draftPosts = allPosts.length - publishedPosts
  const approvedComments = await prisma.comment.count({ where: { approved: true } })
  const pendingComments = await prisma.comment.count({ where: { approved: false } })

  console.log("\n📊 Thống kê:")
  console.log(
    `- Roles: ${roles.length} (${roleConfigs.map((role) => role.displayName).join(", ")})`
  )
  console.log(`- Tổng quyền được gán: ${totalPermissions}`)
  console.log(`- Users: ${allUsers.length} (Super Admin, Admin, Editor, Author, User, Parent)`)
  console.log(`- Categories: ${categories.length}`)
  console.log(`- Tags: ${tags.length}`)
  console.log(`- Posts: ${allPosts.length} (${publishedPosts} published, ${draftPosts} drafts)`)
  console.log(`- Comments: ${approvedComments + pendingComments} (${approvedComments} approved, ${pendingComments} pending)`)
  console.log(`- Parents: ${parents.length}`)
  console.log(`- Students: ${createdStudents.length}`)
  console.log(`- Contact Requests: ${contactRequests.count} (various statuses and priorities)`)
  console.log(`- Notifications: ${notifications.count} (various types)`)
  console.log(`- Groups: ${groups.length} (with members)`)
  console.log(`- Messages: ${messages.length} (personal and group)`)
  console.log(`- Sessions: ${sessionsData.length} (active and inactive)`)
  console.log(`- Products: ${products.length} (with images and categories)`)
  console.log(`- Orders: ${orders.length} (with items and customer info)`)
  console.log(`- Gift Codes: ${giftCodes.length} (with usages)`)

  console.log("\n🔐 Permission System:")
  roleConfigs.forEach((role) => {
    console.log(`✅ ${role.displayName}: ${role.description}`)
  })

  console.log("\n🔑 Thông tin đăng nhập:")
  console.log("Email: superadmin@hub.edu.vn | Password: password123 (SUPER_ADMIN)")
  console.log("Email: admin@hub.edu.vn | Password: password123 (ADMIN)")
  console.log("Email: editor@hub.edu.vn | Password: password123 (EDITOR)")
  console.log("Email: author@hub.edu.vn | Password: password123 (AUTHOR)")
  console.log("Email: user@hub.edu.vn | Password: password123 (USER)")
  console.log("Email: parent@hub.edu.vn | Password: password123 (PARENT)")
}

main()
  .catch((e) => {
    console.error("❌ Lỗi khi seed database:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

