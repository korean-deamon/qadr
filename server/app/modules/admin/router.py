"""Administration and moderation (SPEC §23). Every write and every conversation view
is recorded in the append-only admin audit log."""

import uuid
from datetime import date, datetime, timedelta
from typing import Any, Literal

from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy import func, or_, select, update

from app.core.deps import DB, Admin, FreshAdmin, csrf_protect
from app.core.errors import AppError, conflict, not_found
from app.core.rate_limit import client_ip
from app.core.time import now_utc
from app.modules.auth.models import User
from app.modules.auth.service import revoke_all
from app.modules.borrowing.models import BorrowRequest
from app.modules.listings.models import Listing
from app.modules.loans.models import Loan
from app.modules.messages.models import Conversation, Message
from app.modules.moderation.models import AdminAuditLog, Report, ReportNote, UserWarning
from app.modules.notifications.service import notify
from app.modules.users.service import trust_signals

router = APIRouter(prefix="/admin", tags=["admin"])
W = [Depends(csrf_protect)]


# ---------------------------------------------------------------- helpers
async def audit(
    db: DB,
    admin: User,
    request: Request,
    action: str,
    target_type: str,
    target_id: uuid.UUID | None,
    *,
    report_id: uuid.UUID | None = None,
    reason: str | None = None,
    meta: dict[str, Any] | None = None,
) -> None:
    db.add(
        AdminAuditLog(
            id=uuid.uuid4(),
            admin_id=admin.id,
            action=action,
            target_type=target_type,
            target_id=target_id,
            report_id=report_id,
            reason=reason,
            meta=meta or {},
            ip=client_ip(request) if client_ip(request) != "unknown" else None,
            user_agent=(request.headers.get("user-agent") or "")[:300] or None,
        )
    )


class ReasonIn(BaseModel):
    reason: str = Field(min_length=3, max_length=1000)
    report_id: uuid.UUID | None = None


class RestrictIn(ReasonIn):
    days: int = Field(ge=1, le=365)


class NoteIn(BaseModel):
    body: str = Field(min_length=1, max_length=4000)


class ContactIn(BaseModel):
    to: Literal["reporter", "target", "both"]
    text: str = Field(min_length=3, max_length=2000)


class AssignIn(BaseModel):
    admin_id: uuid.UUID | None = None  # None = assign to me


async def _user_summary(db: DB, user: User) -> dict[str, Any]:
    trust = (await trust_signals(db, [user.id]))[user.id]
    warnings = await db.scalar(select(func.count()).where(UserWarning.user_id == user.id)) or 0
    as_target = await db.scalar(select(func.count()).where(Report.target_user_id == user.id)) or 0
    as_reporter = await db.scalar(select(func.count()).where(Report.reporter_id == user.id)) or 0
    return {
        "id": user.id,
        "name": user.display_name,
        "email": user.email,
        "phone": user.phone if user.phone_verified_at else None,
        "email_verified": user.email_verified_at is not None,
        "phone_verified": user.phone_verified_at is not None,
        "telegram_linked": user.telegram_id is not None,
        "member_since": user.created_at,
        "is_admin": user.is_admin,
        "restricted_until": user.restricted_until if user.is_restricted(now_utc()) else None,
        "restriction_reason": user.restriction_reason,
        "banned_at": user.banned_at,
        "ban_reason": user.ban_reason,
        "warnings": int(warnings),
        "reports_as_target": int(as_target),
        "reports_as_reporter": int(as_reporter),
        **trust,
    }


def _report_row(r: Report, names: dict[uuid.UUID, str], titles: dict[uuid.UUID, str]) -> dict[str, Any]:
    return {
        "id": r.id,
        "reason": r.reason,
        "status": r.status,
        "priority": r.priority,
        "target_type": r.target_type,
        "target_id": r.target_id,
        "target_user": {"id": r.target_user_id, "name": names.get(r.target_user_id)} if r.target_user_id else None,
        "reporter": {"id": r.reporter_id, "name": names.get(r.reporter_id)},
        "listing": {"id": r.listing_id, "title": titles.get(r.listing_id)} if r.listing_id else None,
        "assigned_admin": {"id": r.assigned_admin_id, "name": names.get(r.assigned_admin_id)}
        if r.assigned_admin_id
        else None,
        "description": r.description,
        "resolution": r.resolution,
        "resolution_reason": r.resolution_reason,
        "created_at": r.created_at,
        "resolved_at": r.resolved_at,
    }


