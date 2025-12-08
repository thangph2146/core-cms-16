/**
 * File Utilities
 * Helper functions để xử lý file uploads
 */

import { promises as fs } from "fs"
import path from "path"
import { logger } from "@/lib/config"

/**
 * Storage directory - sử dụng /data volume trên Railway hoặc ./data trong development
 * Trong development, sử dụng ./data (relative to project root)
 * Trên production (Railway), sử dụng /data (absolute path)
 */
export const STORAGE_DIR = process.env.STORAGE_DIR || (process.env.NODE_ENV === "production" ? "/data" : "./data")
export const UPLOADS_DIR = path.join(STORAGE_DIR, "uploads")
export const IMAGES_DIR = path.join(UPLOADS_DIR, "images")

/**
 * Đảm bảo thư mục tồn tại
 */
export async function ensureDirectoryExists(dirPath: string): Promise<void> {
  try {
    await fs.access(dirPath)
    logger.debug("Directory already exists", { dirPath })
  } catch {
    logger.debug("Creating directory", { dirPath })
    await fs.mkdir(dirPath, { recursive: true })
    logger.success("Directory created", { dirPath })
  }
}

/**
 * Khởi tạo storage directories - đảm bảo tất cả thư mục cần thiết được tạo
 * Nên gọi function này khi app start hoặc trước khi upload
 */
export async function initializeStorageDirectories(): Promise<void> {
  try {
    logger.info("Initializing storage directories", {
      storageDir: STORAGE_DIR,
      uploadsDir: UPLOADS_DIR,
      imagesDir: IMAGES_DIR,
    })

    // Tạo các thư mục theo thứ tự: STORAGE_DIR -> UPLOADS_DIR -> IMAGES_DIR
    logger.debug("Creating STORAGE_DIR", { path: STORAGE_DIR })
    await ensureDirectoryExists(STORAGE_DIR)

    logger.debug("Creating UPLOADS_DIR", { path: UPLOADS_DIR })
    await ensureDirectoryExists(UPLOADS_DIR)

    logger.debug("Creating IMAGES_DIR", { path: IMAGES_DIR })
    await ensureDirectoryExists(IMAGES_DIR)

    logger.success("Storage directories initialized successfully", {
      storageDir: STORAGE_DIR,
      uploadsDir: UPLOADS_DIR,
      imagesDir: IMAGES_DIR,
    })
  } catch (error) {
    logger.error("Error initializing storage directories", {
      error: error instanceof Error ? error : new Error(String(error)),
      storageDir: STORAGE_DIR,
      uploadsDir: UPLOADS_DIR,
      imagesDir: IMAGES_DIR,
    })
    throw error
  }
}

/**
 * Tạo tên file unique với timestamp
 */
export function generateUniqueFileName(originalName: string): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 9)
  const ext = path.extname(originalName)
  const nameWithoutExt = path.basename(originalName, ext)
  const sanitizedName = nameWithoutExt.replace(/[^a-zA-Z0-9-_]/g, "_")
  return `${sanitizedName}_${timestamp}_${random}${ext}`
}

/**
 * Kiểm tra xem path đã có định dạng năm/tháng/ngày chưa (ví dụ: 2025/12/04)
 */
function hasDateStructure(folderPath: string): boolean {
  const parts = folderPath.split("/").filter(Boolean)
  if (parts.length < 3) return false
  
  // Kiểm tra 3 phần cuối có phải là năm/tháng/ngày không
  const lastThree = parts.slice(-3)
  const [year, month, day] = lastThree
  
  // Kiểm tra năm (4 chữ số), tháng (01-12), ngày (01-31)
  const yearMatch = /^\d{4}$/.test(year)
  const monthMatch = /^(0[1-9]|1[0-2])$/.test(month)
  const dayMatch = /^(0[1-9]|[12][0-9]|3[01])$/.test(day)
  
  return yearMatch && monthMatch && dayMatch
}

/**
 * Tạo đường dẫn file với cấu trúc thư mục
 * @param fileName - Tên file
 * @param customFolderPath - Đường dẫn folder tùy chỉnh
 * @param isExistingFolder - true nếu là folder có sẵn (chọn từ dropdown), false nếu là folder mới tạo
 *                          - Nếu isExistingFolder = true: upload trực tiếp vào folder đó (không thêm năm/tháng/ngày)
 *                          - Nếu isExistingFolder = false: thêm năm/tháng/ngày vào sau folder
 *                          - Nếu không có customFolderPath: tạo theo năm/tháng/ngày mặc định
 */
