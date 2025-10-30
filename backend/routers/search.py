from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Dict, Any

import models
from database import get_db
from utils.main_utils import get_current_user

router = APIRouter(prefix="/search", tags=["search"])

@router.get("")
def global_search(
    q: str = Query(..., min_length=1, description="Search query"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Global search across tickets, sites, users, and inventory"""
    
    results = {
        "tickets": [],
        "sites": [],
        "users": [],
        "inventory": [],
        "field_techs": [],
        "shipments": []
    }
    
    search_term = f"%{q}%"
    
    # Search tickets
    tickets = db.query(models.Ticket).filter(
        or_(
            models.Ticket.ticket_id.ilike(search_term),
            models.Ticket.inc_number.ilike(search_term),
            models.Ticket.so_number.ilike(search_term),
            models.Ticket.notes.ilike(search_term),
            models.Ticket.category.ilike(search_term)
        )
    ).limit(10).all()
    
    results["tickets"] = [
        {
            "id": t.ticket_id,
            "display": f"Ticket {t.ticket_id} - {t.status}",
            "type": "ticket",
            "url": f"/tickets/{t.ticket_id}"
        } for t in tickets
    ]
    
    # Search sites
    sites = db.query(models.Site).filter(
        or_(
            models.Site.site_id.ilike(search_term),
            models.Site.location.ilike(search_term),
            models.Site.city.ilike(search_term),
            models.Site.brand.ilike(search_term)
        )
    ).limit(10).all()
    
    results["sites"] = [
        {
            "id": s.site_id,
            "display": f"{s.site_id} - {s.location}",
            "type": "site",
            "url": f"/sites/{s.site_id}"
        } for s in sites
    ]
    
    # Search users
    users = db.query(models.User).filter(
        or_(
            models.User.name.ilike(search_term),
            models.User.email.ilike(search_term),
            models.User.user_id.ilike(search_term)
        )
    ).limit(10).all()
    
    results["users"] = [
        {
            "id": u.user_id,
            "display": f"{u.name} ({u.email})",
            "type": "user",
            "url": f"/users/{u.user_id}"
        } for u in users
    ]
    
    # Search inventory
    inventory = db.query(models.InventoryItem).filter(
        or_(
            models.InventoryItem.name.ilike(search_term),
            models.InventoryItem.sku.ilike(search_term),
            models.InventoryItem.barcode.ilike(search_term),
            models.InventoryItem.description.ilike(search_term)
        )
    ).limit(10).all()
    
    results["inventory"] = [
        {
            "id": i.item_id,
            "display": f"{i.name} (SKU: {i.sku})",
            "type": "inventory",
            "url": f"/inventory/{i.item_id}"
        } for i in inventory
    ]
    
    # Search field techs
    field_techs = db.query(models.FieldTech).filter(
        or_(
            models.FieldTech.name.ilike(search_term),
            models.FieldTech.email.ilike(search_term),
            models.FieldTech.phone.ilike(search_term)
        )
    ).limit(10).all()
    
    results["field_techs"] = [
        {
            "id": ft.field_tech_id,
            "display": f"{ft.name} - {ft.region}",
            "type": "field_tech",
            "url": f"/fieldtechs/{ft.field_tech_id}"
        } for ft in field_techs
    ]
    
    # Search shipments
    shipments = db.query(models.Shipment).filter(
        or_(
            models.Shipment.shipment_id.ilike(search_term),
            models.Shipment.tracking_number.ilike(search_term),
            models.Shipment.what_is_being_shipped.ilike(search_term)
        )
    ).limit(10).all()
    
    results["shipments"] = [
        {
            "id": s.shipment_id,
            "display": f"Shipment {s.shipment_id} - {s.what_is_being_shipped}",
            "type": "shipment",
            "url": f"/shipments/{s.shipment_id}"
        } for s in shipments
    ]
    
    # Flatten results for frontend
    all_results = []
    for category, items in results.items():
        all_results.extend(items)
    
    return {
        "query": q,
        "results": all_results,
        "count": len(all_results),
        "by_category": results
    }

