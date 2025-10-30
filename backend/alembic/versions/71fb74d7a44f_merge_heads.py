"""merge heads

Revision ID: 71fb74d7a44f
Revises: add_search_indexes, bc37b6f8eda6
Create Date: 2025-08-26 13:34:31.488036

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '71fb74d7a44f'
down_revision: Union[str, Sequence[str], None] = ('add_search_indexes', 'bc37b6f8eda6')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
