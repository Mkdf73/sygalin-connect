"""Initial schema - all tables

Revision ID: 001_initial
Revises:
Create Date: 2026-05-10 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "001_initial"
down_revision = None
branch_labels = None
depends_on = None


USER_ROLE = postgresql.ENUM("SYGALIN", "CLIENT", name="userrole")
USER_STATUS = postgresql.ENUM(
    "PENDING", "ACTIVE", "SUSPENDED", "REJECTED", name="userstatus"
)
SENDER_STATUS = postgresql.ENUM(
    "PENDING", "APPROVED", "REJECTED", name="senderstatus"
)
SENDER_USAGE = postgresql.ENUM(
    "COMMERCIAL", "TRANSACTIONAL", "INFORMATIONAL", name="senderusage"
)
CAMPAIGN_STATUS = postgresql.ENUM(
    "DRAFT", "SCHEDULED", "SENDING", "COMPLETED", "FAILED",
    name="campaignstatus",
)
MESSAGE_STATUS = postgresql.ENUM(
    "PENDING", "SENT", "DELIVERED", "FAILED", name="messagestatus"
)
TRANSACTION_TYPE = postgresql.ENUM(
    "PURCHASE", "ALLOCATION", "CAMPAIGN_DEBIT", "REFUND",
    name="transactiontype",
)
NOTIFICATION_TYPE = postgresql.ENUM(
    "INFO", "SUCCESS", "WARNING", "ERROR", name="notificationtype"
)

ENUMS = (
    USER_ROLE,
    USER_STATUS,
    SENDER_STATUS,
    SENDER_USAGE,
    CAMPAIGN_STATUS,
    MESSAGE_STATUS,
    TRANSACTION_TYPE,
    NOTIFICATION_TYPE,
)


def _enum(name: str, *values: str) -> postgresql.ENUM:
    return postgresql.ENUM(*values, name=name, create_type=False)


def _create_enums() -> None:
    bind = op.get_bind()
    for enum in ENUMS:
        enum.create(bind, checkfirst=True)


def _drop_enums() -> None:
    bind = op.get_bind()
    for enum in reversed(ENUMS):
        enum.drop(bind, checkfirst=True)


def upgrade() -> None:
    _create_enums()

    op.create_table(
        "plans",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("sms_monthly_limit", sa.Integer(), nullable=False),
        sa.Column("price_monthly", sa.Float(), nullable=False),
        sa.Column("features", sa.String(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )

    op.create_table(
        "sms_packs",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("sms_count", sa.Integer(), nullable=False),
        sa.Column("price", sa.Float(), nullable=False),
        sa.Column("currency", sa.String(), nullable=True),
        sa.Column("validity_days", sa.Integer(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=True),
        sa.Column("description", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "users",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("hashed_password", sa.String(), nullable=False),
        sa.Column("first_name", sa.String(), nullable=False),
        sa.Column("last_name", sa.String(), nullable=False),
        sa.Column("company", sa.String(), nullable=True),
        sa.Column("phone", sa.String(), nullable=True),
        sa.Column("country", sa.String(), nullable=True),
        sa.Column(
            "role",
            _enum("userrole", "SYGALIN", "CLIENT"),
            nullable=False,
        ),
        sa.Column(
            "status",
            _enum("userstatus", "PENDING", "ACTIVE", "SUSPENDED", "REJECTED"),
            nullable=False,
        ),
        sa.Column("sms_balance", sa.Integer(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=True),
        sa.Column("rejection_reason", sa.String(), nullable=True),
        sa.Column("last_password_reset_request", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "chat_messages",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("sender_id", sa.String(), nullable=False),
        sa.Column("recipient_id", sa.String(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("is_read", sa.Boolean(), nullable=True),
        sa.Column("timestamp", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["recipient_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["sender_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "contacts",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("phone", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=True),
        sa.Column("email", sa.String(), nullable=True),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "groups",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("description", sa.String(), nullable=True),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "notifications",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column(
            "notification_type",
            _enum("notificationtype", "INFO", "SUCCESS", "WARNING", "ERROR"),
            nullable=True,
        ),
        sa.Column("is_read", sa.Boolean(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "sender_ids",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("name", sa.String(length=11), nullable=False),
        sa.Column(
            "usage_type",
            _enum(
                "senderusage",
                "COMMERCIAL",
                "TRANSACTIONAL",
                "INFORMATIONAL",
            ),
            nullable=False,
        ),
        sa.Column("description", sa.String(length=300), nullable=True),
        sa.Column(
            "status",
            _enum("senderstatus", "PENDING", "APPROVED", "REJECTED"),
            nullable=False,
        ),
        sa.Column("rejection_reason", sa.String(), nullable=True),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "sms_templates",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("variables", sa.String(), nullable=True),
        sa.Column("category", sa.String(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "campaigns",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("message_content", sa.Text(), nullable=False),
        sa.Column("sender_id", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("encoding", sa.String(), nullable=True),
        sa.Column("total_recipients", sa.Integer(), nullable=True),
        sa.Column("sent_count", sa.Integer(), nullable=True),
        sa.Column("delivered_count", sa.Integer(), nullable=True),
        sa.Column("failed_count", sa.Integer(), nullable=True),
        sa.Column("sms_per_message", sa.Integer(), nullable=True),
        sa.Column("total_sms_used", sa.Integer(), nullable=True),
        sa.Column(
            "status",
            _enum(
                "campaignstatus",
                "DRAFT",
                "SCHEDULED",
                "SENDING",
                "COMPLETED",
                "FAILED",
            ),
            nullable=True,
        ),
        sa.Column("is_scheduled", sa.Boolean(), nullable=True),
        sa.Column("scheduled_at", sa.DateTime(), nullable=True),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.Column("provider_name", sa.String(), nullable=True),
        sa.Column("provider_response", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["sender_id"], ["sender_ids.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "contact_group",
        sa.Column("contact_id", sa.String(), nullable=False),
        sa.Column("group_id", sa.String(), nullable=False),
        sa.ForeignKeyConstraint(["contact_id"], ["contacts.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["group_id"], ["groups.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("contact_id", "group_id"),
    )

    op.create_table(
        "messages",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("campaign_id", sa.String(), nullable=False),
        sa.Column("contact_phone", sa.String(), nullable=False),
        sa.Column("contact_name", sa.String(), nullable=True),
        sa.Column(
            "status",
            _enum("messagestatus", "PENDING", "SENT", "DELIVERED", "FAILED"),
            nullable=True,
        ),
        sa.Column("external_id", sa.String(), nullable=True),
        sa.Column("provider_response", sa.Text(), nullable=True),
        sa.Column("error_message", sa.String(), nullable=True),
        sa.Column("sent_at", sa.DateTime(), nullable=True),
        sa.Column("delivered_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["campaign_id"], ["campaigns.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "transactions",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column(
            "transaction_type",
            _enum(
                "transactiontype",
                "PURCHASE",
                "ALLOCATION",
                "CAMPAIGN_DEBIT",
                "REFUND",
            ),
            nullable=False,
        ),
        sa.Column("sms_count", sa.Integer(), nullable=False),
        sa.Column("amount", sa.Float(), nullable=True),
        sa.Column("currency", sa.String(), nullable=True),
        sa.Column("pack_id", sa.String(), nullable=True),
        sa.Column("campaign_id", sa.String(), nullable=True),
        sa.Column("reference", sa.String(), nullable=True),
        sa.Column("description", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["campaign_id"], ["campaigns.id"]),
        sa.ForeignKeyConstraint(["pack_id"], ["sms_packs.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("transactions")
    op.drop_table("messages")
    op.drop_table("contact_group")
    op.drop_table("campaigns")
    op.drop_table("sms_templates")
    op.drop_table("sender_ids")
    op.drop_table("notifications")
    op.drop_table("groups")
    op.drop_table("contacts")
    op.drop_table("chat_messages")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
    op.drop_table("sms_packs")
    op.drop_table("plans")

    _drop_enums()
