import type { ResourceFormField, ResourceFormSection } from "@/features/admin/resources/components"
import React from "react"
import { User, AlignLeft, Phone, MapPin, Lock, UserCircle, Building2, Navigation } from "lucide-react"

export interface AccountFormData {
  name?: string | null
  bio?: string | null
  phone?: string | null
  address?: string | null
  // Structured address fields (for form input)
  addressStreet?: string | null
  addressWard?: string | null
  addressDistrict?: string | null
  addressCity?: string | null
  addressPostalCode?: string | null
  password?: string
  avatar?: string | null
  [key: string]: unknown
}

export function getAccountFormSections(): ResourceFormSection[] {
  return [
    {
      id: "avatar",
      title: "Ảnh đại diện",
      description: "Cập nhật ảnh đại diện của bạn",
    },
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
      id: "address",
      title: "Địa chỉ",
      description: "Thông tin địa chỉ chi tiết",
    },
    {
      id: "security",
      title: "Bảo mật",
      description: "Thay đổi mật khẩu",
    },
  ]
}

export function getAccountFields(): ResourceFormField<AccountFormData>[] {
  return [
    {
      name: "avatar",
      label: "Ảnh đại diện",
      type: "image",
      placeholder: "https://example.com/avatar.jpg",
      description: "URL của ảnh đại diện",
      icon: React.createElement(UserCircle, { className: "h-4 w-4" }),
      section: "avatar",
    },
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
      name: "addressStreet",
      label: "Số nhà, Đường",
      type: "text",
      placeholder: "Ví dụ: 125 Đường Đỗ Uyên",
      icon: React.createElement(MapPin, { className: "h-4 w-4" }),
      section: "address",
    },
    {
      name: "addressWard",
      label: "Phường/Xã",
      type: "text",
      placeholder: "Ví dụ: Phường 2",
      icon: React.createElement(Building2, { className: "h-4 w-4" }),
      section: "address",
    },
    {
      name: "addressDistrict",
      label: "Quận/Huyện",
      type: "text",
      placeholder: "Ví dụ: Quận Hoàn Kiếm",
      icon: React.createElement(Navigation, { className: "h-4 w-4" }),
      section: "address",
    },
    {
      name: "addressCity",
      label: "Thành phố/Tỉnh",
      type: "text",
      placeholder: "Ví dụ: Hà Nội",
      icon: React.createElement(MapPin, { className: "h-4 w-4" }),
      section: "address",
    },
    {
      name: "addressPostalCode",
      label: "Mã bưu điện",
      type: "text",
      placeholder: "Ví dụ: 71593 (tùy chọn)",
      icon: React.createElement(MapPin, { className: "h-4 w-4" }),
      section: "address",
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

