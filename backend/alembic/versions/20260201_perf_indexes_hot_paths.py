"""Add performance indexes for hot ticket and field-tech paths

Revision ID: 20260201_perf_idx
Revises: 20260131_srad
Create Date: 2026-02-01
"""

from typing import Sequence, Union
from alembic import op

revision: str = "20260201_perf_idx"
down_revision: Union[str, Sequence[str], None] = "20260131_srad"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Ticket listing/filtering indexes
    op.execute("CREATE INDEX IF NOT EXISTS ix_tickets_status_created_at ON tickets (status, created_at DESC)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_tickets_assigned_status_created_at ON tickets (assigned_user_id, status, created_at DESC)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_tickets_site_status_created_at ON tickets (site_id, status, created_at DESC)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_tickets_type_status_created_at ON tickets (type, status, created_at DESC)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_tickets_priority_created_at ON tickets (priority, created_at DESC)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_tickets_inc_number ON tickets (inc_number)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_tickets_so_number ON tickets (so_number)")

    # Field-tech/company search indexes
    op.execute("CREATE INDEX IF NOT EXISTS ix_field_tech_companies_company_name ON field_tech_companies (company_name)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_field_tech_companies_city_state ON field_tech_companies (city, state)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_field_techs_company_id_name ON field_techs (company_id, name)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_field_techs_phone ON field_techs (phone)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_field_techs_tech_number ON field_techs (tech_number)")


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_field_techs_tech_number")
    op.execute("DROP INDEX IF EXISTS ix_field_techs_phone")
    op.execute("DROP INDEX IF EXISTS ix_field_techs_company_id_name")
    op.execute("DROP INDEX IF EXISTS ix_field_tech_companies_city_state")
    op.execute("DROP INDEX IF EXISTS ix_field_tech_companies_company_name")
    op.execute("DROP INDEX IF EXISTS ix_tickets_so_number")
    op.execute("DROP INDEX IF EXISTS ix_tickets_inc_number")
    op.execute("DROP INDEX IF EXISTS ix_tickets_priority_created_at")
    op.execute("DROP INDEX IF EXISTS ix_tickets_type_status_created_at")
    op.execute("DROP INDEX IF EXISTS ix_tickets_site_status_created_at")
    op.execute("DROP INDEX IF EXISTS ix_tickets_assigned_status_created_at")
    op.execute("DROP INDEX IF EXISTS ix_tickets_status_created_at")
