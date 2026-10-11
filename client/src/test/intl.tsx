import { render } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"
import type { ReactElement } from "react"
import en from "../../messages/en.json"
import uz from "../../messages/uz.json"

const dictionaries = { en, uz }

export function renderWithIntl(ui: ReactElement, locale: keyof typeof dictionaries = "en") {
  return render(
    <NextIntlClientProvider locale={locale} messages={dictionaries[locale]} timeZone="Asia/Tashkent">
      {ui}
    </NextIntlClientProvider>,
  )
}
