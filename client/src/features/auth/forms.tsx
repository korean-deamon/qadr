"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useLocale, useTranslations } from "next-intl"
import { useRouter as useNextRouter, useSearchParams } from "next/navigation"
import { useState } from "react"
import { useForm, useWatch } from "react-hook-form"
import { notify as toast } from "@/lib/notify"
import { z } from "zod/mini"
import { useSession } from "@/components/session/session-provider"
import { Link, useRouter } from "@/i18n/navigation"
import { api } from "@/lib/api/client"
import { useApiError } from "@/lib/api/errors"
import type { Me } from "@/lib/api/types"
import { safeNext } from "@/lib/routes"
import { cn } from "@/lib/utils"
import { AuthHeading, Field, FormAlert, PasswordField, SubmitButton } from "./fields"
import { ContinueWithGoogle } from "./google-button"

function useSchemas() {
  const v = useTranslations("validation")
  const email = z.pipe(z.string().check(z.trim(), z.minLength(1, v("required"))), z.email(v("email")))
  const password = z.string().check(z.minLength(8, v("passwordMin")))
  return { v, email, password }
}

/* ------------------------------------------------------------------ */

export function LoginForm() {
  const t = useTranslations("auth")
  const locale = useLocale()
  const next = useSearchParams().get("next")
  const { setMe } = useSession()
  const nav = useNextRouter()
  const apiError = useApiError()
  const [error, setError] = useState<string>()
  const { v, email } = useSchemas()
  const schema = z.object({ email, password: z.string().check(z.minLength(1, v("required"))) })
  const { register, handleSubmit, formState } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) })

  return (
    <>
      <AuthHeading title={t("login.title")} lead={t("login.lead")} />
      <form
        noValidate
        className="space-y-5"
        onSubmit={handleSubmit(async (data) => {
          setError(undefined)
          try {
            const me = await api<Me>("/auth/login", { json: data, redirectOn401: false, retry: false })
            setMe(me)
            toast(t("login.done"))
            const target = safeNext(next, me.preferred_locale ?? locale)
            // replace + refresh so every server component renders with the new session
            nav.replace(me.telegram_required ? connectUrl(me.preferred_locale ?? locale, target) : target)
            nav.refresh()
          } catch (e) {
            setError(apiError(e))
          }
        })}
      >
        <FormAlert message={error} />
        <Field label={t("email")} type="email" autoComplete="email" inputMode="email" error={formState.errors.email?.message} {...register("email")} />
        <div>
          <PasswordField label={t("password")} autoComplete="current-password" error={formState.errors.password?.message} {...register("password")} />
          <div className="mt-2 text-right">
            <Link href="/forgot-password" className="text-meta font-medium text-forest underline-offset-4 hover:underline">{t("login.forgot")}</Link>
          </div>
        </div>
        <SubmitButton pending={formState.isSubmitting}>{t("login.submit")}</SubmitButton>
      </form>
      <div className="mt-7">
        <ContinueWithGoogle onError={setError} />
      </div>
      <p className="mt-8 text-center text-caption text-ink-soft">
        {t("login.noAccount")}{" "}
        <Link href={next ? { pathname: "/register", query: { next } } : "/register"} className="font-medium text-forest underline decoration-forest/30 underline-offset-4 hover:decoration-forest">{t("login.create")}</Link>
      </p>
    </>
  )
}

/* ------------------------------------------------------------------ */

function strength(pw: string) {
  let s = 0
  if (pw.length >= 8) s++
  if (pw.length >= 12) s++
  if (/[A-ZА-ЯЁ]/.test(pw) && /[a-zа-яё]/.test(pw)) s++
  if (/\d/.test(pw) && /[^\p{L}\d]/u.test(pw)) s++
  return Math.min(4, s)
}

function StrengthMeter({ value }: { value: string }) {
  const t = useTranslations("auth.strength")
  const score = strength(value)
  const levels = ["weak", "weak", "fair", "good", "strong"] as const
  const tone = ["bg-destructive", "bg-destructive", "bg-ochre", "bg-forest", "bg-forest"][score]
  if (!value) return null
  return (
    <div className="mt-2.5" aria-live="polite">
      <div className="grid grid-cols-4 gap-1.5" aria-hidden="true">
        {[1, 2, 3, 4].map((i) => (
          <span key={i} className="h-1 overflow-hidden rounded-full bg-sage">
            <span
              className={cn("block h-full rounded-full transition-[width,background-color] duration-400 ease-[var(--ease-qadr)]", tone)}
              style={{ width: i <= Math.max(score, 1) ? "100%" : "0%" }}
            />
          </span>
        ))}
      </div>
      <p className="mt-1.5 text-meta text-ink-soft">{t("label", { level: t(levels[score]) })}</p>
    </div>
  )
}

/** Unlinked accounts finish signing in on the Telegram step (SPEC §11). */
function connectUrl(locale: string, next: string) {
  return `/${locale}/connect-telegram?next=${encodeURIComponent(next)}`
}

