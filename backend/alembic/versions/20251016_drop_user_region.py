"""drop user region column

Revision ID: 20251016_drop_user_region
Revises: b32e072e8dd1
Create Date: 2025-10-16 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20251016_drop_user_region'
down_revision = 'b32e072e8dd1'
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table('users') as batch_op:
        try:
            batch_op.drop_column('region')
        except Exception:
            pass


def downgrade() -> None:
    with op.batch_alter_table('users') as batch_op:
        try:
            batch_op.add_column(sa.Column('region', sa.String(), nullable=True))
        except Exception:
            pass


