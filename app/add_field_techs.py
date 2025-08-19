from database import SessionLocal
import models
import uuid

def add_field_techs():
    db = SessionLocal()
    try:
        # Check if field techs already exist
        existing_techs = db.query(models.FieldTech).count()
        if existing_techs > 0:
            print(f"Found {existing_techs} existing field techs. Skipping addition.")
            return
        
        # Field Techs
        field_tech1 = models.FieldTech(
            field_tech_id=str(uuid.uuid4()),
            name="John Smith",
            phone="555-3000",
            email="john.smith@company.com",
            region="East",
            city="Springfield",
            state="IL",
            zip="62701",
            notes="Senior field technician"
        )
        field_tech2 = models.FieldTech(
            field_tech_id=str(uuid.uuid4()),
            name="Sarah Johnson",
            phone="555-3001",
            email="sarah.johnson@company.com",
            region="West",
            city="Shelbyville",
            state="IL",
            zip="62565",
            notes="Network specialist"
        )
        field_tech3 = models.FieldTech(
            field_tech_id=str(uuid.uuid4()),
            name="Mike Wilson",
            phone="555-3002",
            email="mike.wilson@company.com",
            region="North",
            city="Chicago",
            state="IL",
            zip="60601",
            notes="Hardware expert"
        )
        field_tech4 = models.FieldTech(
            field_tech_id=str(uuid.uuid4()),
            name="Lisa Davis",
            phone="555-3003",
            email="lisa.davis@company.com",
            region="South",
            city="Peoria",
            state="IL",
            zip="61601",
            notes="Software specialist"
        )
        field_tech5 = models.FieldTech(
            field_tech_id=str(uuid.uuid4()),
            name="Tom Brown",
            phone="555-3004",
            email="tom.brown@company.com",
            region="Central",
            city="Bloomington",
            state="IL",
            zip="61701",
            notes="System administrator"
        )
        
        db.add_all([field_tech1, field_tech2, field_tech3, field_tech4, field_tech5])
        db.commit()
        print("Successfully added 5 field techs to the database.")
        
    except Exception as e:
        print(f"Error adding field techs: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    add_field_techs()
