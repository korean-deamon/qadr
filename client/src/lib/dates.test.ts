import { describe, expect, it } from "vitest"
import { parseDay, toDay, todayTashkent } from "./dates"

describe("dates", () => {
  it("round-trips calendar days without timezone drift", () => {
    expect(toDay(parseDay("2026-10-31"))).toBe("2026-10-31")
    expect(parseDay("2026-01-05T00:00:00Z").getDate()).toBe(5)
  })
  it("uses the Tashkent calendar day", () => {
    // 20:30 UTC is already the next day in Tashkent (UTC+5)
    expect(todayTashkent(new Date("2026-10-12T20:30:00Z"))).toBe("2026-10-13")
  })
})
