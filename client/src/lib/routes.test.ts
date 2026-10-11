import { describe, expect, it } from "vitest"
import { isAppRoute, isAuthRoute, isPending } from "./routes"

describe("route families", () => {
  it("recognises auth and app surfaces", () => {
    expect(isAuthRoute("/verify")).toBe(true)
    expect(isAuthRoute("/verifying")).toBe(false)
    expect(isAppRoute("/messages/c1")).toBe(true)
    expect(isAppRoute("/explore")).toBe(false)
  })
  it("marks later-phase routes as pending (not prefetched)", () => {
    expect(isPending("/items/new")).toBe(true)
    expect(isPending("/categories/tools?x=1")).toBe(true)
    expect(isPending("/items/1")).toBe(false)
  })
})
