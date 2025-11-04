/**
 * Shared form field definitions cho user forms
 */

import type { ResourceFormField } from "@/features/admin/resources/components"
import { validateEmail, validateName, validatePassword } from "./utils"
import type { Role } from "./utils"

export interface UserFormData {
  email: string
  name?: string | null
  roleIds?: string[] | string
  isActive?: boolean
  bio?: string | null
  phone?: string | null
  address?: string | null
  password?: string
  [key: string]: unknown
}

/**
 * Base fields cho user form (email, name, roles, isActive, bio, phone, address)
 */
export function getBaseUserFields(roles: Role[], roleDefaultValue = ""): ResourceFormField<UserFormData>[] {
  return [
    {
      name: "email",
      label: "Email",
      type: "email",
      placeholder: "email@example.com",
      required: true,
      validate: validateEmail,
    },
    {
      name: "name",
      label: "Tên",
      type: "text",
      placeholder: "Nhập tên",
      validate: validateName,
    },
    {
      name: "roleIds",
      label: "Vai trò",
      type: "select",
      required: false,
      placeholder: "Chọn vai trò",
      options: roles.map((role) => ({
        label: role.displayName || role.name,
        value: role.id,
      })),
      defaultValue: roleDefaultValue,
    },
    {
      name: "bio",
      label: "Giới thiệu",
      type: "textarea",
      placeholder: "Nhập giới thiệu về người dùng",
    },
    {
      name: "phone",
      label: "Số điện thoại",
      type: "text",
      placeholder: "Nhập số điện thoại",
    },
    {
      name: "address",
      label: "Địa chỉ",
      type: "textarea",
      placeholder: "Nhập địa chỉ",
    },
    {
      name: "isActive",
      label: "Kích hoạt",
      type: "checkbox",
      defaultValue: true,
    }
  ]
}

/**
 * Password field cho create form
 */
export function getPasswordField(): ResourceFormField<UserFormData> {
  return {
    name: "password",
    label: "Mật khẩu",
    type: "password",
    placeholder: "Nhập mật khẩu",
    required: true,
    description: "Mật khẩu phải có ít nhất 6 ký tự",
    validate: (value) => validatePassword(value, false),
  }
}

/**
 * Password field cho edit form (optional, only for super admin)
 */
export function getPasswordEditField(): ResourceFormField<UserFormData> {
  return {
    name: "password",
    label: "Mật khẩu mới",
    type: "password",
    placeholder: "Để trống nếu không muốn thay đổi",
    description: "Chỉ nhập nếu muốn thay đổi mật khẩu. Để trống để giữ nguyên mật khẩu hiện tại.",
    required: false,
    validate: (value) => validatePassword(value, true),
  }
}

