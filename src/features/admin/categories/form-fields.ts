/**
 * Shared form field definitions cho category forms
 */

import type { ResourceFormField } from "@/features/admin/resources/components"
import { validateCategoryName, validateCategorySlug, validateDescription } from "./utils"
import React from "react"
import { Tag, Hash, AlignLeft } from "lucide-react"

export interface CategoryFormData {
  name: string
  slug: string
  description?: string | null
  [key: string]: unknown
}

/**
 * Base fields cho category form (name, slug, description)
 */
export function getBaseCategoryFields(): ResourceFormField<CategoryFormData>[] {
  return [
    {
      name: "name",
      label: "Tên danh mục",
      type: "text",
      placeholder: "vd: Công nghệ, Hướng dẫn",
      required: true,
      description: "Tên danh mục sẽ hiển thị trên website",
      validate: validateCategoryName,
      icon: React.createElement(Tag, { className: "h-4 w-4" }),
    },
    {
      name: "slug",
      label: "Slug",
      type: "text",
      placeholder: "vd: cong-nghe, huong-dan",
      required: true,
      description: "URL-friendly identifier (tự động tạo từ tên nếu để trống)",
      validate: validateCategorySlug,
      icon: React.createElement(Hash, { className: "h-4 w-4" }),
    },
    {
      name: "description",
      label: "Mô tả",
      type: "textarea",
      placeholder: "Nhập mô tả về danh mục",
      validate: validateDescription,
      icon: React.createElement(AlignLeft, { className: "h-4 w-4" }),
    },
  ]
}

