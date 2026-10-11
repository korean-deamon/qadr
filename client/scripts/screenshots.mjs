// Design verification (SPEC §3): full-page screenshots at 1440px and 390px.
// Usage: node scripts/screenshots.mjs <baseUrl> <outDir> [path ...]
import { chromium } from "@playwright/test"
import { mkdir } from "node:fs/promises"

const [base = "http://localhost:3000", out = "screenshots", ...paths] = process.argv.slice(2)
const routes = paths.length ? paths : ["/uz"]
const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
]

await mkdir(out, { recursive: true })
const browser = await chromium.launch()
const problems = []
for (const vp of viewports) {
  const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: vp.isMobile, hasTouch: vp.hasTouch, deviceScaleFactor: vp.deviceScaleFactor ?? 1 })
  const page = await context.newPage()
  page.on("console", (m) => m.type() === "error" && problems.push(`[${vp.name}] console: ${m.text()}`))
  page.on("pageerror", (e) => problems.push(`[${vp.name}] pageerror: ${e.message}`))
  for (const route of routes) {
    await page.goto(base + route, { waitUntil: "networkidle" })
    await page.evaluate(() => document.fonts.ready)
    await page.waitForTimeout(Number(process.env.SETTLE_MS ?? 1600))
    const name = route.replace(/\//g, "_").replace(/^_/, "") || "root"
    await page.screenshot({ path: `${out}/${name}-${vp.name}-fold.png` })
    // Walk the page so scroll-reveal content is in its final state.
    // Walk the page so scroll-reveal content reaches its final state.
    for (let y = 0; ; y += vp.height * 0.6) {
      const max = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight)
      await page.evaluate((top) => window.scrollTo(0, top), Math.min(y, max))
      await page.waitForTimeout(150)
      if (y >= max) break
    }
    await page.waitForTimeout(1200)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    if (overflow > 0) problems.push(`[${vp.name}] ${route}: horizontal overflow ${overflow}px`)
    // Clipped overflow: visible text that ends past the right edge of the viewport
    const clipped = await page.evaluate(() => {
      const out = []
      for (const el of document.querySelectorAll("main p, main h1, main h2, main h3, main a, main button, main span")) {
        const r = el.getBoundingClientRect()
        if (!el.childElementCount && el.textContent.trim() && r.width && r.right > innerWidth + 2 && getComputedStyle(el).visibility !== "hidden") {
          const scroller = el.closest("[data-lenis-prevent-horizontal], ul.overflow-x-auto, .overflow-x-auto")
          if (!scroller) out.push(el.textContent.trim().slice(0, 40))
        }
      }
      return out.slice(0, 5)
    })
    if (clipped.length) problems.push(`[${vp.name}] ${route}: content past right edge: ${clipped.join(" | ")}`)
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.waitForTimeout(800)
    await page.screenshot({ path: `${out}/${name}-${vp.name}-full.png`, fullPage: true })
  }
  await context.close()
}
await browser.close()
console.log(problems.length ? problems.join("\n") : "no console errors, no horizontal overflow")
