"""merge_heads

Revision ID: b32e072e8dd1
Revises: add_logging_tables, add_performance_indexes, add_safe_performance_indexes
Create Date: 2025-10-12 17:46:43.527002

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b32e072e8dd1'
down_revision: Union[str, Sequence[str], None] = ('add_logging_tables', 'add_performance_indexes', 'add_safe_performance_indexes')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
