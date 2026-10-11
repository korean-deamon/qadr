/** Wall-clock time in Tashkent (UTC+5, no DST), independent of the viewer's timezone. */
export function tashkentTime(d: Date) {
  const h = (d.getUTCHours() + 5) % 24
  return `${String(h).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`
}

/** Calendar-day difference between two instants, in Tashkent. */
export function tashkentDayDiff(a: Date, b: Date) {
  const day = (d: Date) => Math.floor((d.getTime() + 5 * 3_600_000) / 86_400_000)
  return day(a) - day(b)
}
