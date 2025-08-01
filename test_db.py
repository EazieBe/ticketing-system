from app.database import engine
from sqlalchemy import text

print('Database connection test...')
try:
    with engine.connect() as conn:
        result = conn.execute(text('SELECT 1'))
        print('Database connection successful')
except Exception as e:
    print(f'Database connection failed: {e}') 