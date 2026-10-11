import { expect, test } from "@playwright/test"

test.describe("route protection (SPEC §11.1)", () => {
  test("guest is sent to login and back after signing in", async ({ page }) => {
    await page.goto("/en/settings")
    await expect(page).toHaveURL(/\/en\/login\?next=%2Fen%2Fsettings/)
    await page.locator("html[data-hydrated]").waitFor({ state: "attached" })
    await page.getByLabel("Email").fill("demo@qadr.uz")
    await page.getByLabel("Password", { exact: true }).fill("Demo12345!")
    await page.getByRole("button", { name: "Log in" }).click()
    await expect(page).toHaveURL(/\/en\/settings$/)
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible()
  })

  test("wrong password shows a localized error", async ({ page }) => {
    await page.goto("/ru/login")
    await page.locator("html[data-hydrated]").waitFor({ state: "attached" })
    await page.getByLabel("Email").fill("demo@qadr.uz")
    await page.getByLabel("Пароль", { exact: true }).fill("not-the-password")
    await page.getByRole("button", { name: "Войти" }).click()
    await expect(page.locator("form [role=alert]").first()).toHaveText("Неверный email или пароль.")
  })

  test.describe("signed in", () => {
    test.use({ storageState: "e2e/.auth/demo.json" })

    test("guest-only pages redirect to the dashboard", async ({ page }) => {
      await page.goto("/uz/login")
      await expect(page).toHaveURL(/\/uz\/dashboard$/)
      await page.goto("/uz/register")
      await expect(page).toHaveURL(/\/uz\/dashboard$/)
    })

    test("next is honoured but never leaves the site", async ({ page }) => {
      await page.goto("/uz/login?next=%2Fuz%2Fmessages")
      await expect(page).toHaveURL(/\/uz\/messages$/)
      await page.goto("/uz/login?next=%2F%2Fevil.example")
      await expect(page).toHaveURL(/\/uz\/dashboard$/)
    })

    test("non-admins get a 404 for /admin", async ({ page }) => {
      const res = await page.goto("/uz/admin")
      expect(res?.status()).toBe(404)
    })

  })

  test.describe("logout", () => {
    test("account menu logs out", async ({ page, isMobile, baseURL }) => {
      test.skip(!!isMobile, "account menu is in the desktop header")
      // its own session: logging out revokes the refresh family
      const res = await page.request.post("/api/v1/auth/login", {
        data: { email: "malika@qadr.uz", password: "Demo12345!" },
        headers: { origin: baseURL ?? "" },
      })
      expect(res.ok()).toBeTruthy()
      await page.goto("/en/settings")
      await page.locator("html[data-hydrated]").waitFor({ state: "attached" })
      await page.getByRole("button", { name: "Account", exact: true }).click()
      await page.getByRole("menuitem", { name: "Log out" }).click()
      await expect(page).toHaveURL(/\/en$/)
      await page.goto("/en/dashboard")
      await expect(page).toHaveURL(/\/en\/login\?next=/)
    })
  })
})
