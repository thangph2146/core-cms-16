/**
 * Shared form field definitions cho tag forms
 */

import type { ResourceFormField, ResourceFormSection } from "@/features/admin/resources/components"
import { validateName, validateSlug } from "./utils"
import React from "react"
import { Tag, Hash } from "lucide-react"

export interface TagFormData {
  name: string
  slug: string
  [key: string]: unknown
}

/**
 * Sections cho tag form
 */
export function getTagFormSections(): ResourceFormSection[] {
  return [
    {
      id: "basic",
      title: "Thông tin cơ bản",
      description: "Thông tin chính về thẻ tag",
    },
  ]
}

/**
 * Base fields cho tag form (name, slug)
 */
export function getBaseTagFields(): ResourceFormField<TagFormData>[] {
  return [
    {
      name: "name",
      label: "Tên thẻ tag",
      type: "text",
      placeholder: "vd: React, Next.js, TypeScript",
      required: true,
      description: "Tên thẻ tag sẽ hiển thị trên website",
      validate: validateName,
      icon: React.createElement(Tag, { className: "h-4 w-4" }),
      section: "basic",
    },
    {
      name: "slug",
      label: "Slug",
      type: "text",
      placeholder: "vd: react, nextjs, typescript",
      required: true,
      description: "URL-friendly identifier (tự động tạo từ tên nếu để trống)",
      validate: validateSlug,
      icon: React.createElement(Hash, { className: "h-4 w-4" }),
      section: "basic",
    },
  ]
}

