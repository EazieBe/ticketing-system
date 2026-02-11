# Backend Operations Standards

## Migration Discipline

- All schema changes must ship via Alembic migrations in `backend/alembic/versions/`.
- Avoid direct schema edits in ad-hoc scripts for normal deploy paths.
- Use one-way emergency scripts only for break-glass recovery, then backfill an Alembic migration to match.

## Deployment Sequence

1. Deploy application code.
2. Run `alembic upgrade head`.
3. Run smoke tests against `/health` and a critical API path.
4. Monitor `/ops/latency` for p95 regression in the first 15 minutes.

## Backup and Restore

- Recommended backup cadence:
  - Full backup nightly.
  - WAL/transaction-log shipping every 5-15 minutes.
- Validate restore process weekly:
  - Restore to a staging database.
  - Run API health checks and a sample ticket query.
- Keep at least:
  - 7 daily backups.
  - 4 weekly backups.
  - 3 monthly backups.

## Runtime Monitoring

- Track these baseline SLO signals:
  - `tickets` p95 latency
  - `fieldtech_map` p95 latency
  - error rate (5xx)
  - websocket reconnect failures
- Use `/ops/latency` endpoint for rolling in-app p50/p95 snapshots.
