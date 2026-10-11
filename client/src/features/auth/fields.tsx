"use client"

import { Eye, EyeOff, Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { forwardRef, useId, useState, type InputHTMLAttributes, type ReactNode } from "react"
import { Magnetic } from "@/components/motion/magnetic"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type FieldProps = InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; hint?: string; trailing?: ReactNode }

export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field({ label, error, hint, trailing, className, ...props }, ref) {
  const id = useId()
  const describedBy = [error ? `${id}-err` : null, hint ? `${id}-hint` : null].filter(Boolean).join(" ") || undefined
  return (
    <div className={className}>
      <label htmlFor={id} className="text-caption font-medium text-charcoal">{label}</label>
      <div
        className={cn(
          "mt-2 flex items-center rounded-2xl border bg-white transition-[border-color,box-shadow] duration-200 focus-within:shadow-soft",
          error ? "border-destructive/60" : "border-line focus-within:border-forest/50",
        )}
      >
        <input
          ref={ref}
          id={id}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          className="h-12 w-full min-w-0 bg-transparent px-4 text-body text-charcoal outline-none placeholder:text-ink-soft"
          {...props}
        />
        {trailing}
      </div>
      {hint && !error ? <p id={`${id}-hint`} className="mt-1.5 text-meta text-ink-soft">{hint}</p> : null}
      <FieldError id={`${id}-err`} message={error} />
    </div>
  )
})

export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return (
    <p key={message} id={id} role="alert" className="mt-1.5 animate-in-up text-meta font-medium text-destructive">
      {message}
    </p>
  )
}

export const PasswordField = forwardRef<HTMLInputElement, Omit<FieldProps, "type" | "trailing">>(function PasswordField(props, ref) {
  const t = useTranslations("auth")
  const [shown, setShown] = useState(false)
  return (
    <Field
      ref={ref}
      type={shown ? "text" : "password"}
      trailing={
        <button
          type="button"
          onClick={() => setShown((s) => !s)}
          aria-label={shown ? t("hidePassword") : t("showPassword")}
          aria-pressed={shown}
          className="mr-1.5 flex size-9 shrink-0 items-center justify-center rounded-xl text-ink-soft transition-colors hover:bg-sage hover:text-forest"
        >
          {shown ? <EyeOff className="size-[1.125rem]" aria-hidden="true" /> : <Eye className="size-[1.125rem]" aria-hidden="true" />}
        </button>
      }
      {...props}
    />
  )
})

export function SubmitButton({ pending, children }: { pending: boolean; children: ReactNode }) {
  return (
    <Magnetic strength={0.12} className="w-full [&>button]:w-full">
      <Button type="submit" size="lg" className="w-full" disabled={pending} aria-busy={pending}>
        {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
        {children}
      </Button>
    </Magnetic>
  )
}

export function AuthHeading({ title, lead }: { title: string; lead: ReactNode }) {
  return (
    <div className="mb-9">
      <h1 className="text-title text-forest">{title}</h1>
      <p className="mt-3 text-body text-ink-soft">{lead}</p>
    </div>
  )
}

/** Form-level error (API errors), announced to screen readers. */
export function FormAlert({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p key={message} role="alert" className="animate-in-up rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-caption font-medium text-destructive">
      {message}
    </p>
  )
}
