import { expect, test, type APIRequestContext, type Page } from "@playwright/test"

/** A seeded listing by title (ids are random per seed). */
async function listingId(request: APIRequestContext, q: string): Promise<string> {
  const res = await request.get(`/api/v1/listings?q=${encodeURIComponent(q)}`)
  const body = (await res.json()) as { items: { id: string }[] }
  return body.items[0].id
}

/** Navigate and wait until React has hydrated, so clicks have handlers. */
async function open(page: Page, url: string) {
  await page.goto(url)
  await page.locator("html[data-hydrated]").waitFor({ state: "attached" })
}

const ROUTES = [
  ["/uz/explore", "Yaqindan toping"],
  ["/uz/login", "Qaytganingizdan xursandmiz"],
  ["/uz/register", "Qoʻshnilaringizga qoʻshiling"],
  ["/uz/verify?email=someone@test.uz", "Emailingizni tekshiring"],
  ["/uz/forgot-password", "Parolni tiklash"],
  ["/uz/reset-password", "Yangi parol oʻylab toping"],
] as const

test.describe("signed-in pages render", () => {
  test.use({ storageState: "e2e/.auth/demo.json" })
  for (const [route, text] of [
    ["/uz/dashboard", "Dilnoza"],
    ["/uz/messages", "Xabarlar"],
    ["/uz/settings", "Sozlamalar"],
    ["/uz/requests", "Soʻrovlar"],
    ["/uz/borrowings", "Ijaralar"],
    ["/uz/saved", "Saqlanganlar"],
    ["/uz/notifications", "Bildirishnomalar"],
    ["/uz/my-items", "Mening buyumlarim"],
    ["/uz/items/new", "Buyum qoʻshish"],
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

test("the item page shows real data", async ({ page, request }) => {
  await open(page, `/uz/items/${await listingId(request, "Naturehike")}`)
  await expect(page.getByRole("heading", { level: 1 })).toContainText("4 kishilik chodir, Naturehike")
  await expect(page.getByText("Sardor Rahimov").first()).toBeVisible()
})

test("visitors who save are sent to log in", async ({ page }) => {
  await open(page, "/en/explore")
  await page.getByRole("button", { name: "Save" }).first().click()
  await expect(page).toHaveURL(/\/en\/login\?next=/)
})

test("saving an item animates and shows an undoable toast", async ({ browser }) => {
  const context = await browser.newContext({ storageState: "e2e/.auth/demo.json" })
  const page = await context.newPage()
  await open(page, "/en/explore?q=kayak")
  const save = page.getByRole("button", { name: "Save" }).first()
  await save.click()
  await expect(page.getByRole("button", { name: "Saved" }).first()).toHaveAttribute("aria-pressed", "true")
  await expect(page.getByText("Saved to your list")).toBeVisible()
  await page.getByRole("button", { name: "Undo" }).click()
  await expect(page.getByRole("button", { name: "Saved" })).toHaveCount(0)
  await context.close()
})

test("explore search and empty state", async ({ page }) => {
  await open(page, "/en/explore?q=tent")
  await expect(page.getByText("Results for “tent”")).toBeVisible()
  await page.goto("/en/explore?q=zzzz")
  await expect(page.getByRole("heading", { name: "Nothing matches “zzzz” yet" })).toBeVisible()
})

test("item page: the request needs dates and terms", async ({ browser, request }) => {
  const context = await browser.newContext({ storageState: "e2e/.auth/demo.json" })
  const page = await context.newPage()
  await open(page, `/en/items/${await listingId(request, "Yamaha")}`)
  await page.getByRole("button", { name: "Send request" }).click()
  await expect(page.locator("#request [role=alert]")).toHaveText("Choose start and end dates")
  await context.close()
})

test("an owner declines an incoming request from the requests page", async ({ browser, request }) => {
  test.skip(test.info().project.name !== "desktop", "one run is enough: it changes data")
  // Timur asks for the mixer on a random far-off day (no clash with seeded loans)
  const borrower = await browser.newContext()
  const login = await borrower.request.post("/api/v1/auth/login", { data: { email: "timur@qadr.uz", password: "Demo12345!" } })
  expect(login.ok()).toBeTruthy()
  const csrf = (await borrower.cookies()).find((c) => c.name === "qadr_csrf")!.value
  const day = new Date(Date.now() + (40 + Math.floor(Math.random() * 45)) * 86_400_000).toISOString().slice(0, 10)
  const id = await listingId(request, "Planetar")
  const res = await borrower.request.post(`/api/v1/listings/${id}/requests`, {
    data: { start_date: day, end_date: day, message: "E2E request", accept_terms: true },
    headers: { "x-csrf-token": csrf },
  })
  expect(res.status(), await res.text()).toBe(201)
  const reqId = ((await res.json()) as { id: string }).id
  await borrower.close()

  const owner = await browser.newContext({ storageState: "e2e/.auth/demo.json" })
  const page = await owner.newPage()
  await open(page, "/en/requests")
  const card = page.locator("li", { hasText: "E2E request" }).first()
  await card.getByRole("button", { name: "Decline" }).click()
  await expect(page.getByText("Request declined")).toBeVisible()
  const check = await owner.request.get(`/api/v1/requests/${reqId}`)
  expect(((await check.json()) as { status: string }).status).toBe("rejected")
  await owner.close()
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
