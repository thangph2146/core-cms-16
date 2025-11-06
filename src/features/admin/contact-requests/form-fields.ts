/**
 * Shared form field definitions cho contact request forms
 */

import type { ResourceFormField } from "@/features/admin/resources/components"
import { validateName, validateEmail, validatePhone, validateSubject, validateContent } from "./utils"
import React from "react"
import { User, Mail, Phone, FileText, MessageSquare, AlertCircle, UserCheck } from "lucide-react"
import type { ContactStatus, ContactPriority } from "./types"

export interface ContactRequestFormData {
  name: string
  email: string
  phone?: string | null
  subject: string
  content: string
  status?: ContactStatus
  priority?: ContactPriority
  assignedToId?: string | null
  isRead?: boolean
  [key: string]: unknown
}

const statusOptions: Array<{ label: string; value: ContactStatus }> = [
  { label: "Mới", value: "NEW" },
  { label: "Đang xử lý", value: "IN_PROGRESS" },
  { label: "Đã xử lý", value: "RESOLVED" },
  { label: "Đã đóng", value: "CLOSED" },
]

const priorityOptions: Array<{ label: string; value: ContactPriority }> = [
  { label: "Thấp", value: "LOW" },
  { label: "Trung bình", value: "MEDIUM" },
  { label: "Cao", value: "HIGH" },
  { label: "Khẩn cấp", value: "URGENT" },
]

/**
 * Base fields cho contact request form
 */
export function getBaseContactRequestFields(usersOptions: Array<{ label: string; value: string }> = []): ResourceFormField<ContactRequestFormData>[] {
  return [
    {
      name: "name",
      label: "Tên người liên hệ",
      type: "text",
      placeholder: "Nhập tên người liên hệ",
      required: true,
      validate: validateName,
      icon: React.createElement(User, { className: "h-4 w-4" }),
    },
    {
      name: "email",
      label: "Email",
      type: "email",
      placeholder: "email@example.com",
      required: true,
      validate: validateEmail,
      icon: React.createElement(Mail, { className: "h-4 w-4" }),
    },
    {
      name: "phone",
      label: "Số điện thoại",
      type: "text",
      placeholder: "Nhập số điện thoại",
      required: false,
      validate: validatePhone,
      icon: React.createElement(Phone, { className: "h-4 w-4" }),
    },
    {
      name: "subject",
      label: "Tiêu đề",
      type: "text",
      placeholder: "Nhập tiêu đề liên hệ",
      required: true,
      validate: validateSubject,
      icon: React.createElement(FileText, { className: "h-4 w-4" }),
    },
    {
      name: "content",
      label: "Nội dung",
      type: "textarea",
      placeholder: "Nhập nội dung liên hệ",
      required: true,
      validate: validateContent,
      icon: React.createElement(MessageSquare, { className: "h-4 w-4" }),
    },
    {
      name: "status",
      label: "Trạng thái",
      type: "select",
      required: false,
      placeholder: "Chọn trạng thái",
      options: statusOptions.map((opt) => ({ label: opt.label, value: opt.value })),
      defaultValue: "NEW",
      icon: React.createElement(AlertCircle, { className: "h-4 w-4" }),
    },
    {
      name: "priority",
      label: "Độ ưu tiên",
      type: "select",
      required: false,
      placeholder: "Chọn độ ưu tiên",
      options: priorityOptions.map((opt) => ({ label: opt.label, value: opt.value })),
      defaultValue: "MEDIUM",
      icon: React.createElement(AlertCircle, { className: "h-4 w-4" }),
    },
    {
      name: "assignedToId",
      label: "Giao cho",
      type: "select",
      required: false,
      placeholder: "Chọn người được giao",
      options: usersOptions,
      icon: React.createElement(UserCheck, { className: "h-4 w-4" }),
    },
    {
      name: "isRead",
      label: "Đã đọc",
      description: "Đánh dấu yêu cầu liên hệ đã được đọc",
      type: "switch",
      defaultValue: false,
      icon: React.createElement(MessageSquare, { className: "h-4 w-4" }),
    },
  ]
}

