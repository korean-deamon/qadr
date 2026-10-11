import { describe, expect, it } from "vitest"
import { cn } from "./utils"

describe("cn", () => {
  it("keeps custom size and colour utilities together", () => {
    expect(cn("text-display text-forest")).toBe("text-display text-forest")
  })
  it("merges conflicting custom sizes", () => {
    expect(cn("text-body", "text-lead")).toBe("text-lead")
  })
  it("treats custom shadows as shadow size", () => {
    expect(cn("shadow-soft", "shadow-lift")).toBe("shadow-lift")
  })
})
