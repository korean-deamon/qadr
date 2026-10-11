/**
 * Static mock data for the design pass. Replaced by the API in Phases 3–5.
 * User-generated text (titles, descriptions, messages) stays in the author's
 * language, as it will in production (SPEC §4).
 */
import type { StaticImageData } from "next/image"
import bike from "../../../public/images/bike.jpg"
import boardGame from "../../../public/images/board-game.jpg"
import books from "../../../public/images/books.jpg"
import bookshelf from "../../../public/images/bookshelf.jpg"
import camera from "../../../public/images/camera.jpg"
import chess from "../../../public/images/chess.jpg"
import coffeeGrinder from "../../../public/images/coffee-grinder.jpg"
import guitar from "../../../public/images/guitar.jpg"
import hammer from "../../../public/images/hammer.jpg"
import drill from "../../../public/images/hero-drill.jpg"
import kayak from "../../../public/images/kayak.jpg"
import mixer from "../../../public/images/mixer.jpg"
import projector from "../../../public/images/projector.jpg"
import sewing from "../../../public/images/sewing-machine.jpg"
import skateboard from "../../../public/images/skateboard.jpg"
import sockets from "../../../public/images/sockets.jpg"
import tennis from "../../../public/images/tennis.jpg"
import tentMountain from "../../../public/images/tent-mountain.jpg"
import tentView from "../../../public/images/tent-view.jpg"
import toolsWall from "../../../public/images/tools-wall.jpg"

/** Fixed clock so mock pages render deterministically (and statically). */
export const MOCK_NOW = new Date("2026-10-12T10:00:00+05:00")
const daysFromNow = (d: number) => new Date(MOCK_NOW.getTime() + d * 86_400_000)
const at = (d: number, hh: number, mm = 0) => {
  const x = daysFromNow(d)
  x.setUTCHours(hh - 5, mm, 0, 0)
  return x
}

export type CategoryKey = "tools" | "books" | "camping" | "photo" | "kitchen" | "sports" | "music" | "kids"
export type Condition = "new" | "good" | "used"

export const categories: { key: CategoryKey; slug: string; count: number; image: StaticImageData }[] = [
  { key: "tools", slug: "tools", count: 128, image: toolsWall },
  { key: "books", slug: "books", count: 342, image: bookshelf },
  { key: "camping", slug: "camping", count: 96, image: tentMountain },
  { key: "photo", slug: "photo", count: 45, image: camera },
  { key: "kitchen", slug: "kitchen", count: 71, image: mixer },
  { key: "sports", slug: "sports", count: 84, image: bike },
  { key: "music", slug: "music", count: 38, image: guitar },
  { key: "kids", slug: "kids", count: 63, image: boardGame },
]

export type User = {
  id: string
  name: string
  area: string
  memberSince: Date
  emailVerified: boolean
  completedLoans: number
  rating: number
  ratingCount: number
  phone: string
  responseHours: number
}

