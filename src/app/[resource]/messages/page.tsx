import { redirect } from "next/navigation"

/**
 * Messages Index Page
 * Redirects to inbox by default
 */
export default async function MessagesPage({
  params,
}: {
  params: Promise<{ resource: string }>
}) {
  const { resource } = await params
  redirect(`/${resource}/messages/inbox`)
}

