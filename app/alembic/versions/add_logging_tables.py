"""Add logging tables

Revision ID: add_logging_tables
Revises: d9946355712c
Create Date: 2025-01-07

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_logging_tables'
down_revision = 'd9946355712c'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add frontend logging tables."""
    
    # Create frontend_logs table
    op.create_table('frontend_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('timestamp', sa.DateTime(), nullable=False),
        sa.Column('level', sa.String(), nullable=False),
        sa.Column('context', sa.String(), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('data', sa.Text(), nullable=True),
        sa.Column('url', sa.String(), nullable=True),
        sa.Column('user_agent', sa.Text(), nullable=True),
        sa.Column('client_ip', sa.String(), nullable=True),
        sa.Column('error_id', sa.String(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for frontend_logs
    op.create_index(op.f('ix_frontend_logs_id'), 'frontend_logs', ['id'], unique=False)
    op.create_index(op.f('ix_frontend_logs_timestamp'), 'frontend_logs', ['timestamp'], unique=False)
    op.create_index(op.f('ix_frontend_logs_level'), 'frontend_logs', ['level'], unique=False)
    op.create_index(op.f('ix_frontend_logs_context'), 'frontend_logs', ['context'], unique=False)
    op.create_index(op.f('ix_frontend_logs_error_id'), 'frontend_logs', ['error_id'], unique=False)
    
    # Create frontend_errors table
    op.create_table('frontend_errors',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('timestamp', sa.DateTime(), nullable=False),
        sa.Column('error_id', sa.String(), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('stack', sa.Text(), nullable=True),
        sa.Column('component_stack', sa.Text(), nullable=True),
        sa.Column('url', sa.String(), nullable=True),
        sa.Column('user_agent', sa.Text(), nullable=True),
        sa.Column('client_ip', sa.String(), nullable=True),
        sa.Column('additional_data', sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('error_id')
    )
    
    # Create indexes for frontend_errors
    op.create_index(op.f('ix_frontend_errors_id'), 'frontend_errors', ['id'], unique=False)
    op.create_index(op.f('ix_frontend_errors_timestamp'), 'frontend_errors', ['timestamp'], unique=False)
    op.create_index(op.f('ix_frontend_errors_error_id'), 'frontend_errors', ['error_id'], unique=True)


def downgrade() -> None:
    """Remove frontend logging tables."""
    
    # Drop indexes
    op.drop_index(op.f('ix_frontend_errors_error_id'), table_name='frontend_errors')
    op.drop_index(op.f('ix_frontend_errors_timestamp'), table_name='frontend_errors')
    op.drop_index(op.f('ix_frontend_errors_id'), table_name='frontend_errors')
    
    op.drop_index(op.f('ix_frontend_logs_error_id'), table_name='frontend_logs')
    op.drop_index(op.f('ix_frontend_logs_context'), table_name='frontend_logs')
    op.drop_index(op.f('ix_frontend_logs_level'), table_name='frontend_logs')
    op.drop_index(op.f('ix_frontend_logs_timestamp'), table_name='frontend_logs')
    op.drop_index(op.f('ix_frontend_logs_id'), table_name='frontend_logs')
    
    # Drop tables
    op.drop_table('frontend_errors')
    op.drop_table('frontend_logs')
