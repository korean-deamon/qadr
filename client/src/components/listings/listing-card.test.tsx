import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { renderWithIntl } from "@/test/intl"
import { ListingCard } from "./listing-card"

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}))

const listing = {
  id: "42", title: "4 kishilik chodir", area: "Chilonzor", km: 1.4, maxDays: 7,
  owner: "Sardor", rating: 4.9, image: "/images/tent-mountain.jpg",
}

describe("ListingCard", () => {
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

  it("uses Uzbek number formatting in uz", () => {
    renderWithIntl(<ListingCard listing={listing} />, "uz")
    expect(screen.getByText("1,4 km uzoqlikda")).toBeInTheDocument()
    expect(screen.getByText("7 kungacha")).toBeInTheDocument()
  })

  it("toggles the save button state", async () => {
    renderWithIntl(<ListingCard listing={listing} />)
    const save = screen.getByRole("button", { name: "Save" })
    expect(save).toHaveAttribute("aria-pressed", "false")
    await userEvent.click(save)
    expect(screen.getByRole("button", { name: "Saved" })).toHaveAttribute("aria-pressed", "true")
  })
})
