from app.database import engine
from app.models import SLARule
from sqlalchemy import text

print('Creating SLA rules table...')
try:
    # Create the table using SQLAlchemy
    SLARule.__table__.create(engine, checkfirst=True)
    print('SLA rules table created successfully')
except Exception as e:
    print(f'Error creating table: {e}')
    
    # Try manual SQL creation
    try:
        with engine.connect() as conn:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS sla_rules (
                    rule_id VARCHAR PRIMARY KEY,
                    name VARCHAR NOT NULL,
                    description TEXT,
                    ticket_type tickettype,
                    customer_impact impactlevel,
                    business_priority businesspriority,
                    sla_target_hours INTEGER DEFAULT 24,
                    sla_breach_hours INTEGER DEFAULT 48,
                    escalation_levels INTEGER DEFAULT 3,
                    is_active BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """))
            conn.commit()
            print('SLA rules table created successfully using SQL')
    except Exception as e2:
        print(f'Error creating table with SQL: {e2}') 