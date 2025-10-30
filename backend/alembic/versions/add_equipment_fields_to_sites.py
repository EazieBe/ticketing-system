"""add equipment fields to sites

Revision ID: add_equipment_fields_to_sites
Revises: 1608d5597c20
Create Date: 2024-07-29 15:10:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_equipment_fields_to_sites'
down_revision = '1608d5597c20'
branch_labels = None
depends_on = None


def upgrade():
    # Add equipment fields to sites table
    op.add_column('sites', sa.Column('equipment_notes', sa.Text(), nullable=True))
    op.add_column('sites', sa.Column('phone_system', sa.String(), nullable=True))
    op.add_column('sites', sa.Column('phone_types', sa.String(), nullable=True))
    op.add_column('sites', sa.Column('network_equipment', sa.String(), nullable=True))
    op.add_column('sites', sa.Column('additional_equipment', sa.String(), nullable=True))


def downgrade():
    # Remove equipment fields from sites table
    op.drop_column('sites', 'additional_equipment')
    op.drop_column('sites', 'network_equipment')
    op.drop_column('sites', 'phone_types')
    op.drop_column('sites', 'phone_system')
    op.drop_column('sites', 'equipment_notes') 