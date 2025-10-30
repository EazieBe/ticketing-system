"""merge multiple heads

Revision ID: 60eed7cd8217
Revises: add_sla_rules_table, e8b0d3557785
Create Date: 2025-08-01 17:18:45.748781

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '60eed7cd8217'
down_revision: Union[str, Sequence[str], None] = ('add_sla_rules_table', 'e8b0d3557785')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
