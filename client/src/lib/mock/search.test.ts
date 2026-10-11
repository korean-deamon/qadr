import { describe, expect, it } from "vitest"
import { parseSearchParams, searchListings } from "./search"

describe("mock search", () => {
  it("matches Uzbek text regardless of the ʻ character", () => {
    expect(searchListings({ q: "togʻ" }).length).toBe(searchListings({ q: "tog'" }).length)
    expect(searchListings({ q: "chodir" }).map((l) => l.id)).toContain("1")
  })
  it("filters by category and distance and sorts nearest first", () => {
    const res = searchListings({ category: "sports", km: 5 })
    expect(res.every((l) => l.category === "sports" && l.km <= 5)).toBe(true)
    expect(res.map((l) => l.km)).toEqual([...res.map((l) => l.km)].sort((a, b) => a - b))
  })
  it("rejects unknown query values", () => {
    expect(parseSearchParams({ category: "weapons", sort: "price", km: "999", condition: "new,broken" })).toEqual({
      q: undefined, category: undefined, sort: undefined, km: undefined, condition: ["new"],
    })
  })
})
