import { act, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { renderWithIntl } from "@/test/intl"
import { ConnectTelegram } from "./connect-telegram"

const nav = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }))
const session = vi.hoisted(() => ({
  me: { id: "u1", telegram_required: true } as { id: string; telegram_required: boolean },
  refreshMe: vi.fn(async () => {}),
  logout: vi.fn(async () => {}),
}))
const client = vi.hoisted(() => ({ api: vi.fn(), refreshSession: vi.fn(async () => true) }))

vi.mock("next/navigation", () => ({ useRouter: () => nav, useSearchParams: () => new URLSearchParams("next=/en/saved") }))
vi.mock("@/components/session/session-provider", () => ({ useSession: () => session }))
vi.mock("@/lib/api/client", () => ({ ...client, ApiError: class extends Error {} }))
vi.mock("@/lib/notify", () => ({ notify: vi.fn() }))

const status = { enabled: true, linked: false, username: null, phone: null, notifications: true, blocked: false }
const deleteAt = new Date(Date.now() + 23 * 3600_000).toISOString()

describe("ConnectTelegram", () => {
  beforeEach(() => {
    session.me = { id: "u1", telegram_required: true }
    nav.replace.mockReset()
    client.api.mockReset()
  })
  afterEach(() => vi.useRealTimers())

  it("explains the three steps and when an unconnected account is deleted", () => {
    renderWithIntl(<ConnectTelegram initial={status} deleteAt={deleteAt} />)
    expect(screen.getByRole("heading", { name: "Connect Telegram" })).toBeInTheDocument()
    expect(screen.getAllByRole("listitem")).toHaveLength(3)
    expect(screen.getByText(/deleted in 23 hours/)).toBeInTheDocument()
  })

  it("opens the bot link in a new tab and waits", async () => {
    const tab = { opener: {}, location: { href: "" }, close: vi.fn() }
    vi.spyOn(window, "open").mockReturnValue(tab as unknown as Window)
    client.api.mockResolvedValueOnce({ url: "https://t.me/qadr_bot?start=abc", expires_in: 600 })
    renderWithIntl(<ConnectTelegram initial={status} deleteAt={deleteAt} />)
    await userEvent.click(screen.getByRole("button", { name: "Open Telegram" }))
    expect(client.api).toHaveBeenCalledWith("/telegram/link-token", { method: "POST" })
    expect(tab.location.href).toBe("https://t.me/qadr_bot?start=abc")
    expect(tab.opener).toBeNull()
    expect(await screen.findByText(/Waiting for you to share your contact/)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Open the bot again" })).toHaveAttribute("href", "https://t.me/qadr_bot?start=abc")
  })

  it("finishes once the account is linked: refreshes the session and continues to `next`", async () => {
    session.me = { id: "u1", telegram_required: false } // e.g. after the realtime "telegram.linked" event
    await act(async () => {
      renderWithIntl(<ConnectTelegram initial={status} deleteAt={deleteAt} />)
    })
    await waitFor(() => expect(nav.replace).toHaveBeenCalledWith("/en/saved"))
    expect(client.refreshSession).toHaveBeenCalled()
  })

  it("says so when Telegram linking is not configured", () => {
    renderWithIntl(<ConnectTelegram initial={{ ...status, enabled: false }} deleteAt={null} />)
    expect(screen.getByText(/temporarily unavailable/)).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Open Telegram" })).not.toBeInTheDocument()
  })

  it("lets the wrong person sign out with a full page load", async () => {
    const replace = vi.fn()
    vi.stubGlobal("location", { ...window.location, replace })
    renderWithIntl(<ConnectTelegram initial={status} deleteAt={deleteAt} />)
    await userEvent.click(screen.getByRole("button", { name: "Not you? Log out" }))
    expect(session.logout).toHaveBeenCalled()
    expect(replace).toHaveBeenCalledWith("/en")
    vi.unstubAllGlobals()
  })
})
