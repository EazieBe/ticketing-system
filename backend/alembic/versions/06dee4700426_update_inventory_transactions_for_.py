"""update_inventory_transactions_for_shipment_items

Revision ID: 06dee4700426
Revises: 056b381ee2a8
Create Date: 2025-10-27 12:26:56.603429

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '06dee4700426'
down_revision: Union[str, Sequence[str], None] = '056b381ee2a8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
