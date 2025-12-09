/**
 * POST /api/admin/products/[id]/images/[imageId]/set-primary
 * Set product image as primary
 */
import { NextRequest } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/database"
import { getTablePermissionsAsync } from "@/features/admin/resources/server"
import { createErrorResponse, createSuccessResponse } from "@/lib/config"
import { PERMISSIONS } from "@/lib/permissions"
import { logger } from "@/lib/config/logger"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; imageId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return createErrorResponse("Unauthorized", { status: 401 })
    }

    const permissions = await getTablePermissionsAsync({
      delete: [PERMISSIONS.PRODUCTS_DELETE],
      restore: [PERMISSIONS.PRODUCTS_UPDATE],
      manage: PERMISSIONS.PRODUCTS_MANAGE,
      create: PERMISSIONS.PRODUCTS_CREATE,
    })
    if (!permissions.canManage) {
      return createErrorResponse("Forbidden", { status: 403 })
    }

    const { id: productId, imageId } = await params

    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { images: true },
    })

    if (!product) {
      return createErrorResponse("Sản phẩm không tồn tại", { status: 404 })
    }

    // Verify image exists and belongs to product
    const image = product.images.find((img) => img.id === imageId)
    if (!image) {
      return createErrorResponse("Hình ảnh không tồn tại", { status: 404 })
    }

    // Update all images: set isPrimary to false, then set target image to true
    const updatedProduct = await prisma.$transaction(async (tx) => {
      // Set all images to non-primary
      await tx.productImage.updateMany({
        where: { productId },
        data: { isPrimary: false },
      })

      // Set target image as primary
      await tx.productImage.update({
        where: { id: imageId },
        data: { isPrimary: true },
      })

      // Fetch updated product with images
      return tx.product.findUnique({
        where: { id: productId },
        include: {
          images: {
            orderBy: { order: "asc" },
          },
        },
      })
    })

    logger.info("[POST /api/admin/products/[id]/images/[imageId]/set-primary] Success", {
      productId,
      imageId,
      userId: session.user.id,
    })

    return createSuccessResponse(updatedProduct)
  } catch (error: unknown) {
    logger.error("[POST /api/admin/products/[id]/images/[imageId]/set-primary] Error", { error })
    const errorMessage = error instanceof Error ? error.message : "Không thể đặt ảnh chính"
    const status = error && typeof error === "object" && "statusCode" in error && typeof error.statusCode === "number" 
      ? error.statusCode 
      : 500
    return createErrorResponse(errorMessage, { status })
  }
}

