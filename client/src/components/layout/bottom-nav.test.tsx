import { screen, within } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { renderWithIntl } from "@/test/intl"
import { BottomNav } from "./bottom-nav"

const pathname = vi.hoisted(() => ({ current: "/" }))
const session = vi.hoisted(() => ({
  me: { id: "u1" } as unknown,
  counters: { unread_messages: 0, unread_notifications: 0, pending_requests: 0 },
}))
vi.mock("@/components/session/session-provider", () => ({ useSession: () => session }))
vi.mock("@/i18n/navigation", () => ({
  usePathname: () => pathname.current,
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}))

describe("BottomNav", () => {
  it("sends visitors to login from Profile", () => {
    session.me = null
    renderWithIntl(<BottomNav />)
    expect(screen.getByRole("link", { name: /Profile/ })).toHaveAttribute("href", "/login")
    session.me = { id: "u1" }
  })

  it("renders the five SPEC destinations", () => {
    renderWithIntl(<BottomNav />)
    const nav = screen.getByRole("navigation", { name: "App navigation" })
    const links = within(nav).getAllByRole("link")
    expect(links.map((l) => l.getAttribute("href"))).toEqual(["/", "/explore", "/items/new", "/messages", "/dashboard"])
    expect(within(nav).getByRole("link", { name: "List an item" })).toBeInTheDocument()
  })

  it("marks the current section with aria-current", () => {
    pathname.current = "/messages/abc"
    renderWithIntl(<BottomNav />)
    expect(screen.getByRole("link", { name: /Messages/ })).toHaveAttribute("aria-current", "page")
    expect(screen.getByRole("link", { name: /Home/ })).not.toHaveAttribute("aria-current")
    pathname.current = "/"
  })

  it("shows unread badges with an accessible count and caps at 9+", () => {
    session.counters = { unread_messages: 3, unread_notifications: 10, pending_requests: 4 }
    renderWithIntl(<BottomNav />)
    expect(screen.getByText("3 unread")).toBeInTheDocument()
    expect(screen.getByText("9+")).toBeInTheDocument()
    expect(screen.getByText("14 unread")).toBeInTheDocument()
  })

  it("hides badges when there is nothing unread", () => {
    session.counters = { unread_messages: 0, unread_notifications: 0, pending_requests: 0 }
    renderWithIntl(<BottomNav />)
    expect(screen.queryByText(/unread/)).not.toBeInTheDocument()
  })

  it("translates labels (uz)", () => {
    renderWithIntl(<BottomNav />, "uz")
    expect(screen.getByRole("link", { name: /Xabarlar/ })).toBeInTheDocument()
  })
})
