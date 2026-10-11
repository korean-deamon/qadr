import { listings, ownerOf, type CategoryKey, type Condition, type Listing } from "./index"

export type SortKey = "nearest" | "newest" | "rating"
export type SearchParams = {
  q?: string
  category?: CategoryKey
  sort?: SortKey
  km?: number
  condition?: Condition[]
}

const norm = (s: string) => s.toLocaleLowerCase().normalize("NFKD").replace(/[ʻʼ'‘’`]/g, "")

/** In-memory stand-in for GET /listings (Phase 3). */
export function searchListings({ q, category, sort = "nearest", km, condition }: SearchParams): Listing[] {
  const needle = q ? norm(q.trim()) : ""
  const out = listings.filter(
    (l) =>
      (!category || l.category === category) &&
      (!km || l.km <= km) &&
      (!condition?.length || condition.includes(l.condition)) &&
      (!needle || norm(`${l.title} ${l.description} ${l.area}`).includes(needle)),
  )
  const by: Record<SortKey, (a: Listing, b: Listing) => number> = {
    nearest: (a, b) => a.km - b.km,
    newest: (a, b) => a.listedDaysAgo - b.listedDaysAgo,
    rating: (a, b) => ownerOf(b).rating - ownerOf(a).rating,
  }
  return out.sort(by[sort])
}

const CATEGORY_KEYS: CategoryKey[] = ["tools", "books", "camping", "photo", "kitchen", "sports", "music", "kids"]
const SORTS: SortKey[] = ["nearest", "newest", "rating"]
const CONDITIONS: Condition[] = ["new", "good", "used"]

/** Parse untrusted query-string values into SearchParams. */
export function parseSearchParams(raw: Record<string, string | string[] | undefined>): SearchParams {
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)
  const many = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? v.split(",") : [])
  const category = one(raw.category) as CategoryKey | undefined
  const sort = one(raw.sort) as SortKey | undefined
  const km = Number(one(raw.km))
  return {
    q: one(raw.q)?.slice(0, 100) || undefined,
    category: category && CATEGORY_KEYS.includes(category) ? category : undefined,
    sort: sort && SORTS.includes(sort) ? sort : undefined,
    km: [1, 3, 5, 10].includes(km) ? km : undefined,
    condition: many(raw.condition).filter((c): c is Condition => CONDITIONS.includes(c as Condition)),
  }
}
