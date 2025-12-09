import { prisma } from "@/lib/database"
import type { Product, ProductDetail } from "../types"

export interface GetProductsParams {
  page?: number
  limit?: number
  category?: string
  search?: string
  featured?: boolean
  sortBy?: "price_asc" | "price_desc" | "name_asc" | "name_desc" | "created_desc"
}

export interface ProductsResult {
  products: Product[]
  total: number
  totalPages: number
  page: number
  limit: number
}

export async function getProducts(params: GetProductsParams = {}): Promise<ProductsResult> {
  const page = params.page || 1
  const limit = params.limit || 12
  const skip = (page - 1) * limit

  const where: {
    status: "ACTIVE"
    deletedAt: null
    categories?: { some: { category: { slug: string } } }
    OR?: Array<{ name?: { contains: string; mode: "insensitive" }; description?: { contains: string; mode: "insensitive" }; sku?: { contains: string; mode: "insensitive" } }>
    featured?: boolean
  } = {
    status: "ACTIVE",
    deletedAt: null,
  }

  if (params.category) {
    where.categories = {
      some: {
        category: {
          slug: params.category,
        },
      },
    }
  }

  if (params.search) {
    where.OR = [
      { name: { contains: params.search, mode: "insensitive" as const } },
      { description: { contains: params.search, mode: "insensitive" as const } },
      { sku: { contains: params.search, mode: "insensitive" as const } },
    ]
  }

  if (params.featured !== undefined) {
    where.featured = params.featured
  }

  const orderBy: Record<string, "asc" | "desc"> = {}
  if (params.sortBy === "price_asc") {
    orderBy.price = "asc"
  } else if (params.sortBy === "price_desc") {
    orderBy.price = "desc"
  } else if (params.sortBy === "name_asc") {
    orderBy.name = "asc"
  } else if (params.sortBy === "name_desc") {
    orderBy.name = "desc"
  } else {
    orderBy.createdAt = "desc"
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        images: {
          orderBy: {
            order: "asc",
          },
          take: 1, // Only get first image for listing
        },
        categories: {
          include: {
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
    }),
    prisma.product.count({ where }),
  ])

  const totalPages = Math.ceil(total / limit)

  return {
    products: products.map((product) => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      shortDescription: product.shortDescription,
      sku: product.sku,
      price: product.price.toString(),
      compareAtPrice: product.compareAtPrice?.toString() || null,
      stock: product.stock,
      status: product.status,
      featured: product.featured,
      images: product.images.map((img) => ({
        id: img.id,
        url: img.url,
        alt: img.alt,
        order: img.order,
        isPrimary: img.isPrimary,
      })),
      categories: product.categories.map((pc) => ({
        id: pc.category.id,
        name: pc.category.name,
        slug: pc.category.slug,
      })),
    })),
    total,
    totalPages,
    page,
    limit,
  }
}

export async function getProductBySlug(slug: string): Promise<ProductDetail | null> {
  try {
    const product = await prisma.product.findFirst({
      where: {
        slug,
        status: "ACTIVE",
        deletedAt: null,
      },
      include: {
        images: {
          orderBy: {
            order: "asc",
          },
        },
        categories: {
          include: {
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
        variants: {
          orderBy: [
            { type: "asc" },
            { order: "asc" },
          ],
        },
      },
    })

    if (!product) {
      return null
    }

    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      shortDescription: product.shortDescription,
      sku: product.sku,
      price: product.price.toString(),
      compareAtPrice: product.compareAtPrice?.toString() || null,
      stock: product.stock,
      status: product.status,
      featured: product.featured,
      images: product.images.map((img) => ({
        id: img.id,
        url: img.url,
        alt: img.alt,
        order: img.order,
        isPrimary: img.isPrimary,
      })),
      categories: product.categories.map((pc) => ({
        id: pc.category.id,
        name: pc.category.name,
        slug: pc.category.slug,
      })),
      variants: product.variants.map((v) => ({
        id: v.id,
        name: v.name,
        value: v.value,
        type: v.type,
        price: v.price?.toString() || null,
        sku: v.sku,
        stock: v.stock,
        imageUrl: v.imageUrl,
        order: v.order,
        isDefault: v.isDefault,
      })),
      shippingInfo: product.shippingInfo as unknown as ProductDetail["shippingInfo"],
      promotionBanner: product.promotionBanner,
      branchAvailability: product.branchAvailability as unknown as ProductDetail["branchAvailability"],
      paymentPromotion: product.paymentPromotion as unknown as ProductDetail["paymentPromotion"],
      relatedProductIds: (product as { relatedProductIds?: string[] }).relatedProductIds || [],
    }
  } catch (error) {
    console.error("[getProductBySlug] Error fetching product:", error)
    
    // Check for database connection errors
    const isConnectionError = error instanceof Error && (
      error.message.includes("Can't reach database server") ||
      error.message.includes("P1001") ||
      error.message.includes("connection")
    )
    
    if (isConnectionError) {
      console.error("[getProductBySlug] Database connection error - returning null instead of throwing")
      // Return null instead of throwing to allow graceful degradation
      // The error.tsx will handle this if needed
      return null
    }
    
    // For other errors, return null to indicate product not found
    return null
  }
}
export async function getRelatedProducts(
  productId: string,
  relatedProductIds: string[] = [],
  categoryIds: string[] = [],
  limit: number = 8
): Promise<Product[]> {
  const where: {
    id?: { not: string; in?: string[] }
    status: "ACTIVE"
    deletedAt: null
    OR?: Array<{ id?: { in: string[] }; categories?: { some: { categoryId: { in: string[] } } } }>
  } = {
    id: { not: productId },
    status: "ACTIVE",
    deletedAt: null,
  }

  // Ưu tiên sản phẩm liên quan, sau đó là cùng category
  if (relatedProductIds.length > 0) {
    where.id = { not: productId, in: relatedProductIds }
  } else if (categoryIds.length > 0) {
    where.OR = [
      { categories: { some: { categoryId: { in: categoryIds } } } },
    ]
  } else {
    // Nếu không có relatedProductIds và categoryIds, lấy sản phẩm featured
    return getProducts({ featured: true, limit }).then((result) => result.products.filter((p) => p.id !== productId).slice(0, limit))
  }

  const products = await prisma.product.findMany({
    where,
    take: limit,
    orderBy: { createdAt: "desc" },
    include: {
      images: {
        orderBy: { order: "asc" },
        take: 1,
      },
      categories: {
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      },
    },
  })

  return products.map((product) => ({
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    shortDescription: product.shortDescription,
    sku: product.sku,
    price: product.price.toString(),
    compareAtPrice: product.compareAtPrice?.toString() || null,
    stock: product.stock,
    status: product.status,
    featured: product.featured,
    images: product.images.map((img) => ({
      id: img.id,
      url: img.url,
      alt: img.alt,
      order: img.order,
      isPrimary: img.isPrimary,
    })),
    categories: product.categories.map((pc) => ({
      id: pc.category.id,
      name: pc.category.name,
      slug: pc.category.slug,
    })),
  }))
}