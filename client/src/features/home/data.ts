/**
 * Static homepage content until the marketplace API exists (Phase 3).
 * Listing titles are user-generated, so they stay in the author's language.
 */
import bike from "../../../public/images/bike.jpg"
import books from "../../../public/images/books.jpg"
import bookshelf from "../../../public/images/bookshelf.jpg"
import camera from "../../../public/images/camera.jpg"
import guitar from "../../../public/images/guitar.jpg"
import kayak from "../../../public/images/kayak.jpg"
import mixer from "../../../public/images/mixer.jpg"
import sockets from "../../../public/images/sockets.jpg"
import tentMountain from "../../../public/images/tent-mountain.jpg"
import toolsWall from "../../../public/images/tools-wall.jpg"
import type { StaticImageData } from "next/image"

export type CategoryKey = "tools" | "books" | "camping" | "photo" | "kitchen" | "sports" | "music" | "kids"

export const categories: { key: CategoryKey; slug: string; count: number; image: StaticImageData }[] = [
  { key: "tools", slug: "tools", count: 128, image: toolsWall },
  { key: "books", slug: "books", count: 342, image: bookshelf },
  { key: "camping", slug: "camping", count: 96, image: tentMountain },
  { key: "photo", slug: "photo", count: 45, image: camera },
  { key: "kitchen", slug: "kitchen", count: 71, image: mixer },
  { key: "sports", slug: "sports", count: 84, image: bike },
  { key: "music", slug: "music", count: 38, image: guitar },
  { key: "kids", slug: "kids", count: 63, image: books },
]

export type MockListing = {
  id: string
  title: string
  area: string
  km: number
  maxDays: number
  owner: string
  rating: number
  image: StaticImageData
}

export const nearby: MockListing[] = [
  { id: "1", title: "4 kishilik chodir, Naturehike", area: "Chilonzor", km: 1.4, maxDays: 7, owner: "Sardor", rating: 4.9, image: tentMountain },
  { id: "2", title: "Беззеркальная камера с объективом 35 мм", area: "Mirobod", km: 2.1, maxDays: 3, owner: "Malika", rating: 5, image: camera },
  { id: "3", title: "Planetar mikser, 5 litr", area: "Yunusobod", km: 0.8, maxDays: 5, owner: "Aziza", rating: 4.8, image: mixer },
  { id: "4", title: "Shosse velosipedi, 54 oʻlcham", area: "Mirzo Ulugʻbek", km: 3.2, maxDays: 2, owner: "Jasur", rating: 4.7, image: bike },
  { id: "5", title: "Набор торцевых головок, 94 предмета", area: "Yakkasaroy", km: 1.9, maxDays: 10, owner: "Timur", rating: 4.9, image: sockets },
  { id: "6", title: "Ikki kishilik kayak va eshkaklar", area: "Sergeli", km: 6.5, maxDays: 4, owner: "Bekzod", rating: 4.6, image: kayak },
]
