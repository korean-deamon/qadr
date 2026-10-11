import { describe, expect, it } from "vitest"
import { parseSearchParams, toApiQuery, toQuery } from "./search"

describe("explore query parsing", () => {
  it("rejects unknown values", () => {
    expect(parseSearchParams({ category: "Weapons!", sort: "price", km: "999", condition: "new,broken", page: "-3" })).toEqual({
      q: undefined, area: undefined, category: undefined, sort: undefined, km: undefined, condition: ["new"], available: undefined, page: undefined,
    })
  })
  it("never sends distance filters without a location", () => {
    const p = parseSearchParams({ km: "3", sort: "nearest", q: "chodir" })
    const api = new URLSearchParams(toApiQuery(p, null))
    expect(api.get("km")).toBeNull()
    expect(api.get("lat")).toBeNull()
    expect(api.get("sort")).toBe("newest")
    const located = new URLSearchParams(toApiQuery(p, { lat: 41.3, lng: 69.2 }))
    expect(located.get("km")).toBe("3")
    expect(located.get("sort")).toBe("nearest")
  })
  it("round-trips to link queries", () => {
    expect(toQuery(parseSearchParams({ q: " tent ", condition: ["good", "new"], available: "1" }))).toEqual({ q: "tent", condition: "good,new", available: "1" })
  })
})
