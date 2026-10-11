import { renderHook } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"
import type { ReactNode } from "react"
import { describe, expect, it } from "vitest"
import en from "../../../messages/en.json"
import ru from "../../../messages/ru.json"
import uz from "../../../messages/uz.json"
import { useDates } from "./use-dates"

const wrap = (locale: "uz" | "ru" | "en", messages: object) =>
  function W({ children }: { children: ReactNode }) {
    return <NextIntlClientProvider locale={locale} messages={messages}>{children}</NextIntlClientProvider>
  }

const oct12 = new Date(2026, 9, 12)
const oct14 = new Date(2026, 9, 14)
const nov2 = new Date(2026, 10, 2)

describe("useDates (dictionary-based, no browser ICU)", () => {
  it("formats Uzbek month names in Latin script", () => {
    const { result } = renderHook(() => useDates(), { wrapper: wrap("uz", uz) })
    expect(result.current.monthYear(oct12)).toBe("2026-yil, oktabr")
    expect(result.current.dayMonth(oct12)).toBe("12-oktabr")
    expect(result.current.range(oct12, oct14)).toBe("12 – 14-okt")
  })
  it("uses genitive month names in Russian", () => {
    const { result } = renderHook(() => useDates(), { wrapper: wrap("ru", ru) })
    expect(result.current.dayMonth(oct12)).toBe("12 октября")
    expect(result.current.range(oct12, nov2)).toBe("12 окт – 2 ноя")
  })
  it("starts weeks on Monday", () => {
    const { result } = renderHook(() => useDates(), { wrapper: wrap("en", en) })
    expect(result.current.weekdays()).toEqual(["M", "T", "W", "T", "F", "S", "S"])
  })
})
