import { createCn } from "cn/config"

/**
 * Class merger aware of Qadr's custom theme scales, so that e.g.
 * `text-display` (size) and `text-forest` (colour) never cancel each other.
 */
export const cn = createCn({
  extend: {
    classGroups: {
      "font-size": [
        { text: ["display", "title", "section", "lead", "body", "caption", "meta"] },
      ],
      shadow: [{ shadow: ["soft", "lift"] }],
    },
  },
})
