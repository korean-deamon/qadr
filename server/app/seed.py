"""Demo data: categories, users (incl. an admin), listings with images, and live
activity (requests, loans, conversations, notifications, a report).

Run: `uv run python -m app.seed` (idempotent) or `--reset` to wipe and reseed.
"""

import asyncio
import random
import sys
import uuid
from datetime import date, datetime, timedelta
from pathlib import Path

from sqlalchemy import select, text

import app.models  # noqa: F401
from app.core.db import SessionLocal, engine
from app.core.security import hash_password
from app.core.time import now_utc, today_tashkent
from app.modules.auth.models import User
from app.modules.borrowing.models import BorrowRequest
from app.modules.categories.models import Category, CategoryTranslation
from app.modules.listings.models import Listing, ListingImage
from app.modules.loans.models import Loan
from app.modules.messages.models import Conversation, ConversationParticipant, Message
from app.modules.moderation.models import Report
from app.modules.notifications.models import Notification
from app.modules.ratings.models import Rating
from app.storage.base import get_storage

IMAGES = Path(__file__).parent / "seed_data" / "images"
DEMO_PASSWORD = "Demo12345!"
ADMIN_PASSWORD = "Admin12345!"

CATEGORIES = [
    ("tools", "tools-wall", {"uz": "Asboblar", "ru": "Инструменты", "en": "Tools"}),
    ("books", "bookshelf", {"uz": "Kitoblar", "ru": "Книги", "en": "Books"}),
    ("camping", "tent-mountain", {"uz": "Sayohat va tabiat", "ru": "Походы и отдых", "en": "Camping and outdoors"}),
    ("photo", "camera", {"uz": "Foto va video", "ru": "Фото и видео", "en": "Photo and video"}),
    ("kitchen", "mixer", {"uz": "Oshxona", "ru": "Кухня", "en": "Kitchen"}),
    ("sports", "bike", {"uz": "Sport", "ru": "Спорт", "en": "Sports"}),
    ("music", "guitar", {"uz": "Musiqa", "ru": "Музыка", "en": "Music"}),
    ("kids", "board-game", {"uz": "Bolalar uchun", "ru": "Детям", "en": "For kids"}),
]

# Approximate district centres in Tashkent (listing coordinates stay private)
AREAS = {
    "Yunusobod": (41.364, 69.288),
    "Chilonzor": (41.275, 69.204),
    "Mirobod": (41.293, 69.281),
    "Mirzo Ulugʻbek": (41.330, 69.335),
    "Yakkasaroy": (41.287, 69.257),
    "Sergeli": (41.226, 69.220),
    "Shayxontohur": (41.324, 69.231),
}

USERS = [
    # key, name, email, area, phone, admin
    ("me", "Dilnoza Karimova", "demo@qadr.uz", "Yunusobod", "+998901234567", False),
    ("sardor", "Sardor Rahimov", "sardor@qadr.uz", "Chilonzor", "+998935552014", False),
    ("malika", "Malika Yusupova", "malika@qadr.uz", "Mirobod", "+998974108803", False),
    ("aziza", "Aziza Tosheva", "aziza@qadr.uz", "Yunusobod", "+998907023155", False),
    ("jasur", "Jasur Ergashev", "jasur@qadr.uz", "Mirzo Ulugʻbek", "+998991186420", False),
    ("timur", "Тимур Ахмедов", "timur@qadr.uz", "Yakkasaroy", "+998909771240", False),
    ("bekzod", "Bekzod Nazarov", "bekzod@qadr.uz", "Sergeli", None, False),
    ("olga", "Ольга Ким", "olga@qadr.uz", "Mirobod", "+998973004512", False),
    ("nodira", "Nodira Alimova", "nodira@qadr.uz", "Shayxontohur", "+998936401809", False),
    ("admin", "Qadr Moderator", "admin@qadr.uz", "Mirobod", None, True),
]

