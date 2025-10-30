"""Add created_at timestamp to tickets

Revision ID: 20251006_add_ticket_created_at
Revises: 20251006_make_site_id_required
Create Date: 2025-10-06

"""
from alembic import op
import sqlalchemy as sa
from datetime import datetime, timezone

# revision identifiers, used by Alembic.
revision = '20251006_add_ticket_created_at'
down_revision = '20251006_make_site_id_required'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add created_at column to tickets table (nullable first)
    op.add_column('tickets', sa.Column('created_at', sa.DateTime(), nullable=True))
    
    # Set existing tickets' created_at to current timestamp (or use date_created if available)
    # This uses a SQL expression to convert date_created to datetime
    op.execute("""
        UPDATE tickets 
        SET created_at = CAST(date_created AS TIMESTAMP)
        WHERE created_at IS NULL
    """)
    
    # Now make it non-nullable with default
    op.alter_column('tickets', 'created_at',
                    existing_type=sa.DateTime(),
                    nullable=False,
                    server_default=sa.text('CURRENT_TIMESTAMP'))


def downgrade() -> None:
    # Remove created_at column
    op.drop_column('tickets', 'created_at')

