import { expect, test } from "@playwright/test"

test.describe("homepage", () => {
  test.describe("locale detection on /", () => {
    for (const [browserLocale, expected] of [
      ["uz-UZ", "uz"],
      ["ru-RU", "ru"],
      ["de-DE", "uz"], // unsupported language falls back to the Uzbek default
    ] as const) {
      test.describe(browserLocale, () => {
        test.use({ locale: browserLocale })
        test(`redirects to /${expected}`, async ({ page }) => {
          await page.goto("/")
          await expect(page).toHaveURL(new RegExp(`/${expected}$`))
          await expect(page.locator("html")).toHaveAttribute("lang", expected)
        })
      })
    }
  })

  for (const [locale, title] of [
    ["ru", "У каждой вещи своя ценность."],
    ["en", "Good things are worth sharing."],
  ] as const) {
    test(`renders in ${locale}`, async ({ page }) => {
      await page.goto(`/${locale}`)
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(title)
      await expect(page).toHaveTitle(/Qadr/)
    })
  }

  test("never shows raw translation keys", async ({ page }) => {
    for (const locale of ["uz", "ru", "en"]) {
      await page.goto(`/${locale}`)
      const text = await page.locator("body").innerText()
      expect(text).not.toMatch(/\b(home|common|navigation|listings|footer)\.[a-z]+/)
      expect(text).not.toContain("⚠")
    }
  })

  test("locale switcher keeps the page and changes language", async ({ page }) => {
    await page.goto("/uz")
    await page.getByRole("link", { name: "Русский" }).click()
    await expect(page).toHaveURL(/\/ru$/)
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("У каждой вещи своя ценность.")
  })

  test("search submits to explore with the query", async ({ page }) => {
    await page.goto("/en")
    await page.getByRole("searchbox", { name: "Search for an item" }).fill("drill")
    await page.getByRole("button", { name: "Search" }).click()
    await expect(page).toHaveURL(/\/en\/explore\?q=drill/)
  })

  test("display font renders the Uzbek ʻ (U+02BB)", async ({ page }) => {
    await page.goto("/uz")
    const ok = await page.evaluate(async () => {
      await document.fonts.ready
      const family = getComputedStyle(document.querySelector("h1")!).fontFamily.split(",")[0]
      return document.fonts.check(`500 48px ${family}`, "oʻgʻ")
    })
    expect(ok).toBe(true)
  })

  test("has no horizontal overflow and no console errors", async ({ page }) => {
    const errors: string[] = []
    page.on("pageerror", (e) => errors.push(e.message))
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()))
    await page.goto("/uz", { waitUntil: "networkidle" })
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
    expect(overflow).toBeLessThanOrEqual(0)
    expect(errors).toEqual([])
  })
})

test.describe("mobile bottom navigation", () => {
  test.skip(({ isMobile }) => !isMobile, "mobile only")

  test("is fixed, visible after scrolling, and never covers the footer", async ({ page }) => {
    await page.goto("/uz")
    const nav = page.getByRole("navigation", { name: "Ilova menyusi" })
    await expect(nav).toBeVisible()
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
    await page.waitForTimeout(400)
    await expect(nav).toBeInViewport()
    const navTop = (await nav.boundingBox())!.y
    const lastLine = await page.locator("footer > div").last().boundingBox()
    expect(lastLine!.y + lastLine!.height).toBeLessThanOrEqual(navTop + 1)
  })
})

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" })

  test("disables Lenis and shows content without scroll reveals", async ({ page }) => {
    await page.goto("/en")
    await expect(page.locator("html")).not.toHaveClass(/lenis/)
    const cta = page.getByRole("heading", { name: /drill in your cupboard/ })
    await expect(cta).toBeVisible()
    expect(await cta.evaluate((el) => getComputedStyle(el.closest("section")!.querySelector("div div")!).opacity)).toBe("1")
  })
})
