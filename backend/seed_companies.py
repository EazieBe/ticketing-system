#!/usr/bin/env python3
"""
Seed ~40 test companies with full fake data. Run from backend: python seed_companies.py
Uses database from settings; region is derived from state via crud.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.chdir(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal
import crud
import schemas
import models

# 40 companies: varied US cities/states/zips (valid zips for map lookup), all fields filled
# service_radius_miles: default area covered from address (map rings)
COMPANIES = [
    {"company_name": "Summit Field Services LLC", "company_number": "SFS-001", "address": "1200 Industrial Blvd", "city": "Houston", "state": "TX", "zip": "77001", "notes": "Primary contractor for Gulf region.", "service_radius_miles": 50},
    {"company_name": "Northern Tech Solutions Inc", "company_number": "NTS-002", "address": "450 Main St", "city": "Chicago", "state": "IL", "zip": "60601", "notes": "Midwest installation partner.", "service_radius_miles": 50},
    {"company_name": "Pacific Coast Telecom", "company_number": "PCT-003", "address": "8800 Sunset Dr", "city": "Los Angeles", "state": "CA", "zip": "90001", "notes": "West coast deployments.", "service_radius_miles": 75},
    {"company_name": "Metro Install Group", "company_number": "MIG-004", "address": "200 Park Ave", "city": "New York", "state": "NY", "zip": "10001", "notes": "NYC metro area.", "service_radius_miles": 50},
    {"company_name": "Desert Sun Services", "company_number": "DSS-005", "address": "3500 E Camelback Rd", "city": "Phoenix", "state": "AZ", "zip": "85001", "notes": "Arizona and NM coverage.", "service_radius_miles": 100},
    {"company_name": "Rocky Mountain Tech", "company_number": "RMT-006", "address": "1600 Broadway", "city": "Denver", "state": "CO", "zip": "80201", "notes": "Mountain region.", "service_radius_miles": 75},
    {"company_name": "Atlantic Field Ops", "company_number": "AFO-007", "address": "100 Peachtree St", "city": "Atlanta", "state": "GA", "zip": "30301", "notes": "Southeast coverage.", "service_radius_miles": 50},
    {"company_name": "Evergreen Install Co", "company_number": "EIC-008", "address": "500 Pike St", "city": "Seattle", "state": "WA", "zip": "98101", "notes": "Pacific Northwest.", "service_radius_miles": 75},
    {"company_name": "Lone Star Service Co", "company_number": "LSS-009", "address": "600 Congress Ave", "city": "Austin", "state": "TX", "zip": "78701", "notes": "Central Texas.", "service_radius_miles": 50},
    {"company_name": "Twin Cities Tech", "company_number": "TCT-010", "address": "400 S 4th St", "city": "Minneapolis", "state": "MN", "zip": "55401", "notes": "Upper Midwest.", "service_radius_miles": 50},
    {"company_name": "Sunshine State Services", "company_number": "SSS-011", "address": "255 E Flagler St", "city": "Miami", "state": "FL", "zip": "33101", "notes": "South Florida.", "service_radius_miles": 75},
    {"company_name": "Motor City Install", "company_number": "MCI-012", "address": "100 Woodward Ave", "city": "Detroit", "state": "MI", "zip": "48201", "notes": "Michigan and Ohio.", "service_radius_miles": 50},
    {"company_name": "Chesapeake Field Tech", "company_number": "CFT-013", "address": "300 E Pratt St", "city": "Baltimore", "state": "MD", "zip": "21201", "notes": "MD/VA/DC area.", "service_radius_miles": 50},
    {"company_name": "Bay Area Network Services", "company_number": "BANS-014", "address": "1 Market St", "city": "San Francisco", "state": "CA", "zip": "94102", "notes": "SF Bay Area.", "service_radius_miles": 75},
    {"company_name": "Heartland Telecom", "company_number": "HT-015", "address": "1400 Walnut St", "city": "Kansas City", "state": "MO", "zip": "64101", "notes": "Kansas City metro.", "service_radius_miles": 50},
    {"company_name": "Nashville Sound Tech", "company_number": "NST-016", "address": "200 Broadway", "city": "Nashville", "state": "TN", "zip": "37201", "notes": "Tennessee region.", "service_radius_miles": 75},
    {"company_name": "Queen City Install", "company_number": "QCI-017", "address": "400 Tryon St", "city": "Charlotte", "state": "NC", "zip": "28202", "notes": "North Carolina.", "service_radius_miles": 50},
    {"company_name": "River City Services", "company_number": "RCS-018", "address": "500 Jefferson St", "city": "New Orleans", "state": "LA", "zip": "70112", "notes": "Louisiana Gulf.", "service_radius_miles": 50},
    {"company_name": "Inland Empire Tech", "company_number": "IET-019", "address": "3800 Orange St", "city": "Riverside", "state": "CA", "zip": "92501", "notes": "Inland Southern CA.", "service_radius_miles": 100},
    {"company_name": "Steel City Field Ops", "company_number": "SCFO-020", "address": "600 Grant St", "city": "Pittsburgh", "state": "PA", "zip": "15219", "notes": "Western PA.", "service_radius_miles": 50},
    {"company_name": "Beehive State Services", "company_number": "BSS-021", "address": "50 S Main St", "city": "Salt Lake City", "state": "UT", "zip": "84101", "notes": "Utah and Idaho.", "service_radius_miles": 100},
    {"company_name": "Hoosier Install Group", "company_number": "HIG-022", "address": "120 E Market St", "city": "Indianapolis", "state": "IN", "zip": "46204", "notes": "Indiana coverage.", "service_radius_miles": 50},
    {"company_name": "Alamo Tech Services", "company_number": "ATS-023", "address": "100 Alamo Plaza", "city": "San Antonio", "state": "TX", "zip": "78205", "notes": "South Texas.", "service_radius_miles": 75},
    {"company_name": "Emerald City Telecom", "company_number": "ECT-024", "address": "700 5th Ave", "city": "Seattle", "state": "WA", "zip": "98104", "notes": "Seattle metro.", "service_radius_miles": 50},
    {"company_name": "Capitol Region Tech", "company_number": "CRT-025", "address": "1600 I St NW", "city": "Washington", "state": "DC", "zip": "20001", "notes": "DC metro.", "service_radius_miles": 50},
    {"company_name": "Gateway Field Services", "company_number": "GFS-026", "address": "800 Olive St", "city": "St Louis", "state": "MO", "zip": "63101", "notes": "St Louis region.", "service_radius_miles": 75},
    {"company_name": "Coastal Carolina Tech", "company_number": "CCT-027", "address": "250 King St", "city": "Charleston", "state": "SC", "zip": "29401", "notes": "South Carolina coast.", "service_radius_miles": 50},
    {"company_name": "Valley Field Ops", "company_number": "VFO-028", "address": "300 W Jefferson St", "city": "Phoenix", "state": "AZ", "zip": "85003", "notes": "Phoenix valley.", "service_radius_miles": 75},
    {"company_name": "Buckeye Install Co", "company_number": "BIC-029", "address": "100 E Broad St", "city": "Columbus", "state": "OH", "zip": "43215", "notes": "Central Ohio.", "service_radius_miles": 50},
    {"company_name": "Silver State Services", "company_number": "SSS-030", "address": "400 S Virginia St", "city": "Reno", "state": "NV", "zip": "89501", "notes": "Nevada coverage.", "service_radius_miles": 100},
    {"company_name": "Rose City Telecom", "company_number": "RCT-031", "address": "1220 SW 3rd Ave", "city": "Portland", "state": "OR", "zip": "97204", "notes": "Portland metro.", "service_radius_miles": 75},
    {"company_name": "Aloha Pacific Tech", "company_number": "APT-032", "address": "1000 Bishop St", "city": "Honolulu", "state": "HI", "zip": "96813", "notes": "Hawaii deployments.", "service_radius_miles": 50},
    {"company_name": "Last Frontier Services", "company_number": "LFS-033", "address": "500 W 5th Ave", "city": "Anchorage", "state": "AK", "zip": "99501", "notes": "Alaska region.", "service_radius_miles": 150},
    {"company_name": "Land of Enchantment Tech", "company_number": "LOET-034", "address": "400 Gold Ave SW", "city": "Albuquerque", "state": "NM", "zip": "87102", "notes": "New Mexico.", "service_radius_miles": 100},
    {"company_name": "Badger State Install", "company_number": "BSI-035", "address": "200 State St", "city": "Madison", "state": "WI", "zip": "53703", "notes": "Wisconsin.", "service_radius_miles": 50},
    {"company_name": "Hawkeye Field Ops", "company_number": "HFO-036", "address": "200 E Washington St", "city": "Iowa City", "state": "IA", "zip": "52240", "notes": "Iowa coverage.", "service_radius_miles": 75},
    {"company_name": "Sunflower Tech Services", "company_number": "STS-037", "address": "700 SW Jackson St", "city": "Topeka", "state": "KS", "zip": "66603", "notes": "Kansas region.", "service_radius_miles": 100},
    {"company_name": "Mount Rushmore Tech", "company_number": "MRT-038", "address": "300 E Capitol Ave", "city": "Pierre", "state": "SD", "zip": "57501", "notes": "South Dakota.", "service_radius_miles": 150},
    {"company_name": "Big Sky Install", "company_number": "BSI-039", "address": "1301 E Lockey Ave", "city": "Helena", "state": "MT", "zip": "59601", "notes": "Montana coverage.", "service_radius_miles": 150},
    {"company_name": "Equality State Services", "company_number": "ESS-040", "address": "200 W 24th St", "city": "Cheyenne", "state": "WY", "zip": "82001", "notes": "Wyoming region.", "service_radius_miles": 150},
]

# 1–2 techs per company (name, tech_number, phone, email, service_radius_miles)
def techs_for_company(company_index: int, company_id: str):
    first_names = ["Mike", "Sarah", "James", "Lisa", "David", "Jennifer", "Robert", "Maria", "John", "Patricia"]
    last_names = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez"]
    i = company_index % 10
    j = (company_index + 5) % 10
    return [
        {"company_id": company_id, "name": f"{first_names[i]} {last_names[i]}", "tech_number": f"T{company_index * 2 + 1:03d}", "phone": f"(555) 2{company_index:02d}1-{1000 + company_index * 11}", "email": f"tech{company_index * 2 + 1}@example.com", "service_radius_miles": 50},
        {"company_id": company_id, "name": f"{first_names[j]} {last_names[j]}", "tech_number": f"T{company_index * 2 + 2:03d}", "phone": f"(555) 2{company_index:02d}2-{2000 + company_index * 11}", "email": f"tech{company_index * 2 + 2}@example.com", "service_radius_miles": 75},
    ]


def main():
    db = SessionLocal()
    try:
        created = 0
        updated = 0
        techs_created = 0
        techs_updated = 0
        for idx, c in enumerate(COMPANIES):
            company_number = c.get("company_number")
            existing_company = None
            if company_number:
                existing_company = db.query(models.FieldTechCompany).filter(
                    models.FieldTechCompany.company_number == company_number
                ).first()

            if existing_company:
                for field, value in c.items():
                    if hasattr(existing_company, field):
                        setattr(existing_company, field, value)
                db.commit()
                db.refresh(existing_company)
                company = existing_company
                updated += 1
            else:
                company_in = schemas.FieldTechCompanyCreate(**c)
                company = crud.create_field_tech_company(db, company_in)
                created += 1

            for t in techs_for_company(idx, company.company_id):
                existing_tech = db.query(models.FieldTech).filter(
                    models.FieldTech.company_id == company.company_id,
                    models.FieldTech.tech_number == t.get("tech_number")
                ).first()
                if existing_tech:
                    for field, value in t.items():
                        if hasattr(existing_tech, field):
                            setattr(existing_tech, field, value)
                    db.commit()
                    techs_updated += 1
                else:
                    tech_in = schemas.FieldTechCreate(**t)
                    crud.create_field_tech(db, tech_in)
                    techs_created += 1

            print(f"  {company.company_name} ({company.company_id})")

        print(
            f"\nCompanies: created={created}, updated={updated}. "
            f"Techs: created={techs_created}, updated={techs_updated}."
        )
        print("Region is derived from state in CRUD.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
