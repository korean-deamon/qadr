import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { ListingCardData } from "@/lib/api/types"
import { renderWithIntl } from "@/test/intl"
import { ListingCard } from "./listing-card"

const push = vi.fn()
const api = vi.fn()
let me: object | null = { id: "u1" }

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
  useRouter: () => ({ push }),
}))
vi.mock("@/components/session/session-provider", () => ({ useSession: () => ({ me }) }))
vi.mock("@/lib/api/client", () => ({ api: (...a: unknown[]) => api(...a) }))
vi.mock("@/lib/notify", () => ({ notify: vi.fn() }))

const listing: ListingCardData = {
  id: "42",
  title: "4 kishilik chodir",
  area: "Chilonzor",
  distance_km: 1.4,
  max_days: 7,
  condition: "good",
  status: "active",
  image: { id: "i1", url: "/api/v1/media/listings/42/a-1600.webp", width: 1600, height: 1200 },
  owner: { id: "o1", first_name: "Sardor", rating: 4.9 },
  is_saved: false,
  created_at: "2026-10-01T10:00:00Z",
}

describe("ListingCard", () => {
  beforeEach(() => {
    push.mockReset()
    api.mockReset().mockResolvedValue({ saved: true })
    me = { id: "u1" }
  })

  it("links the title to the item page and uses it as image alt", () => {
    renderWithIntl(<ListingCard listing={listing} />)
    expect(screen.getByRole("link", { name: listing.title })).toHaveAttribute("href", "/items/42")
    expect(screen.getByRole("img", { name: listing.title })).toBeInTheDocument()
  })

  it("formats terms, distance and rating for the locale", () => {
    renderWithIntl(<ListingCard listing={listing} />)
    expect(screen.getByText("Up to 7 days")).toBeInTheDocument()
    expect(screen.getByText("1.4 km away")).toBeInTheDocument()
    expect(screen.getByLabelText("Rated 4.9 out of 5")).toBeInTheDocument()
  })

  it("shows no distance without a location, and a new-lender badge without ratings", () => {
    renderWithIntl(<ListingCard listing={{ ...listing, distance_km: null, owner: { ...listing.owner, rating: null } }} />)
    expect(screen.queryByText(/km away/)).not.toBeInTheDocument()
    expect(screen.getByText("New lender")).toBeInTheDocument()
  })

  it("uses Uzbek number formatting in uz", () => {
    renderWithIntl(<ListingCard listing={listing} />, "uz")
    expect(screen.getByText("1,4 km uzoqlikda")).toBeInTheDocument()
    expect(screen.getByText("7 kungacha")).toBeInTheDocument()
  })

  it("saves through the API", async () => {
    renderWithIntl(<ListingCard listing={listing} />)
    await userEvent.click(screen.getByRole("button", { name: "Save" }))
    expect(screen.getByRole("button", { name: "Saved" })).toHaveAttribute("aria-pressed", "true")
    expect(api).toHaveBeenCalledWith("/listings/42/save", { method: "POST" })
  })

  it("sends visitors to login instead of saving", async () => {
    me = null
    renderWithIntl(<ListingCard listing={listing} />)
    await userEvent.click(screen.getByRole("button", { name: "Save" }))
    expect(api).not.toHaveBeenCalled()
    expect(push).toHaveBeenCalledWith({ pathname: "/login", query: { next: "/en/items/42" } })
  })
})
