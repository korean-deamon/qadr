import { createCn } from "cn/engine"
import tables from "./cn-tables"

/**
 * Class merger compiled for this project (`npm run cn:build`, also run by
 * next.config via withCn). The tables include Qadr's @theme scales, so e.g.
 * `text-display` (size) and `text-forest` (colour) never cancel each other.
 */
export const cn = createCn(tables)
