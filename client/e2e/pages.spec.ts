import { expect, test, type Page } from "@playwright/test"

/** Navigate and wait until React has hydrated, so clicks have handlers. */
async function open(page: Page, url: string) {
  await page.goto(url)
  await page.locator("html[data-hydrated]").waitFor({ state: "attached" })
}

const ROUTES = [
  ["/uz/explore", "Yaqindan toping"],
  ["/uz/items/1", "4 kishilik chodir, Naturehike"],
  ["/uz/login", "Qaytganingizdan xursandmiz"],
  ["/uz/register", "Qoʻshnilaringizga qoʻshiling"],
  ["/uz/verify?email=someone@test.uz", "Emailingizni tekshiring"],
  ["/uz/forgot-password", "Parolni tiklash"],
  ["/uz/reset-password", "Yangi parol oʻylab toping"],
] as const

test.describe("signed-in pages render", () => {
  test.use({ storageState: "e2e/.auth/demo.json" })
  for (const [route, text] of [
    ["/uz/dashboard", "Xayrli tong, Dilnoza"],
    ["/uz/messages", "Xabarlar"],
    ["/uz/settings", "Sozlamalar"],
  ] as const) {
    test(route, async ({ page }) => {
      const errors: string[] = []
      page.on("pageerror", (e) => errors.push(e.message))
      await page.goto(route)
      await expect(page.getByText(text, { exact: false }).filter({ visible: true }).first()).toBeVisible()
      expect(errors).toEqual([])
    })
  }
})

test.describe("every main page renders", () => {
  for (const [route, text] of ROUTES) {
    test(route, async ({ page }) => {
      const errors: string[] = []
      page.on("pageerror", (e) => errors.push(e.message))
      await page.goto(route)
      await expect(page.getByText(text, { exact: false }).filter({ visible: true }).first()).toBeVisible()
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
      expect(overflow).toBeLessThanOrEqual(0)
      expect(errors).toEqual([])
    })
  }
})

test("saving an item animates and shows an undoable toast", async ({ page }) => {
  await open(page, "/en/explore")
  const save = page.getByRole("button", { name: "Save" }).first()
  await save.click()
  await expect(page.getByRole("button", { name: "Saved" }).first()).toHaveAttribute("aria-pressed", "true")
  await expect(page.getByText("Saved to your list")).toBeVisible()
  await page.getByRole("button", { name: "Undo" }).click()
  await expect(page.getByRole("button", { name: "Saved" })).toHaveCount(0)
})

test("explore search and empty state", async ({ page }) => {
  await open(page, "/en/explore?q=tent")
  await expect(page.getByText("Results for “tent”")).toBeVisible()
  await page.goto("/en/explore?q=zzzz")
  await expect(page.getByRole("heading", { name: "Nothing matches “zzzz” yet" })).toBeVisible()
})

test("item page: gallery switches photos and the request needs dates and terms", async ({ page }) => {
  await open(page, "/en/items/1")
  await page.getByRole("button", { name: "Photo 2 of 3" }).click()
  await expect(page.getByRole("button", { name: "Photo 2 of 3" })).toHaveAttribute("aria-pressed", "true")
  await page.getByRole("button", { name: "Send request" }).click()
  await expect(page.locator("#request [role=alert]")).toHaveText("Choose start and end dates")
})

test("verify: a wrong code shows the API's localized error", async ({ page }) => {
  await open(page, "/uz/verify?email=nobody-e2e@test.uz")
  await page.getByRole("textbox", { name: "1-raqam" }).click()
  await page.keyboard.type("123456")
  await page.getByRole("button", { name: "Tasdiqlash" }).click()
  await expect(page.locator("#otp-error")).toContainText("Kod notoʻgʻri. Qayta urinib koʻring.")
})

test("register validates fields with localized messages", async ({ page }) => {
  await open(page, "/ru/register")
  await page.getByRole("button", { name: "Создать аккаунт" }).click()
  await expect(page.getByText("Введите не менее 2 символов")).toBeVisible()
  await expect(page.getByText("Заполните это поле")).toBeVisible()
})

test.describe("mobile only", () => {
  test.skip(({ isMobile }) => !isMobile, "mobile only")

  test("filters open in a bottom sheet", async ({ page }) => {
    await open(page, "/en/explore")
    await page.getByRole("button", { name: "Filters" }).click()
    await expect(page.getByRole("dialog", { name: "Filters" })).toBeVisible()
  })

  test("how it works is a stacked list, not pinned", async ({ page }) => {
    await page.goto("/en")
    await expect(page.locator("#how-it-works .h-\\[330vh\\]")).toHaveCount(0)
  })
})

test.describe("desktop only", () => {
  test.skip(({ isMobile }) => !!isMobile, "desktop only")

  test("how it works pins and scrubs through the steps", async ({ page }) => {
    await open(page, "/en")
    const story = page.locator("#how-it-works .h-\\[330vh\\]")
    await expect(story).toHaveCount(1)
    await story.evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY + el.getBoundingClientRect().height * 0.8))
    await expect(page.locator('#how-it-works li[aria-current="step"]')).toContainText("Pick up and return")
  })
})
