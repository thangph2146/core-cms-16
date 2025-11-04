"use client"

import { useState } from "react"
import { Edit, ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { ResourceForm, type ResourceFormField } from "./resource-form"

export interface ResourceDetailField<T = unknown> {
  name: keyof T | string
  label: string
  description?: string
  render?: (value: unknown, data: T) => React.ReactNode
  format?: (value: unknown) => string
  type?: "text" | "date" | "boolean" | "number" | "custom"
}

export interface ResourceDetailPageProps<T extends Record<string, unknown>> {
  // Data
  data: T | null
  isLoading?: boolean
  
  // Fields config
  fields: ResourceDetailField<T>[]
  
  // Edit form config (optional)
  editFields?: ResourceFormField<T>[]
  onEditSubmit?: (data: Partial<T>) => Promise<{ success: boolean; error?: string }>
  
  // UI
  title?: string
  description?: string
  backUrl?: string
  backLabel?: string
  editLabel?: string
  
  // Actions
  actions?: React.ReactNode
  
  // Custom sections
  sections?: Array<{
    title: string
    description?: string
    fields: ResourceDetailField<T>[]
  }>
}

export function ResourceDetailPage<T extends Record<string, unknown>>({
  data,
  isLoading = false,
  fields,
  editFields,
  onEditSubmit,
  title,
  description,
  backUrl,
  backLabel = "Quay lại",
  editLabel = "Chỉnh sửa",
  actions,
  sections,
}: ResourceDetailPageProps<T>) {
  const router = useRouter()
  const [isEditOpen, setIsEditOpen] = useState(false)

  const formatValue = (field: ResourceDetailField<T>, value: unknown): React.ReactNode => {
    if (field.render) {
      return field.render(value, data!)
    }

    if (value === null || value === undefined) {
      return <span className="text-muted-foreground">—</span>
    }

    if (field.format) {
      return field.format(value)
    }

    switch (field.type) {
      case "boolean":
        return (
          <span className={cn("inline-flex items-center rounded-full px-2 py-1 text-xs font-medium", 
            value ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
          )}>
            {value ? "Có" : "Không"}
          </span>
        )
      
      case "date":
        try {
          const date = new Date(value as string | number)
          return date.toLocaleDateString("vi-VN", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        } catch {
          return String(value)
        }
      
      case "number":
        return typeof value === "number" ? value.toLocaleString("vi-VN") : String(value)
      
      default:
        // Wrap long text content
        const stringValue = String(value)
        return (
          <span className="break-words break-all whitespace-pre-wrap">
            {stringValue}
          </span>
        )
    }
  }

  const renderFields = (fieldsToRender: ResourceDetailField<T>[]) => {
    if (fieldsToRender.length === 0) return null
    
    return (
      <FieldGroup className="gap-0">
        {fieldsToRender.map((field) => {
          const value = data?.[field.name as keyof T]
          return (
            <Field 
              key={field.name as string} 
              orientation="responsive"
              className="py-4 border-b border-border/50 last:border-0 @md/field-group:items-start"
            >
              <FieldLabel className="w-[140px] sm:w-[180px] text-sm font-semibold text-muted-foreground flex-shrink-0 self-start pt-0.5">
                {field.label}
              </FieldLabel>
              <FieldContent className="flex-1 min-w-0 self-start">
                <div className="text-sm font-medium break-words break-all whitespace-pre-wrap min-h-[1.5rem]">
                  {isLoading ? (
                    <Skeleton className="h-5 w-32" />
                  ) : (
                    formatValue(field, value)
                  )}
                </div>
                {field.description && (
                  <FieldDescription className="mt-1.5 break-words">{field.description}</FieldDescription>
                )}
              </FieldContent>
            </Field>
          )
        })}
      </FieldGroup>
    )
  }

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 lg:p-8">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-48" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4 md:p-6 lg:p-8">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-muted-foreground">Không tìm thấy dữ liệu</p>
              {backUrl && (
                <Button
                  variant="outline"
                  onClick={() => router.push(backUrl)}
                  className="mt-4"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {backLabel}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      {(title || backUrl || (editFields && onEditSubmit) || actions) && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-border/50">
          <div className="space-y-1.5 flex-1 min-w-0">
            {backUrl && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push(backUrl)}
                className="-ml-2"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                {backLabel}
              </Button>
            )}
            {title && (
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{title}</h1>
            )}
            {description && (
              <p className="text-sm text-muted-foreground max-w-2xl">{description}</p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {editFields && onEditSubmit && (
              <Button
                variant="outline"
                onClick={() => setIsEditOpen(true)}
                className="shadow-sm"
              >
                <Edit className="mr-2 h-4 w-4" />
                {editLabel}
              </Button>
            )}
            {actions}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Default Section - Full width if exists */}
        {fields.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold">Thông tin chi tiết</CardTitle>
              {description && (
                <CardDescription className="mt-1">{description}</CardDescription>
              )}
            </CardHeader>
            <CardContent className="pt-0">
              {renderFields(fields)}
            </CardContent>
          </Card>
        )}

        {/* Custom Sections - Split into 2 columns on large screens */}
        {sections && sections.length > 0 && (
          <>
            {sections.map((section, index) => (
              <Card key={index} className="h-fit">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-semibold">{section.title}</CardTitle>
                  {section.description && (
                    <CardDescription className="mt-1">{section.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="pt-0">
                  {renderFields(section.fields)}
                </CardContent>
              </Card>
            ))}
            {/* If odd number of sections, add empty div to maintain grid balance */}
            {sections.length % 2 === 1 && <div />}
          </>
        )}
      </div>

      {/* Edit Form */}
      {editFields && onEditSubmit && (
        <ResourceForm<T>
          data={data}
          fields={editFields}
          onSubmit={onEditSubmit}
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
          variant="dialog"
          title={`${editLabel} ${title || ""}`.trim()}
          showCard={false}
        />
      )}
    </div>
  )
}

