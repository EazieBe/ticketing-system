"""add sla rules table

Revision ID: add_sla_rules_table
Revises: 1608d5597c20
Create Date: 2025-01-01 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_sla_rules_table'
down_revision = '1608d5597c20'
branch_labels = None
depends_on = None


def upgrade():
    # Create SLA rules table using existing enum types
    op.create_table('sla_rules',
        sa.Column('rule_id', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('ticket_type', sa.Enum('inhouse', 'onsite', 'shipping', 'projects', 'nro', 'misc', name='tickettype', create_type=False), nullable=True),
        sa.Column('customer_impact', sa.Enum('low', 'medium', 'high', 'critical', name='impactlevel', create_type=False), nullable=True),
        sa.Column('business_priority', sa.Enum('low', 'medium', 'high', 'urgent', name='businesspriority', create_type=False), nullable=True),
        sa.Column('sla_target_hours', sa.Integer(), nullable=True),
        sa.Column('sla_breach_hours', sa.Integer(), nullable=True),
        sa.Column('escalation_levels', sa.Integer(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('rule_id')
    )
    op.create_index(op.f('ix_sla_rules_rule_id'), 'sla_rules', ['rule_id'], unique=False)


def downgrade():
    op.drop_index(op.f('ix_sla_rules_rule_id'), table_name='sla_rules')
    op.drop_table('sla_rules') 