# key, owner, category, title, condition, max_days, images, description, terms, days_ago
LISTINGS = [
    (
        "tent",
        "sardor",
        "camping",
        "4 kishilik chodir, Naturehike",
        "good",
        7,
        ["tent-mountain", "tent-view", "kayak"],
        "Ikki qavatli, yengil (2,6 kg) chodir. Chimyon, Zomin va Arslonbobda sinovdan oʻtgan, yomgʻirda ham quruq qoladi. "
        "Qoziqlar, tortqichlar va qopi bilan beriladi.",
        [
            "Quruq va tozalangan holda qaytaring",
            "Olib ketish: Chilonzor, 9-mavze",
            "Yoʻqolgan qoziq uchun oʻrnini qoplaysiz",
        ],
        2,
    ),
    (
        "camera",
        "malika",
        "photo",
        "Беззеркальная камера с объективом 35 мм",
        "good",
        3,
        ["camera", "projector"],
        "Fujifilm X-T30 и объектив 35 мм f/2. Два аккумулятора, зарядка, карта на 64 ГБ. "
        "Отлично подходит для свадеб, поездок и портретов.",
        ["Только для аккуратного использования", "Встреча у метро Космонавтов", "Карту памяти верните очищенной"],
        4,
    ),
    (
        "mixer",
        "me",
        "kitchen",
        "Planetar mikser, 5 litr",
        "new",
        5,
        ["mixer"],
        "Kenwood planetar mikseri: xamir ilmogʻi, koʻpirtirgich va aralashtirgich bilan. Bayram oldidan pishiriq qilish uchun ayni muddao.",
        ["Yuvilgan holda qaytaring", "Olib ketish: Yunusobod, 4-kvartal"],
        1,
    ),
    (
        "bike",
        "jasur",
        "sports",
        "Shosse velosipedi, 54 oʻlcham",
        "good",
        2,
        ["bike"],
        "Alyuminiy rama, 2×9 tezlik. Yaqinda texnik koʻrikdan oʻtgan. Dubulgʻa va qulf ham beriladi.",
        ["Faqat asfalt yoʻllarda", "Shina teshilsa, oʻzingiz yamaysiz"],
        6,
    ),
    (
        "sockets",
        "timur",
        "tools",
        "Набор торцевых головок, 94 предмета",
        "used",
        10,
        ["sockets", "tools-wall"],
        'Полный набор: головки 4–32 мм, трещотки 1/4" и 1/2", удлинители, биты. Всё в кейсе, ничего не потеряно.',
        ["Сверьте комплект при получении и возврате"],
        9,
    ),
    (
        "kayak",
        "bekzod",
        "sports",
        "Ikki kishilik kayak va eshkaklar",
        "good",
        4,
        ["kayak"],
        "Puflama kayak, ikkita eshkak, nasos va qutqaruv jiletlari. Chorvoq uchun ideal.",
        ["Faqat suzish kiyimida foydalaning", "Qumdan tozalab qaytaring"],
        3,
    ),
    (
        "drill",
        "me",
        "tools",
        "Zarbli matkap Bosch, 18 V",
        "good",
        5,
        ["hero-drill", "hammer"],
        "Ikki akkumulyator, zaryadlovchi va 10 ta parma. Beton devorga javon osish uchun yetarli kuchli.",
        [
            "Parmalarni sindirsangiz, xuddi shunday parma bilan almashtiring",
            "Olib ketish: Yunusobod, Amir Temur shoh koʻchasi",
        ],
        12,
    ),
    (
        "projector",
        "olga",
        "photo",
        "Слайд-проектор Kodak и 200 слайдов",
        "used",
        3,
        ["projector"],
        "Работает, лампа новая. Для домашнего показа семейных слайдов или винтажной вечеринки.",
        ["Не оставлять включённым без присмотра"],
        15,
    ),
    (
        "sewing",
        "me",
        "kitchen",
        "Tikuv mashinasi Janome",
        "good",
        7,
        ["sewing-machine"],
        "Uy uchun elektr tikuv mashinasi, 15 xil chok. Ignalar va ip gʻaltaklari bilan.",
        ["Ignani sindirsangiz, almashtirib qoʻying"],
        5,
    ),
    (
        "chess",
        "sardor",
        "kids",
        "Shaxmat toʻplami, yogʻoch",
        "good",
        14,
        ["chess"],
        "Katta yogʻoch donalar va taxta. Bolalar bilan oʻrganish uchun qulay.",
        ["Donalarni sanab qaytaring"],
        20,
    ),
    (
        "tennis",
        "timur",
        "sports",
        "Теннисные ракетки, 2 шт. и мячи",
        "used",
        3,
        ["tennis"],
        "Две ракетки Head среднего уровня и банка мячей. Подойдут, чтобы попробовать теннис перед покупкой своей.",
        [],
        8,
    ),
    (
        "grinder",
        "malika",
        "kitchen",
        "Qoʻl qahva tegirmoni",
        "new",
        7,
        ["coffee-grinder"],
        "Keramik tegirmon toshlari, maydalikni sozlash mumkin. Sayohatga olib ketish uchun qulay.",
        ["Faqat qahva uchun"],
        2,
    ),
    (
        "skate",
        "jasur",
        "sports",
        "Skeytbord, 8 dyuym",
        "good",
        5,
        ["skateboard"],
        "Yangi gʻildiraklar va podshipniklar. Boshlovchilar uchun ham qulay.",
        ["Himoya vositalarini oʻzingiz taqing"],
        10,
    ),
    (
        "books",
        "olga",
        "books",
        "Детские книги, 30 шт.",
        "good",
        21,
        ["books", "bookshelf"],
        "Сказки, энциклопедии и книги с картинками для 4–8 лет. На русском и узбекском.",
        ["Пожалуйста, без пометок в книгах"],
        7,
    ),
    (
        "guitar",
        "nodira",
        "music",
        "Akustik gitara Yamaha F310",
        "good",
        7,
        ["guitar"],
        "Yangi torlar, chexol va kapodastr bilan. Oʻrganish uchun juda qulay.",
        ["Chexolda olib yuring"],
        11,
    ),
]


