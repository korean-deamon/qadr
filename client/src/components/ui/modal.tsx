"use client"

import { X } from "lucide-react"
import { useTranslations } from "next-intl"
import { Dialog } from "radix-ui"
import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/** Bottom sheet on phones, centred card from `sm` up. Same motion language as the filters sheet. */
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  trigger,
  children,
  className,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  trigger?: ReactNode
  children: ReactNode
  className?: string
}) {
  const t = useTranslations("common")
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger ? <Dialog.Trigger asChild>{trigger}</Dialog.Trigger> : null}
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-charcoal/40 backdrop-blur-[2px] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content
          data-lenis-prevent
          className={cn(
            "fixed inset-x-0 bottom-0 z-50 max-h-[88dvh] overflow-y-auto rounded-t-[1.75rem] bg-ivory px-[var(--gutter)] pt-3 pb-[calc(1.25rem+env(safe-area-inset-bottom))] duration-500 ease-[var(--ease-qadr)] data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom",
            "sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:w-[min(32rem,calc(100vw-2rem))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[1.75rem] sm:p-8 sm:shadow-lift sm:data-[state=closed]:slide-out-to-bottom-4 sm:data-[state=open]:slide-in-from-bottom-4",
            className,
          )}
        >
          <span aria-hidden="true" className="mx-auto mb-4 block h-1 w-10 rounded-full bg-line sm:hidden" />
          <div className="mb-5 flex items-start justify-between gap-4">
            <Dialog.Title className="font-display text-[1.75rem] leading-tight text-charcoal">{title}</Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon-sm" aria-label={t("close")}>
                <X aria-hidden="true" />
              </Button>
            </Dialog.Close>
          </div>
          {description ? (
            <Dialog.Description className="-mt-3 mb-5 text-caption text-ink-soft">{description}</Dialog.Description>
          ) : (
            <Dialog.Description className="sr-only">{title}</Dialog.Description>
          )}
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export const fieldClass =
  "w-full rounded-2xl border border-line bg-white px-4 py-3 text-body text-charcoal transition-[border-color,box-shadow] placeholder:text-ink-soft focus:border-forest/50 focus:shadow-soft focus:outline-none"
