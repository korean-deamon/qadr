import { screen, within } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { renderWithIntl } from "@/test/intl"
import { BottomNav } from "./bottom-nav"

const pathname = vi.hoisted(() => ({ current: "/" }))
vi.mock("@/i18n/navigation", () => ({
  usePathname: () => pathname.current,
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}))

describe("BottomNav", () => {
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
    renderWithIntl(<BottomNav unreadMessages={3} unreadNotifications={14} />)
    expect(screen.getByText("3 unread")).toBeInTheDocument()
    expect(screen.getByText("9+")).toBeInTheDocument()
    expect(screen.getByText("14 unread")).toBeInTheDocument()
  })

  it("hides badges when there is nothing unread", () => {
    renderWithIntl(<BottomNav />)
    expect(screen.queryByText(/unread/)).not.toBeInTheDocument()
  })

  it("translates labels (uz)", () => {
    renderWithIntl(<BottomNav />, "uz")
    expect(screen.getByRole("link", { name: /Xabarlar/ })).toBeInTheDocument()
  })
})
