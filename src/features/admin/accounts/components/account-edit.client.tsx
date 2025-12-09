"use client"

import { ResourceForm, type ResourceFormField } from "@/features/admin/resources/components"
import { useResourceFormSubmit } from "@/features/admin/resources/hooks"
import { apiRoutes } from "@/lib/api/routes"
import { getAccountFields, getAccountFormSections, type AccountFormData } from "../form-fields"
import type { AccountProfile } from "../types"
import { UpdateAccountSchema } from "../server/schemas"
import { useToast } from "@/hooks/use-toast"
import { ZodError } from "zod"

export interface AccountEditClientProps {
  account: AccountProfile | null
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSuccess?: () => void
  onCancel?: () => void
  variant?: "dialog" | "sheet" | "page"
  backUrl?: string
  backLabel?: string
}

export function AccountEditClient({
  account,
  open = true,
  onOpenChange,
  onSuccess,
  onCancel,
  variant = "dialog",
  backUrl,
  backLabel = "Quay lại",
}: AccountEditClientProps) {
  const { toast } = useToast()
  const { handleSubmit } = useResourceFormSubmit({
    apiRoute: apiRoutes.accounts.update,
    method: "PUT",
    resourceId: account?.id,
    messages: {
      successTitle: "Cập nhật thành công",
      successDescription: "Thông tin tài khoản đã được cập nhật.",
      errorTitle: "Lỗi cập nhật",
    },
    navigation: {
      fallback: backUrl,
    },
    transformData: (data) => {
      const submitData: Record<string, unknown> = { ...data }
      
      // Trim name field
      if (submitData.name) submitData.name = String(submitData.name).trim()
      
      // Remove password if empty
      if (!submitData.password || submitData.password === "") {
        delete submitData.password
      }
      
      // Convert structured address fields to JSON string
      const addressMap: Record<string, string> = {
        addressStreet: "address",
        addressWard: "ward",
        addressDistrict: "district",
        addressCity: "city",
        addressPostalCode: "postalCode",
      }
      
      const structuredAddress: Record<string, string> = {}
      Object.entries(addressMap).forEach(([field, key]) => {
        const value = submitData[field]
        if (value && String(value).trim() !== "") {
          structuredAddress[key] = String(value).trim()
        }
        delete submitData[field]
      })
      
      submitData.address = Object.keys(structuredAddress).length > 0 
        ? JSON.stringify(structuredAddress) 
        : (submitData.address === "" ? null : submitData.address)
      
      // Convert empty strings to null for nullable fields
      ;(["bio", "phone", "avatar"] as const).forEach((field) => {
        if (submitData[field] === "") submitData[field] = null
      })

      // Validate with Zod schema
      try {
        UpdateAccountSchema.parse(submitData)
      } catch (error) {
        if (error instanceof ZodError) {
          const firstError = error.issues[0]
          if (firstError) {
            const fieldName = firstError.path[0] || "dữ liệu"
            const fieldLabels: Record<string, string> = {
              name: "Tên",
              bio: "Tiểu sử",
              phone: "Số điện thoại",
              address: "Địa chỉ",
              password: "Mật khẩu",
              avatar: "Ảnh đại diện",
            }
            toast({
              variant: "destructive",
              title: "Lỗi validation",
              description: `${fieldLabels[String(fieldName)] || String(fieldName)}: ${firstError.message}`,
            })
            throw new Error(`Validation error: ${firstError.message}`)
          }
        }
        toast({
          variant: "destructive",
          title: "Lỗi validation",
          description: "Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.",
        })
        throw error
      }

      return submitData
    },
    onSuccess: async () => {
      if (onSuccess) {
        onSuccess()
      }
    },
  })

  if (!account?.id) {
    return null
  }

  // Parse structured address from JSON string
  const parseAddress = (address: string | null): Partial<AccountFormData> => {
    if (!address) return {}
    try {
      const parsed = typeof address === "string" ? JSON.parse(address) : address
      if (parsed && typeof parsed === "object" && parsed !== null) {
        return {
          addressStreet: parsed.address || null,
          addressWard: parsed.ward || null,
          addressDistrict: parsed.district || null,
          addressCity: parsed.city || null,
          addressPostalCode: parsed.postalCode || null,
        }
      }
    } catch {
      // Legacy support: keep as simple string
    }
    return {}
  }

  const accountForEdit: AccountFormData = {
    name: account.name,
    bio: account.bio,
    phone: account.phone,
    address: account.address,
    avatar: account.avatar,
    ...parseAddress(account.address),
  }

  const editFields = getAccountFields() as ResourceFormField<AccountFormData>[]
  const formSections = getAccountFormSections()

  return (
    <ResourceForm<AccountFormData>
      data={accountForEdit}
      fields={editFields}
      sections={formSections}
      onSubmit={handleSubmit}
      title="Chỉnh sửa thông tin tài khoản"
      description="Cập nhật thông tin cá nhân của bạn"
      submitLabel="Lưu thay đổi"
      cancelLabel="Hủy"
      backUrl={backUrl}
      backLabel={backLabel}
      variant={variant}
      open={open}
      onOpenChange={onOpenChange}
      onCancel={onCancel}
      showCard={variant === "page" ? false : true}
      className={variant === "page" ? "max-w-[100%]" : undefined}
    />
  )
}

