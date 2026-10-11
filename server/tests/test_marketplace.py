import io

from PIL import Image
from sqlalchemy import select, update

from app.core.db import SessionLocal
from app.core.time import now_utc
from app.modules.auth.models import User
from tests.conftest import Client, login, make_category, make_listing, make_user, new_client


def jpeg(w: int = 1200, h: int = 900) -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (w, h), (33, 78, 61)).save(buf, "JPEG")
    return buf.getvalue()


async def test_create_listing_with_images_and_validation(client: Client) -> None:
    await make_category("camping")
    await login(client, await make_user())
    body = {
        "title": "4 kishilik chodir",
        "description": "Yengil chodir, Chimyonda sinovdan oʻtgan.",
        "category": "camping",
        "condition": "good",
        "max_days": 7,
        "borrowing_terms": ["Quruq qaytaring"],
        "location_area": "Chilonzor",
    }
    res = await client.post("/listings", json=body)
    assert res.status_code == 201, res.text
    lid = res.json()["id"]
    bad = await client.post("/listings", json={**body, "max_days": 60})
    assert bad.status_code == 422 and bad.json()["error"]["code"] == "VALIDATION_ERROR"
    assert (await client.post("/listings", json={**body, "category": "nope"})).json()["error"][
        "code"
    ] == "CATEGORY_NOT_FOUND"

    up = await client.post(f"/listings/{lid}/images", files={"file": ("a.jpg", jpeg(), "image/jpeg")})
    assert up.status_code == 201, up.text
    assert up.json()["url"].endswith("-1600.webp") and up.json()["width"] == 1200
    junk = await client.post(f"/listings/{lid}/images", files={"file": ("a.jpg", b"not an image", "image/jpeg")})
    assert junk.json()["error"]["code"] == "IMAGE_INVALID"

    detail = (await client.get(f"/listings/{lid}")).json()
    assert detail["is_owner"] and len(detail["images"]) == 1 and detail["category"]["slug"] == "camping"
    assert "latitude" not in detail and "longitude" not in detail


async def test_search_filters_distance_and_apostrophes(client: Client) -> None:
    owner = await make_user(name="Lender")
    await make_listing(owner, title="Togʻ chodiri", category="camping", area="Chilonzor", lat=41.275, lng=69.204)
    await make_listing(owner, title="Bosch drill", category="tools", area="Yunusobod", lat=41.364, lng=69.288)
    res = (await client.get("/listings", params={"q": "tog'"})).json()  # ASCII apostrophe still matches ʻ
    assert res["total"] == 1 and res["items"][0]["title"] == "Togʻ chodiri"
    assert (await client.get("/listings", params={"category": "tools"})).json()["total"] == 1
    # no location → no distance anywhere (SPEC §10.1)
    assert all(i["distance_km"] is None for i in (await client.get("/listings")).json()["items"])
    near = (await client.get("/listings", params={"lat": 41.36, "lng": 69.29, "sort": "nearest"})).json()["items"]
    assert near[0]["title"] == "Bosch drill" and near[0]["distance_km"] is not None and near[0]["distance_km"] < 2
    within = (await client.get("/listings", params={"lat": 41.36, "lng": 69.29, "km": 3})).json()
    assert within["total"] == 1


async def test_hidden_and_banned_owner_listings_are_private(client: Client) -> None:
    owner = await make_user()
    listing = await make_listing(owner, title="Secret item")
    async with SessionLocal() as db:
        await db.execute(update(User).where(User.id == owner.id).values(banned_at=now_utc()))
        await db.commit()
    assert (await client.get("/listings", params={"q": "Secret"})).json()["total"] == 0
    assert (await client.get(f"/listings/{listing.id}")).status_code == 404


async def test_saved_items(client: Client) -> None:
    listing = await make_listing(await make_user())
    await login(client, await make_user())
    assert (await client.post(f"/listings/{listing.id}/save")).json() == {"saved": True}
    assert (await client.post(f"/listings/{listing.id}/save")).json() == {"saved": True}  # idempotent
    saved = (await client.get("/saved")).json()
    assert len(saved) == 1 and saved[0]["is_saved"]
    assert (await client.get(f"/listings/{listing.id}")).json()["is_saved"] is True
    await client.delete(f"/listings/{listing.id}/save")
    assert (await client.get("/saved")).json() == []


