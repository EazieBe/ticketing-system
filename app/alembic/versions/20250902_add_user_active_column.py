"""add user.active column

Revision ID: 20250902_add_user_active
Revises: 5b57969a5c81
Create Date: 2025-09-02 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20250902_add_user_active'
down_revision = '5b57969a5c81'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add 'active' column to users with default true, then set non-null
    op.add_column('users', sa.Column('active', sa.Boolean(), nullable=True))
    op.execute("UPDATE users SET active = TRUE WHERE active IS NULL")
    op.alter_column('users', 'active', nullable=False)


def downgrade() -> None:
    op.drop_column('users', 'active')



