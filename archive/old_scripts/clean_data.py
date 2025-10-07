#!/usr/bin/env python3
"""
Script to clean all data from the ticketing system while preserving user logins
"""
import sys
import os

# Add the app directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from sqlalchemy.orm import Session
from database import SessionLocal
import models

def clean_data(skip_confirmation=False):
    """Clean all data except users"""
    db = SessionLocal()
    
    try:
        print("=" * 60)
        print("CLEANING TICKETING SYSTEM DATA")
        print("=" * 60)
        print("")
        
        # Count records before deletion
        print("Current data counts:")
        print(f"  Users: {db.query(models.User).count()}")
        print(f"  Sites: {db.query(models.Site).count()}")
        print(f"  Tickets: {db.query(models.Ticket).count()}")
        print(f"  Shipments: {db.query(models.Shipment).count()}")
        print(f"  Field Techs: {db.query(models.FieldTech).count()}")
        print(f"  Inventory Items: {db.query(models.InventoryItem).count()}")
        print(f"  Ticket Comments: {db.query(models.TicketComment).count()}")
        print(f"  Time Entries: {db.query(models.TimeEntry).count()}")
        print("")
        
        # Confirm deletion
        if not skip_confirmation:
            response = input("⚠️  This will DELETE all data except users. Continue? (yes/no): ")
            if response.lower() != 'yes':
                print("❌ Operation cancelled.")
                return
        else:
            print("⚠️  Proceeding with data cleanup (confirmation skipped)...")
        
        print("")
        print("Deleting data...")
        print("")
        
        # Delete in order to respect foreign key constraints
        
        # 1. Delete ticket-related data first
        deleted_comments = db.query(models.TicketComment).delete()
        print(f"✓ Deleted {deleted_comments} ticket comments")
        
        deleted_time_entries = db.query(models.TimeEntry).delete()
        print(f"✓ Deleted {deleted_time_entries} time entries")
        
        deleted_audits = db.query(models.TicketAudit).delete()
        print(f"✓ Deleted {deleted_audits} audit entries")
        
        # Check if TicketAttachment exists
        try:
            deleted_attachments = db.query(models.TicketAttachment).delete()
            print(f"✓ Deleted {deleted_attachments} ticket attachments")
        except AttributeError:
            print("ℹ Ticket attachments table not found, skipping...")
        
        # Check if Task exists
        try:
            deleted_tasks = db.query(models.Task).delete()
            print(f"✓ Deleted {deleted_tasks} tasks")
        except AttributeError:
            print("ℹ Tasks table not found, skipping...")
        
        # 2. Delete tickets
        deleted_tickets = db.query(models.Ticket).delete()
        print(f"✓ Deleted {deleted_tickets} tickets")
        
        # 3. Delete shipment-related data
        # Check if InventoryTransaction exists
        try:
            deleted_transactions = db.query(models.InventoryTransaction).delete()
            print(f"✓ Deleted {deleted_transactions} inventory transactions")
        except AttributeError:
            print("ℹ Inventory transactions table not found, skipping...")
        
        deleted_shipments = db.query(models.Shipment).delete()
        print(f"✓ Deleted {deleted_shipments} shipments")
        
        # 4. Delete inventory items
        deleted_inventory = db.query(models.InventoryItem).delete()
        print(f"✓ Deleted {deleted_inventory} inventory items")
        
        # 5. Delete site equipment
        try:
            deleted_equipment = db.query(models.SiteEquipment).delete()
            print(f"✓ Deleted {deleted_equipment} site equipment records")
        except AttributeError:
            print("ℹ Site equipment table not found, skipping...")
        
        # 6. Delete sites
        deleted_sites = db.query(models.Site).delete()
        print(f"✓ Deleted {deleted_sites} sites")
        
        # 7. Delete field techs
        deleted_techs = db.query(models.FieldTech).delete()
        print(f"✓ Deleted {deleted_techs} field techs")
        
        # 8. Delete SLA rules
        try:
            deleted_sla = db.query(models.SLARule).delete()
            print(f"✓ Deleted {deleted_sla} SLA rules")
        except AttributeError:
            print("ℹ SLA rules table not found, skipping...")
        
        # Commit all deletions
        db.commit()
        
        print("")
        print("=" * 60)
        print("✅ DATA CLEANUP COMPLETE")
        print("=" * 60)
        print("")
        
        # Show remaining data
        print("Remaining data counts:")
        print(f"  Users: {db.query(models.User).count()} (preserved)")
        print(f"  Sites: {db.query(models.Site).count()}")
        print(f"  Tickets: {db.query(models.Ticket).count()}")
        print(f"  Shipments: {db.query(models.Shipment).count()}")
        print(f"  Field Techs: {db.query(models.FieldTech).count()}")
        print(f"  Inventory Items: {db.query(models.InventoryItem).count()}")
        print("")
        print("✓ All users and their login credentials have been preserved.")
        print("")
        
    except Exception as e:
        print(f"")
        print(f"❌ Error cleaning data: {e}")
        db.rollback()
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    import sys
    # Check for --yes flag to skip confirmation
    skip_confirmation = '--yes' in sys.argv or '-y' in sys.argv
    clean_data(skip_confirmation)