def at(day: date, hh: int, mm: int = 0) -> datetime:
    """Tashkent wall-clock time as an aware datetime."""
    return datetime.fromisoformat(f"{day.isoformat()}T{hh:02d}:{mm:02d}:00+05:00")


async def reset() -> None:
    async with engine.begin() as conn:
        tables = [
            "admin_audit_log",
            "user_warnings",
            "report_notes",
            "reports",
            "notifications",
            "ratings",
            "messages",
            "conversation_participants",
            "conversations",
            "loans",
            "borrow_requests",
            "saved_items",
            "listing_images",
            "listings",
            "category_translations",
            "categories",
            "telegram_link_tokens",
            "refresh_tokens",
            "email_otps",
            "task_outbox",
            "users",
        ]
        await conn.execute(text("ALTER TABLE admin_audit_log DISABLE TRIGGER admin_audit_log_no_change"))
        await conn.execute(text(f"TRUNCATE {', '.join(tables)} CASCADE"))
        await conn.execute(text("ALTER TABLE admin_audit_log ENABLE TRIGGER admin_audit_log_no_change"))


async def seed() -> None:
    rnd = random.Random(7)  # noqa: S311 (deterministic demo jitter)
    storage = get_storage()
    async with SessionLocal() as db:
        if await db.scalar(select(Category.id).limit(1)):
            print("Seed: data already present (use --reset to reseed).")
            return
        now = now_utc()
        today = today_tashkent()

        # categories
        for pos, (slug, img, names) in enumerate(CATEGORIES):
            category = Category(id=uuid.uuid4(), slug=slug, image=img, position=pos)
            category.translations = [CategoryTranslation(locale=loc, name=name) for loc, name in names.items()]
            db.add(category)
        await db.flush()
        cats = {cat.slug: cat.id for cat in (await db.scalars(select(Category))).all()}

        # users
        users: dict[str, User] = {}
        demo_hash = hash_password(DEMO_PASSWORD)
        for i, (key, name, email, area, phone, admin) in enumerate(USERS):
            u = User(
                id=uuid.uuid4(),
                email=email,
                password_hash=hash_password(ADMIN_PASSWORD) if admin else demo_hash,
                display_name=name,
                area=area,
                phone=phone,
                phone_verified_at=now if phone else None,
                preferred_locale="ru" if key in ("timur", "olga") else "uz",
                email_verified_at=now,
                is_admin=admin,
                created_at=now - timedelta(days=200 - i * 15),
            )
            users[key] = u
            db.add(u)
        await db.flush()

        # listings + images through the real storage pipeline
        listings: dict[str, Listing] = {}
        for key, owner_key, cat, title, cond, max_days, imgs, desc, terms, days_ago in LISTINGS:
            area = users[owner_key].area or "Mirobod"
            lat, lng = AREAS[area]
            listing = Listing(
                id=uuid.uuid4(),
                owner_id=users[owner_key].id,
                category_id=cats[cat],
                title=title,
                description=desc,
                condition=cond,
                max_days=max_days,
                borrowing_terms=terms,
                location_area=area,
                latitude=lat + rnd.uniform(-0.012, 0.012),
                longitude=lng + rnd.uniform(-0.012, 0.012),
                status="active",
                created_at=now - timedelta(days=days_ago, hours=rnd.randint(1, 20)),
            )
            db.add(listing)
            await db.flush()
            for pos, name in enumerate(imgs):
                stored = await storage.save_image((IMAGES / f"{name}.jpg").read_bytes(), f"listings/{listing.id}")
                db.add(
                    ListingImage(
                        id=uuid.uuid4(),
                        listing_id=listing.id,
                        cloudinary_public_id=stored.key,
                        url=stored.url,
                        width=stored.width,
                        height=stored.height,
                        position=pos,
                    )
                )
            listings[key] = listing
        await db.flush()

        def conv(listing: Listing, borrower: User) -> Conversation:
            c = Conversation(id=uuid.uuid4(), listing_id=listing.id, borrower_id=borrower.id)
            db.add(c)
            for uid in {borrower.id, listing.owner_id}:
                db.add(ConversationParticipant(conversation_id=c.id, user_id=uid))
            return c

        def msg(c: Conversation, sender: User | None, body: str, when: datetime, kind: str = "text") -> None:
            db.add(
                Message(
                    id=uuid.uuid4(),
                    conversation_id=c.id,
                    sender_id=sender.id if sender else None,
                    kind=kind,
                    body=body,
                    created_at=when,
                )
            )
            c.last_message_at = when

        me, sardor, malika, jasur, olga, nodira, timur = (
            users[k] for k in ("me", "sardor", "malika", "jasur", "olga", "nodira", "timur")
        )

        # 1) Dilnoza borrows Sardor's tent: approved, pickup in 3 days
        r1 = BorrowRequest(
            id=uuid.uuid4(),
            listing_id=listings["tent"].id,
            borrower_id=me.id,
            start_date=today + timedelta(days=3),
            end_date=today + timedelta(days=5),
            message="Zominga borishni rejalashtiryapmiz.",
            terms_accepted_at=now,
            status="approved",
            decided_at=now - timedelta(hours=15),
            created_at=now - timedelta(hours=16),
        )
        db.add(r1)
        await db.flush()
        db.add(
            Loan(
                id=uuid.uuid4(),
                request_id=r1.id,
                listing_id=r1.listing_id,
                borrower_id=me.id,
                owner_id=sardor.id,
                start_date=r1.start_date,
                end_date=r1.end_date,
                status="approved",
            )
        )
        c1 = conv(listings["tent"], me)
        y = today - timedelta(days=1)
        msg(
            c1,
            me,
            "Assalomu alaykum, Sardor! Chodiringiz shu dam olish kunlari boʻshmi? Zominga borishni rejalashtiryapmiz.",
            at(y, 18, 12),
        )
        msg(c1, sardor, "Vaalaykum assalom! Ha, boʻsh. Soʻrov yuboravering, tasdiqlayman.", at(y, 18, 30))
        msg(c1, None, "requested", at(y, 18, 34), "event")
        msg(c1, None, "approved", at(y, 19, 2), "event")
        msg(
            c1,
            sardor,
            "Tasdiqladim. Juma kuni soat 19:00 dan keyin Chilonzor 9-mavzeda olib ketishingiz mumkin.",
            at(today, 9, 15),
        )
        msg(c1, sardor, "Qoziqlar alohida xaltachada, sanab olsangiz boʻldi 🙂", at(today, 9, 16))

        # 2) Dilnoza asks Malika for the camera: pending
        r2 = BorrowRequest(
            id=uuid.uuid4(),
            listing_id=listings["camera"].id,
            borrower_id=me.id,
            start_date=today + timedelta(days=6),
            end_date=today + timedelta(days=7),
            message="Можно взять камеру на свадьбу подруги?",
            terms_accepted_at=now,
            status="pending",
            created_at=now - timedelta(hours=20),
        )
        db.add(r2)
        c2 = conv(listings["camera"], me)
        msg(c2, me, "Здравствуйте! Можно взять камеру на свадьбу подруги?", now - timedelta(hours=22))
        msg(
            c2, malika, "Добрый день! Да, в эти даты свободна. Отправьте запрос, пожалуйста.", now - timedelta(hours=21)
        )
        msg(c2, None, "requested", now - timedelta(hours=20), "event")

        # 3) Nodira has Dilnoza's drill right now (active, due tomorrow)
        r3 = BorrowRequest(
            id=uuid.uuid4(),
            listing_id=listings["drill"].id,
            borrower_id=nodira.id,
            start_date=today - timedelta(days=2),
            end_date=today + timedelta(days=1),
            terms_accepted_at=now - timedelta(days=4),
            status="approved",
            decided_at=now - timedelta(days=4),
            created_at=now - timedelta(days=4),
        )
        db.add(r3)
        await db.flush()
        db.add(
            Loan(
                id=uuid.uuid4(),
                request_id=r3.id,
                listing_id=r3.listing_id,
                borrower_id=nodira.id,
                owner_id=me.id,
                start_date=r3.start_date,
                end_date=r3.end_date,
                picked_up_at=now - timedelta(days=2),
                status="active",
            )
        )
        c3 = conv(listings["drill"], nodira)
        msg(c3, None, "pickedUp", now - timedelta(days=2), "event")
        msg(
            c3,
            nodira,
            "Rahmat, Dilnoza opa! Ertaga kechqurun qaytarib beraman.",
            now - timedelta(days=2) + timedelta(minutes=10),
        )

        # 4) Incoming requests for Dilnoza's mixer (pending), from Jasur and Olga
        for who, start, end, text_ in (
            (
                jasur,
                3,
                5,
                "Assalomu alaykum! Onamning tugʻilgan kuniga tort pishirmoqchiman, shanba kuni olsam boʻladimi?",
            ),
            (olga, 9, 10, "Здравствуйте! Хочу испечь куличи, верну в тот же вечер."),
        ):
            r = BorrowRequest(
                id=uuid.uuid4(),
                listing_id=listings["mixer"].id,
                borrower_id=who.id,
                start_date=today + timedelta(days=start),
                end_date=today + timedelta(days=end),
                message=text_,
                terms_accepted_at=now,
                status="pending",
                created_at=now - timedelta(hours=rnd.randint(1, 10)),
            )
            db.add(r)
            c = conv(listings["mixer"], who)
            msg(c, who, text_, r.created_at)
            msg(c, None, "requested", r.created_at + timedelta(minutes=1), "event")
            await db.flush()
            db.add(
                Notification(
                    id=uuid.uuid4(),
                    user_id=me.id,
                    type="request_received",
                    dedupe_key=f"request_received:{r.id}",
                    payload={
                        "listing_id": str(listings["mixer"].id),
                        "item": listings["mixer"].title,
                        "actor": who.display_name.split(" ")[0],
                        "start": r.start_date.isoformat(),
                        "end": r.end_date.isoformat(),
                        "request_id": str(r.id),
                    },
                    created_at=r.created_at,
                )
            )

        # 5) Past returned loans with ratings → trust signals
        past = [
            ("sockets", me, timur, 5),
            ("chess", olga, sardor, 5),
            ("books", sardor, olga, 4),
            ("grinder", jasur, malika, 5),
        ]
        for key, borrower, owner, score in past:
            listing = listings[key]
            s = today - timedelta(days=rnd.randint(15, 40))
            r = BorrowRequest(
                id=uuid.uuid4(),
                listing_id=listing.id,
                borrower_id=borrower.id,
                start_date=s,
                end_date=s + timedelta(days=2),
                terms_accepted_at=now,
                status="approved",
                decided_at=now - timedelta(days=50),
                created_at=now - timedelta(days=50),
            )
            db.add(r)
            await db.flush()
            loan = Loan(
                id=uuid.uuid4(),
                request_id=r.id,
                listing_id=listing.id,
                borrower_id=borrower.id,
                owner_id=owner.id,
                start_date=s,
                end_date=s + timedelta(days=2),
                status="returned",
                picked_up_at=now - timedelta(days=45),
                returned_at=now - timedelta(days=10),
            )
            db.add(loan)
            await db.flush()
            db.add(
                Rating(
                    id=uuid.uuid4(), loan_id=loan.id, rater_id=borrower.id, ratee_id=owner.id, score=score, comment=None
                )
            )
            db.add(
                Rating(id=uuid.uuid4(), loan_id=loan.id, rater_id=owner.id, ratee_id=borrower.id, score=5, comment=None)
            )

        # 6) Notifications for Dilnoza
        n = [
            ("request_approved", sardor, listings["tent"], r1, now - timedelta(hours=15), True),
            ("return_due_tomorrow", nodira, listings["drill"], r3, now - timedelta(hours=3), False),
        ]
        for type_, actor, listing, req, when, read in n:
            db.add(
                Notification(
                    id=uuid.uuid4(),
                    user_id=me.id,
                    type=type_,
                    created_at=when,
                    read_at=when if read else None,
                    payload={
                        "listing_id": str(listing.id),
                        "item": listing.title,
                        "actor": actor.display_name.split(" ")[0],
                        "start": req.start_date.isoformat(),
                        "end": req.end_date.isoformat(),
                        "due": req.end_date.isoformat(),
                    },
                )
            )

        # 7) An open report for the admin queue
        db.add(
            Report(
                id=uuid.uuid4(),
                reporter_id=jasur.id,
                target_type="listing",
                target_id=listings["projector"].id,
                target_user_id=olga.id,
                listing_id=listings["projector"].id,
                reason="inappropriate",
                description="Rasmdagi buyum taʼrifga mos kelmaydi.",
                status="open",
                priority="normal",
                created_at=now - timedelta(hours=5),
            )
        )
        await db.commit()
    print("Seed complete.")
    print(f"  Demo user:  demo@qadr.uz / {DEMO_PASSWORD}   (also sardor@, malika@, jasur@, olga@, nodira@, timur@ …)")
    print(f"  Admin:      admin@qadr.uz / {ADMIN_PASSWORD}")


async def main() -> None:
    if "--reset" in sys.argv:
        await reset()
        from app.storage.local import LocalStorage

        if not get_storage().__class__.__name__.startswith("Cloudinary"):
            LocalStorage().clear()
    await seed()
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
