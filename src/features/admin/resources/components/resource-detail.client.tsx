"use client"

import * as React from "react"
import { ArrowLeft } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldTitle,
} from "@/components/ui/field"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { type ResourceFormSection } from "./resource-form"
import { useResourceSegment } from "@/hooks/use-resource-segment"
import { applyResourceSegmentToPath } from "@/lib/permissions"
import { useResourceNavigation } from "../hooks"
import { logger } from "@/lib/config/logger"

export interface ResourceDetailField<T = unknown> {
  name: keyof T | string
  label: string
  description?: string
  render?: (value: unknown, data: T) => React.ReactNode
  format?: (value: unknown) => string
  type?: "text" | "date" | "boolean" | "number" | "custom"
  section?: string
}

export interface ResourceDetailSection<T = unknown> extends ResourceFormSection {
  fieldHeader?: React.ReactNode
  fieldFooter?: React.ReactNode
  fieldsContent?: (fields: ResourceDetailField<T>[], data: T) => React.ReactNode
}

export interface ResourceDetailClientProps<T extends Record<string, unknown>> {
  data: T | null
  isLoading?: boolean

  fields: ResourceDetailField<T>[] | {
    title?: string
    description?: string
    fields: ResourceDetailField<T>[]
  }

  // UI
  title?: string
  description?: string
  backUrl?: string
  backLabel?: string

  actions?: React.ReactNode

  sections?: Array<{
    title: string
    description?: string
    fields: ResourceDetailField<T>[]
  }>
  
  detailSections?: ResourceDetailSection<T>[]
  
  afterSections?: React.ReactNode
  
  onBack?: () => void | Promise<void>
}

