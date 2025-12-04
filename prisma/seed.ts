import { PrismaClient } from "@prisma/client"
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

  // Tạo main users (6 users)
  const superAdminUser = await prisma.user.upsert({
    where: { email: "superadmin@hub.edu.vn" },
    update: {},
    create: {
      email: "superadmin@hub.edu.vn",
      name: "Super Administrator",
      password: hashedPassword,
    },
  })

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@hub.edu.vn" },
    update: {},
    create: {
      email: "admin@hub.edu.vn",
      name: "Administrator",
      password: hashedPassword,
    },
  })

  const editorUser = await prisma.user.upsert({
    where: { email: "editor@hub.edu.vn" },
    update: {},
    create: {
      email: "editor@hub.edu.vn",
      name: "Editor",
      password: hashedPassword,
    },
  })

  const authorUser = await prisma.user.upsert({
    where: { email: "author@hub.edu.vn" },
    update: {},
    create: {
      email: "author@hub.edu.vn",
      name: "Author",
      password: hashedPassword,
    },
  })

  const regularUser = await prisma.user.upsert({
    where: { email: "user@hub.edu.vn" },
    update: {},
    create: {
      email: "user@hub.edu.vn",
      name: "Regular User",
      password: hashedPassword,
    },
  })

  const parentUser = await prisma.user.upsert({
    where: { email: "parent@hub.edu.vn" },
    update: {},
    create: {
      email: "parent@hub.edu.vn",
      name: "Parent User",
      password: hashedPassword,
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
      const user = await prisma.user.create({
        data: {
          email,
          name,
          password: hashedPassword,
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

  // Tạo comments cho các posts
  const commentsData = []
  const commentAuthors = allUsers.filter((u) => u.id !== superAdminUser.id) // Exclude super admin

  // Tạo ít nhất 3-5 comments cho mỗi post
  for (const post of allPosts) {
    const commentCount = randomInt(3, 8)
    for (let i = 0; i < commentCount; i++) {
      const author = randomItem(commentAuthors)
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

  await prisma.comment.createMany({
    data: commentsData,
  })

  console.log(`✅ Đã tạo ${commentsData.length} comments`)

  const parents = [parentUser, ...additionalUsers.filter((u) => u.role === ROLE_NAMES.PARENT).map((u) => u.user)]
  console.log(`✅ Đã tạo parents (${parents.length})`)

  // Tạo students (ít nhất 25 students)
  const studentSeedData = []
  for (let i = 1; i <= 25; i++) {
    const code = `STU-${1000 + i}`
    const name = generateVietnameseName()
    const parent = randomItem(parents)
    studentSeedData.push({
      code,
      name,
      parentId: parent.id,
    })
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

  // Tạo Contact Requests (ít nhất 25 requests)
  const contactRequestsData = []
  const statuses: Array<"NEW" | "IN_PROGRESS" | "RESOLVED" | "CLOSED"> = ["NEW", "IN_PROGRESS", "RESOLVED", "CLOSED"]
  const priorities: Array<"LOW" | "MEDIUM" | "HIGH" | "URGENT"> = ["LOW", "MEDIUM", "HIGH", "URGENT"]
  const assignableUsers = [adminUser, editorUser, ...additionalUsers.filter((u) => u.role === ROLE_NAMES.ADMIN || u.role === ROLE_NAMES.EDITOR).map((u) => u.user)]

  for (let i = 0; i < 25; i++) {
    const name = generateVietnameseName()
    const email = `contact${i + 1}@example.com`
    const phone = `09${String(i).padStart(8, "0")}`
    const subject = randomItem(contactRequestSubjects)
    const content = `Nội dung yêu cầu liên hệ số ${i + 1}. ${randomItem(commentContents)}`
    const status = randomItem(statuses)
    const priority = randomItem(priorities)
    const isRead = status !== "NEW" && Math.random() > 0.2
    const assignedToId = status !== "NEW" && Math.random() > 0.3 ? randomItem(assignableUsers).id : null

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

  // Tạo Notifications (ít nhất 25 notifications)
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

  // Tạo ít nhất 3-5 notifications cho mỗi user
  for (const user of allUsers) {
    const notificationCount = randomInt(3, 6)
    for (let i = 0; i < notificationCount; i++) {
      const kind = randomItem(notificationKinds)
      const title = randomItem(notificationTitles)
      const description = `Mô tả cho thông báo "${title}". Đây là thông báo số ${i + 1} cho user ${user.name}.`
      const isRead = Math.random() > 0.4 // 60% unread, 40% read
      const readAt = isRead ? new Date(Date.now() - randomInt(1, 7) * 24 * 60 * 60 * 1000) : null
      const actionUrl = randomItem([
        "/admin/dashboard",
        "/admin/posts",
        "/admin/messages",
        "/admin/students",
        "/admin/contact-requests",
        `/admin/posts/${randomItem(allPosts).id}`,
      ])

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

  for (let i = 0; i < 5; i++) {
    const name = groupNames[i] || `Nhóm ${i + 1}`
    const description = groupDescriptions[i] || `Mô tả cho ${name}`
    const creator = randomItem(allUsers)

    const group = await prisma.group.create({
      data: {
        name,
        description,
        createdById: creator.id,
      },
    })
    groups.push(group)

    // Thêm members cho mỗi group (3-8 members)
    const memberCount = randomInt(3, 8)
    const selectedMembers = randomItems(allUsers, memberCount)

    await prisma.groupMember.createMany({
      data: selectedMembers.map((member, index) => ({
        groupId: group.id,
        userId: member.id,
        role: (index === 0 ? "OWNER" : index < 3 ? randomItem(["ADMIN", "MEMBER"]) : "MEMBER") as "OWNER" | "ADMIN" | "MEMBER",
      })),
    })
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

  // Tạo personal messages (15 messages)
  for (let i = 0; i < 15; i++) {
    const sender = randomItem(allUsers)
    const receiver = randomItem(allUsers.filter((u) => u.id !== sender.id))
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

  // Tạo group messages (10 messages)
  for (let i = 0; i < 10; i++) {
    const group = randomItem(groups)
    const sender = randomItem(allUsers)
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
    const readCount = randomInt(1, Math.min(groupMembers.length, 5))
    const readers = randomItems(groupMembers, readCount)

    await prisma.messageRead.createMany({
      data: readers.map((member) => ({
        messageId: message.id,
        userId: member.userId,
      })),
    })
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

  // Tạo 2-3 sessions cho mỗi user
  for (const user of allUsers) {
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

  console.log("🎉 Seed database hoàn thành!")
  const publishedPosts = allPosts.filter((p) => p.published).length
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

