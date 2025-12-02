import type { ResourceFormField, ResourceFormSection } from "@/features/admin/resources/components"
import { validateIpAddress, validateUserAgent } from "./utils"
import React from "react"
import { User, Globe, MapPin, ToggleLeft, Calendar } from "lucide-react"

export interface SessionFormData {
  userId: string
  accessToken?: string
  refreshToken?: string
  userAgent?: string | null
  ipAddress?: string | null
  isActive?: boolean
  expiresAt?: string
  [key: string]: unknown
}

export function getSessionFormSections(): ResourceFormSection[] {
  return [
    {
      id: "basic",
      title: "Thông tin cơ bản",
      description: "Thông tin chính về session",
    },
    {
      id: "security",
      title: "Bảo mật",
      description: "Thông tin bảo mật và mạng",
    },
    {
      id: "status",
      title: "Trạng thái",
      description: "Cấu hình trạng thái và thời gian",
    },
  ]
}

export function getBaseSessionFields(
  usersOptions?: Array<{ label: string; value: string }>
): ResourceFormField<SessionFormData>[] {
  return [
    {
      name: "userId",
      label: "Người dùng",
      type: "select",
      required: true,
      placeholder: "Chọn người dùng",
      options: usersOptions || [],
      description: "Người dùng sở hữu session này",
      icon: React.createElement(User, { className: "h-4 w-4" }),
      section: "basic",
    },
    {
      name: "userAgent",
      label: "User Agent",
      type: "text",
      placeholder: "vd: Mozilla/5.0...",
      required: false,
      description: "Thông tin trình duyệt/thiết bị",
      validate: validateUserAgent,
      icon: React.createElement(Globe, { className: "h-4 w-4" }),
      section: "security",
    },
    {
      name: "ipAddress",
      label: "Địa chỉ IP",
      type: "text",
      placeholder: "vd: 192.168.1.1",
      required: false,
      description: "Địa chỉ IP của client",
      validate: validateIpAddress,
      icon: React.createElement(MapPin, { className: "h-4 w-4" }),
      section: "security",
    },
    {
      name: "expiresAt",
      label: "Thời gian hết hạn",
      type: "text",
      required: true,
      placeholder: "YYYY-MM-DDTHH:mm:ss.sssZ",
      description: "Thời gian session hết hạn (ISO 8601 format)",
      icon: React.createElement(Calendar, { className: "h-4 w-4" }),
      section: "status",
    },
    {
      name: "isActive",
      label: "Trạng thái",
      description: "Bật/tắt để kích hoạt hoặc vô hiệu hóa session",
      type: "switch",
      defaultValue: true,
      icon: React.createElement(ToggleLeft, { className: "h-4 w-4" }),
      section: "status",
    },
  ]
}

