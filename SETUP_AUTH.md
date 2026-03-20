# Role-Based Auth Setup

## Credentials

| Role       | Username   | Password     |
|-----------|------------|--------------|
| Admin     | Admin      | Admin123@    |
| Supervisor| Supervisor | 6366929651   |

## One-Time Setup (Supabase)

1. **Create Auth Users** (run once):
   ```bash
   # Get your service role key from: Supabase Dashboard > Project Settings > API > service_role
   export SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   node scripts/seed-auth-users.js
   ```

2. **Enable RLS** (run in Supabase SQL Editor):
   - Execute `MIGRATION_rls_role_based.sql`

## Access Summary

- **Admin**: Full access (Employees, Records, Calculator). Can create, edit, delete.
- **Supervisor**: Calculator only. Can create and update salary records. Cannot delete or access Employees/Records.
