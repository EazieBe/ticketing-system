"""add timezone to sites

Revision ID: 20251021_add_timezone_to_sites
Revises: 20251016_drop_user_region
Create Date: 2025-10-21 00:00:00
"""

from alembic import op
import sqlalchemy as sa

# Helper mappings for normalization
STATE_NAME_TO_ABBR = {
    'ALABAMA': 'AL', 'ALASKA': 'AK', 'ARIZONA': 'AZ', 'ARKANSAS': 'AR', 'CALIFORNIA': 'CA',
    'COLORADO': 'CO', 'CONNECTICUT': 'CT', 'DELAWARE': 'DE', 'DISTRICT OF COLUMBIA': 'DC', 'WASHINGTON DC': 'DC', 'DC': 'DC',
    'FLORIDA': 'FL', 'GEORGIA': 'GA', 'HAWAII': 'HI', 'IDAHO': 'ID', 'ILLINOIS': 'IL', 'INDIANA': 'IN',
    'IOWA': 'IA', 'KANSAS': 'KS', 'KENTUCKY': 'KY', 'LOUISIANA': 'LA', 'MAINE': 'ME', 'MARYLAND': 'MD',
    'MASSACHUSETTS': 'MA', 'MICHIGAN': 'MI', 'MINNESOTA': 'MN', 'MISSISSIPPI': 'MS', 'MISSOURI': 'MO',
    'MONTANA': 'MT', 'NEBRASKA': 'NE', 'NEVADA': 'NV', 'NEW HAMPSHIRE': 'NH', 'NEW JERSEY': 'NJ',
    'NEW MEXICO': 'NM', 'NEW YORK': 'NY', 'NORTH CAROLINA': 'NC', 'NORTH DAKOTA': 'ND',
    'OHIO': 'OH', 'OKLAHOMA': 'OK', 'OREGON': 'OR', 'PENNSYLVANIA': 'PA', 'RHODE ISLAND': 'RI',
    'SOUTH CAROLINA': 'SC', 'SOUTH DAKOTA': 'SD', 'TENNESSEE': 'TN', 'TEXAS': 'TX', 'UTAH': 'UT',
    'VERMONT': 'VT', 'VIRGINIA': 'VA', 'WASHINGTON': 'WA', 'WEST VIRGINIA': 'WV', 'WISCONSIN': 'WI', 'WYOMING': 'WY',
}

REGION_BY_ABBR = {
    'Northeast': {'ME','NH','VT','MA','RI','CT','NY','NJ','PA'},
    'Midwest': {'OH','MI','IN','IL','WI','MN','IA','MO','ND','SD','NE','KS'},
    'South': {'DE','MD','DC','VA','WV','NC','SC','GA','FL','KY','TN','MS','AL','AR','LA','OK','TX'},
    'West': {'MT','ID','WY','CO','NM','AZ','UT','NV','CA','OR','WA','AK','HI'},
}

# Timezone label mapping
TZ_LABEL_BY_ABBR = {
    **{abbr: 'Eastern' for abbr in ['CT','DE','DC','FL','GA','ME','MD','MA','MI','NH','NJ','NY','NC','OH','PA','RI','SC','VT','VA','WV','KY']},
    **{abbr: 'Central' for abbr in ['AL','AR','IL','IA','LA','MN','MS','MO','OK','WI','TX','KS','NE','SD','ND','TN']},
    **{abbr: 'Mountain' for abbr in ['AZ','CO','ID','MT','NM','UT','WY']},
    **{abbr: 'Pacific' for abbr in ['CA','NV','OR','WA','AK','HI']},
}

# revision identifiers, used by Alembic.
revision = '20251021_add_timezone_to_sites'
down_revision = '20251016_drop_user_region'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('sites', sa.Column('timezone', sa.String(), nullable=True))
    # Normalize existing rows: state -> abbreviation, region by state, timezone label by state
    bind = op.get_bind()
    sites = list(bind.execute(sa.text("SELECT site_id, state, region FROM sites")))
    def to_abbr(state):
        if not state:
            return None
        s = str(state).strip()
        if len(s) == 2:
            return s.upper()
        return STATE_NAME_TO_ABBR.get(s.upper(), s[:2].upper())
    def region_for(abbr):
        if not abbr:
            return None
        for name, group in REGION_BY_ABBR.items():
            if abbr in group:
                return name
        return None
    def tz_label_for(abbr):
        if not abbr:
            return None
        return TZ_LABEL_BY_ABBR.get(abbr)

    update_stmt = sa.text("UPDATE sites SET state = :state, region = COALESCE(:region, region), timezone = :tz WHERE site_id = :site_id")
    for row in sites:
        site_id, state, _ = row
        abbr = to_abbr(state)
        reg = region_for(abbr)
        tz = tz_label_for(abbr)
        bind.execute(update_stmt, {
            'state': abbr,
            'region': reg,
            'tz': tz,
            'site_id': site_id,
        })


def downgrade():
    op.drop_column('sites', 'timezone')


