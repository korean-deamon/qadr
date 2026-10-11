import { expect, test as setup } from "@playwright/test"

/** Logs the seeded demo user in once and stores the cookies for authenticated specs. */
setup("authenticate demo user", async ({ request, baseURL }) => {
  const res = await request.post("/api/v1/auth/login", {
    data: { email: "demo@qadr.uz", password: "Demo12345!" },
    headers: { origin: baseURL ?? "http://localhost:3200" },
  })
  expect(res.ok(), await res.text()).toBeTruthy()
  await request.storageState({ path: "e2e/.auth/demo.json" })
})
