#!/usr/bin/env python3
"""
Ensure service_radius_miles columns exist and backfill existing companies/techs with sample radii.
Run from backend: python backfill_service_radius.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.chdir(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text
from database import engine, SessionLocal
import models

def ensure_columns():
    """Add service_radius_miles columns if they do not exist."""
    with engine.connect() as conn:
        # PostgreSQL: add column if not exists
        conn.execute(text("""
            ALTER TABLE field_tech_companies
            ADD COLUMN IF NOT EXISTS service_radius_miles INTEGER
        """))
        conn.execute(text("""
            ALTER TABLE field_techs
            ADD COLUMN IF NOT EXISTS service_radius_miles INTEGER
        """))
        conn.commit()
    print("Columns verified/added.")

def backfill():
    """Set service_radius_miles on companies and techs that have NULL."""
    db = SessionLocal()
    try:
        companies = db.query(models.FieldTechCompany).filter(
            models.FieldTechCompany.service_radius_miles == None
        ).all()
        updated_c = 0
        for c in companies:
            c.service_radius_miles = 50  # default 50 miles
            updated_c += 1
        db.commit()
        print(f"Updated {updated_c} companies with service_radius_miles=50")

        techs = db.query(models.FieldTech).filter(
            models.FieldTech.service_radius_miles == None
        ).all()
        radii = [50, 75, 100]
        updated_t = 0
        for i, t in enumerate(techs):
            t.service_radius_miles = radii[i % len(radii)]
            updated_t += 1
        db.commit()
        print(f"Updated {updated_t} techs with service_radius_miles (50/75/100).")
    finally:
        db.close()

if __name__ == "__main__":
    ensure_columns()
    backfill()
    print("Done. Map rings should show when you click a company.")
