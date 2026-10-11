import { describe, expect, it } from "vitest"
import en from "./en.json"
import ru from "./ru.json"
import uz from "./uz.json"

type Tree = { [key: string]: string | Tree }

function flatten(tree: Tree, prefix = ""): Record<string, string> {
  return Object.entries(tree).reduce<Record<string, string>>((acc, [k, v]) => {
    const path = prefix ? `${prefix}.${k}` : k
    if (typeof v === "string") acc[path] = v
    else Object.assign(acc, flatten(v, path))
    return acc
  }, {})
}

const dictionaries = { uz, ru, en } as Record<string, Tree>
const flat = Object.fromEntries(
  Object.entries(dictionaries).map(([l, d]) => [l, flatten(d)]),
)
const domains = [
  "common", "navigation", "home", "explore", "listings", "borrowing",
  "messages", "dashboard", "auth", "notifications", "validation", "errors",
]

describe("message dictionaries", () => {
  it.each(Object.keys(dictionaries))("%s has every SPEC §4 domain", (locale) => {
    for (const d of domains) expect(dictionaries[locale]).toHaveProperty(d)
  })

  it.each(["ru", "en"])("%s has exactly the same keys as uz", (locale) => {
    expect(Object.keys(flat[locale]).sort()).toEqual(Object.keys(flat.uz).sort())
  })

  it.each(Object.keys(dictionaries))("%s has no empty strings", (locale) => {
    const empty = Object.entries(flat[locale]).filter(([, v]) => !v.trim())
    expect(empty).toEqual([])
  })

  it("Uzbek uses ʻ (U+02BB) in oʻ and gʻ, never an apostrophe or quote", () => {
    const bad = Object.entries(flat.uz).filter(([, v]) => /[oOgG]['‘’`]/.test(v))
    expect(bad).toEqual([])
  })
})
