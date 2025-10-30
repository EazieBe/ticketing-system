"""Standardize timestamp fields across all entities

Revision ID: standardize_timestamps
Revises: 1b19778c0ab8
Create Date: 2025-01-07 14:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'standardize_timestamps'
down_revision = '1b19778c0ab8'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Standardize timestamp fields across all entities."""
    
    # Note: created_at field is already added by 20251006_add_ticket_created_at migration
    # This migration focuses on standardizing other timestamp fields
    
    # For shipments table - ensure date_created is properly set
    op.execute("""
        UPDATE shipments 
        SET date_created = COALESCE(date_created, NOW() AT TIME ZONE 'UTC')
        WHERE date_created IS NULL;
    """)
    
    # For tasks table - ensure created_at is properly set
    op.execute("""
        UPDATE tasks 
        SET created_at = COALESCE(created_at, NOW() AT TIME ZONE 'UTC')
        WHERE created_at IS NULL;
    """)
    
    # Add updated_at to tasks if it doesn't exist
    # Check if column exists first
    connection = op.get_bind()
    inspector = sa.inspect(connection)
    columns = [col['name'] for col in inspector.get_columns('tasks')]
    
    if 'updated_at' not in columns:
        op.add_column('tasks', sa.Column('updated_at', sa.DateTime(), nullable=True))
        op.execute("UPDATE tasks SET updated_at = created_at WHERE updated_at IS NULL;")
    
    # Note: tickets.created_at is already handled by 20251006_add_ticket_created_at migration
    # Only handle last_updated_at here
    op.alter_column('tickets', 'last_updated_at',
                   existing_type=sa.DateTime(),
                   nullable=True,
                   server_default=sa.text('NOW() AT TIME ZONE \'UTC\''))
    
    op.alter_column('shipments', 'date_created',
                   existing_type=sa.DateTime(),
                   nullable=False,
                   server_default=sa.text('NOW() AT TIME ZONE \'UTC\''))
    
    op.alter_column('tasks', 'created_at',
                   existing_type=sa.DateTime(),
                   nullable=False,
                   server_default=sa.text('NOW() AT TIME ZONE \'UTC\''))
    
    op.alter_column('tasks', 'updated_at',
                   existing_type=sa.DateTime(),
                   nullable=False,
                   server_default=sa.text('NOW() AT TIME ZONE \'UTC\''))
    
    op.alter_column('ticket_comments', 'created_at',
                   existing_type=sa.DateTime(),
                   nullable=False,
                   server_default=sa.text('NOW() AT TIME ZONE \'UTC\''))
    
    op.alter_column('ticket_comments', 'updated_at',
                   existing_type=sa.DateTime(),
                   nullable=False,
                   server_default=sa.text('NOW() AT TIME ZONE \'UTC\''))
    
    op.alter_column('time_entries', 'created_at',
                   existing_type=sa.DateTime(),
                   nullable=False,
                   server_default=sa.text('NOW() AT TIME ZONE \'UTC\''))
    
    op.alter_column('sla_rules', 'created_at',
                   existing_type=sa.DateTime(),
                   nullable=False,
                   server_default=sa.text('NOW() AT TIME ZONE \'UTC\''))
    
    op.alter_column('sla_rules', 'updated_at',
                   existing_type=sa.DateTime(),
                   nullable=False,
                   server_default=sa.text('NOW() AT TIME ZONE \'UTC\''))
    
    op.alter_column('site_equipment', 'created_at',
                   existing_type=sa.DateTime(),
                   nullable=False,
                   server_default=sa.text('NOW() AT TIME ZONE \'UTC\''))
    
    op.alter_column('site_equipment', 'updated_at',
                   existing_type=sa.DateTime(),
                   nullable=False,
                   server_default=sa.text('NOW() AT TIME ZONE \'UTC\''))
    
    # Add triggers to automatically update last_updated_at on ticket changes
    op.execute("""
        CREATE OR REPLACE FUNCTION update_ticket_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.last_updated_at = NOW() AT TIME ZONE 'UTC';
            RETURN NEW;
        END;
        $$ language 'plpgsql';
    """)
    
    op.execute("""
        CREATE TRIGGER update_tickets_updated_at 
        BEFORE UPDATE ON tickets 
        FOR EACH ROW 
        EXECUTE FUNCTION update_ticket_updated_at();
    """)


def downgrade() -> None:
    """Revert timestamp standardization."""
    
    # Drop triggers
    op.execute("DROP TRIGGER IF EXISTS update_tickets_updated_at ON tickets;")
    op.execute("DROP FUNCTION IF EXISTS update_ticket_updated_at();")
    
    # Remove server defaults (created_at is handled by other migration)
    op.alter_column('tickets', 'last_updated_at', server_default=None)
    op.alter_column('shipments', 'date_created', server_default=None)
    op.alter_column('tasks', 'created_at', server_default=None)
    op.alter_column('tasks', 'updated_at', server_default=None)
    op.alter_column('ticket_comments', 'created_at', server_default=None)
    op.alter_column('ticket_comments', 'updated_at', server_default=None)
    op.alter_column('time_entries', 'created_at', server_default=None)
    op.alter_column('sla_rules', 'created_at', server_default=None)
    op.alter_column('sla_rules', 'updated_at', server_default=None)
    op.alter_column('site_equipment', 'created_at', server_default=None)
    op.alter_column('site_equipment', 'updated_at', server_default=None)
    
    # Remove updated_at from tasks if it was added
    op.drop_column('tasks', 'updated_at')
