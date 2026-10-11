import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { MediaImage } from "./media-image"

describe("MediaImage", () => {
  it("picks the smallest local WebP variant that fits", () => {
    const { container } = render(<MediaImage src="/api/v1/media/listings/x/a-1600.webp" alt="" fill sizes="300px" />)
    const img = container.querySelector("img")!
    expect(img.getAttribute("src")).toMatch(/a-1600\.webp$/)
    expect(img.getAttribute("srcset")).toMatch(/a-480\.webp \d+w/)
  })
  it("uses Cloudinary transforms for Cloudinary URLs", () => {
    const { container } = render(<MediaImage src="https://res.cloudinary.com/demo/image/upload/v1/qadr/x.jpg" alt="" width={400} height={300} />)
    expect(container.querySelector("img")!.getAttribute("src")).toMatch(/\/upload\/f_auto,q_\w+,c_limit,w_\d+\//)
  })
})
