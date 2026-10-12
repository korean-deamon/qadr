import { describe, expect, it } from "vitest"
import { isAppRoute, isAuthRoute, isConnectRoute, isGuestRoute, isProtectedRoute } from "./routes"

describe("route families", () => {
  it("recognises auth and app surfaces", () => {
    expect(isAuthRoute("/connect-telegram")).toBe(true)
    expect(isAuthRoute("/verify")).toBe(false) // email verification no longer exists (SPEC §11)
    expect(isAppRoute("/messages/c1")).toBe(true)
    expect(isAppRoute("/explore")).toBe(false)
  })
  it("protects owner-only listing pages but not the public item page", () => {
    expect(isProtectedRoute("/items/new")).toBe(true)
    expect(isProtectedRoute("/items/abc/edit")).toBe(true)
    expect(isProtectedRoute("/items/abc")).toBe(false)
    expect(isProtectedRoute("/users/abc")).toBe(false)
  })
  it("treats connect-telegram as the signed-in gate, not a guest page", () => {
    expect(isConnectRoute("/connect-telegram")).toBe(true)
    expect(isConnectRoute("/connect-telegrams")).toBe(false)
    expect(isGuestRoute("/connect-telegram")).toBe(false)
    expect(isProtectedRoute("/connect-telegram")).toBe(false)
  })
})
