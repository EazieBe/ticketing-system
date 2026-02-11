"""
US state → region mapping (derived from state for map filter).
No API key; accurate for standard US Census regions.
"""

# US Census Bureau regions (state abbreviation → region name)
_STATE_TO_REGION = {
    "AL": "South", "AR": "South", "DE": "Northeast", "FL": "South", "GA": "South",
    "KY": "South", "LA": "South", "MD": "South", "MS": "South", "NC": "South",
    "OK": "South", "SC": "South", "TN": "South", "TX": "South", "VA": "South",
    "WV": "South", "DC": "South",
    "CT": "Northeast", "ME": "Northeast", "MA": "Northeast", "NH": "Northeast",
    "NJ": "Northeast", "NY": "Northeast", "PA": "Northeast", "RI": "Northeast", "VT": "Northeast",
    "IL": "Midwest", "IN": "Midwest", "IA": "Midwest", "KS": "Midwest", "MI": "Midwest",
    "MN": "Midwest", "MO": "Midwest", "NE": "Midwest", "ND": "Midwest", "OH": "Midwest",
    "SD": "Midwest", "WI": "Midwest",
    "AZ": "West", "CO": "West", "ID": "West", "MT": "West", "NV": "West",
    "NM": "West", "UT": "West", "WY": "West",
    "AK": "West", "CA": "West", "HI": "West", "OR": "West", "WA": "West",
}


def state_to_region(state: str) -> str | None:
    """Return region name for a US state abbreviation (e.g. 'TX' → 'South')."""
    if not state:
        return None
    abbr = (state or "").strip().upper()
    if len(abbr) == 2:
        return _STATE_TO_REGION.get(abbr)
    # Allow full state name → lookup by value (slow path)
    abbr_to_region = _STATE_TO_REGION
    for ab, reg in abbr_to_region.items():
        if reg.upper() == abbr:
            return reg
    return None


def get_us_states_for_dropdown():
    """Return list of { value: 'XX', label: 'State Name' } for dropdowns. Sorted by label."""
    # State abbreviation → full name (common list, no API)
    _ABBR_TO_NAME = {
        "AL": "Alabama", "AK": "Alaska", "AZ": "Arizona", "AR": "Arkansas", "CA": "California",
        "CO": "Colorado", "CT": "Connecticut", "DE": "Delaware", "FL": "Florida", "GA": "Georgia",
        "HI": "Hawaii", "ID": "Idaho", "IL": "Illinois", "IN": "Indiana", "IA": "Iowa",
        "KS": "Kansas", "KY": "Kentucky", "LA": "Louisiana", "ME": "Maine", "MD": "Maryland",
        "MA": "Massachusetts", "MI": "Michigan", "MN": "Minnesota", "MS": "Mississippi", "MO": "Missouri",
        "MT": "Montana", "NE": "Nebraska", "NV": "Nevada", "NH": "New Hampshire", "NJ": "New Jersey",
        "NM": "New Mexico", "NY": "New York", "NC": "North Carolina", "ND": "North Dakota", "OH": "Ohio",
        "OK": "Oklahoma", "OR": "Oregon", "PA": "Pennsylvania", "RI": "Rhode Island", "SC": "South Carolina",
        "SD": "South Dakota", "TN": "Tennessee", "TX": "Texas", "UT": "Utah", "VT": "Vermont",
        "VA": "Virginia", "WA": "Washington", "WV": "West Virginia", "WI": "Wisconsin", "WY": "Wyoming",
        "DC": "District of Columbia",
    }
    out = [{"value": abbr, "label": _ABBR_TO_NAME[abbr]} for abbr in sorted(_ABBR_TO_NAME.keys(), key=lambda a: _ABBR_TO_NAME[a])]
    return out
