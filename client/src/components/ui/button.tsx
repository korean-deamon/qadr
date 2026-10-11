import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Slot } from "radix-ui"

/** Qadr buttons: pill shapes, forest primary, tactile press state. */
const buttonVariants = cva(
  "group/button relative inline-flex shrink-0 items-center justify-center gap-2 rounded-full font-medium whitespace-nowrap transition-[background-color,color,box-shadow,transform,border-color] duration-200 ease-[var(--ease-qadr)] outline-none select-none focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-forest active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 aria-invalid:outline-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-[1.125rem]",
  {
    variants: {
      variant: {
        default: "bg-forest text-ivory shadow-soft hover:bg-forest-deep hover:shadow-lift",
        secondary: "bg-sage text-forest hover:bg-[color-mix(in_oklab,var(--qadr-sage),var(--qadr-forest)_8%)]",
        outline: "border border-line bg-white text-charcoal hover:border-forest/40 hover:text-forest",
        ghost: "text-charcoal hover:bg-sage hover:text-forest",
        inverse: "bg-ivory text-forest hover:bg-white",
        destructive: "border border-destructive/30 bg-white text-destructive hover:bg-destructive hover:text-white",
        link: "rounded-md px-0 text-forest underline decoration-forest/30 underline-offset-[6px] hover:decoration-forest active:scale-100",
      },
      size: {
        default: "h-11 px-6 text-caption",
        sm: "h-9 px-4 text-meta",
        lg: "h-13 px-8 text-body",
        icon: "size-11",
        "icon-sm": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
