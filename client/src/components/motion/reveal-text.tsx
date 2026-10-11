"use client"

import { Fragment, useEffect, useRef, type CSSProperties } from "react"
import { cn } from "@/lib/utils"

type Props = {
  text: string
  as?: "h1" | "h2" | "h3" | "p" | "span"
  className?: string
  id?: string
  /** `load` animates on first paint (hero); `view` waits until scrolled into view */
  trigger?: "load" | "view"
  /** ms before the first word starts */
  delay?: number
}

/**
 * Word-by-word masked text reveal. Words are rendered on the server, so the
 * text is always in the HTML; CSS only hides them when scripting is on and
 * motion is allowed (see `.reveal-text` in globals.css).
 */
export function RevealText({ text, as = "h2", className, id, trigger = "view", delay = 0 }: Props) {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (trigger === "load") return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.dataset.inview = ""
          io.disconnect()
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [trigger])

  const words = text.split(/\s+/).filter(Boolean)
  const Tag = as
  return (
    <Tag
      ref={ref as React.Ref<never>}
      id={id}
      className={cn("reveal-text", className)}
      data-trigger={trigger}
      data-inview={trigger === "load" ? "" : undefined}
      style={{ "--reveal-delay": `${delay}ms` } as CSSProperties}
    >
      {words.map((word, i) => (
        <Fragment key={i}>
          <span className="reveal-word">
            <span className="reveal-inner" style={{ "--i": i } as CSSProperties}>
              {word}
            </span>
          </span>
          {i < words.length - 1 ? " " : null}
        </Fragment>
      ))}
    </Tag>
  )
}
