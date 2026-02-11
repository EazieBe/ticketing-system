"""Field tech companies: one address per company, techs listed under company."""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional

import models, schemas, crud
from database import get_db
from utils.main_utils import get_current_user, require_role, _enqueue_broadcast

router = APIRouter(prefix="/fieldtech-companies", tags=["fieldtech-companies"])


@router.get("/states")
def list_us_states():
    """Return US states for dropdown (value, label). No auth required for dropdown data."""
    from region_utils import get_us_states_for_dropdown
    return get_us_states_for_dropdown()


@router.get("/regions")
def list_regions():
    """Return distinct region names for map filter."""
    from region_utils import _STATE_TO_REGION
    return sorted(set(_STATE_TO_REGION.values()))


@router.get("/zip/{zip_code}")
def lookup_zip_code(zip_code: str):
    """Return city, state, and optional lat/lng for address auto-fill. No auth required."""
    from zip_lookup import lookup_zip
    result = lookup_zip(zip_code)
    if result is None:
        return {"city": None, "state": None, "lat": None, "lng": None}
    return result


@router.post("/", response_model=schemas.FieldTechCompanyOut)
def create_company(
    data: schemas.FieldTechCompanyCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    background_tasks: BackgroundTasks = None,
):
    """Create a field tech company; region is derived from state."""
    result = crud.create_field_tech_company(db=db, company=data)
    if background_tasks:
        _enqueue_broadcast(background_tasks, '{"type":"field_tech_company","action":"create"}')
    return result


@router.get("/", response_model=List[schemas.FieldTechCompanyOut])
def list_companies(
    skip: int = 0,
    limit: int = 500,
    region: Optional[str] = None,
    state: Optional[str] = None,
    city: Optional[str] = None,
    search: Optional[str] = None,
    include_techs: bool = False,
    for_map: bool = False,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """List companies with optional region/state/city filter. include_techs=1 and for_map=1 add techs and lat/lng from ZIP."""
    from zip_lookup import lookup_zip
    safe_skip = max(0, skip)
    safe_limit = max(1, min(limit, 500))
    companies = crud.get_field_tech_companies(
        db,
        skip=safe_skip,
        limit=safe_limit,
        region=region,
        state=state,
        city=city,
        include_techs=include_techs,
        search=search,
    )
    if not include_techs and not for_map:
        return companies
    out = []
    zip_cache = {}
    for c in companies:
        obj = schemas.FieldTechCompanyOut.model_validate(c)
        d = obj.model_dump()
        if for_map and c.zip:
            z = zip_cache.get(c.zip)
            if z is None:
                z = lookup_zip(c.zip)
                zip_cache[c.zip] = z
            if z:
                d["lat"] = z.get("lat")
                d["lng"] = z.get("lng")
        if include_techs and hasattr(c, "techs"):
            techs = getattr(c, "techs", None) or []
            d["techs"] = [schemas.FieldTechOutNested.model_validate(t) for t in techs]
        out.append(schemas.FieldTechCompanyOut(**d))
    return out


@router.get("/{company_id}", response_model=schemas.FieldTechCompanyOut)
def get_company(
    company_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Get company by ID (with techs in response if schema includes them)."""
    company = crud.get_field_tech_company(db, company_id=company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return company


@router.put("/{company_id}", response_model=schemas.FieldTechCompanyOut)
def update_company(
    company_id: str,
    data: schemas.FieldTechCompanyCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    background_tasks: BackgroundTasks = None,
):
    """Update company; region derived from state."""
    result = crud.update_field_tech_company(db, company_id=company_id, company=data)
    if not result:
        raise HTTPException(status_code=404, detail="Company not found")
    if background_tasks:
        _enqueue_broadcast(background_tasks, '{"type":"field_tech_company","action":"update"}')
    return result


@router.delete("/{company_id}")
def delete_company(
    company_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role([models.UserRole.admin.value, models.UserRole.dispatcher.value])),
    background_tasks: BackgroundTasks = None,
):
    """Delete company only if it has no techs."""
    try:
        crud.delete_field_tech_company(db, company_id=company_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if background_tasks:
        _enqueue_broadcast(background_tasks, '{"type":"field_tech_company","action":"delete"}')
    return {"success": True, "message": "Company deleted"}
