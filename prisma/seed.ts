import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

import { DEFAULT_ROLES } from "../src/lib/permissions"

const prisma = new PrismaClient()

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
  USER: "Người dùng thông thường với quyền hạn cơ bản.",
  PARENT: "Phụ huynh học sinh, truy cập thông tin liên quan học sinh.",
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
  await prisma.$transaction(async (tx) => {
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
  })
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
    ],
    skipDuplicates: true,
  })

  console.log("✅ Đã tạo users")

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
      authorId: authorUser.id,
    },
  })

  console.log("✅ Đã tạo posts")

  await prisma.postCategory.createMany({
    data: [
      { postId: post1.id, categoryId: categories[0].id },
      { postId: post1.id, categoryId: categories[1].id },
      { postId: post2.id, categoryId: categories[0].id },
      { postId: post3.id, categoryId: categories[1].id },
    ],
    skipDuplicates: true,
  })

  await prisma.postTag.createMany({
    data: [
      { postId: post1.id, tagId: tags[0].id },
      { postId: post1.id, tagId: tags[1].id },
      { postId: post1.id, tagId: tags[2].id },
      { postId: post1.id, tagId: tags[3].id },
      { postId: post2.id, tagId: tags[0].id },
      { postId: post2.id, tagId: tags[1].id },
      { postId: post3.id, tagId: tags[2].id },
      { postId: post3.id, tagId: tags[6].id },
      { postId: post3.id, tagId: tags[7].id },
    ],
    skipDuplicates: true,
  })

  console.log("✅ Đã liên kết posts với categories và tags")

  await prisma.comment.createMany({
    data: [
      {
        content: "Bài viết rất hay và hữu ích! Cảm ơn tác giả đã chia sẻ.",
        approved: true,
        authorId: authorUser.id,
        postId: post1.id,
      },
      {
        content: "Tôi đã thử và thấy rất dễ sử dụng. Recommend cho mọi người!",
        approved: true,
        authorId: editorUser.id,
        postId: post1.id,
      },
      {
        content: "Có thể chia sẻ thêm về cách customize editor không?",
        approved: false,
        authorId: regularUser.id,
        postId: post2.id,
      },
    ],
  })

  console.log("✅ Đã tạo comments")

  const parents = [parentUser]
  console.log(`✅ Đã tạo parents (${parents.length})`)

  const studentSeedData = [
    { code: "STU-1001", name: "Student 1001" },
    { code: "STU-1002", name: "Student 1002" },
    { code: "STU-1003", name: "Student 1003" },
    { code: "STU-1004", name: "Student 1004" },
  ]

  await Promise.all(
    studentSeedData.map((student) =>
      prisma.student.upsert({
        where: { studentCode: student.code },
        update: {
          userId: parentUser.id,
          name: student.name,
          email: `${student.code.toLowerCase()}@example.com`,
        },
        create: {
          userId: parentUser.id,
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

  console.log("✅ Đã tạo students")

  console.log("🎉 Seed database hoàn thành!")
  console.log("\n📊 Thống kê:")
  console.log(
    `- Roles: ${roles.length} (${roleConfigs.map((role) => role.displayName).join(", ")})`
  )
  console.log(`- Tổng quyền được gán: ${totalPermissions}`)
  console.log(`- Users: 6 (Super Admin, Admin, Editor, Author, User, Parent)`)
  console.log(`- Categories: ${categories.length}`)
  console.log(`- Tags: ${tags.length}`)
  console.log(`- Posts: 3 (3 published)`)
  console.log(`- Comments: 3 (2 approved, 1 pending)`)
  console.log(`- Parents: ${parents.length}`)
  console.log(`- Students: ${createdStudents.length}`)
  console.log(`- Messages: 0 (không tạo sẵn - để người dùng tự tạo)`)

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

