import { describe, expect, it } from "vitest"
import { isAppRoute, isAuthRoute, isProtectedRoute } from "./routes"

describe("route families", () => {
  it("recognises auth and app surfaces", () => {
    expect(isAuthRoute("/verify")).toBe(true)
    expect(isAuthRoute("/verifying")).toBe(false)
    expect(isAppRoute("/messages/c1")).toBe(true)
    expect(isAppRoute("/explore")).toBe(false)
  })
  it("protects owner-only listing pages but not the public item page", () => {
    expect(isProtectedRoute("/items/new")).toBe(true)
    expect(isProtectedRoute("/items/abc/edit")).toBe(true)
    expect(isProtectedRoute("/items/abc")).toBe(false)
    expect(isProtectedRoute("/users/abc")).toBe(false)
  })
})
