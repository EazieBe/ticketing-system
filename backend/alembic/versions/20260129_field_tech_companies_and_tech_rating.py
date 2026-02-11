"""Field tech companies, tech_number, tech_rating

Revision ID: 20260129_ft
Revises: 06dee4700426
Create Date: 2026-01-29

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '20260129_ft'
down_revision: Union[str, Sequence[str], None] = '06dee4700426'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'field_tech_companies',
        sa.Column('company_id', sa.String(), nullable=False),
        sa.Column('company_name', sa.String(), nullable=False),
        sa.Column('company_number', sa.String(), nullable=True),
        sa.Column('address', sa.String(), nullable=True),
        sa.Column('city', sa.String(), nullable=True),
        sa.Column('state', sa.String(), nullable=True),
        sa.Column('zip', sa.String(), nullable=True),
        sa.Column('region', sa.String(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('company_id')
    )
    op.create_index(op.f('ix_field_tech_companies_company_id'), 'field_tech_companies', ['company_id'], unique=False)
    op.create_index(op.f('ix_field_tech_companies_state'), 'field_tech_companies', ['state'], unique=False)
    op.create_index(op.f('ix_field_tech_companies_region'), 'field_tech_companies', ['region'], unique=False)

    op.add_column('field_techs', sa.Column('company_id', sa.String(), nullable=True))
    op.add_column('field_techs', sa.Column('tech_number', sa.String(), nullable=True))
    op.create_foreign_key('fk_field_techs_company', 'field_techs', 'field_tech_companies', ['company_id'], ['company_id'])

    op.add_column('tickets', sa.Column('tech_rating', sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column('tickets', 'tech_rating')
    op.drop_constraint('fk_field_techs_company', 'field_techs', type_='foreignkey')
    op.drop_column('field_techs', 'tech_number')
    op.drop_column('field_techs', 'company_id')
    op.drop_index(op.f('ix_field_tech_companies_region'), table_name='field_tech_companies')
    op.drop_index(op.f('ix_field_tech_companies_state'), table_name='field_tech_companies')
    op.drop_index(op.f('ix_field_tech_companies_company_id'), table_name='field_tech_companies')
    op.drop_table('field_tech_companies')
