"use client"

import { useLocale, useTranslations } from "next-intl"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { useSession } from "@/components/session/session-provider"
import { api, ApiError } from "@/lib/api/client"
import { useApiError } from "@/lib/api/errors"
import type { Me } from "@/lib/api/types"
import { notify as toast } from "@/lib/notify"
import { safeNext } from "@/lib/routes"
import { cn } from "@/lib/utils"
import { AuthHeading, FieldError, SubmitButton } from "./fields"

const LENGTH = 6
const COOLDOWN = 60

export function OtpForm({ email }: { email: string }) {
  const t = useTranslations("auth.verify")
  const v = useTranslations("validation")
  const locale = useLocale()
  const next = useSearchParams().get("next")
  const apiError = useApiError()
  const { setMe } = useSession()
  const nav = useRouter()
  const refs = useRef<(HTMLInputElement | null)[]>([])
  const [digits, setDigits] = useState<string[]>(Array(LENGTH).fill(""))
  const [error, setError] = useState<string>()
  const [shakeKey, setShakeKey] = useState(0)
  const [pending, setPending] = useState(false)
  const [left, setLeft] = useState(COOLDOWN)

  useEffect(() => {
    if (left <= 0) return
    const id = window.setTimeout(() => setLeft((s) => s - 1), 1000)
    return () => window.clearTimeout(id)
  }, [left])

  const fill = (from: number, chars: string) => {
    const nextDigits = [...digits]
    chars.split("").forEach((c, i) => {
      if (from + i < LENGTH) nextDigits[from + i] = c
    })
    setDigits(nextDigits)
    setError(undefined)
    refs.current[Math.min(from + chars.length, LENGTH - 1)]?.focus()
  }

  const fail = (message: string) => {
    setError(message)
    setShakeKey((k) => k + 1)
    setDigits(Array(LENGTH).fill(""))
    refs.current[0]?.focus()
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const code = digits.join("")
    if (code.length < LENGTH) return setError(v("code"))
    setPending(true)
    try {
      const me = await api<Me>("/auth/verify-email", { json: { email, code }, redirectOn401: false, retry: false })
      setMe(me)
      toast(t("done"))
      nav.replace(safeNext(next, me.preferred_locale ?? locale))
      nav.refresh()
    } catch (err) {
      if (err instanceof ApiError && err.code === "ALREADY_VERIFIED") {
        nav.replace(`/${locale}/login${next ? `?next=${encodeURIComponent(next)}` : ""}`)
        return
      }
      fail(apiError(err))
    } finally {
      setPending(false)
    }
  }

  const resend = async () => {
    try {
      await api("/auth/resend-otp", { json: { email, purpose: "verify" }, redirectOn401: false })
      setLeft(COOLDOWN)
      toast(t("resent"))
    } catch (err) {
      if (err instanceof ApiError && err.code === "RATE_LIMITED") setLeft(Number(err.body?.retry_after ?? COOLDOWN))
      setError(apiError(err))
    }
  }

  return (
    <>
      <AuthHeading title={t("title")} lead={t("lead", { email })} />
      <form noValidate onSubmit={submit} className="space-y-6">
        <fieldset>
          <legend className="text-caption font-medium text-charcoal">{t("codeLabel")}</legend>
          <div key={shakeKey} className={cn("mt-3 grid grid-cols-6 gap-2 sm:gap-3", shakeKey > 0 && "animate-shake")}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => {
                  refs.current[i] = el
                }}
                value={d}
                inputMode="numeric"
                autoComplete={i === 0 ? "one-time-code" : "off"}
                maxLength={1}
                aria-label={t("digit", { n: i + 1 })}
                aria-invalid={!!error}
                aria-describedby={error ? "otp-error" : undefined}
                onChange={(e) => {
                  const only = e.target.value.replace(/\D/g, "")
                  if (only) fill(i, only.slice(-1))
                  else {
                    const nextDigits = [...digits]
                    nextDigits[i] = ""
                    setDigits(nextDigits)
                  }
                }}
                onPaste={(e) => {
                  const only = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, LENGTH)
                  if (only) {
                    e.preventDefault()
                    fill(0, only)
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Backspace" && !digits[i] && i > 0) refs.current[i - 1]?.focus()
                  if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus()
                  if (e.key === "ArrowRight" && i < LENGTH - 1) refs.current[i + 1]?.focus()
                }}
                className={cn(
                  "aspect-[4/5] w-full rounded-2xl border bg-white text-center font-display text-[1.75rem] text-charcoal caret-forest transition-[border-color,box-shadow,transform] duration-200 outline-none focus:-translate-y-0.5 focus:border-forest focus:shadow-lift",
                  error ? "border-destructive/60" : d ? "border-forest/40" : "border-line",
                )}
              />
            ))}
          </div>
          <FieldError id="otp-error" message={error} />
        </fieldset>

        <SubmitButton pending={pending}>{t("submit")}</SubmitButton>

        <p className="text-center text-caption text-ink-soft" aria-live="polite">
          {left > 0 ? (
            t("resendIn", { seconds: left })
          ) : (
            <button
              type="button"
              onClick={resend}
              className="font-medium text-forest underline decoration-forest/30 underline-offset-4 hover:decoration-forest"
            >
              {t("resend")}
            </button>
          )}
        </p>
      </form>
    </>
  )
}
