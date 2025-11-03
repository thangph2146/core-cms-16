import { AdminHeader } from "@/components/headers"

export default function Page() {
  return (
    <>
      <AdminHeader
        breadcrumbs={[
          {
            label: "Dashboard",
            isActive: true,
          },
        ]}
      />
      <div className="flex flex-1 flex-col gap-4 p-4 max-w[100nw]">
        <div className="grid auto-rows-min gap-4 md:grid-cols-3">
          <div className="bg-muted/50 aspect-video rounded-xl" />
          <div className="bg-muted/50 aspect-video rounded-xl" />
          <div className="bg-muted/50 aspect-video rounded-xl" />
        </div>
        <div className="bg-muted/50 min-h-[600px] flex-1 rounded-xl" />
      </div>
    </>
  )
}