export const users: Record<string, User> = {
  me: { id: "me", name: "Dilnoza Karimova", area: "Yunusobod", memberSince: new Date("2026-03-04"), emailVerified: true, completedLoans: 27, rating: 4.9, ratingCount: 24, phone: "+998 90 123 45 67", responseHours: 1 },
  sardor: { id: "sardor", name: "Sardor Rahimov", area: "Chilonzor", memberSince: new Date("2026-02-11"), emailVerified: true, completedLoans: 41, rating: 4.9, ratingCount: 38, phone: "+998 93 555 20 14", responseHours: 2 },
  malika: { id: "malika", name: "Malika Yusupova", area: "Mirobod", memberSince: new Date("2026-05-20"), emailVerified: true, completedLoans: 12, rating: 5, ratingCount: 11, phone: "+998 97 410 88 03", responseHours: 1 },
  aziza: { id: "aziza", name: "Aziza Tosheva", area: "Yunusobod", memberSince: new Date("2026-04-02"), emailVerified: true, completedLoans: 18, rating: 4.8, ratingCount: 16, phone: "+998 90 702 31 55", responseHours: 3 },
  jasur: { id: "jasur", name: "Jasur Ergashev", area: "Mirzo Ulugʻbek", memberSince: new Date("2026-06-15"), emailVerified: true, completedLoans: 7, rating: 4.7, ratingCount: 6, phone: "+998 99 118 64 20", responseHours: 4 },
  timur: { id: "timur", name: "Тимур Ахмедов", area: "Yakkasaroy", memberSince: new Date("2026-01-28"), emailVerified: true, completedLoans: 33, rating: 4.9, ratingCount: 29, phone: "+998 90 977 12 40", responseHours: 2 },
  bekzod: { id: "bekzod", name: "Bekzod Nazarov", area: "Sergeli", memberSince: new Date("2026-07-09"), emailVerified: false, completedLoans: 3, rating: 4.6, ratingCount: 3, phone: "+998 94 231 07 77", responseHours: 6 },
  olga: { id: "olga", name: "Ольга Ким", area: "Mirobod", memberSince: new Date("2026-03-30"), emailVerified: true, completedLoans: 21, rating: 4.9, ratingCount: 19, phone: "+998 97 300 45 12", responseHours: 1 },
  nodira: { id: "nodira", name: "Nodira Alimova", area: "Shayxontohur", memberSince: new Date("2026-08-01"), emailVerified: true, completedLoans: 5, rating: 5, ratingCount: 5, phone: "+998 93 640 18 09", responseHours: 2 },
}

export type Listing = {
  id: string
  title: string
  description: string
  terms: string[]
  category: CategoryKey
  condition: Condition
  maxDays: number
  area: string
  km: number
  ownerId: string
  images: StaticImageData[]
  listedDaysAgo: number
  /** Inclusive day offsets from MOCK_NOW already booked */
  booked: [number, number][]
}

