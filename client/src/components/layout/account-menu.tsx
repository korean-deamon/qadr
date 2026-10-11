"use client"

import { Bookmark, LayoutGrid, LogOut, Package, Settings, ShieldCheck } from "lucide-react"
import { useTranslations } from "next-intl"
import { DropdownMenu } from "radix-ui"
import { Avatar } from "@/components/ui/avatar"
import { useSession } from "@/components/session/session-provider"
import { Link, useRouter } from "@/i18n/navigation"
import { notify } from "@/lib/notify"

const item =
  "flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-caption text-charcoal outline-none transition-colors data-[highlighted]:bg-sage data-[highlighted]:text-forest"

export function AccountMenu() {
  const t = useTranslations("account")
  const { me, logout } = useSession()
  const router = useRouter()
  if (!me) return null

  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger
        aria-label={t("menu")}
        className="rounded-full outline-offset-4 transition-transform active:scale-95 data-[state=open]:ring-2 data-[state=open]:ring-forest/30"
      >
        <Avatar name={me.display_name} />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={10}
          className="z-50 w-64 rounded-2xl border border-line bg-white p-2 shadow-lift data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-2"
        >
          <div className="px-3 pt-2 pb-3">
            <p className="font-display text-[1.125rem] leading-tight text-charcoal">{me.display_name}</p>
            <p className="truncate text-meta text-ink-soft">{me.email}</p>
          </div>
          <DropdownMenu.Separator className="mx-2 mb-1 h-px bg-line" />
          {[
            { href: "/dashboard", label: t("dashboard"), icon: LayoutGrid },
            { href: "/my-items", label: t("myItems"), icon: Package },
            { href: "/saved", label: t("saved"), icon: Bookmark },
            { href: "/settings", label: t("settings"), icon: Settings },
            ...(me.is_admin ? [{ href: "/admin", label: t("admin"), icon: ShieldCheck }] : []),
          ].map(({ href, label, icon: Icon }) => (
            <DropdownMenu.Item key={href} asChild className={item}>
              <Link href={href}>
                <Icon className="size-4 text-ink-soft" aria-hidden="true" />
                {label}
              </Link>
            </DropdownMenu.Item>
          ))}
          <DropdownMenu.Separator className="mx-2 my-1 h-px bg-line" />
          <DropdownMenu.Item
            className={item}
            onSelect={async () => {
              await logout()
              notify(t("loggedOut"))
              router.push("/")
              router.refresh()
            }}
          >
            <LogOut className="size-4 text-ink-soft" aria-hidden="true" />
            {t("logout")}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