export function ResourceDetailClient<T extends Record<string, unknown>>({
  data,
  isLoading = false,
  fields,
  title,
  description,
  backUrl,
  backLabel = "Quay lại",
  actions,
  sections,
  detailSections,
  afterSections,
  onBack,
}: ResourceDetailClientProps<T>) {
  const resourceSegment = useResourceSegment()
  const resolvedBackUrl = React.useMemo(
    () => (backUrl ? applyResourceSegmentToPath(backUrl, resourceSegment) : undefined),
    [backUrl, resourceSegment],
  )
  
  const { navigateBack } = useResourceNavigation()
  
  const handleBack = async () => {
    if (resolvedBackUrl) {
      logger.info("🔙 Back button clicked", {
        source: "detail-back-button",
        backUrl: resolvedBackUrl,
        currentPath: typeof window !== "undefined" ? window.location.pathname : undefined,
        hasOnBack: !!onBack,
      })
      await navigateBack(resolvedBackUrl, onBack)
    }
  }

  const allFields = React.useMemo(
    () => Array.isArray(fields) ? fields : fields.fields,
    [fields]
  )

  const groupFieldsBySection = React.useMemo(() => {
    const grouped: Record<string, ResourceDetailField<T>[]> = {}
    const ungrouped: ResourceDetailField<T>[] = []
    
    allFields.forEach((field) => {
      if (field.section) {
        grouped[field.section] ??= []
        grouped[field.section].push(field)
      } else {
        ungrouped.push(field)
      }
    })
    
    return { grouped, ungrouped }
  }, [allFields])

  const formatValue = React.useCallback((field: ResourceDetailField<T>, value: unknown): React.ReactNode => {
    if (field.render) return field.render(value, data!)
    if (value == null) return <span className="text-muted-foreground">—</span>
    if (field.format) return field.format(value)

    switch (field.type) {
      case "boolean": {
        const boolValue = Boolean(value)
        return (
          <span className={cn(
            "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium",
            boolValue 
              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" 
              : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
          )}>
            {boolValue ? "Có" : "Không"}
          </span>
        )
      }
      case "date":
        try {
          return new Date(value as string | number).toLocaleDateString("vi-VN", {
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
        return <span className="break-words break-all whitespace-pre-wrap">{String(value)}</span>
    }
  }, [data])

  const isComplexReactNode = (node: React.ReactNode): boolean => {
    if (!node) return false
    if (typeof node === "string" || typeof node === "number") return false
    if (React.isValidElement(node)) {
      const element = node as React.ReactElement<{ className?: string }>
      if (element.type === Card || 
          (typeof element.type === "string" && ["div", "section", "article"].includes(element.type))) {
        return true
      }
      const className = element.props?.className
      if (className && typeof className === "string") {
        const layoutClasses = ["flex", "grid", "card", "border", "p-", "gap-", "shadow"]
        return layoutClasses.some(lc => className.includes(lc))
      }
    }
    return false
  }

  const renderField = React.useCallback((field: ResourceDetailField<T>, inSection = false) => {
    const value = data?.[field.name as keyof T]
    const formattedValue = isLoading ? <Skeleton className="h-4 w-32" /> : formatValue(field, value)
    const isCustomRender = !!field.render
    const isComplexNode = isComplexReactNode(formattedValue)

    return (
      <Field orientation="vertical" className={cn("py-2.5", !inSection && "border-b border-border/50 last:border-0")}>
        <FieldTitle className="text-muted-foreground text-xs font-medium mb-1">{field.label}</FieldTitle>
        <FieldContent>
          {isCustomRender || isComplexNode ? (
            formattedValue
          ) : (
            <div className="text-sm break-words break-all whitespace-pre-wrap">
              {formattedValue}
            </div>
          )}
          {field.description && <FieldDescription className="text-xs mt-1">{field.description}</FieldDescription>}
        </FieldContent>
      </Field>
    )
  }, [data, isLoading, formatValue])

  const renderFields = React.useCallback((fieldsToRender: ResourceDetailField<T>[]) => {
    if (fieldsToRender.length === 0) return null
    
    return (
      <FieldGroup className="gap-0">
        {fieldsToRender.map((field) => (
          <React.Fragment key={String(field.name)}>
            {renderField(field, false)}
          </React.Fragment>
        ))}
      </FieldGroup>
    )
  }, [renderField])

  const getGridClasses = React.useCallback((fieldCount: number) => {
    if (fieldCount === 1) {
      return { gridClass: "grid-cols-1", gridResponsiveAttr: "true" as const }
    }
    if (fieldCount === 2) {
      return { gridClass: "grid-cols-1 sm:grid-cols-2", gridResponsiveAttr: "true" as const }
    }
    return { gridClass: "grid-cols-1 sm:grid-cols-2", gridResponsiveAttr: "auto-fit" as const }
  }, [])

  const renderSection = React.useCallback((sectionId: string, sectionFields: ResourceDetailField<T>[]) => {
    const sectionInfo = detailSections?.find((s) => s.id === sectionId)
    const { gridClass, gridResponsiveAttr } = getGridClasses(sectionFields.length)
    
    const fieldsContent = sectionInfo?.fieldsContent && data 
      ? sectionInfo.fieldsContent(sectionFields, data)
      : (
          <div className={cn("grid gap-6", gridClass)} data-grid-responsive={gridResponsiveAttr}>
            {sectionFields.map((field) => (
              <div key={String(field.name)} className="min-w-0">
                {renderField(field, true)}
              </div>
            ))}
          </div>
        )

    return (
      <Card key={sectionId} className="h-fit">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">
            {sectionInfo?.title || "Thông tin chi tiết"}
          </CardTitle>
          {sectionInfo?.description && (
            <CardDescription className="mt-0.5 text-xs">
              {sectionInfo.description}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="pt-0 pb-4">
          {sectionInfo?.fieldHeader && <div className="mb-6">{sectionInfo.fieldHeader}</div>}
          {fieldsContent}
          {sectionInfo?.fieldFooter && <div className="mt-6">{sectionInfo.fieldFooter}</div>}
        </CardContent>
      </Card>
    )
  }, [detailSections, data, getGridClasses, renderField])

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
                <Skeleton className="h-5 w-58" />
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
              {resolvedBackUrl && (
                <Button
                  variant="outline"
                  onClick={() => navigateBack(resolvedBackUrl, onBack)}
                  className="mt-4"
                >
                  <ArrowLeft className="mr-2 h-5 w-5" />
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
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 lg:p-8 mx-auto w-full max-w-[100%]">
      {(title || resolvedBackUrl || actions) && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-border/50">
          <div className="space-y-1.5 flex-1 min-w-0">
            {resolvedBackUrl && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="-ml-2"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                {backLabel}
              </Button>
            )}
            {title && <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{title}</h1>}
            {description && <p className="text-sm text-muted-foreground max-w-2xl">{description}</p>}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>
        </div>
      )}

      <div className="space-y-6">
        {(() => {
          const { grouped, ungrouped } = groupFieldsBySection
          const fieldsTitle = Array.isArray(fields) ? "Thông tin chi tiết" : (fields.title || "Thông tin chi tiết")
          const fieldsDesc = Array.isArray(fields) ? description : fields.description
          const detailSectionIds = new Set(detailSections?.map(s => s.id) || [])

          return (
            <>
              {/* Render sections từ detailSections - bao gồm cả sections có fieldsContent nhưng không có fields */}
              {detailSections?.map((section) => {
                const sectionFields = grouped[section.id] || []
                if (sectionFields.length > 0 || section.fieldsContent) {
                  return <React.Fragment key={section.id}>{renderSection(section.id, sectionFields)}</React.Fragment>
                }
                return null
              })}
              
              {/* Render sections từ grouped (legacy - cho backward compatibility) */}
              {Object.entries(grouped)
                .filter(([sectionId]) => !detailSectionIds.has(sectionId))
                .map(([sectionId, sectionFields]) => (
                  <React.Fragment key={sectionId}>{renderSection(sectionId, sectionFields)}</React.Fragment>
                ))}

              {ungrouped.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold">{fieldsTitle}</CardTitle>
                    {fieldsDesc && <CardDescription className="mt-0.5 text-xs">{fieldsDesc}</CardDescription>}
                  </CardHeader>
                  <CardContent className="pt-0 pb-4">
                    {ungrouped.length > 4 ? (() => {
                      const mid = Math.ceil(ungrouped.length / 2)
                      return (
                        <div className="grid gap-6 lg:grid-cols-2">
                          <div>{renderFields(ungrouped.slice(0, mid))}</div>
                          {ungrouped.slice(mid).length > 0 && <div>{renderFields(ungrouped.slice(mid))}</div>}
                        </div>
                      )
                    })() : renderFields(ungrouped)}
                  </CardContent>
                </Card>
              )}

              {sections && sections.length > 0 && (
                <div className="grid gap-6 lg:grid-cols-2">
                  {sections.map((section, i) => (
                    <Card key={i} className="h-fit">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base font-semibold">{section.title}</CardTitle>
                        {section.description && <CardDescription className="mt-0.5 text-xs">{section.description}</CardDescription>}
                      </CardHeader>
                      <CardContent className="pt-0 pb-4">{renderFields(section.fields)}</CardContent>
                    </Card>
                  ))}
                  {sections.length % 2 === 1 && <div />}
                </div>
              )}

              {afterSections && <div>{afterSections}</div>}
            </>
          )
        })()}
      </div>

    </div>
  )
}

