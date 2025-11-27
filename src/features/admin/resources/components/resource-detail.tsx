import { Suspense } from "react"
import { ResourceDetailClient } from "./resource-detail.client"
import type { ResourceDetailClientProps } from "./resource-detail.client"
import { ResourceDetailSkeleton } from "@/components/layouts/skeletons"

export type ResourceDetailProps<T extends Record<string, unknown>> = ResourceDetailClientProps<T>

export function ResourceDetail<T extends Record<string, unknown>>({
  fields,
  sections,
  title,
  ...props
}: ResourceDetailProps<T>) {
  return (
    <ResourceDetailClient
      fields={fields}
      sections={sections}
      title={title}
      {...props}
    />
  )
}

export interface ResourceDetailAsyncProps<T extends Record<string, unknown>> 
  extends Omit<ResourceDetailProps<T>, "data" | "isLoading"> {
  dataLoader: () => Promise<T | null>
  fields: ResourceDetailClientProps<T>["fields"]
  sections?: ResourceDetailClientProps<T>["sections"]
  title?: string
}

export async function ResourceDetailAsync<T extends Record<string, unknown>>({
  dataLoader,
  fields,
  sections,
  title,
  ...props
}: ResourceDetailAsyncProps<T>) {
  const defaultFields = Array.isArray(fields) ? fields : fields.fields
  const fieldCount = defaultFields.length
  const sectionCount = sections ? sections.length + 1 : 1

  return (
    <Suspense
      fallback={
        <ResourceDetailSkeleton
          showHeader={!!title}
          fieldCount={fieldCount}
          sectionCount={sectionCount}
        />
      }
    >
      <ResourceDetailAsyncContent
        dataLoader={dataLoader}
        fields={fields}
        sections={sections}
        title={title}
        {...props}
      />
    </Suspense>
  )
}

async function ResourceDetailAsyncContent<T extends Record<string, unknown>>({
  dataLoader,
  fields,
  sections,
  title,
  ...props
}: ResourceDetailAsyncProps<T>) {
  const data = await dataLoader()

  return (
    <ResourceDetail
      data={data}
      fields={fields}
      sections={sections}
      title={title}
      {...props}
    />
  )
}

export function ResourceDetailWithSuspense<T extends Record<string, unknown>>({
  fields,
  sections,
  title,
  ...props
}: ResourceDetailProps<T>) {
  const defaultFields = Array.isArray(fields) ? fields : fields.fields
  const fieldCount = defaultFields.length
  const sectionCount = sections ? sections.length + 1 : 1

  return (
    <Suspense
      fallback={
        <ResourceDetailSkeleton
          showHeader={!!title}
          fieldCount={fieldCount}
          sectionCount={sectionCount}
        />
      }
    >
      <ResourceDetail
        fields={fields}
        sections={sections}
        title={title}
        {...props}
      />
    </Suspense>
  )
}

