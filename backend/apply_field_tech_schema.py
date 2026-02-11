#!/usr/bin/env python3
"""One-off: add field_tech_companies table and company_id/tech_number to field_techs, tech_rating to tickets."""
import os
import sys

# Run from backend/
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.chdir(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine, text
from database import engine

def run():
    with engine.connect() as conn:
        # Create field_tech_companies if not exists
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS field_tech_companies (
                company_id VARCHAR NOT NULL PRIMARY KEY,
                company_name VARCHAR NOT NULL,
                company_number VARCHAR,
                address VARCHAR,
                city VARCHAR,
                state VARCHAR,
                zip VARCHAR,
                region VARCHAR,
                notes TEXT,
                created_at TIMESTAMP
            )
        """))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_field_tech_companies_company_id ON field_tech_companies (company_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_field_tech_companies_state ON field_tech_companies (state)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_field_tech_companies_region ON field_tech_companies (region)"))
        # Add company_id to field_techs if missing
        r = conn.execute(text("""
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'field_techs' AND column_name = 'company_id'
        """))
        if r.fetchone() is None:
            conn.execute(text("ALTER TABLE field_techs ADD COLUMN company_id VARCHAR REFERENCES field_tech_companies(company_id)"))
        # Add tech_number to field_techs if missing
        r = conn.execute(text("""
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'field_techs' AND column_name = 'tech_number'
        """))
        if r.fetchone() is None:
            conn.execute(text("ALTER TABLE field_techs ADD COLUMN tech_number VARCHAR"))
        # Add tech_rating to tickets if missing
        r = conn.execute(text("""
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'tickets' AND column_name = 'tech_rating'
        """))
        if r.fetchone() is None:
            conn.execute(text("ALTER TABLE tickets ADD COLUMN tech_rating INTEGER"))
        conn.commit()
    print("Schema updated: field_tech_companies, field_techs.company_id/tech_number, tickets.tech_rating")

if __name__ == "__main__":
    run()
