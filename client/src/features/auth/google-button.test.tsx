import { render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { NextIntlClientProvider } from "next-intl"
import en from "../../../messages/en.json"
import { ContinueWithGoogle } from "./google-button"

const nav = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }))
const session = vi.hoisted(() => ({ setMe: vi.fn() }))
const client = vi.hoisted(() => ({ api: vi.fn() }))

vi.mock("next/navigation", () => ({ useRouter: () => nav, useSearchParams: () => new URLSearchParams("next=/en/saved") }))
vi.mock("@/components/session/session-provider", () => ({ useSession: () => session }))
vi.mock("@/lib/api/client", () => ({ ...client, ApiError: class extends Error {} }))

function renderButton(onError = vi.fn()) {
  render(
    <NextIntlClientProvider locale="en" messages={en} timeZone="Asia/Tashkent">
      <ContinueWithGoogle onError={onError} />
    </NextIntlClientProvider>,
  )
  return onError
}

describe("ContinueWithGoogle", () => {
  beforeEach(() => {
    nav.replace.mockReset()
    nav.refresh.mockReset()
    session.setMe.mockReset()
    client.api.mockReset()
    delete (window as { google?: unknown }).google
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    document.querySelectorAll("script").forEach((s) => s.remove())
  })

  it("renders nothing when no client ID is configured", () => {
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_CLIENT_ID", "")
    const { container } = render(
      <NextIntlClientProvider locale="en" messages={en} timeZone="Asia/Tashkent">
        <ContinueWithGoogle onError={vi.fn()} />
      </NextIntlClientProvider>,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it("loads Google's script and renders the button once the ID is set", async () => {
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_CLIENT_ID", "test-client-id")
    const initialize = vi.fn()
    const renderButtonMock = vi.fn()
    renderButton()
    expect(screen.getByText("or continue with")).toBeInTheDocument()
    const script = document.querySelector('script[src="https://accounts.google.com/gsi/client"]')
    expect(script).not.toBeNull()
    window.google = { accounts: { id: { initialize, renderButton: renderButtonMock } } }
    script!.dispatchEvent(new Event("load"))
    await waitFor(() => expect(initialize).toHaveBeenCalledWith(expect.objectContaining({ client_id: "test-client-id" })))
    expect(renderButtonMock).toHaveBeenCalled()
  })

  it("on a real credential: signs in, stores the session, and continues to the Telegram gate", async () => {
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_CLIENT_ID", "test-client-id")
    const me = { id: "u1", preferred_locale: "en", telegram_required: true }
    client.api.mockResolvedValueOnce(me)
    let initializeCb: ((r: { credential: string }) => void) | undefined
    renderButton()
    const script = document.querySelector('script[src="https://accounts.google.com/gsi/client"]')!
    window.google = {
      accounts: {
        id: {
          initialize: (cfg) => {
            initializeCb = cfg.callback
          },
          renderButton: vi.fn(),
        },
      },
    }
    script.dispatchEvent(new Event("load"))
    await waitFor(() => expect(initializeCb).toBeDefined())

    await initializeCb!({ credential: "google-id-token" })

    expect(client.api).toHaveBeenCalledWith(
      "/auth/google",
      expect.objectContaining({ json: { credential: "google-id-token", locale: "en" } }),
    )
    expect(session.setMe).toHaveBeenCalledWith(me)
    expect(nav.replace).toHaveBeenCalledWith(expect.stringContaining("/en/connect-telegram"))
    expect(nav.refresh).toHaveBeenCalled()
  })

  it("surfaces a rejected token through onError, not a crash", async () => {
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_CLIENT_ID", "test-client-id")
    client.api.mockRejectedValueOnce(new Error("rejected"))
    let initializeCb: ((r: { credential: string }) => void) | undefined
    const onError = renderButton()
    const script = document.querySelector('script[src="https://accounts.google.com/gsi/client"]')!
    window.google = {
      accounts: { id: { initialize: (cfg) => (initializeCb = cfg.callback), renderButton: vi.fn() } },
    }
    script.dispatchEvent(new Event("load"))
    await waitFor(() => expect(initializeCb).toBeDefined())

    await initializeCb!({ credential: "bad-token" })

    await waitFor(() => expect(onError).toHaveBeenCalled())
    expect(session.setMe).not.toHaveBeenCalled()
  })
})