export const listings: Listing[] = [
  {
    id: "1", title: "4 kishilik chodir, Naturehike", category: "camping", condition: "good", maxDays: 7, area: "Chilonzor", km: 1.4, ownerId: "sardor", listedDaysAgo: 2,
    images: [tentMountain, tentView, kayak],
    description: "Ikki qavatli, yengil (2,6 kg) chodir. Chimyon, Zomin va Arslonbobda sinovdan oʻtgan, yomgʻirda ham quruq qoladi. Qoziqlar, tortqichlar va qopi bilan beriladi.",
    terms: ["Quruq va tozalangan holda qaytaring", "Olib ketish: Chilonzor, 9-mavze", "Yoʻqolgan qoziq uchun oʻrnini qoplaysiz"],
    booked: [[3, 5], [12, 15]],
  },
  {
    id: "2", title: "Беззеркальная камера с объективом 35 мм", category: "photo", condition: "good", maxDays: 3, area: "Mirobod", km: 2.1, ownerId: "malika", listedDaysAgo: 4,
    images: [camera, projector],
    description: "Fujifilm X-T30 и объектив 35 мм f/2. Два аккумулятора, зарядка, карта на 64 ГБ. Отлично подходит для свадеб, поездок и портретов.",
    terms: ["Только для аккуратного использования", "Встреча у метро Космонавтов", "Карту памяти верните очищенной"],
    booked: [[1, 2]],
  },
  {
    id: "3", title: "Planetar mikser, 5 litr", category: "kitchen", condition: "new", maxDays: 5, area: "Yunusobod", km: 0.8, ownerId: "me", listedDaysAgo: 1,
    images: [mixer],
    description: "Kenwood planetar mikseri: xamir ilmogʻi, koʻpirtirgich va aralashtirgich bilan. Bayram oldidan pishiriq qilish uchun ayni muddao.",
    terms: ["Yuvilgan holda qaytaring", "Olib ketish: Yunusobod, 4-kvartal"],
    booked: [],
  },
  {
    id: "4", title: "Shosse velosipedi, 54 oʻlcham", category: "sports", condition: "good", maxDays: 2, area: "Mirzo Ulugʻbek", km: 3.2, ownerId: "jasur", listedDaysAgo: 6,
    images: [bike],
    description: "Alyuminiy rama, 2×9 tezlik. Yaqinda texnik koʻrikdan oʻtgan. Dubulgʻa va qulf ham beriladi.",
    terms: ["Faqat asfalt yoʻllarda", "Shina teshilsa, oʻzingiz yamaysiz"],
    booked: [[0, 1]],
  },
  {
    id: "5", title: "Набор торцевых головок, 94 предмета", category: "tools", condition: "used", maxDays: 10, area: "Yakkasaroy", km: 1.9, ownerId: "timur", listedDaysAgo: 9,
    images: [sockets, toolsWall],
    description: "Полный набор: головки 4–32 мм, трещотки 1/4\" и 1/2\", удлинители, биты. Всё в кейсе, ничего не потеряно.",
    terms: ["Сверьте комплект при получении и возврате"],
    booked: [],
  },
  {
    id: "6", title: "Ikki kishilik kayak va eshkaklar", category: "sports", condition: "good", maxDays: 4, area: "Sergeli", km: 6.5, ownerId: "bekzod", listedDaysAgo: 3,
    images: [kayak],
    description: "Puflama kayak, ikkita eshkak, nasos va qutqaruv jiletlari. Chorvoq uchun ideal.",
    terms: ["Faqat suzish kiyimida foydalaning", "Qumdan tozalab qaytaring"],
    booked: [[8, 11]],
  },
  {
    id: "7", title: "Zarbli matkap Bosch, 18 V", category: "tools", condition: "good", maxDays: 5, area: "Yunusobod", km: 0.6, ownerId: "me", listedDaysAgo: 12,
    images: [drill, hammer],
    description: "Ikki akkumulyator, zaryadlovchi va 10 ta parma. Beton devorga javon osish uchun yetarli kuchli.",
    terms: ["Parmalarni sindirsangiz, xuddi shunday parma bilan almashtiring", "Olib ketish: Yunusobod, Amir Temur shoh koʻchasi"],
    booked: [[-2, 1]],
  },
  {
    id: "8", title: "Слайд-проектор Kodak и 200 слайдов", category: "photo", condition: "used", maxDays: 3, area: "Mirobod", km: 2.3, ownerId: "olga", listedDaysAgo: 15,
    images: [projector],
    description: "Работает, лампа новая. Для домашнего показа семейных слайдов или винтажной вечеринки.",
    terms: ["Не оставлять включённым без присмотра"],
    booked: [],
  },
  {
    id: "9", title: "Tikuv mashinasi Janome", category: "kitchen", condition: "good", maxDays: 7, area: "Yunusobod", km: 0.9, ownerId: "me", listedDaysAgo: 5,
    images: [sewing],
    description: "Uy uchun elektr tikuv mashinasi, 15 xil chok. Ignalar va ip gʻaltaklari bilan.",
    terms: ["Ignani sindirsangiz, almashtirib qoʻying"],
    booked: [],
  },
  {
    id: "10", title: "Shaxmat toʻplami, yogʻoch", category: "kids", condition: "good", maxDays: 14, area: "Chilonzor", km: 1.1, ownerId: "sardor", listedDaysAgo: 20,
    images: [chess],
    description: "Katta yogʻoch donalar va taxta. Bolalar bilan oʻrganish uchun qulay.",
    terms: ["Donalarni sanab qaytaring"],
    booked: [],
  },
  {
    id: "11", title: "Теннисные ракетки, 2 шт. и мячи", category: "sports", condition: "used", maxDays: 3, area: "Yakkasaroy", km: 2.0, ownerId: "timur", listedDaysAgo: 8,
    images: [tennis],
    description: "Две ракетки Head среднего уровня и банка мячей. Подойдут, чтобы попробовать теннис перед покупкой своей.",
    terms: [],
    booked: [],
  },
  {
    id: "12", title: "Qoʻl qahva tegirmoni", category: "kitchen", condition: "new", maxDays: 7, area: "Mirobod", km: 2.4, ownerId: "malika", listedDaysAgo: 2,
    images: [coffeeGrinder],
    description: "Keramik tegirmon toshlari, maydalikni sozlash mumkin. Sayohatga olib ketish uchun qulay.",
    terms: ["Faqat qahva uchun"],
    booked: [],
  },
  {
    id: "13", title: "Skeytbord, 8 dyuym", category: "sports", condition: "good", maxDays: 5, area: "Mirzo Ulugʻbek", km: 3.5, ownerId: "jasur", listedDaysAgo: 10,
    images: [skateboard],
    description: "Yangi gʻildiraklar va podshipniklar. Boshlovchilar uchun ham qulay.",
    terms: ["Himoya vositalarini oʻzingiz taqing"],
    booked: [],
  },
  {
    id: "14", title: "Детские книги, 30 шт.", category: "books", condition: "good", maxDays: 21, area: "Mirobod", km: 2.2, ownerId: "olga", listedDaysAgo: 7,
    images: [books, bookshelf],
    description: "Сказки, энциклопедии и книги с картинками для 4–8 лет. На русском и узбекском.",
    terms: ["Пожалуйста, без пометок в книгах"],
    booked: [],
  },
]

