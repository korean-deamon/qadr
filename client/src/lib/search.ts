/** Explore query-string parsing (validated before it reaches the API). */

export type SortKey = "nearest" | "newest" | "rating"
export type Condition = "new" | "good" | "used"
export type SearchParams = {
  q?: string
  area?: string
  category?: string
  sort?: SortKey
  km?: number
  condition?: Condition[]
  available?: boolean
  page?: number
}

const SORTS: SortKey[] = ["nearest", "newest", "rating"]
const CONDITIONS: Condition[] = ["new", "good", "used"]

export function parseSearchParams(raw: Record<string, string | string[] | undefined>): SearchParams {
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)
  const many = (v: string | string[] | undefined) => (Array.isArray(v) ? v.flatMap((x) => x.split(",")) : v ? v.split(",") : [])
  const sort = one(raw.sort) as SortKey | undefined
  const km = Number(one(raw.km))
  const page = Number(one(raw.page))
  const category = one(raw.category)
  return {
    q: one(raw.q)?.trim().slice(0, 100) || undefined,
    area: one(raw.area)?.trim().slice(0, 80) || undefined,
    category: category && /^[a-z0-9-]{2,40}$/.test(category) ? category : undefined,
    sort: sort && SORTS.includes(sort) ? sort : undefined,
    km: [1, 3, 5, 10].includes(km) ? km : undefined,
    condition: many(raw.condition).filter((c): c is Condition => CONDITIONS.includes(c as Condition)),
    available: one(raw.available) === "1" || undefined,
    page: Number.isInteger(page) && page > 1 && page <= 500 ? page : undefined,
  }
}

/** Query object for links, dropping empty values. */
export function toQuery(p: SearchParams): Record<string, string> {
  const out: Record<string, string> = {}
  if (p.q) out.q = p.q
  if (p.area) out.area = p.area
  if (p.category) out.category = p.category
  if (p.sort) out.sort = p.sort
  if (p.km) out.km = String(p.km)
  if (p.condition?.length) out.condition = p.condition.join(",")
  if (p.available) out.available = "1"
  if (p.page) out.page = String(p.page)
  return out
}

/** API query string for GET /listings. */
export function toApiQuery(p: SearchParams, loc: { lat: number; lng: number } | null, pageSize = 24): string {
  const q = new URLSearchParams()
  if (p.q) q.set("q", p.q)
  if (p.area) q.set("area", p.area)
  if (p.category) q.set("category", p.category)
  for (const c of p.condition ?? []) q.append("condition", c)
  if (p.available) q.set("available", "true")
  const sort = p.sort ?? (loc ? "nearest" : "newest")
  q.set("sort", sort === "nearest" && !loc ? "newest" : sort)
  if (loc) {
    q.set("lat", String(loc.lat))
    q.set("lng", String(loc.lng))
    if (p.km) q.set("km", String(p.km))
  }
  q.set("page", String(p.page ?? 1))
  q.set("page_size", String(pageSize))
  return q.toString()
}