async def _names(db: DB, ids: set[uuid.UUID | None]) -> dict[uuid.UUID, str]:
    clean = {i for i in ids if i}
    if not clean:
        return {}
    return dict((await db.execute(select(User.id, User.display_name).where(User.id.in_(clean)))).all())


async def _titles(db: DB, ids: set[uuid.UUID | None]) -> dict[uuid.UUID, str]:
    clean = {i for i in ids if i}
    if not clean:
        return {}
    return dict((await db.execute(select(Listing.id, Listing.title).where(Listing.id.in_(clean)))).all())


async def _get_user(db: DB, user_id: uuid.UUID) -> User:
    user = await db.get(User, user_id, with_for_update=True)
    if not user:
        raise not_found("USER")
    return user


# ---------------------------------------------------------------- overview
@router.get("/stats")
async def stats(db: DB, _: Admin) -> dict[str, int]:
    async def count(*where: Any, model: Any = Report) -> int:
        return int(await db.scalar(select(func.count()).select_from(model).where(*where)) or 0)

    return {
        "open_reports": await count(Report.status.in_(("open", "in_review"))),
        "high_priority": await count(Report.status.in_(("open", "in_review")), Report.priority == "high"),
        "users": await count(User.is_active.is_(True), model=User),
        "restricted": await count(User.restricted_until > now_utc(), model=User),
        "banned": await count(User.banned_at.is_not(None), model=User),
        "listings": await count(Listing.status == "active", model=Listing),
        "hidden_listings": await count(Listing.status == "hidden_by_admin", model=Listing),
        "active_loans": await count(Loan.status == "active", model=Loan),
    }


