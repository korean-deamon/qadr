"""Server-side message catalogue (emails, Telegram, notification texts) in uz/ru/en.

The web UI renders notifications from `type` + `payload` with its own dictionaries;
these strings are for channels outside the browser (email, Telegram).
"""

from typing import Any

T: dict[str, dict[str, str]] = {
    # ---- one-time codes -------------------------------------------------
    "otp.verify.subject": {
        "uz": "Qadr: tasdiqlash kodi {code}",
        "ru": "Qadr: код подтверждения {code}",
        "en": "Qadr: your verification code {code}",
    },
    "otp.verify.body": {
        "uz": "Salom, {name}!\n\nEmailingizni tasdiqlash kodi: {code}\nKod 10 daqiqa amal qiladi.\n\n"
        "Agar siz roʻyxatdan oʻtmagan boʻlsangiz, bu xatga eʼtibor bermang.",
        "ru": "Здравствуйте, {name}!\n\nКод подтверждения email: {code}\nКод действует 10 минут.\n\n"
        "Если вы не регистрировались, просто проигнорируйте это письмо.",
        "en": "Hi {name},\n\nYour email verification code is {code}.\nIt expires in 10 minutes.\n\n"
        "If you didn't sign up, you can ignore this email.",
    },
    "otp.reset.subject": {
        "uz": "Qadr: parolni tiklash kodi {code}",
        "ru": "Qadr: код для сброса пароля {code}",
        "en": "Qadr: password reset code {code}",
    },
    "otp.reset.body": {
        "uz": "Parolni tiklash kodi: {code}\nKod 10 daqiqa amal qiladi. Agar siz soʻramagan boʻlsangiz, eʼtibor bermang.",
        "ru": "Код для сброса пароля: {code}\nКод действует 10 минут. Если вы его не запрашивали, проигнорируйте.",
        "en": "Your password reset code is {code}.\nIt expires in 10 minutes. If you didn't ask for it, ignore this.",
    },
    # ---- notifications (title line) -------------------------------------
    "n.request_received": {
        "uz": "{actor} “{item}” uchun soʻrov yubordi ({dates}).",
        "ru": "{actor} хочет взять «{item}» ({dates}).",
        "en": "{actor} wants to borrow “{item}” ({dates}).",
    },
    "n.request_approved": {
        "uz": "{actor} “{item}” boʻyicha soʻrovingizni tasdiqladi ({dates}). Endi telefon raqamlari koʻrinadi.",
        "ru": "Запрос на «{item}» одобрен ({dates}). Теперь вы видите номера телефонов друг друга.",
        "en": "{actor} approved your request for “{item}” ({dates}). You can now see each other's phone numbers.",
    },
    "n.request_rejected": {
        "uz": "“{item}” boʻyicha soʻrovingiz rad etildi.",
        "ru": "Запрос на «{item}» отклонён.",
        "en": "Your request for “{item}” was declined.",
    },
    "n.request_cancelled": {
        "uz": "{actor} “{item}” boʻyicha soʻrovini bekor qildi.",
        "ru": "{actor} отменил(а) запрос на «{item}».",
        "en": "{actor} cancelled the request for “{item}”.",
    },
    "n.request_expired": {
        "uz": "“{item}” boʻyicha soʻrov muddati oʻtdi.",
        "ru": "Срок запроса на «{item}» истёк.",
        "en": "The request for “{item}” expired.",
    },
    "n.loan_picked_up": {
        "uz": "“{item}” olib ketildi. {due} gacha qaytaring.",
        "ru": "«{item}» передан(а). Вернуть до {due}.",
        "en": "“{item}” was picked up. Please return it by {due}.",
    },
    "n.loan_returned": {
        "uz": "“{item}” qaytarildi. {actor}ni baholang.",
        "ru": "«{item}» возвращён(а). Оцените: {actor}.",
        "en": "“{item}” was returned. Rate {actor}.",
    },
    "n.loan_return_claimed": {
        "uz": "{actor} “{item}”ni qaytarganini bildirdi. Iltimos, tasdiqlang.",
        "ru": "{actor} сообщает, что вернул(а) «{item}». Подтвердите возврат.",
        "en": "{actor} says “{item}” was returned. Please confirm.",
    },
    "n.loan_cancelled": {
        "uz": "“{item}” boʻyicha kelishuv bekor qilindi.",
        "ru": "Договорённость по «{item}» отменена.",
        "en": "The loan of “{item}” was cancelled.",
    },
    "n.return_due_tomorrow": {
        "uz": "Eslatma: “{item}” ertaga qaytarilishi kerak.",
        "ru": "Напоминание: «{item}» нужно вернуть завтра.",
        "en": "Reminder: “{item}” is due back tomorrow.",
    },
    "n.return_due_today": {
        "uz": "Eslatma: “{item}” bugun qaytarilishi kerak.",
        "ru": "Напоминание: «{item}» нужно вернуть сегодня.",
        "en": "Reminder: “{item}” is due back today.",
    },
    "n.rating_received": {
        "uz": "{actor} sizni {score} yulduz bilan baholadi.",
        "ru": "{actor} оценил(а) вас на {score} из 5.",
        "en": "{actor} rated you {score} out of 5.",
    },
    "n.new_message": {
        "uz": "{actor}dan yangi xabar: {preview}",
        "ru": "Новое сообщение от {actor}: {preview}",
        "en": "New message from {actor}: {preview}",
    },
    "n.moderation_message": {
        "uz": "Qadr moderatsiyasidan xabar: {text}",
        "ru": "Сообщение от модерации Qadr: {text}",
        "en": "Message from Qadr moderation: {text}",
    },
    "n.account_warned": {
        "uz": "Qadr moderatsiyasi ogohlantirish berdi: {reason}",
        "ru": "Модерация Qadr вынесла предупреждение: {reason}",
        "en": "Qadr moderation issued a warning: {reason}",
    },
    "n.account_restricted": {
        "uz": "Hisobingiz {until} gacha cheklandi: {reason}",
        "ru": "Ваш аккаунт ограничен до {until}: {reason}",
        "en": "Your account is restricted until {until}: {reason}",
    },
    "n.account_unrestricted": {
        "uz": "Hisobingizdagi cheklov olib tashlandi.",
        "ru": "Ограничение с вашего аккаунта снято.",
        "en": "The restriction on your account was lifted.",
    },
    "n.listing_hidden": {
        "uz": "“{item}” moderatsiya tomonidan yashirildi: {reason}",
        "ru": "«{item}» скрыто модерацией: {reason}",
        "en": "“{item}” was hidden by moderation: {reason}",
    },
    "n.listing_removed": {
        "uz": "“{item}” moderatsiya tomonidan oʻchirildi: {reason}",
        "ru": "«{item}» удалено модерацией: {reason}",
        "en": "“{item}” was removed by moderation: {reason}",
    },
    "n.listing_unhidden": {
        "uz": "“{item}” yana koʻrinadi.",
        "ru": "«{item}» снова видно.",
        "en": "“{item}” is visible again.",
    },
    "n.report_resolved": {
        "uz": "Shikoyatingiz koʻrib chiqildi: {reason}",
        "ru": "Ваша жалоба рассмотрена: {reason}",
        "en": "Your report was reviewed: {reason}",
    },
    "n.telegram_linked": {
        "uz": "Telegram ulandi. Telefon raqamingiz tasdiqlandi.",
        "ru": "Telegram подключён. Номер телефона подтверждён.",
        "en": "Telegram linked. Your phone number is verified.",
    },
    "email.notification.subject": {
        "uz": "Qadr: yangi bildirishnoma",
        "ru": "Qadr: новое уведомление",
        "en": "Qadr: new notification",
    },
    "email.footer": {
        "uz": "\n\n— Qadr. Har narsaning qadri bor.\n{url}",
        "ru": "\n\n— Qadr. У каждой вещи своя ценность.\n{url}",
        "en": "\n\n— Qadr. Good things are worth sharing.\n{url}",
    },
    # ---- Telegram bot ---------------------------------------------------
    "bot.welcome": {
        "uz": "Assalomu alaykum! Bu Qadr boti. Telefon raqamingizni ulash uchun saytdagi "
        "“Telegramni ulash” tugmasini bosing.",
        "ru": "Здравствуйте! Это бот Qadr. Чтобы привязать номер, нажмите «Подключить Telegram» на сайте.",
        "en": "Hello! This is the Qadr bot. To link your phone, tap “Link Telegram” on the website.",
    },
    "bot.ask_contact": {
        "uz": "Raqamingizni tasdiqlash uchun pastdagi tugma orqali kontaktingizni yuboring.",
        "ru": "Чтобы подтвердить номер, отправьте свой контакт кнопкой ниже.",
        "en": "To verify your number, share your contact with the button below.",
    },
    "bot.share_button": {"uz": "📱 Kontaktni yuborish", "ru": "📱 Отправить контакт", "en": "📱 Share my contact"},
    "bot.token_invalid": {
        "uz": "Havola eskirgan yoki allaqachon ishlatilgan. Saytdagi sozlamalardan yangisini oling: {url}",
        "ru": "Ссылка устарела или уже использована. Получите новую в настройках на сайте: {url}",
        "en": "This link has expired or was already used. Get a new one in your settings: {url}",
    },
    "bot.wrong_contact": {
        "uz": "Iltimos, oʻzingizning kontaktingizni yuboring (boshqa odamniki emas).",
        "ru": "Пожалуйста, отправьте свой собственный контакт, а не чужой.",
        "en": "Please share your own contact, not someone else's.",
    },
    "bot.no_pending": {
        "uz": "Avval saytdan “Telegramni ulash” havolasini oching.",
        "ru": "Сначала откройте ссылку «Подключить Telegram» на сайте.",
        "en": "First open the “Link Telegram” link from the website.",
    },
    "bot.phone_taken": {
        "uz": "Bu raqam boshqa Qadr hisobiga ulangan. Yordam kerak boʻlsa, biz bilan bogʻlaning.",
        "ru": "Этот номер уже привязан к другому аккаунту Qadr. Если нужна помощь, напишите нам.",
        "en": "This number is already linked to another Qadr account. Contact us if you need help.",
    },
    "bot.telegram_taken": {
        "uz": "Bu Telegram akkaunt boshqa Qadr hisobiga ulangan.",
        "ru": "Этот Telegram уже привязан к другому аккаунту Qadr.",
        "en": "This Telegram account is already linked to another Qadr account.",
    },
    "bot.linked": {
        "uz": "Tayyor! Raqamingiz {phone} tasdiqlandi. Endi kodlar va muhim bildirishnomalar shu yerga keladi.",
        "ru": "Готово! Номер {phone} подтверждён. Коды и важные уведомления будут приходить сюда.",
        "en": "Done! {phone} is verified. Codes and key notifications will arrive here.",
    },
    "bot.stopped": {
        "uz": "Bildirishnomalar oʻchirildi. Kodlar baribir keladi. Qayta yoqish: /notify",
        "ru": "Уведомления выключены. Коды всё равно будут приходить. Включить снова: /notify",
        "en": "Notifications are off. Codes will still arrive. Turn them back on: /notify",
    },
    "bot.notify_on": {"uz": "Bildirishnomalar yoqildi.", "ru": "Уведомления включены.", "en": "Notifications are on."},
    "bot.help": {
        "uz": "/stop — bildirishnomalarni oʻchirish\n/notify — yoqish\nSayt: {url}",
        "ru": "/stop — выключить уведомления\n/notify — включить\nСайт: {url}",
        "en": "/stop — turn notifications off\n/notify — turn them on\nWebsite: {url}",
    },
    "bot.otp": {
        "uz": "Qadr kodi: <b>{code}</b>\n10 daqiqa amal qiladi. Hech kimga bermang.",
        "ru": "Код Qadr: <b>{code}</b>\nДействует 10 минут. Никому его не сообщайте.",
        "en": "Qadr code: <b>{code}</b>\nValid for 10 minutes. Never share it.",
    },
}


def t(key: str, locale: str, **params: Any) -> str:
    entry = T.get(key)
    if not entry:
        return key
    text = entry.get(locale) or entry.get("uz") or next(iter(entry.values()))
    try:
        return text.format(**params)
    except (KeyError, IndexError):
        return text