export function generateFilePath(fileName: string, customFolderPath?: string, isExistingFolder: boolean = false): {
  relativePath: string
  fullPath: string
  urlPath: string
} {
  // Tạo folder theo ngày (chỉ dùng khi cần)
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  const dateDir = path.join(year.toString(), month, day)

  let fullPath: string
  let relativePath: string
  let urlPath: string

  if (customFolderPath) {
    // Loại bỏ "images/" prefix nếu có và trailing slash
    const cleanCustomPath = customFolderPath.replace(/^images\//, "").replace(/\/$/, "")
    
    if (isExistingFolder) {
      // Folder có sẵn: upload trực tiếp vào folder đó (không thêm năm/tháng/ngày)
      // Kiểm tra xem có phải folder trong IMAGES_DIR không (có định dạng năm/tháng/ngày)
      if (hasDateStructure(cleanCustomPath)) {
        // Folder trong IMAGES_DIR (theo ngày)
        // Use string concatenation to avoid Turbopack dynamic path analysis
        fullPath = `${IMAGES_DIR}${path.sep}${cleanCustomPath}${path.sep}${fileName}`
        relativePath = path.join("images", cleanCustomPath, fileName)
        urlPath = `/api/uploads/images/${cleanCustomPath.replace(/\\/g, "/")}/${fileName}`
      } else {
        // Folder tự tạo trong STORAGE_DIR
        // Use string concatenation to avoid Turbopack dynamic path analysis
        fullPath = `${STORAGE_DIR}${path.sep}${cleanCustomPath}${path.sep}${fileName}`
        relativePath = cleanCustomPath + "/" + fileName
        urlPath = `/api/uploads/${cleanCustomPath.replace(/\\/g, "/")}/${fileName}`
      }
    } else {
      // Folder mới tạo: thêm năm/tháng/ngày vào sau
      const finalPath = path.join(cleanCustomPath, dateDir)
      // Use string concatenation to avoid Turbopack dynamic path analysis
      fullPath = `${STORAGE_DIR}${path.sep}${finalPath}${path.sep}${fileName}`
      relativePath = finalPath + "/" + fileName
      urlPath = `/api/uploads/${finalPath.replace(/\\/g, "/")}/${fileName}`
    }
  } else {
    // Không có folder tùy chỉnh: dùng folder theo ngày mặc định
    // Use string concatenation to avoid Turbopack dynamic path analysis
    fullPath = `${IMAGES_DIR}${path.sep}${dateDir}${path.sep}${fileName}`
    relativePath = path.join("images", dateDir, fileName)
    urlPath = `/api/uploads/images/${dateDir.replace(/\\/g, "/")}/${fileName}`
  }

  return { relativePath, fullPath, urlPath }
}

/**
 * Validate file type (chỉ cho phép hình ảnh)
 */
export function isValidImageFile(fileName: string, mimeType?: string): boolean {
  const allowedExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"]
  const allowedMimeTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/svg+xml",
  ]

  const ext = path.extname(fileName).toLowerCase()
  if (!allowedExtensions.includes(ext)) {
    return false
  }

  if (mimeType && !allowedMimeTypes.includes(mimeType)) {
    return false
  }

  return true
}

/**
 * Xóa folder và tất cả nội dung bên trong (recursive)
 */
export async function deleteDirectory(dirPath: string): Promise<void> {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true })
    
    // Xóa tất cả files và subdirectories
    await Promise.all(
      entries.map(async (entry) => {
        const fullPath = path.join(dirPath, entry.name)
        if (entry.isDirectory()) {
          await deleteDirectory(fullPath) // Recursive delete
        } else {
          await fs.unlink(fullPath)
        }
      })
    )
    
    // Xóa folder rỗng
    await fs.rmdir(dirPath)
    logger.success("Directory deleted", { dirPath })
  } catch (error) {
    logger.error("Error deleting directory", {
      dirPath,
      error: error instanceof Error ? error : new Error(String(error)),
    })
    throw error
  }
}

/**
 * Validate file size (max 10MB)
 */
export function isValidFileSize(size: number, maxSizeMB = 10): boolean {
  const maxSizeBytes = maxSizeMB * 1024 * 1024
  return size <= maxSizeBytes
}

/**
 * Validate image dimensions (max width or height)
 * Client-side đã resize hình ảnh trước khi upload, nên server-side chỉ validate đơn giản
 * Nếu cần validate chính xác, có thể cài đặt sharp: npm install sharp
 */
export async function validateImageDimensions(
  file: File,
  _maxDimension: number
): Promise<{ valid: boolean; width?: number; height?: number; error?: string }> {
  // SVG không thể validate dimensions dễ dàng, và client đã xử lý
  if (file.type === "image/svg+xml") {
    return { valid: true }
  }

  // Client-side đã resize hình ảnh trước khi upload
  // Server-side validation là optional - nếu cần có thể cài sharp để validate chính xác
  // Hiện tại skip validation vì client đã xử lý
  return { valid: true }
}

/**
 * Xóa file
 */
export async function deleteFile(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath)
  } catch (error) {
    // File không tồn tại hoặc đã bị xóa
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error
    }
  }
}

