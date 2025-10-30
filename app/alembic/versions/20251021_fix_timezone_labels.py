"""normalize existing site timezones to labels

Revision ID: 20251021_fix_timezone_labels
Revises: 20251021_add_timezone_to_sites
Create Date: 2025-10-21 00:15:00
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20251021_fix_timezone_labels'
down_revision = '20251021_add_timezone_to_sites'
branch_labels = None
depends_on = None

# Mappings
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

TZ_LABEL_BY_ABBR = {
    **{abbr: 'Eastern' for abbr in ['CT','DE','DC','FL','GA','ME','MD','MA','MI','NH','NJ','NY','NC','OH','PA','RI','SC','VT','VA','WV','KY']},
    **{abbr: 'Central' for abbr in ['AL','AR','IL','IA','LA','MN','MS','MO','OK','WI','TX','KS','NE','SD','ND','TN']},
    **{abbr: 'Mountain' for abbr in ['AZ','CO','ID','MT','NM','UT','WY']},
    **{abbr: 'Pacific' for abbr in ['CA','NV','OR','WA','AK','HI']},
}


def upgrade():
    bind = op.get_bind()
    rows = list(bind.execute(sa.text("SELECT site_id, state, timezone FROM sites")))

    def to_abbr(state):
        if not state:
            return None
        s = str(state).strip()
        if len(s) == 2:
            return s.upper()
        return STATE_NAME_TO_ABBR.get(s.upper(), s[:2].upper())

    def tz_label_for(abbr):
        if not abbr:
            return None
        return TZ_LABEL_BY_ABBR.get(abbr)

    update_stmt = sa.text("UPDATE sites SET state = :state, timezone = :tz WHERE site_id = :site_id")
    for site_id, state, _tz in rows:
        abbr = to_abbr(state)
        label = tz_label_for(abbr)
        bind.execute(update_stmt, {'state': abbr, 'tz': label, 'site_id': site_id})


def downgrade():
    # No-op: cannot reliably restore previous timezone strings
    pass


