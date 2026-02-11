"""
US ZIP code lookup for address auto-fill and map coordinates.
Uses the zipcodes package (bundled data, no API key).
"""

from typing import Optional


def lookup_zip(zip_code: str) -> Optional[dict]:
    """
    Return { "city", "state", "lat", "lng" } for a US ZIP, or None if not found.
    """
    if not zip_code or not str(zip_code).strip():
        return None
    try:
        import zipcodes
        z = str(zip_code).strip()
        # Normalize to 5 digits for lookup
        if len(z) > 5:
            z = z[:5]
        matches = zipcodes.matching(z)
        if not matches:
            return None
        row = matches[0]
        lat = row.get("lat")
        lng = row.get("long") or row.get("lon") or row.get("lng")
        return {
            "city": (row.get("city") or "").strip() or None,
            "state": (row.get("state") or "").strip() or None,
            "lat": float(lat) if lat is not None else None,
            "lng": float(lng) if lng is not None else None,
        }
    except Exception:
        return None
