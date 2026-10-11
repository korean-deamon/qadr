import "server-only"

import { notFound } from "next/navigation"
import { getMe } from "@/lib/api/server"

/**
 * Pages render in parallel with their layout, so each admin page checks too:
 * non-admins get the 404 without the page ever calling the admin API.
 */
export async function requireAdmin() {
  const me = await getMe()
  if (!me?.is_admin) notFound()
  return me
}
