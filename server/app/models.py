"""Import every model so Base.metadata is complete (Alembic, tests)."""

from app.core.outbox import TaskOutbox
from app.modules.auth.models import EmailOtp, RefreshToken, User
from app.modules.borrowing.models import BorrowRequest
from app.modules.categories.models import Category, CategoryTranslation
from app.modules.listings.models import Listing, ListingImage
from app.modules.loans.models import Loan
from app.modules.messages.models import Conversation, ConversationParticipant, Message
from app.modules.moderation.models import AdminAuditLog, Report, ReportNote, UserWarning
from app.modules.notifications.models import Notification
from app.modules.ratings.models import Rating
from app.modules.saved.models import SavedItem
from app.modules.telegram.models import TelegramLinkToken

__all__ = [
    "AdminAuditLog",
    "BorrowRequest",
    "Category",
    "CategoryTranslation",
    "Conversation",
    "ConversationParticipant",
    "EmailOtp",
    "Listing",
    "ListingImage",
    "Loan",
    "Message",
    "Notification",
    "Rating",
    "RefreshToken",
    "Report",
    "ReportNote",
    "SavedItem",
    "TaskOutbox",
    "TelegramLinkToken",
    "User",
    "UserWarning",
]
