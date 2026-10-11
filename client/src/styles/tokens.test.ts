import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const css = readFileSync(join(__dirname, "../app/globals.css"), "utf8")
const token = (name: string) => {
  const m = css.match(new RegExp(`--qadr-${name}:\\s*(#[0-9a-f]{6})`, "i"))
  if (!m) throw new Error(`missing token ${name}`)
  return m[1]
}

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

describe("design tokens", () => {
  it("match the SPEC §2 palette", () => {
    expect(token("forest")).toBe("#214e3d")
    expect(token("ivory")).toBe("#f7f5ef")
    expect(token("charcoal")).toBe("#252822")
    expect(token("sage")).toBe("#e6e9df")
    expect(token("ochre")).toBe("#d8a45b")
    expect(token("muted")).toBe("#72766f")
    expect(token("border")).toBe("#d8ddd3")
  })

  // Text/background pairs the UI actually uses must pass WCAG AA (4.5:1).
  const pairs: [string, string][] = [
    ["charcoal", "ivory"], ["charcoal", "white"], ["charcoal", "sage"],
    ["forest", "ivory"], ["forest", "white"], ["forest", "sage"],
    ["ivory", "forest"], ["ivory", "charcoal"], ["sage", "forest-deep"],
    ["muted-ink", "ivory"], ["muted-ink", "white"], ["muted-ink", "sage"],
    ["muted", "white"], ["ochre", "charcoal"], ["ochre", "forest-deep"],
  ]
  it.each(pairs)("%s on %s passes AA", (fg, bg) => {
    expect(contrast(token(fg), token(bg))).toBeGreaterThanOrEqual(4.5)
  })
})
