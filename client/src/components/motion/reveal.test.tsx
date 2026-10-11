import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Reveal } from "./reveal"
import { RevealItem } from "./reveal-item"
import { RevealText } from "./reveal-text"

describe("RevealText", () => {
  it("keeps the full sentence in the markup, word by word", () => {
    render(<RevealText as="h2" text="Har narsaning qadri bor." />)
    const h = screen.getByRole("heading", { level: 2 })
    expect(h).toHaveTextContent("Har narsaning qadri bor.")
    expect(h.querySelectorAll(".reveal-inner")).toHaveLength(4)
  })
  it("load-triggered text is marked in view from the first render (no JS wait)", () => {
    render(<RevealText as="h1" trigger="load" text="Salom" />)
    expect(screen.getByRole("heading", { level: 1 })).toHaveAttribute("data-inview", "")
  })
})

describe("Reveal", () => {
  it("flips data-inview when it intersects", () => {
    render(
      <Reveal as="ul" stagger>
        <RevealItem as="li">One</RevealItem>
      </Reveal>,
    )
    const list = screen.getByRole("list")
    expect(list).toHaveAttribute("data-inview", "")
    expect(list).toHaveAttribute("data-stagger", "")
  })
})
