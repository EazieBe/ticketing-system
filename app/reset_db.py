from database import SessionLocal, engine
import models

def reset_database():
    # Drop all tables
    models.Base.metadata.drop_all(bind=engine)
    # Create all tables
    models.Base.metadata.create_all(bind=engine)
    print("Database reset complete!")

if __name__ == "__main__":
    reset_database() 