async def test_messaging_permissions_and_per_user_delete(client: Client) -> None:
    owner, b, stranger = await make_user(name="Owner"), await make_user(name="Borrower"), await make_user(name="Eve")
    listing = await make_listing(owner)
    async with new_client() as cb:
        await login(cb, b)
        cid = (await cb.post("/conversations", json={"listing_id": str(listing.id), "body": "Salom!"})).json()["id"]
        # second start reuses the same conversation (one per listing+borrower)
        assert (await cb.post("/conversations", json={"listing_id": str(listing.id), "body": "Yana"})).json()[
            "id"
        ] == cid
    await login(client, owner)
    convs = (await client.get("/conversations")).json()
    assert len(convs) == 1 and convs[0]["unread"] == 2 and convs[0]["role"] == "owner"
    assert (await client.get("/me/counters")).json()["unread_messages"] == 2
    await client.post(f"/conversations/{cid}/read")
    assert (await client.get("/me/counters")).json()["unread_messages"] == 0
    assert (await client.post(f"/conversations/{cid}/messages", json={"body": "Vaalaykum!"})).status_code == 201

    async with new_client() as ce:
        await login(ce, stranger)
        assert (await ce.get(f"/conversations/{cid}/messages")).status_code == 404
        assert (await ce.post(f"/conversations/{cid}/messages", json={"body": "hi"})).status_code == 404

    # delete hides it for the owner only
    await client.delete(f"/conversations/{cid}")
    assert (await client.get("/conversations")).json() == []
    async with new_client() as cb:
        await login(cb, b)
        assert len((await cb.get("/conversations")).json()) == 1
        await cb.post(f"/conversations/{cid}/messages", json={"body": "Hali shu yerdamisiz?"})
    assert len((await client.get("/conversations")).json()) == 1  # reappears on new activity


async def test_auth_and_permission_matrix(client: Client) -> None:
    listing = await make_listing(await make_user())
    protected = [
        ("get", "/auth/me"),
        ("get", "/users/me"),
        ("get", "/saved"),
        ("get", "/me/listings"),
        ("get", "/conversations"),
        ("get", "/requests/incoming"),
        ("get", "/loans"),
        ("get", "/notifications"),
        ("get", "/me/counters"),
        ("post", f"/listings/{listing.id}/save"),
        ("get", "/telegram/status"),
    ]
    for method, path in protected:
        res = await getattr(client, method)(path)
        assert res.status_code == 401, (path, res.status_code)
    await login(client, await make_user())
    for path in ("/admin/reports", "/admin/users", "/admin/audit-log", "/admin/stats"):
        assert (await client.get(path)).status_code == 403


async def test_restricted_user_cannot_write(client: Client) -> None:
    from datetime import timedelta

    user = await make_user()
    async with SessionLocal() as db:
        await db.execute(update(User).where(User.id == user.id).values(restricted_until=now_utc() + timedelta(days=3)))
        await db.commit()
    listing = await make_listing(await make_user())
    await login(client, user)
    res = await client.post("/conversations", json={"listing_id": str(listing.id), "body": "hi"})
    assert res.status_code == 403 and res.json()["error"]["code"] == "ACCOUNT_RESTRICTED"
    assert (await client.get("/auth/me")).json()["restricted_until"] is not None


async def test_categories_counts_and_translations(client: Client) -> None:
    await make_listing(await make_user(), category="tools")
    cats = (await client.get("/categories", params={"locale": "en"})).json()
    assert cats[0]["slug"] == "tools" and cats[0]["name"] == "Tools" and cats[0]["count"] == 1


async def test_media_is_served(client: Client) -> None:
    await make_category("tools")
    await login(client, await make_user())
    lid = (
        await client.post(
            "/listings",
            json={
                "title": "Hammer",
                "description": "Solid claw hammer.",
                "category": "tools",
                "condition": "used",
                "max_days": 3,
                "location_area": "Sergeli",
            },
        )
    ).json()["id"]
    url = (
        await client.post(f"/listings/{lid}/images", files={"file": ("h.png", jpeg(300, 300), "image/jpeg")})
    ).json()["url"]
    res = await client.get(url.replace("/api/v1", "").replace("-1600", "-480"))
    assert res.status_code == 200 and res.headers["content-type"] == "image/webp"
    async with SessionLocal() as db:
        assert await db.scalar(select(User.id).limit(1))
