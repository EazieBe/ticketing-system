"""enhance shipments table

Revision ID: 5b57969a5c81
Revises: 71fb74d7a44f
Create Date: 2025-08-26 13:50:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '5b57969a5c81'
down_revision = '71fb74d7a44f'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Enhance shipments table with new fields"""
    
    # Add new columns to shipments table
    op.add_column('shipments', sa.Column('date_created', sa.DateTime(), nullable=True))
    op.add_column('shipments', sa.Column('remove_from_inventory', sa.Boolean(), nullable=True, default=False))
    
    # Update existing records to have a date_created value
    op.execute("UPDATE shipments SET date_created = CURRENT_TIMESTAMP WHERE date_created IS NULL")
    
    # Make date_created not nullable after setting default values
    op.alter_column('shipments', 'date_created', nullable=False)


def downgrade() -> None:
    """Remove enhanced fields from shipments table"""
    
    # Remove the new columns
    op.drop_column('shipments', 'remove_from_inventory')
    op.drop_column('shipments', 'date_created')
