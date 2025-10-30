"""update ticket types and statuses

Revision ID: update_ticket_types_and_statuses
Revises: add_equipment_fields_to_sites
Create Date: 2024-07-29 17:35:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'update_ticket_types_and_statuses'
down_revision = 'add_equipment_fields_to_sites'
branch_labels = None
depends_on = None


def upgrade():
    # Add temporary columns
    op.add_column('tickets', sa.Column('type_new', sa.String()))
    op.add_column('tickets', sa.Column('status_new', sa.String()))
    
    # Update data in temporary columns
    op.execute("UPDATE tickets SET type_new = CASE WHEN type = 'project' THEN 'projects' ELSE type::text END")
    op.execute("UPDATE tickets SET status_new = CASE WHEN status = 'assigned' THEN 'in_progress' WHEN status = 'awaiting_approval' THEN 'closed' ELSE status::text END")
    
    # Drop old enum columns
    op.drop_column('tickets', 'type')
    op.drop_column('tickets', 'status')
    
    # Create new enums
    op.execute("DROP TYPE IF EXISTS tickettype")
    op.execute("CREATE TYPE tickettype AS ENUM ('inhouse', 'onsite', 'shipping', 'projects', 'nro', 'misc')")
    op.execute("DROP TYPE IF EXISTS ticketstatus")
    op.execute("CREATE TYPE ticketstatus AS ENUM ('open', 'in_progress', 'pending', 'closed', 'approved', 'checked_in', 'return', 'shipped', 'delivered', 'planning', 'review', 'completed', 'archived')")
    
    # Add new enum columns
    op.add_column('tickets', sa.Column('type', sa.Enum('inhouse', 'onsite', 'shipping', 'projects', 'nro', 'misc', name='tickettype')))
    op.add_column('tickets', sa.Column('status', sa.Enum('open', 'in_progress', 'pending', 'closed', 'approved', 'checked_in', 'return', 'shipped', 'delivered', 'planning', 'review', 'completed', 'archived', name='ticketstatus')))
    
    # Copy data from temporary columns to new enum columns
    op.execute("UPDATE tickets SET type = type_new::tickettype, status = status_new::ticketstatus")
    
    # Drop temporary columns
    op.drop_column('tickets', 'type_new')
    op.drop_column('tickets', 'status_new')


def downgrade():
    # Revert ticket status enum
    op.execute("ALTER TYPE ticketstatus RENAME TO ticketstatus_new")
    op.execute("CREATE TYPE ticketstatus AS ENUM ('open', 'assigned', 'in_progress', 'pending', 'closed', 'awaiting_approval')")
    
    # Update existing data back to old statuses
    op.execute("UPDATE tickets SET status = 'assigned' WHERE status = 'in_progress'")
    op.execute("UPDATE tickets SET status = 'awaiting_approval' WHERE status = 'closed'")
    
    # Change column to use old enum
    op.execute("ALTER TABLE tickets ALTER COLUMN status TYPE ticketstatus USING status::text::ticketstatus")
    op.execute("DROP TYPE ticketstatus_new")
    
    # Revert ticket types enum
    op.execute("ALTER TYPE tickettype RENAME TO tickettype_new")
    op.execute("CREATE TYPE tickettype AS ENUM ('inhouse', 'onsite', 'project', 'shipping', 'misc')")
    
    # Update existing data - map 'projects' back to 'project'
    op.execute("UPDATE tickets SET type = 'project' WHERE type = 'projects'")
    
    # Change column to use old enum
    op.execute("ALTER TABLE tickets ALTER COLUMN type TYPE tickettype USING type::text::tickettype")
    op.execute("DROP TYPE tickettype_new") 