export const listingById = (id: string) => listings.find((l) => l.id === id)
export const ownerOf = (l: Listing) => users[l.ownerId]

/* ------------------------------------------------------------------ */
/* Borrowing                                                           */
/* ------------------------------------------------------------------ */
export type RequestStatus = "pending" | "approved" | "rejected" | "cancelled" | "expired"
export type LoanStatus = "approved" | "active" | "returned" | "cancelled"

export type BorrowRequest = {
  id: string
  listingId: string
  borrowerId: string
  start: Date
  end: Date
  message: string
  status: RequestStatus
  createdAt: Date
}

export const incomingRequests: BorrowRequest[] = [
  { id: "r1", listingId: "7", borrowerId: "jasur", start: daysFromNow(3), end: daysFromNow(5), message: "Assalomu alaykum! Yotoqxonaga ikkita javon osmoqchiman, shanba kuni olib ketsam boʻladimi?", status: "pending", createdAt: at(0, 8, 40) },
  { id: "r2", listingId: "7", borrowerId: "olga", start: daysFromNow(9), end: daysFromNow(10), message: "Здравствуйте! Нужно повесить карниз, верну в тот же вечер.", status: "pending", createdAt: at(-1, 19, 5) },
]

export type Loan = {
  id: string
  listingId: string
  borrowerId: string
  ownerId: string
  start: Date
  end: Date
  status: LoanStatus
}

/** Things I lend out right now */
export const lendingLoans: Loan[] = [
  { id: "l1", listingId: "7", borrowerId: "nodira", ownerId: "me", start: daysFromNow(-2), end: daysFromNow(1), status: "active" },
]
/** Things I borrow */
export const borrowingLoans: Loan[] = [
  { id: "l2", listingId: "1", borrowerId: "me", ownerId: "sardor", start: daysFromNow(3), end: daysFromNow(5), status: "approved" },
  { id: "l3", listingId: "12", borrowerId: "me", ownerId: "malika", start: daysFromNow(-4), end: daysFromNow(0), status: "active" },
]

/* ------------------------------------------------------------------ */
/* Messaging                                                           */
/* ------------------------------------------------------------------ */
export type Message =
  | { id: string; kind: "text"; from: "me" | "them"; body: string; at: Date }
  | { id: string; kind: "event"; event: "requested" | "approved" | "pickedUp"; at: Date }

export type Conversation = {
  id: string
  listingId: string
  withId: string
  unread: number
  requestStatus?: RequestStatus
  requestDates?: [Date, Date]
  messages: Message[]
}

