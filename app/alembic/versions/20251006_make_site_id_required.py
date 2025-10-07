"""Make site_id required for tickets and shipments

Revision ID: 20251006_make_site_id_required
Revises: 20250902_add_user_active_column
Create Date: 2025-10-06 15:30:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20251006_make_site_id_required'
down_revision = '20250902_add_user_active'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # First, update any NULL site_id values to a default site
    # We'll use the first available site or create a default one
    op.execute("""
        UPDATE tickets 
        SET site_id = (SELECT site_id FROM sites LIMIT 1)
        WHERE site_id IS NULL;
    """)
    
    op.execute("""
        UPDATE shipments 
        SET site_id = (SELECT site_id FROM sites LIMIT 1)
        WHERE site_id IS NULL;
    """)
    
    # Now make site_id NOT NULL for tickets
    op.alter_column('tickets', 'site_id',
                    existing_type=sa.String(),
                    nullable=False)
    
    # Make site_id NOT NULL for shipments
    op.alter_column('shipments', 'site_id',
                    existing_type=sa.String(),
                    nullable=False)


def downgrade() -> None:
    # Revert site_id to nullable
    op.alter_column('tickets', 'site_id',
                    existing_type=sa.String(),
                    nullable=True)
    
    op.alter_column('shipments', 'site_id',
                    existing_type=sa.String(),
                    nullable=True)
