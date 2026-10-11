/** Signed-in app surfaces (messages, dashboard): no footer, full-height content. */
export default function AppLayout({ children }: LayoutProps<"/[locale]">) {
  return (
    <main id="main" className="flex min-h-dvh flex-col pt-[var(--header-height)] pb-bottom-nav md:pb-0">
      {children}
    </main>
  )
}
