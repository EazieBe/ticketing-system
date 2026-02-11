"""Add service_radius_miles to field tech companies and field techs

Revision ID: 20260131_srad
Revises: 20260129_ft
Create Date: 2026-01-31

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '20260131_srad'
down_revision: Union[str, Sequence[str], None] = '20260129_ft'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('field_tech_companies', sa.Column('service_radius_miles', sa.Integer(), nullable=True))
    op.add_column('field_techs', sa.Column('service_radius_miles', sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column('field_techs', 'service_radius_miles')
    op.drop_column('field_tech_companies', 'service_radius_miles')