export const conversations: Conversation[] = [
  {
    id: "c1", listingId: "1", withId: "sardor", unread: 2, requestStatus: "approved", requestDates: [daysFromNow(3), daysFromNow(5)],
    messages: [
      { id: "m1", kind: "text", from: "me", body: "Assalomu alaykum, Sardor! Chodiringiz shu dam olish kunlari boʻshmi? Zominga borishni rejalashtiryapmiz.", at: at(-1, 18, 12) },
      { id: "m2", kind: "text", from: "them", body: "Vaalaykum assalom! Ha, boʻsh. Soʻrov yuboravering, tasdiqlayman.", at: at(-1, 18, 30) },
      { id: "m3", kind: "event", event: "requested", at: at(-1, 18, 34) },
      { id: "m4", kind: "event", event: "approved", at: at(-1, 19, 2) },
      { id: "m5", kind: "text", from: "them", body: "Tasdiqladim. Juma kuni soat 19:00 dan keyin Chilonzor 9-mavzeda olib ketishingiz mumkin.", at: at(0, 9, 15) },
      { id: "m6", kind: "text", from: "them", body: "Qoziqlar alohida xaltachada, sanab olsangiz boʻldi 🙂", at: at(0, 9, 16) },
    ],
  },
  {
    id: "c2", listingId: "2", withId: "malika", unread: 0, requestStatus: "pending", requestDates: [daysFromNow(6), daysFromNow(7)],
    messages: [
      { id: "m1", kind: "text", from: "me", body: "Здравствуйте! Можно взять камеру на свадьбу подруги 18-го?", at: at(-2, 12, 0) },
      { id: "m2", kind: "text", from: "them", body: "Добрый день! Да, в эти даты свободна. Отправьте запрос, пожалуйста.", at: at(-2, 13, 20) },
      { id: "m3", kind: "event", event: "requested", at: at(-2, 13, 25) },
    ],
  },
  {
    id: "c3", listingId: "7", withId: "nodira", unread: 0, requestStatus: "approved", requestDates: [daysFromNow(-2), daysFromNow(1)],
    messages: [
      { id: "m1", kind: "event", event: "pickedUp", at: at(-2, 18, 0) },
      { id: "m2", kind: "text", from: "them", body: "Rahmat, Dilnoza opa! Ertaga kechqurun qaytarib beraman.", at: at(-2, 18, 10) },
    ],
  },
  {
    id: "c4", listingId: "5", withId: "timur", unread: 0,
    messages: [
      { id: "m1", kind: "text", from: "me", body: "Тимур, в наборе есть головка на 27?", at: at(-5, 10, 0) },
      { id: "m2", kind: "text", from: "them", body: "Есть, и удлинитель тоже.", at: at(-5, 11, 45) },
    ],
  },
]
export const conversationById = (id: string) => conversations.find((c) => c.id === id)

/* ------------------------------------------------------------------ */
/* Notifications                                                       */
/* ------------------------------------------------------------------ */
export type Notification = {
  id: string
  type: "requestReceived" | "requestApproved" | "returnDue" | "newMessage" | "ratingReceived"
  actorId: string
  listingId: string
  at: Date
  read: boolean
}
export const notifications: Notification[] = [
  { id: "n1", type: "requestReceived", actorId: "jasur", listingId: "7", at: at(0, 8, 40), read: false },
  { id: "n2", type: "newMessage", actorId: "sardor", listingId: "1", at: at(0, 9, 16), read: false },
  { id: "n3", type: "returnDue", actorId: "nodira", listingId: "7", at: at(0, 7, 0), read: false },
  { id: "n4", type: "requestApproved", actorId: "sardor", listingId: "1", at: at(-1, 19, 2), read: true },
  { id: "n5", type: "ratingReceived", actorId: "timur", listingId: "5", at: at(-3, 14, 30), read: true },
]

/** Shape consumed by <ListingCard>. */
export const cardOf = (l: Listing) => {
  const owner = ownerOf(l)
  return {
    id: l.id,
    title: l.title,
    area: l.area,
    km: l.km,
    maxDays: l.maxDays,
    owner: owner.name.split(" ")[0],
    rating: owner.rating,
    image: l.images[0],
  }
}
