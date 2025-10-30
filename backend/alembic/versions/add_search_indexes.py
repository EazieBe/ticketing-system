"""Add search indexes for better performance

Revision ID: add_search_indexes
Revises: 05d8fda78538
Create Date: 2024-01-01 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_search_indexes'
down_revision = '05d8fda78538'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add search indexes for better performance on text search operations"""
    
    # Note: pg_trgm extension must be created by database admin
    # CREATE EXTENSION IF NOT EXISTS pg_trgm;
    
    # Add regular indexes for search fields (will work without trigram extension)
    op.create_index('ix_tickets_notes', 'tickets', ['notes'])
    op.create_index('ix_tickets_customer_name', 'tickets', ['customer_name'])
    op.create_index('ix_tickets_inc_number', 'tickets', ['inc_number'])
    op.create_index('ix_tickets_so_number', 'tickets', ['so_number'])
    
    # Add indexes for site search
    op.create_index('ix_sites_location', 'sites', ['location'])
    op.create_index('ix_sites_brand', 'sites', ['brand'])
    
    # Add indexes for user search
    op.create_index('ix_users_name', 'users', ['name'])
    op.create_index('ix_users_email', 'users', ['email'])


def downgrade() -> None:
    """Remove search indexes"""
    op.drop_index('ix_tickets_notes', table_name='tickets')
    op.drop_index('ix_tickets_customer_name', table_name='tickets')
    op.drop_index('ix_tickets_inc_number', table_name='tickets')
    op.drop_index('ix_tickets_so_number', table_name='tickets')
    op.drop_index('ix_sites_location', table_name='sites')
    op.drop_index('ix_sites_brand', table_name='sites')
    op.drop_index('ix_users_name', table_name='users')
    op.drop_index('ix_users_email', table_name='users')
