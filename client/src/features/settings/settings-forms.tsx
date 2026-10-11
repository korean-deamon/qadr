"use client"

import { useLocale, useTranslations } from "next-intl"
import { useState } from "react"
import { useSession } from "@/components/session/session-provider"
import { Button } from "@/components/ui/button"
import { Field, FormAlert, PasswordField } from "@/features/auth/fields"
import { usePathname, useRouter } from "@/i18n/navigation"
import { routing } from "@/i18n/routing"
import { api } from "@/lib/api/client"
import { useApiError } from "@/lib/api/errors"
import type { Me } from "@/lib/api/types"
import { notify } from "@/lib/notify"
import { cn } from "@/lib/utils"

function Card({ title, children, tone }: { title: string; children: React.ReactNode; tone?: "danger" }) {
  return (
    <section className={cn("rounded-[1.75rem] border bg-white p-6 md:p-8", tone === "danger" ? "border-destructive/25" : "border-line")}>
      <h2 className={cn("text-[1.5rem] leading-tight", tone === "danger" ? "text-destructive" : "text-charcoal")}>{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  )
}

export function ProfileForm() {
  const t = useTranslations("settings")
  const apiError = useApiError()
  const { me, setMe } = useSession()
  const [name, setName] = useState(me?.display_name ?? "")
  const [area, setArea] = useState(me?.area ?? "")
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)
  return (
    <Card title={t("profile")}>
      <form
        className="grid gap-5 md:grid-cols-2"
        onSubmit={async (e) => {
          e.preventDefault()
          setBusy(true)
          setError(undefined)
          try {
            setMe(await api<Me>("/users/me", { method: "PATCH", json: { display_name: name, area: area || null } }))
            notify(t("saved"))
          } catch (err) {
            setError(apiError(err))
          } finally {
            setBusy(false)
          }
        }}
      >
        <div className="md:col-span-2"><FormAlert message={error} /></div>
        <Field label={t("name")} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required minLength={2} />
        <Field label={t("area")} hint={t("areaHint")} value={area} onChange={(e) => setArea(e.target.value)} />
        <div className="md:col-span-2">
          <Button type="submit" disabled={busy}>{t("save")}</Button>
        </div>
      </form>
    </Card>
  )
}

export function LanguageForm() {
  const t = useTranslations()
  const locale = useLocale()
  const apiError = useApiError()
  const router = useRouter()
  const pathname = usePathname()
  const { setMe } = useSession()
  return (
    <Card title={t("settings.language")}>
      <p className="text-caption text-ink-soft">{t("settings.languageHint")}</p>
      <div className="mt-4 flex flex-wrap gap-2" role="radiogroup" aria-label={t("settings.language")}>
        {routing.locales.map((l) => (
          <button
            key={l}
            type="button"
            role="radio"
            aria-checked={l === locale}
            lang={l}
            onClick={async () => {
              try {
                setMe(await api<Me>("/users/me", { method: "PATCH", json: { preferred_locale: l } }))
                document.cookie = `QADR_LOCALE=${l}; path=/; max-age=31536000; samesite=lax`
                router.replace(pathname, { locale: l })
              } catch (err) {
                notify(apiError(err))
              }
            }}
            className={cn(
              "h-11 rounded-full border px-5 text-caption font-medium transition-colors",
              l === locale ? "border-forest bg-forest text-ivory" : "border-line bg-white text-charcoal hover:border-forest/40",
            )}
          >
            {t(`common.locales.${l}`)}
          </button>
        ))}
      </div>
    </Card>
  )
}

export function PasswordForm() {
  const t = useTranslations()
  const apiError = useApiError()
  const router = useRouter()
  const { me, setMe } = useSession()
  const [stage, setStage] = useState<"idle" | "code">("idle")
  const [code, setCode] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)
  if (!me) return null
  return (
    <Card title={t("settings.password")}>
      <p className="text-caption text-ink-soft">{t("settings.changePasswordHint")}</p>
      <FormAlert message={error} />
      {stage === "idle" ? (
        <Button
          className="mt-4"
          variant="outline"
          disabled={busy}
          onClick={async () => {
            setBusy(true)
            try {
              await api("/auth/forgot-password", { json: { email: me.email } })
              setStage("code")
            } catch (err) {
              setError(apiError(err))
            } finally {
              setBusy(false)
            }
          }}
        >
          {t("settings.changePassword")}
        </Button>
      ) : (
        <form
          className="mt-4 grid gap-5 md:grid-cols-2"
          onSubmit={async (e) => {
            e.preventDefault()
            setBusy(true)
            setError(undefined)
            try {
              await api("/auth/reset-password", { json: { email: me.email, code, password } })
              notify(t("auth.reset.done"))
              setMe(null) // all sessions were revoked by the reset
              router.replace("/login")
              router.refresh()
            } catch (err) {
              setError(apiError(err))
            } finally {
              setBusy(false)
            }
          }}
        >
          <Field label={t("auth.reset.code")} inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
          <PasswordField label={t("auth.reset.newPassword")} autoComplete="new-password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
          <div className="md:col-span-2">
            <Button type="submit" disabled={busy || code.length !== 6 || password.length < 8}>{t("auth.reset.submit")}</Button>
          </div>
        </form>
      )}
    </Card>
  )
}

export function DeleteAccount() {
  const t = useTranslations("settings")
  const apiError = useApiError()
  const router = useRouter()
  const { setMe } = useSession()
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)
  return (
    <Card title={t("danger")} tone="danger">
      <p className="max-w-[60ch] text-caption text-ink-soft">{t("dangerBody")}</p>
      <form
        className="mt-5 flex flex-col gap-4 md:flex-row md:items-end"
        onSubmit={async (e) => {
          e.preventDefault()
          setBusy(true)
          setError(undefined)
          try {
            await api("/users/me", { method: "DELETE", json: { password } })
            notify(t("deleted"))
            setMe(null)
            router.replace("/")
            router.refresh()
          } catch (err) {
            setError(apiError(err))
          } finally {
            setBusy(false)
          }
        }}
      >
        <PasswordField label={t("deleteConfirm")} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="md:w-80" />
        <Button type="submit" variant="destructive" disabled={busy || !password}>{t("delete")}</Button>
      </form>
      <FormAlert message={error} />
    </Card>
  )
}
