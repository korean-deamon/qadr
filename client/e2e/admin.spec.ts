import { expect, test, type Page } from "@playwright/test"

async function open(page: Page, url: string) {
  await page.goto(url)
  await page.locator("html[data-hydrated]").waitFor({ state: "attached" })
}

test.describe("admin (SPEC §23)", () => {
  test.skip(({ isMobile }) => !!isMobile, "desktop is enough: these change data")

  test("non-admins get a 404, not the panel", async ({ browser }) => {
    const context = await browser.newContext({ storageState: "e2e/.auth/demo.json" })
    const page = await context.newPage()
    const res = await page.goto("/en/admin/reports")
    expect(res?.status()).toBe(404)
    await context.close()
  })

  test("an admin adds a note and it shows up in the audit log", async ({ page }) => {
    const login = await page.request.post("/api/v1/auth/login", { data: { email: "admin@qadr.uz", password: "Admin12345!" } })
    expect(login.ok()).toBeTruthy()
    await open(page, "/en/admin/reports?status=all")
    await page.getByRole("table").getByRole("link").first().click()
    await expect(page.getByRole("heading", { name: "Internal notes" })).toBeVisible()

    const note = `E2E note ${Date.now()}`
    await page.getByRole("button", { name: "Add note" }).click()
    const dialog = page.getByRole("dialog", { name: "Add note" })
    await dialog.getByRole("textbox").fill(note)
    await dialog.getByRole("button", { name: "Save note" }).click()
    await expect(page.getByText(note)).toBeVisible()

    await open(page, "/en/admin/audit-log?action=add_note")
    await expect(page.getByRole("cell", { name: "Note added" }).first()).toBeVisible()
  })

  test("a reason is required before an action is sent", async ({ page }) => {
    await page.request.post("/api/v1/auth/login", { data: { email: "admin@qadr.uz", password: "Admin12345!" } })
    await open(page, "/en/admin/listings")
    await page.getByRole("button", { name: "Hide" }).first().click()
    const dialog = page.getByRole("dialog", { name: "Hide the listing" })
    await dialog.getByRole("button", { name: "Hide" }).click()
    await expect(dialog.getByRole("alert")).toContainText("at least 3 characters")
  })
})
