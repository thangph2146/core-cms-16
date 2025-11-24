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
  await prisma.$transaction(async (tx) => {
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

  const allPosts = [post1, post2, post3, post4, post5, post6, post7, post8]

  console.log("✅ Đã tạo posts")

  await prisma.postCategory.createMany({
    data: [
      { postId: post1.id, categoryId: categories[0].id },
      { postId: post1.id, categoryId: categories[1].id },
      { postId: post2.id, categoryId: categories[0].id },
      { postId: post3.id, categoryId: categories[1].id },
      { postId: post4.id, categoryId: categories[1].id },
      { postId: post4.id, categoryId: categories[4].id },
      { postId: post5.id, categoryId: categories[1].id },
      { postId: post5.id, categoryId: categories[4].id },
      { postId: post6.id, categoryId: categories[6].id },
      { postId: post7.id, categoryId: categories[1].id },
      { postId: post7.id, categoryId: categories[6].id },
      { postId: post8.id, categoryId: categories[6].id },
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
      { postId: post4.id, tagId: tags[4].id },
      { postId: post4.id, tagId: tags[3].id },
      { postId: post5.id, tagId: tags[3].id },
      { postId: post5.id, tagId: tags[4].id },
      { postId: post6.id, tagId: tags[7].id },
      { postId: post6.id, tagId: tags[10].id },
      { postId: post7.id, tagId: tags[8].id },
      { postId: post7.id, tagId: tags[9].id },
      { postId: post8.id, tagId: tags[11].id },
      { postId: post8.id, tagId: tags[6].id },
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
      {
        content: "Rất thích cách giải thích chi tiết. Mong chờ bài viết tiếp theo!",
        approved: true,
        authorId: regularUser.id,
        postId: post1.id,
      },
      {
        content: "Next.js 16 có vẻ rất mạnh mẽ. Cảm ơn bạn đã chia sẻ!",
        approved: true,
        authorId: authorUser.id,
        postId: post4.id,
      },
      {
        content: "Bài viết về React Server Components rất hay. Tôi đã học được nhiều điều mới.",
        approved: true,
        authorId: editorUser.id,
        postId: post5.id,
      },
      {
        content: "Có thể bạn có thể giải thích thêm về cách optimize queries không?",
        approved: false,
        authorId: regularUser.id,
        postId: post6.id,
      },
      {
        content: "TypeScript patterns này rất hữu ích cho dự án của tôi. Cảm ơn!",
        approved: true,
        authorId: authorUser.id,
        postId: post7.id,
      },
      {
        content: "API design là một chủ đề quan trọng. Bài viết này rất chi tiết.",
        approved: true,
        authorId: adminUser.id,
        postId: post8.id,
      },
      {
        content: "Tôi có một số câu hỏi về cách implement versioning. Có thể hỗ trợ không?",
        approved: false,
        authorId: regularUser.id,
        postId: post8.id,
      },
    ],
  })

  console.log("✅ Đã tạo comments")

  const parents = [parentUser]
  console.log(`✅ Đã tạo parents (${parents.length})`)

  const studentSeedData = [
    { code: "STU-1001", name: "Nguyễn Văn An" },
    { code: "STU-1002", name: "Trần Thị Bình" },
    { code: "STU-1003", name: "Lê Văn Cường" },
    { code: "STU-1004", name: "Phạm Thị Dung" },
    { code: "STU-1005", name: "Hoàng Văn Em" },
    { code: "STU-1006", name: "Vũ Thị Phương" },
    { code: "STU-1007", name: "Đặng Văn Giang" },
    { code: "STU-1008", name: "Bùi Thị Hoa" },
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

  // Tạo Contact Requests
  const contactRequests = await prisma.contactRequest.createMany({
    data: [
      {
        name: "Nguyễn Văn Khách",
        email: "khach1@example.com",
        phone: "0901234567",
        subject: "Câu hỏi về hệ thống",
        content: "Tôi muốn tìm hiểu thêm về cách sử dụng hệ thống CMS này.",
        status: "NEW",
        priority: "MEDIUM",
        isRead: false,
      },
      {
        name: "Trần Thị Người Dùng",
        email: "user2@example.com",
        phone: "0912345678",
        subject: "Yêu cầu hỗ trợ kỹ thuật",
        content: "Tôi gặp vấn đề khi đăng nhập vào hệ thống. Có thể hỗ trợ không?",
        status: "IN_PROGRESS",
        priority: "HIGH",
        isRead: true,
        assignedToId: adminUser.id,
      },
      {
        name: "Lê Văn Phản Hồi",
        email: "feedback@example.com",
        phone: "0923456789",
        subject: "Góp ý về tính năng mới",
        content: "Tôi có một số góp ý về tính năng editor. Mong được xem xét!",
        status: "RESOLVED",
        priority: "LOW",
        isRead: true,
        assignedToId: editorUser.id,
      },
      {
        name: "Phạm Thị Khẩn Cấp",
        email: "urgent@example.com",
        phone: "0934567890",
        subject: "Lỗi nghiêm trọng cần xử lý ngay",
        content: "Hệ thống bị lỗi khi tôi cố gắng lưu bài viết. Cần hỗ trợ ngay!",
        status: "NEW",
        priority: "URGENT",
        isRead: false,
      },
      {
        name: "Hoàng Văn Đóng",
        email: "closed@example.com",
        phone: "0945678901",
        subject: "Vấn đề đã được giải quyết",
        content: "Cảm ơn bạn đã hỗ trợ. Vấn đề của tôi đã được giải quyết.",
        status: "CLOSED",
        priority: "MEDIUM",
        isRead: true,
        assignedToId: adminUser.id,
      },
    ],
  })

  console.log(`✅ Đã tạo ${contactRequests.count} contact requests`)

  // Tạo Notifications
  const notifications = await prisma.notification.createMany({
    data: [
      {
        userId: superAdminUser.id,
        kind: "SYSTEM",
        title: "Chào mừng đến với hệ thống!",
        description: "Bạn đã đăng nhập thành công vào hệ thống CMS.",
        isRead: false,
        actionUrl: "/admin/dashboard",
      },
      {
        userId: adminUser.id,
        kind: "MESSAGE",
        title: "Bạn có tin nhắn mới",
        description: "Bạn có 1 tin nhắn mới từ người dùng.",
        isRead: false,
        actionUrl: "/admin/messages",
        metadata: { messageId: "msg-1", fromUserId: regularUser.id },
      },
      {
        userId: editorUser.id,
        kind: "ANNOUNCEMENT",
        title: "Thông báo quan trọng",
        description: "Hệ thống sẽ được bảo trì vào cuối tuần này.",
        isRead: true,
        readAt: new Date(),
      },
      {
        userId: authorUser.id,
        kind: "SUCCESS",
        title: "Bài viết đã được duyệt",
        description: "Bài viết của bạn đã được phê duyệt và xuất bản.",
        isRead: false,
        actionUrl: `/admin/posts/${post1.id}`,
      },
      {
        userId: regularUser.id,
        kind: "WARNING",
        title: "Cảnh báo bảo mật",
        description: "Vui lòng cập nhật mật khẩu của bạn để bảo mật tài khoản.",
        isRead: false,
        actionUrl: "/admin/account",
      },
      {
        userId: parentUser.id,
        kind: "INFO",
        title: "Thông tin học sinh",
        description: "Có thông tin mới về học sinh của bạn.",
        isRead: false,
        actionUrl: "/admin/students",
      },
      {
        userId: adminUser.id,
        kind: "ALERT",
        title: "Yêu cầu liên hệ mới",
        description: "Bạn có 1 yêu cầu liên hệ mới cần xử lý.",
        isRead: false,
        actionUrl: "/admin/contact-requests",
      },
    ],
  })

  console.log(`✅ Đã tạo ${notifications.count} notifications`)

  // Tạo Groups
  const group1 = await prisma.group.create({
    data: {
      name: "Nhóm Phát Triển",
      description: "Nhóm dành cho các developer trong hệ thống",
      createdById: superAdminUser.id,
    },
  })

  const group2 = await prisma.group.create({
    data: {
      name: "Nhóm Biên Tập",
      description: "Nhóm dành cho các editor và author",
      createdById: editorUser.id,
    },
  })

  // Tạo Group Members
  await prisma.groupMember.createMany({
    data: [
      { groupId: group1.id, userId: superAdminUser.id, role: "OWNER" },
      { groupId: group1.id, userId: adminUser.id, role: "ADMIN" },
      { groupId: group1.id, userId: editorUser.id, role: "MEMBER" },
      { groupId: group1.id, userId: authorUser.id, role: "MEMBER" },
      { groupId: group2.id, userId: editorUser.id, role: "OWNER" },
      { groupId: group2.id, userId: authorUser.id, role: "MEMBER" },
      { groupId: group2.id, userId: regularUser.id, role: "MEMBER" },
    ],
  })

  console.log("✅ Đã tạo groups và group members")

  // Tạo Messages (Personal và Group)
  const _personalMessage1 = await prisma.message.create({
    data: {
      senderId: regularUser.id,
      receiverId: adminUser.id,
      subject: "Câu hỏi về quyền truy cập",
      content: "Xin chào, tôi muốn hỏi về quyền truy cập của tài khoản USER. Có thể giải thích giúp tôi không?",
      type: "PERSONAL",
      isRead: false,
    },
  })

  const personalMessage2 = await prisma.message.create({
    data: {
      senderId: authorUser.id,
      receiverId: editorUser.id,
      subject: "Yêu cầu review bài viết",
      content: "Tôi đã hoàn thành bài viết mới. Bạn có thể review giúp tôi không?",
      type: "PERSONAL",
      isRead: true,
    },
  })

  const groupMessage1 = await prisma.message.create({
    data: {
      senderId: superAdminUser.id,
      groupId: group1.id,
      subject: "Thông báo về phiên bản mới",
      content: "Chúng tôi đã phát hành phiên bản mới của hệ thống với nhiều cải tiến.",
      type: "ANNOUNCEMENT",
    },
  })

  const groupMessage2 = await prisma.message.create({
    data: {
      senderId: editorUser.id,
      groupId: group2.id,
      subject: "Hướng dẫn sử dụng editor mới",
      content: "Các bạn có thể tham khảo tài liệu mới về cách sử dụng editor.",
      type: "NOTIFICATION",
    },
  })

  // Tạo Message Reads
  await prisma.messageRead.createMany({
    data: [
      { messageId: groupMessage1.id, userId: superAdminUser.id },
      { messageId: groupMessage1.id, userId: adminUser.id },
      { messageId: groupMessage1.id, userId: editorUser.id },
      { messageId: groupMessage2.id, userId: editorUser.id },
      { messageId: groupMessage2.id, userId: authorUser.id },
      { messageId: personalMessage2.id, userId: editorUser.id },
    ],
  })

  console.log("✅ Đã tạo messages và message reads")

  // Tạo Sessions mẫu
  const futureDate = new Date()
  futureDate.setDate(futureDate.getDate() + 7) // 7 ngày sau

  await prisma.session.createMany({
    data: [
      {
        userId: superAdminUser.id,
        accessToken: `access_token_${superAdminUser.id}_${Date.now()}`,
        refreshToken: `refresh_token_${superAdminUser.id}_${Date.now()}`,
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
        ipAddress: "192.168.1.100",
        isActive: true,
        expiresAt: futureDate,
      },
      {
        userId: adminUser.id,
        accessToken: `access_token_${adminUser.id}_${Date.now()}`,
        refreshToken: `refresh_token_${adminUser.id}_${Date.now()}`,
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        ipAddress: "192.168.1.101",
        isActive: true,
        expiresAt: futureDate,
      },
      {
        userId: editorUser.id,
        accessToken: `access_token_${editorUser.id}_${Date.now()}`,
        refreshToken: `refresh_token_${editorUser.id}_${Date.now()}`,
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0)",
        ipAddress: "192.168.1.102",
        isActive: false, // Inactive session
        expiresAt: new Date(Date.now() - 86400000), // Expired yesterday
      },
    ],
  })

  console.log("✅ Đã tạo sessions")

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
  console.log(`- Users: 6 (Super Admin, Admin, Editor, Author, User, Parent)`)
  console.log(`- Categories: ${categories.length}`)
  console.log(`- Tags: ${tags.length}`)
  console.log(`- Posts: ${allPosts.length} (${publishedPosts} published, ${draftPosts} drafts)`)
  console.log(`- Comments: ${approvedComments + pendingComments} (${approvedComments} approved, ${pendingComments} pending)`)
  console.log(`- Parents: ${parents.length}`)
  console.log(`- Students: ${createdStudents.length}`)
  console.log(`- Contact Requests: ${contactRequests.count} (various statuses and priorities)`)
  console.log(`- Notifications: ${notifications.count} (various types)`)
  console.log(`- Groups: 2 (with members)`)
  console.log(`- Messages: 4 (2 personal, 2 group)`)
  console.log(`- Sessions: 3 (2 active, 1 inactive)`)

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

