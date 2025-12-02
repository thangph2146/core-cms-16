import type { ResourceFormField, ResourceFormSection } from "@/features/admin/resources/components"
import { validateStudentCode, validateName, validateEmail } from "./utils"
import React from "react"
import { User, Mail, Hash, ToggleLeft } from "lucide-react"

export interface StudentFormData {
  studentCode: string
  name?: string | null
  email?: string | null
  userId?: string | null
  isActive?: boolean
  [key: string]: unknown
}

export function getStudentFormSections(): ResourceFormSection[] {
  return [
    {
      id: "basic",
      title: "Thông tin cơ bản",
      description: "Thông tin chính về học sinh",
    },
    {
      id: "status",
      title: "Trạng thái",
      description: "Cấu hình trạng thái hoạt động",
    },
  ]
}

export function getBaseStudentFields(
  usersOptions?: Array<{ label: string; value: string }>,
  isSuperAdmin: boolean = false
): ResourceFormField<StudentFormData>[] {
  const fields: ResourceFormField<StudentFormData>[] = [
    {
      name: "studentCode",
      label: "Mã học sinh",
      type: "text",
      placeholder: "vd: HS001, STU2024",
      required: true,
      description: "Mã học sinh (chữ cái, số, dấu gạch dưới và dấu gạch ngang)",
      validate: validateStudentCode,
      icon: React.createElement(Hash, { className: "h-4 w-4" }),
      section: "basic",
    },
    {
      name: "name",
      label: "Tên học sinh",
      type: "text",
      placeholder: "vd: Nguyễn Văn A",
      required: false,
      description: "Tên đầy đủ của học sinh",
      validate: (value) => {
        if (!value || value === "") {
          return { valid: true } // Optional
        }
        return validateName(value)
      },
      icon: React.createElement(User, { className: "h-4 w-4" }),
      section: "basic",
    },
    {
      name: "email",
      label: "Email",
      type: "email",
      placeholder: "vd: student@example.com",
      required: false,
      description: "Email của học sinh",
      validate: (value) => {
        if (!value || value === "") {
          return { valid: true } // Optional
        }
        return validateEmail(value)
      },
      icon: React.createElement(Mail, { className: "h-4 w-4" }),
      section: "basic",
    },
  ]

  // Chỉ super admin mới có thể chọn liên kết tài khoản
  if (isSuperAdmin) {
    fields.push({
      name: "userId",
      label: "Liên kết với tài khoản",
      type: "select",
      required: false,
      placeholder: "Chọn tài khoản người dùng",
      options: usersOptions || [],
      description: "Liên kết học sinh với tài khoản người dùng (tùy chọn)",
      icon: React.createElement(User, { className: "h-4 w-4" }),
      section: "basic",
    })
  }

  fields.push({
    name: "isActive",
    label: "Trạng thái",
    description: "Bật/tắt để kích hoạt hoặc vô hiệu hóa học sinh",
    type: "switch",
    defaultValue: true,
    icon: React.createElement(ToggleLeft, { className: "h-4 w-4" }),
    section: "status",
  })

  return fields
}