export function RegisterForm() {
  const t = useTranslations("auth")
  const locale = useLocale()
  const nav = useNextRouter()
  const { setMe } = useSession()
  const next = useSearchParams().get("next")
  const apiError = useApiError()
  const [error, setError] = useState<string>()
  const { v, email, password } = useSchemas()
  const schema = z.object({ name: z.string().check(z.trim(), z.minLength(2, v("nameMin"))), email, password })
  const { register, handleSubmit, formState, control } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) })
  const pw = useWatch({ control, name: "password" })

  return (
    <>
      <AuthHeading title={t("register.title")} lead={t("register.lead")} />
      <form
        noValidate
        className="space-y-5"
        onSubmit={handleSubmit(async (data) => {
          setError(undefined)
          try {
            const me = await api<Me>("/auth/register", {
              json: { email: data.email, password: data.password, display_name: data.name, locale },
              redirectOn401: false,
            })
            setMe(me)
            toast(t("register.done"))
            nav.replace(connectUrl(locale, safeNext(next, locale)))
            nav.refresh()
          } catch (e) {
            setError(apiError(e))
          }
        })}
      >
        <FormAlert message={error} />
        <Field label={t("register.name")} autoComplete="name" error={formState.errors.name?.message} {...register("name")} />
        <Field label={t("email")} type="email" autoComplete="email" inputMode="email" error={formState.errors.email?.message} {...register("email")} />
        <div>
          <PasswordField label={t("password")} autoComplete="new-password" hint={t("register.passwordHint")} error={formState.errors.password?.message} {...register("password")} />
          <StrengthMeter value={pw ?? ""} />
        </div>
        <p className="text-meta text-ink-soft">{t("register.agree")}</p>
        <SubmitButton pending={formState.isSubmitting}>{t("register.submit")}</SubmitButton>
      </form>
      <div className="mt-7">
        <ContinueWithGoogle onError={setError} />
      </div>
      <p className="mt-8 text-center text-caption text-ink-soft">
        {t("register.haveAccount")}{" "}
        <Link href="/login" className="font-medium text-forest underline decoration-forest/30 underline-offset-4 hover:decoration-forest">{t("login.submit")}</Link>
      </p>
    </>
  )
}

/* ------------------------------------------------------------------ */

export function ForgotForm() {
  const t = useTranslations("auth")
  const router = useRouter()
  const apiError = useApiError()
  const [error, setError] = useState<string>()
  const { email } = useSchemas()
  const schema = z.object({ email })
  const { register, handleSubmit, formState } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) })
  return (
    <>
      <AuthHeading title={t("forgot.title")} lead={t("forgot.lead")} />
      <form
        noValidate
        className="space-y-5"
        onSubmit={handleSubmit(async (data) => {
          setError(undefined)
          try {
            await api("/auth/forgot-password", { json: data, redirectOn401: false })
            toast(t("forgot.done"))
            router.push({ pathname: "/reset-password", query: { email: data.email.trim().toLowerCase() } })
          } catch (e) {
            setError(apiError(e))
          }
        })}
      >
        <FormAlert message={error} />
        <Field label={t("email")} type="email" autoComplete="email" inputMode="email" error={formState.errors.email?.message} {...register("email")} />
        <SubmitButton pending={formState.isSubmitting}>{t("forgot.submit")}</SubmitButton>
      </form>
      <p className="mt-8 text-center text-caption">
        <Link href="/login" className="font-medium text-forest underline decoration-forest/30 underline-offset-4 hover:decoration-forest">{t("forgot.back")}</Link>
      </p>
    </>
  )
}

export function ResetForm() {
  const t = useTranslations("auth")
  const router = useRouter()
  const initialEmail = useSearchParams().get("email") ?? ""
  const apiError = useApiError()
  const [error, setError] = useState<string>()
  const { v, email, password } = useSchemas()
  const schema = z
    .object({ email, code: z.string().check(z.regex(/^\d{6}$/, v("code"))), password, confirm: z.string() })
    .check(z.refine((d) => d.password === d.confirm, { path: ["confirm"], message: v("passwordMatch") }))
  const { register, handleSubmit, formState } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { email: initialEmail },
  })
  return (
    <>
      <AuthHeading title={t("reset.title")} lead={t("reset.lead")} />
      <form
        noValidate
        className="space-y-5"
        onSubmit={handleSubmit(async (data) => {
          setError(undefined)
          try {
            await api("/auth/reset-password", { json: { email: data.email, code: data.code, password: data.password }, redirectOn401: false })
            toast(t("reset.done"))
            router.push("/login")
          } catch (e) {
            setError(apiError(e))
          }
        })}
      >
        <FormAlert message={error} />
        <Field label={t("email")} type="email" autoComplete="email" inputMode="email" error={formState.errors.email?.message} {...register("email")} className={initialEmail ? "hidden" : undefined} />
        <Field label={t("reset.code")} inputMode="numeric" autoComplete="one-time-code" maxLength={6} error={formState.errors.code?.message} {...register("code")} className="[&_input]:font-display [&_input]:text-[1.25rem] [&_input]:tracking-[0.4em]" />
        <PasswordField label={t("reset.newPassword")} autoComplete="new-password" error={formState.errors.password?.message} {...register("password")} />
        <PasswordField label={t("reset.confirm")} autoComplete="new-password" error={formState.errors.confirm?.message} {...register("confirm")} />
        <SubmitButton pending={formState.isSubmitting}>{t("reset.submit")}</SubmitButton>
      </form>
    </>
  )
}
