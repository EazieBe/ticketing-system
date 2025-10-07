"""merge_timestamp_migrations

Revision ID: d9946355712c
Revises: 20251006_add_ticket_created_at, standardize_timestamps
Create Date: 2025-10-07 15:55:24.536791

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd9946355712c'
down_revision: Union[str, Sequence[str], None] = ('20251006_add_ticket_created_at', 'standardize_timestamps')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
