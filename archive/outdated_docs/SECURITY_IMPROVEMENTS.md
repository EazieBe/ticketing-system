# Security and Performance Improvements

This document outlines the security and performance improvements made to the ticketing system.

## Security Improvements

### 1. SECRET_KEY Validation
- **Issue**: Default SECRET_KEY was baked into the code
- **Fix**: Added runtime validation requiring SECRET_KEY to be set via environment variable with minimum 32 characters
- **Code**: 
  ```python
  SECRET_KEY = os.getenv("SECRET_KEY")
  if not SECRET_KEY or len(SECRET_KEY) < 32:
      raise RuntimeError("SECRET_KEY must be set to a strong value (>=32 chars).")
  ```

### 2. JWT Token Claims Enhancement
- **Issue**: JWT tokens lacked standard claims for better security and revocation tracking
- **Fix**: Added `iat` (issued at), `nbf` (not valid before), and `jti` (JWT ID) claims to all tokens
- **Code**:
  ```python
  def _jwt_base_claims():
      now = datetime.now(timezone.utc)
      return {
          "iat": int(now.timestamp()),  # Issued at
          "nbf": int(now.timestamp()),  # Not valid before
          "jti": str(uuid.uuid4())      # JWT ID for revocation tracking
      }
  ```

### 3. Token Revocation Infrastructure
- **Issue**: No mechanism to revoke tokens or track invalid tokens
- **Fix**: Added `RevokedToken` model to track revoked tokens by JTI
- **Model**:
  ```python
  class RevokedToken(Base):
      __tablename__ = 'revoked_tokens'
      jti = Column(String, primary_key=True, index=True)
      user_id = Column(String, ForeignKey('users.user_id'), nullable=False)
      token_type = Column(String, nullable=False)  # 'access' or 'refresh'
      revoked_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
      expires_at = Column(DateTime, nullable=False)
      reason = Column(String)  # Optional reason for revocation
  ```

### 4. Password Hashing Configuration
- **Issue**: Bcrypt rounds were hardcoded
- **Fix**: Made bcrypt rounds configurable via environment variable
- **Code**:
  ```python
  BCRYPT_ROUNDS = int(os.getenv("BCRYPT_ROUNDS", "12"))
  pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=BCRYPT_ROUNDS)
  ```

## Code Quality Improvements

### 1. Audit Log Helper Function
- **Issue**: Inconsistent enum/string handling in audit logs
- **Fix**: Created centralized `audit_log()` helper function
- **Code**:
  ```python
  def audit_log(db: Session, user_id: str, field: str, old_val, new_val, ticket_id: Optional[str] = None):
      def _s(v):
          try:
              return _as_ticket_status(v).value
          except Exception:
              return str(v) if v is not None else None
      
      audit = schemas.TicketAuditCreate(
          ticket_id=ticket_id,
          user_id=user_id,
          change_time=datetime.now(timezone.utc),
          field_changed=field,
          old_value=_s(old_val),
          new_value=_s(new_val),
      )
      crud.create_ticket_audit(db, audit)
  ```

### 2. Parameter Naming Fix
- **Issue**: Date parameter shadowed datetime import
- **Fix**: Renamed parameter from `date` to `date_str` and added proper date parsing
- **Code**:
  ```python
  @app.get("/tickets/daily/{date_str}")
  def get_daily_tickets(date_str: str, ...):
      try:
          date_obj = datetime.strptime(date_str, "%Y-%m-%d").date()
      except ValueError:
          raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
  ```

### 3. BackgroundTasks Simplification
- **Issue**: Unnecessary `= None` defaults on BackgroundTasks parameters
- **Fix**: Removed defaults and simplified broadcast calls
- **Code**:
  ```python
  # Before
  def some_function(..., background_tasks: BackgroundTasks = None):
      if background_tasks:
          _enqueue_broadcast(background_tasks, payload)
  
  # After
  def some_function(..., background_tasks: BackgroundTasks):
      _enqueue_broadcast(background_tasks, payload)
  ```

### 4. CSV Import Optimization
- **Issue**: Re-parsing CSV to count total rows
- **Fix**: Track row count during processing loop
- **Code**:
  ```python
  # Before
  "total_rows_processed": len(list(csv.DictReader(io.StringIO(content))))
  
  # After
  total_rows = 0
  for row_num, row in enumerate(csv_reader, start=2):
      total_rows += 1
      # ... process row
  "total_rows_processed": total_rows
  ```

## Performance Improvements

### 1. Timezone-Aware Analytics
- **Issue**: Inconsistent timezone handling in analytics calculations
- **Fix**: Made all datetime operations timezone-aware using UTC
- **Code**:
  ```python
  # Before
  created = datetime.combine(ticket.date_created, datetime.min.time())
  
  # After
  created = datetime.combine(ticket.date_created, datetime.min.time()).replace(tzinfo=timezone.utc)
  ```

### 2. Database Search Indexes
- **Issue**: ILIKE searches on text fields without indexes
- **Fix**: Added PostgreSQL trigram indexes for better search performance
- **Migration**: Created `add_search_indexes.py` migration with GIN indexes on:
  - `tickets.notes`, `tickets.customer_name`, `tickets.inc_number`, `tickets.so_number`
  - `sites.location`, `sites.brand`
  - `users.name`, `users.email`

## Environment Variables

Add these to your `.env` file:

```bash
# Security
SECRET_KEY=your-very-long-secret-key-at-least-32-characters-long
BCRYPT_ROUNDS=12

# JWT Settings
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=1
```

## Migration Instructions

1. Run the database migration to add search indexes:
   ```bash
   alembic upgrade head
   ```

2. Update your environment variables with the new SECRET_KEY requirements

3. Restart the application

## Future Considerations

1. **Token Revocation**: Implement the actual token revocation logic using the `RevokedToken` model
2. **Argon2**: Consider migrating from bcrypt to Argon2 for password hashing at higher login volumes
3. **Rate Limiting**: Add rate limiting for authentication endpoints
4. **Audit Log Cleanup**: Implement automatic cleanup of old audit logs
5. **Search Optimization**: Consider implementing full-text search with PostgreSQL's `tsvector` for even better performance
