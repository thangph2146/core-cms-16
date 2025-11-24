/**
 * Form field definitions cho account profile form
 */

import type { ResourceFormField, ResourceFormSection } from "@/features/admin/resources/components"
import React from "react"
import { User, AlignLeft, Phone, MapPin, Lock, UserCircle } from "lucide-react"

export interface AccountFormData {
  name?: string | null
  bio?: string | null
  phone?: string | null
  address?: string | null
  password?: string
  avatar?: string | null
  [key: string]: unknown
}

/**
 * Sections cho account form
 */
export function getAccountFormSections(): ResourceFormSection[] {
  return [
    {
      id: "personal",
      title: "Thông tin cá nhân",
      description: "Thông tin cá nhân của bạn",
    },
    {
      id: "additional",
      title: "Thông tin bổ sung",
      description: "Các thông tin bổ sung",
    },
    {
      id: "security",
      title: "Bảo mật",
      description: "Thay đổi mật khẩu",
    },
  ]
}

/**
 * Fields cho account profile form
 */
export function getAccountFields(): ResourceFormField<AccountFormData>[] {
  return [
    {
      name: "name",
      label: "Tên",
      type: "text",
      placeholder: "Nhập tên",
      required: true,
      icon: React.createElement(User, { className: "h-4 w-4" }),
      section: "personal",
    },
    {
      name: "avatar",
      label: "Ảnh đại diện",
      type: "image",
      placeholder: "https://example.com/avatar.jpg",
      description: "URL của ảnh đại diện",
      icon: React.createElement(UserCircle, { className: "h-4 w-4" }),
      section: "personal",
    },
    {
      name: "phone",
      label: "Số điện thoại",
      type: "text",
      placeholder: "Nhập số điện thoại",
      icon: React.createElement(Phone, { className: "h-4 w-4" }),
      section: "personal",
    },
    {
      name: "bio",
      label: "Giới thiệu",
      type: "textarea",
      placeholder: "Nhập giới thiệu về bản thân",
      icon: React.createElement(AlignLeft, { className: "h-4 w-4" }),
      section: "additional",
    },
    {
      name: "address",
      label: "Địa chỉ",
      type: "textarea",
      placeholder: "Nhập địa chỉ",
      icon: React.createElement(MapPin, { className: "h-4 w-4" }),
      section: "additional",
    },
    {
      name: "password",
      label: "Mật khẩu mới",
      type: "password",
      placeholder: "Để trống nếu không muốn thay đổi",
      description: "Chỉ nhập nếu muốn thay đổi mật khẩu. Để trống để giữ nguyên mật khẩu hiện tại.",
      required: false,
      icon: React.createElement(Lock, { className: "h-4 w-4" }),
      section: "security",
    },
  ]
}

