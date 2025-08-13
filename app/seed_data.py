from database import SessionLocal
import models
import uuid
from datetime import date
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password):
    return pwd_context.hash(password)

def seed():
    db = SessionLocal()
    # Users
    user1 = models.User(
        user_id=str(uuid.uuid4()),
        name="Alice Admin",
        email="alice@company.com",
        role=models.UserRole.admin,
        phone="555-1000",
        region="HQ",
        hashed_password=get_password_hash('password123'),
        preferences="{}"
    )
    user2 = models.User(
        user_id=str(uuid.uuid4()),
        name="Bob Tech",
        email="bob@company.com",
        role=models.UserRole.admin,
        phone="555-2000",
        region="East",
        hashed_password=get_password_hash('password123'),
        preferences="{}"
    )
    db.add_all([user1, user2])
    # Sites
    site1 = models.Site(
        site_id="1234",
        ip_address="192.168.1.10",
        location="Store 1234",
        brand="BrandX",
        main_number="555-1234",
        mp="",
        service_address="123 Main St",
        city="Springfield",
        state="IL",
        zip="62701",
        notes="Flagship store"
    )
    site2 = models.Site(
        site_id="5678",
        ip_address="192.168.2.10",
        location="Store 5678",
        brand="BrandY",
        main_number="555-5678",
        mp="",
        service_address="456 Elm St",
        city="Shelbyville",
        state="IL",
        zip="62565",
        notes="New location"
    )
    db.add_all([site1, site2])
    # Tickets
    ticket1 = models.Ticket(
        ticket_id=str(uuid.uuid4()),
        site_id="1234",
        inc_number="INC10001",
        so_number="SO20001",
        type=models.TicketType.inhouse,
        status=models.TicketStatus.open,
        priority=models.TicketPriority.critical,
        category="Network",
        assigned_user_id=user2.user_id,
        onsite_tech_id=None,
        date_created=date.today(),
        notes="Printer not working",
        color_flag="white",
        special_flag=None,
        last_updated_by=user2.user_id,
        last_updated_at=None
    )
    ticket2 = models.Ticket(
        ticket_id=str(uuid.uuid4()),
        site_id="5678",
        inc_number="INC10002",
        so_number="SO20002",
        type=models.TicketType.onsite,
        status=models.TicketStatus.in_progress,
        priority=models.TicketPriority.normal,
        category="Hardware",
        assigned_user_id=user2.user_id,
        onsite_tech_id=None,
        date_created=date.today(),
        notes="Phone system down",
        color_flag="yellow",
        special_flag=None,
        last_updated_by=user1.user_id,
        last_updated_at=None
    )
    db.add_all([ticket1, ticket2])
    db.commit()
    db.close()

if __name__ == "__main__":
    seed() 