# ---------------------------------------------------------------- reports
@router.get("/reports")
async def list_reports(
    db: DB,
    admin: Admin,
    status: Literal["open", "in_review", "resolved", "dismissed", "active", "all"] = "active",
    reason: str | None = None,
    target_type: Literal["user", "listing", "message"] | None = None,
    priority: Literal["high", "normal"] | None = None,
    assignee: Literal["me", "unassigned", "any"] = "any",
    q: str | None = Query(None, max_length=100),
    date_from: date | None = None,
    date_to: date | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
) -> dict[str, Any]:
    where: list[Any] = []
    if status == "active":
        where.append(Report.status.in_(("open", "in_review")))
    elif status != "all":
        where.append(Report.status == status)
    if reason:
        where.append(Report.reason == reason)
    if target_type:
        where.append(Report.target_type == target_type)
    if priority:
        where.append(Report.priority == priority)
    if assignee == "me":
        where.append(Report.assigned_admin_id == admin.id)
    elif assignee == "unassigned":
        where.append(Report.assigned_admin_id.is_(None))
    if date_from:
        where.append(Report.created_at >= datetime.combine(date_from, datetime.min.time()))
    if date_to:
        where.append(Report.created_at < datetime.combine(date_to + timedelta(days=1), datetime.min.time()))
    if q:
        like = f"%{q.lower()}%"
        users = select(User.id).where(or_(func.lower(User.email).like(like), func.lower(User.display_name).like(like)))
        listings = select(Listing.id).where(func.lower(Listing.title).like(like))
        where.append(
            or_(Report.reporter_id.in_(users), Report.target_user_id.in_(users), Report.listing_id.in_(listings))
        )
    total = await db.scalar(select(func.count()).select_from(Report).where(*where)) or 0
    rows = (
        await db.scalars(
            select(Report)
            .where(*where)
            .order_by((Report.priority == "high").desc(), Report.created_at.asc())  # not_returned first, then oldest
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
    ).all()
    names = await _names(db, {i for r in rows for i in (r.reporter_id, r.target_user_id, r.assigned_admin_id)})
    titles = await _titles(db, {r.listing_id for r in rows})
    return {"items": [_report_row(r, names, titles) for r in rows], "total": int(total), "page": page}


@router.get("/reports/{report_id}")
async def report_detail(report_id: uuid.UUID, db: DB, _: Admin) -> dict[str, Any]:
    r = await db.get(Report, report_id)
    if not r:
        raise not_found("REPORT")
    reporter = await db.get(User, r.reporter_id)
    target = await db.get(User, r.target_user_id) if r.target_user_id else None
    listing = await db.get(Listing, r.listing_id) if r.listing_id else None
    names = await _names(db, {r.reporter_id, r.target_user_id, r.assigned_admin_id})
    titles = await _titles(db, {r.listing_id})
    pair = {r.reporter_id, r.target_user_id} - {None}

    history: list[dict[str, Any]] = []
    if listing and len(pair) == 2:
        reqs = (
            await db.scalars(
                select(BorrowRequest)
                .where(BorrowRequest.listing_id == listing.id, BorrowRequest.borrower_id.in_(pair))
                .order_by(BorrowRequest.created_at)
            )
        ).all()
        loans = {
            loan.request_id: loan
            for loan in (await db.scalars(select(Loan).where(Loan.request_id.in_([q.id for q in reqs])))).all()
        }
        for q in reqs:
            loan = loans.get(q.id)
            history.append(
                {
                    "request_id": q.id,
                    "request_status": q.status,
                    "start": q.start_date,
                    "end": q.end_date,
                    "requested_at": q.created_at,
                    "decided_at": q.decided_at,
                    "loan": {
                        "id": loan.id,
                        "status": loan.status,
                        "picked_up_at": loan.picked_up_at,
                        "returned_at": loan.returned_at,
                        "borrower_returned_at": loan.borrower_returned_at,
                        "cancelled_at": loan.cancelled_at,
                    }
                    if loan
                    else None,
                }
            )

    async def past(user_id: uuid.UUID | None) -> list[dict[str, Any]]:
        if not user_id:
            return []
        rows = (
            await db.scalars(
                select(Report)
                .where(or_(Report.reporter_id == user_id, Report.target_user_id == user_id), Report.id != r.id)
                .order_by(Report.created_at.desc())
                .limit(20)
            )
        ).all()
        return [
            {
                "id": p.id,
                "reason": p.reason,
                "status": p.status,
                "role": "reporter" if p.reporter_id == user_id else "target",
                "created_at": p.created_at,
            }
            for p in rows
        ]

    conversation_id = None
    if listing and len(pair) == 2:
        borrower = next((u for u in pair if u != listing.owner_id), None)
        if borrower:
            conversation_id = await db.scalar(
                select(Conversation.id).where(
                    Conversation.listing_id == listing.id, Conversation.borrower_id == borrower
                )
            )
    notes = (
        await db.execute(
            select(ReportNote, User.display_name)
            .join(User, User.id == ReportNote.admin_id)
            .where(ReportNote.report_id == r.id)
            .order_by(ReportNote.created_at)
        )
    ).all()
    trail = (
        await db.execute(
            select(AdminAuditLog, User.display_name)
            .join(User, User.id == AdminAuditLog.admin_id)
            .where(AdminAuditLog.report_id == r.id)
            .order_by(AdminAuditLog.created_at)
        )
    ).all()
    return {
        "report": _report_row(r, names, titles),
        "reporter": await _user_summary(db, reporter) if reporter else None,
        "target": await _user_summary(db, target) if target else None,
        "listing": {
            "id": listing.id,
            "title": listing.title,
            "status": listing.status,
            "owner_id": listing.owner_id,
            "image": listing.images[0].url if listing.images else None,
            "moderation_reason": listing.moderation_reason,
        }
        if listing
        else None,
        "history": history,
        "past_reports": {"reporter": await past(r.reporter_id), "target": await past(r.target_user_id)},
        "conversation_id": conversation_id,
        "notes": [{"id": n[0].id, "body": n[0].body, "admin": n[1], "created_at": n[0].created_at} for n in notes],
        "audit": [
            {
                "action": a[0].action,
                "admin": a[1],
                "reason": a[0].reason,
                "meta": a[0].meta,
                "created_at": a[0].created_at,
            }
            for a in trail
        ],
    }


@router.get("/reports/{report_id}/conversation")
async def report_conversation(
    report_id: uuid.UUID, request: Request, db: DB, admin: Admin, reason: str = Query(min_length=3, max_length=500)
) -> dict[str, Any]:
    """Read-only, only the conversation tied to the reported listing; every view is audited."""
    r = await db.get(Report, report_id)
    if not r or not r.listing_id:
        raise not_found("REPORT")
    listing = await db.get(Listing, r.listing_id)
    pair = {r.reporter_id, r.target_user_id} - {None}
    borrower = next((u for u in pair if listing and u != listing.owner_id), None)
    conv = (
        await db.scalar(
            select(Conversation).where(Conversation.listing_id == r.listing_id, Conversation.borrower_id == borrower)
        )
        if borrower
        else None
    )
    if not conv:
        raise not_found("CONVERSATION")
    await audit(db, admin, request, "view_conversation", "conversation", conv.id, report_id=r.id, reason=reason)
    await db.commit()
    msgs = (
        await db.scalars(select(Message).where(Message.conversation_id == conv.id).order_by(Message.created_at))
    ).all()
    names = await _names(db, {m.sender_id for m in msgs})
    return {
        "conversation_id": conv.id,
        "messages": [
            {
                "id": m.id,
                "kind": m.kind,
                "body": m.body,
                "sender": names.get(m.sender_id) if m.sender_id else None,
                "sender_id": m.sender_id,
                "created_at": m.created_at,
            }
            for m in msgs
        ],
    }


@router.post("/reports/{report_id}/notes", status_code=201, dependencies=W)
async def add_note(report_id: uuid.UUID, body: NoteIn, request: Request, db: DB, admin: FreshAdmin) -> dict[str, Any]:
    r = await db.get(Report, report_id)
    if not r:
        raise not_found("REPORT")
    note = ReportNote(id=uuid.uuid4(), report_id=r.id, admin_id=admin.id, body=body.body.strip())
    db.add(note)
    if r.status == "open":
        r.status = "in_review"
    await audit(db, admin, request, "add_note", "report", r.id, report_id=r.id)
    await db.commit()
    return {"id": note.id}


@router.post("/reports/{report_id}/assign", dependencies=W)
async def assign(report_id: uuid.UUID, body: AssignIn, request: Request, db: DB, admin: FreshAdmin) -> dict[str, Any]:
    r = await db.get(Report, report_id, with_for_update=True)
    if not r:
        raise not_found("REPORT")
    assignee = body.admin_id or admin.id
    other = await db.get(User, assignee)
    if not other or not other.is_admin:
        raise AppError("ASSIGNEE_NOT_ADMIN", 422)
    r.assigned_admin_id = assignee
    if r.status == "open":
        r.status = "in_review"
    await audit(db, admin, request, "assign_report", "report", r.id, report_id=r.id, meta={"assignee": str(assignee)})
    await db.commit()
    return {"ok": True}


async def _close(
    report_id: uuid.UUID, body: ReasonIn, request: Request, db: DB, admin: User, status: str
) -> dict[str, Any]:
    r = await db.get(Report, report_id, with_for_update=True)
    if not r:
        raise not_found("REPORT")
    if r.status in ("resolved", "dismissed"):
        raise conflict("REPORT_ALREADY_CLOSED")
    r.status = status
    r.resolution = status
    r.resolution_reason = body.reason
    r.resolved_at = now_utc()
    await audit(
        db,
        admin,
        request,
        {"resolved": "resolve_report", "dismissed": "dismiss_report"}[status],
        "report",
        r.id,
        report_id=r.id,
        reason=body.reason,
    )
    await notify(
        db,
        r.reporter_id,
        "report_resolved",
        {"report_id": str(r.id), "status": status, "reason": body.reason},
        dedupe_key=f"report_closed:{r.id}",
    )
    await db.commit()
    return {"status": status}


@router.post("/reports/{report_id}/resolve", dependencies=W)
async def resolve(report_id: uuid.UUID, body: ReasonIn, request: Request, db: DB, admin: FreshAdmin) -> dict[str, Any]:
    return await _close(report_id, body, request, db, admin, "resolved")


@router.post("/reports/{report_id}/dismiss", dependencies=W)
async def dismiss(report_id: uuid.UUID, body: ReasonIn, request: Request, db: DB, admin: FreshAdmin) -> dict[str, Any]:
    return await _close(report_id, body, request, db, admin, "dismissed")


@router.post("/reports/{report_id}/contact", dependencies=W)
async def contact(report_id: uuid.UUID, body: ContactIn, request: Request, db: DB, admin: FreshAdmin) -> dict[str, Any]:
    """Moderation message to one or both parties: in-app notification + Telegram/email."""
    r = await db.get(Report, report_id)
    if not r:
        raise not_found("REPORT")
    recipients = {
        "reporter": [r.reporter_id],
        "target": [r.target_user_id] if r.target_user_id else [],
        "both": [r.reporter_id, *([r.target_user_id] if r.target_user_id else [])],
    }[body.to]
    if not recipients:
        raise AppError("NO_RECIPIENT", 422)
    stamp = int(now_utc().timestamp() * 1000)
    for uid in recipients:
        await notify(
            db,
            uid,
            "moderation_message",
            {"text": body.text, "report_id": str(r.id)},
            dedupe_key=f"moderation:{r.id}:{uid}:{stamp}",
        )
    await audit(
        db, admin, request, "contact_parties", "report", r.id, report_id=r.id, meta={"to": body.to, "text": body.text}
    )
    await db.commit()
    return {"sent": len(recipients)}


# ---------------------------------------------------------------- users
@router.get("/users")
async def list_users(
    db: DB,
    _: Admin,
    q: str | None = Query(None, max_length=100),
    state: Literal["all", "restricted", "banned", "admins", "unverified"] = "all",
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
) -> dict[str, Any]:
    where: list[Any] = [User.is_active.is_(True)]
    if q:
        like = f"%{q.lower()}%"
        where.append(
            or_(func.lower(User.email).like(like), func.lower(User.display_name).like(like), User.phone.like(f"%{q}%"))
        )
    if state == "restricted":
        where.append(User.restricted_until > now_utc())
    elif state == "banned":
        where.append(User.banned_at.is_not(None))
    elif state == "admins":
        where.append(User.is_admin.is_(True))
    elif state == "unverified":
        where.append(User.email_verified_at.is_(None))
    total = await db.scalar(select(func.count()).select_from(User).where(*where)) or 0
    rows = (
        await db.scalars(
            select(User).where(*where).order_by(User.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
        )
    ).all()
    return {"items": [await _user_summary(db, u) for u in rows], "total": int(total), "page": page}


@router.get("/users/{user_id}")
async def user_detail(user_id: uuid.UUID, db: DB, _: Admin) -> dict[str, Any]:
    user = await db.get(User, user_id)
    if not user:
        raise not_found("USER")
    listings = (
        await db.scalars(select(Listing).where(Listing.owner_id == user.id).order_by(Listing.created_at.desc()))
    ).all()
    warnings = (
        await db.execute(
            select(UserWarning, User.display_name)
            .join(User, User.id == UserWarning.admin_id)
            .where(UserWarning.user_id == user.id)
            .order_by(UserWarning.created_at.desc())
        )
    ).all()
    reports = (
        await db.scalars(
            select(Report)
            .where(or_(Report.reporter_id == user.id, Report.target_user_id == user.id))
            .order_by(Report.created_at.desc())
            .limit(50)
        )
    ).all()
    names = await _names(db, {i for r in reports for i in (r.reporter_id, r.target_user_id, r.assigned_admin_id)})
    titles = await _titles(db, {r.listing_id for r in reports})
    loans = (
        await db.scalars(
            select(Loan)
            .where(or_(Loan.owner_id == user.id, Loan.borrower_id == user.id))
            .order_by(Loan.created_at.desc())
            .limit(30)
        )
    ).all()
    ltitles = await _titles(db, {l.listing_id for l in loans})
    trail = (
        await db.execute(
            select(AdminAuditLog, User.display_name)
            .join(User, User.id == AdminAuditLog.admin_id)
            .where(AdminAuditLog.target_type == "user", AdminAuditLog.target_id == user.id)
            .order_by(AdminAuditLog.created_at.desc())
            .limit(50)
        )
    ).all()
    return {
        "user": await _user_summary(db, user),
        "listings": [{"id": l.id, "title": l.title, "status": l.status, "created_at": l.created_at} for l in listings],
        "warnings": [{"reason": w[0].reason, "admin": w[1], "created_at": w[0].created_at} for w in warnings],
        "reports": [_report_row(r, names, titles) for r in reports],
        "loans": [
            {
                "id": l.id,
                "status": l.status,
                "role": "owner" if l.owner_id == user.id else "borrower",
                "title": ltitles.get(l.listing_id),
                "start": l.start_date,
                "end": l.end_date,
            }
            for l in loans
        ],
        "audit": [
            {"action": a[0].action, "admin": a[1], "reason": a[0].reason, "created_at": a[0].created_at} for a in trail
        ],
    }


@router.post("/users/{user_id}/warn", dependencies=W)
async def warn(user_id: uuid.UUID, body: ReasonIn, request: Request, db: DB, admin: FreshAdmin) -> dict[str, Any]:
    user = await _get_user(db, user_id)
    db.add(
        UserWarning(id=uuid.uuid4(), user_id=user.id, admin_id=admin.id, report_id=body.report_id, reason=body.reason)
    )
    await notify(
        db,
        user.id,
        "account_warned",
        {"reason": body.reason},
        dedupe_key=f"warn:{user.id}:{int(now_utc().timestamp() * 1000)}",
    )
    await audit(db, admin, request, "warn_user", "user", user.id, report_id=body.report_id, reason=body.reason)
    await db.commit()
    return {"ok": True}


@router.post("/users/{user_id}/restrict", dependencies=W)
async def restrict(user_id: uuid.UUID, body: RestrictIn, request: Request, db: DB, admin: FreshAdmin) -> dict[str, Any]:
    user = await _get_user(db, user_id)
    if user.is_admin:
        raise AppError("CANNOT_MODERATE_ADMIN", 422)
    user.restricted_until = now_utc() + timedelta(days=body.days)
    user.restriction_reason = body.reason
    await notify(
        db,
        user.id,
        "account_restricted",
        {"reason": body.reason, "until": user.restricted_until.isoformat()},
        dedupe_key=f"restrict:{user.id}:{int(now_utc().timestamp() * 1000)}",
    )
    await audit(
        db,
        admin,
        request,
        "restrict_user",
        "user",
        user.id,
        report_id=body.report_id,
        reason=body.reason,
        meta={"days": body.days},
    )
    await db.commit()
    return {"restricted_until": user.restricted_until}


@router.post("/users/{user_id}/unrestrict", dependencies=W)
async def unrestrict(user_id: uuid.UUID, body: ReasonIn, request: Request, db: DB, admin: FreshAdmin) -> dict[str, Any]:
    user = await _get_user(db, user_id)
    user.restricted_until = None
    user.restriction_reason = None
    await notify(
        db,
        user.id,
        "account_unrestricted",
        {},
        dedupe_key=f"unrestrict:{user.id}:{int(now_utc().timestamp() * 1000)}",
        external=True,
    )
    await audit(db, admin, request, "unrestrict_user", "user", user.id, report_id=body.report_id, reason=body.reason)
    await db.commit()
    return {"ok": True}


@router.post("/users/{user_id}/ban", dependencies=W)
async def ban(user_id: uuid.UUID, body: ReasonIn, request: Request, db: DB, admin: FreshAdmin) -> dict[str, Any]:
    """Ban: sessions revoked, login blocked, listings hidden, pending requests cancelled."""
    user = await _get_user(db, user_id)
    if user.is_admin or user.id == admin.id:
        raise AppError("CANNOT_MODERATE_ADMIN", 422)
    user.banned_at = now_utc()
    user.ban_reason = body.reason
    await revoke_all(db, user.id)
    await db.execute(
        update(Listing)
        .where(Listing.owner_id == user.id, Listing.status == "active")
        .values(status="hidden_by_admin", moderation_reason="account_banned")
    )
    await db.execute(
        update(BorrowRequest)
        .where(BorrowRequest.borrower_id == user.id, BorrowRequest.status == "pending")
        .values(status="cancelled")
    )
    await audit(db, admin, request, "ban_user", "user", user.id, report_id=body.report_id, reason=body.reason)
    await db.commit()
    return {"banned_at": user.banned_at}


@router.post("/users/{user_id}/unban", dependencies=W)
async def unban(user_id: uuid.UUID, body: ReasonIn, request: Request, db: DB, admin: FreshAdmin) -> dict[str, Any]:
    user = await _get_user(db, user_id)
    user.banned_at = None
    user.ban_reason = None
    await db.execute(
        update(Listing)
        .where(
            Listing.owner_id == user.id,
            Listing.status == "hidden_by_admin",
            Listing.moderation_reason == "account_banned",
        )
        .values(status="active", moderation_reason=None)
    )
    await audit(db, admin, request, "unban_user", "user", user.id, report_id=body.report_id, reason=body.reason)
    await db.commit()
    return {"ok": True}


# ---------------------------------------------------------------- listings
@router.get("/listings")
async def list_listings(
    db: DB,
    _: Admin,
    q: str | None = Query(None, max_length=100),
    status: Literal["active", "hidden_by_owner", "hidden_by_admin", "removed", "all"] = "all",
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
) -> dict[str, Any]:
    where: list[Any] = []
    if q:
        where.append(func.lower(Listing.title).like(f"%{q.lower()}%"))
    if status != "all":
        where.append(Listing.status == status)
    total = await db.scalar(select(func.count()).select_from(Listing).where(*where)) or 0
    rows = (
        await db.scalars(
            select(Listing)
            .where(*where)
            .order_by(Listing.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
    ).all()
    names = await _names(db, {l.owner_id for l in rows})
    reports = dict(
        (
            await db.execute(
                select(Report.listing_id, func.count())
                .where(Report.listing_id.in_([l.id for l in rows]), Report.status.in_(("open", "in_review")))
                .group_by(Report.listing_id)
            )
        ).all()
    )
    return {
        "items": [
            {
                "id": l.id,
                "title": l.title,
                "status": l.status,
                "owner": {"id": l.owner_id, "name": names.get(l.owner_id)},
                "image": l.images[0].url if l.images else None,
                "area": l.location_area,
                "open_reports": int(reports.get(l.id, 0)),
                "moderation_reason": l.moderation_reason,
                "created_at": l.created_at,
            }
            for l in rows
        ],
        "total": int(total),
        "page": page,
    }


async def _moderate_listing(
    listing_id: uuid.UUID, body: ReasonIn, request: Request, db: DB, admin: User, action: str
) -> dict[str, Any]:
    listing = await db.get(Listing, listing_id, with_for_update=True)
    if not listing:
        raise not_found("LISTING")
    if action == "hide":
        listing.status, ntype = "hidden_by_admin", "listing_hidden"
    elif action == "unhide":
        listing.status, ntype = "active", "listing_unhidden"
    else:
        open_loan = await db.scalar(select(Loan.id).where(Loan.listing_id == listing.id, Loan.status == "active"))
        if open_loan:
            raise conflict("LISTING_HAS_ACTIVE_LOAN")
        listing.status, ntype = "removed", "listing_removed"
        await db.execute(
            update(BorrowRequest)
            .where(BorrowRequest.listing_id == listing.id, BorrowRequest.status == "pending")
            .values(status="cancelled")
        )
    listing.moderation_reason = None if action == "unhide" else body.reason
    await notify(
        db,
        listing.owner_id,
        ntype,
        {"item": listing.title, "listing_id": str(listing.id), "reason": body.reason},
        dedupe_key=f"{ntype}:{listing.id}:{int(now_utc().timestamp() * 1000)}",
    )
    await audit(
        db, admin, request, f"{action}_listing", "listing", listing.id, report_id=body.report_id, reason=body.reason
    )
    from app.realtime import hub

    hub.defer(db, None, "listing.updated" if action == "unhide" else "listing.deleted", {"id": str(listing.id)})
    await db.commit()
    return {"status": listing.status}


@router.post("/listings/{listing_id}/hide", dependencies=W)
async def hide_listing(
    listing_id: uuid.UUID, body: ReasonIn, request: Request, db: DB, admin: FreshAdmin
) -> dict[str, Any]:
    return await _moderate_listing(listing_id, body, request, db, admin, "hide")


@router.post("/listings/{listing_id}/unhide", dependencies=W)
async def unhide_listing(
    listing_id: uuid.UUID, body: ReasonIn, request: Request, db: DB, admin: FreshAdmin
) -> dict[str, Any]:
    return await _moderate_listing(listing_id, body, request, db, admin, "unhide")


@router.post("/listings/{listing_id}/remove", dependencies=W)
async def remove_listing(
    listing_id: uuid.UUID, body: ReasonIn, request: Request, db: DB, admin: FreshAdmin
) -> dict[str, Any]:
    return await _moderate_listing(listing_id, body, request, db, admin, "remove")


# ---------------------------------------------------------------- audit log
@router.get("/audit-log")
async def audit_log(
    db: DB,
    _: Admin,
    admin_id: uuid.UUID | None = None,
    action: str | None = None,
    target_type: str | None = None,
    target_id: uuid.UUID | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
) -> dict[str, Any]:
    where: list[Any] = []
    if admin_id:
        where.append(AdminAuditLog.admin_id == admin_id)
    if action:
        where.append(AdminAuditLog.action == action)
    if target_type:
        where.append(AdminAuditLog.target_type == target_type)
    if target_id:
        where.append(AdminAuditLog.target_id == target_id)
    if date_from:
        where.append(AdminAuditLog.created_at >= datetime.combine(date_from, datetime.min.time()))
    if date_to:
        where.append(AdminAuditLog.created_at < datetime.combine(date_to + timedelta(days=1), datetime.min.time()))
    total = await db.scalar(select(func.count()).select_from(AdminAuditLog).where(*where)) or 0
    rows = (
        await db.execute(
            select(AdminAuditLog, User.display_name)
            .join(User, User.id == AdminAuditLog.admin_id)
            .where(*where)
            .order_by(AdminAuditLog.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
    ).all()
    actions = (await db.scalars(select(AdminAuditLog.action).distinct())).all()
    return {
        "items": [
            {
                "id": a.id,
                "admin": {"id": a.admin_id, "name": name},
                "action": a.action,
                "target_type": a.target_type,
                "target_id": a.target_id,
                "report_id": a.report_id,
                "reason": a.reason,
                "meta": a.meta,
                "ip": str(a.ip) if a.ip else None,
                "user_agent": a.user_agent,
                "created_at": a.created_at,
            }
            for a, name in rows
        ],
        "total": int(total),
        "page": page,
        "actions": sorted(actions),
    }
