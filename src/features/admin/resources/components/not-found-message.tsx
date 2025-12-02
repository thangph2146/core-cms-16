interface NotFoundMessageProps {
  title?: string
  description?: string
  resourceName?: string
}

export function NotFoundMessage({
  title,
  description,
  resourceName = "dữ liệu",
}: NotFoundMessageProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4 md:p-6 lg:p-8">
      <div className="text-center">
        <h2 className="mb-2 text-2xl font-bold">
          {title || `Không tìm thấy ${resourceName}`}
        </h2>
        <p className="text-muted-foreground">
          {description || `${resourceName.charAt(0).toUpperCase() + resourceName.slice(1)} không tồn tại hoặc bạn không có quyền truy cập.`}
        </p>
      </div>
    </div>
  )
}

