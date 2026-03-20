-- Migration: Role-based Row Level Security (RLS)
-- Run this in Supabase SQL Editor AFTER creating Admin and Supervisor users (run scripts/seed-auth-users.js first).
--
-- Enforces:
-- Admin: Full access (SELECT, INSERT, UPDATE, DELETE) on Employee and SalaryRecord
-- Supervisor: SELECT on Employee; SELECT, INSERT, UPDATE (no DELETE) on SalaryRecord

-- Enable RLS on both tables
ALTER TABLE public."Employee" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."SalaryRecord" ENABLE ROW LEVEL SECURITY;

-- Helper: get role from JWT app_metadata (returns 'admin', 'supervisor', or null)
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT AS $$
  SELECT (auth.jwt() ->> 'app_metadata')::jsonb ->> 'role';
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Employee: Admin full access; Supervisor SELECT only
DROP POLICY IF EXISTS "Employee admin full" ON public."Employee";
DROP POLICY IF EXISTS "Employee supervisor read" ON public."Employee";

CREATE POLICY "Employee admin full" ON public."Employee"
  FOR ALL USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

CREATE POLICY "Employee supervisor read" ON public."Employee"
  FOR SELECT USING (public.current_user_role() = 'supervisor');

-- SalaryRecord: Admin full access; Supervisor SELECT, INSERT, UPDATE (no DELETE)
DROP POLICY IF EXISTS "SalaryRecord admin full" ON public."SalaryRecord";
DROP POLICY IF EXISTS "SalaryRecord supervisor read" ON public."SalaryRecord";
DROP POLICY IF EXISTS "SalaryRecord supervisor insert" ON public."SalaryRecord";
DROP POLICY IF EXISTS "SalaryRecord supervisor update" ON public."SalaryRecord";

CREATE POLICY "SalaryRecord admin full" ON public."SalaryRecord"
  FOR ALL USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

CREATE POLICY "SalaryRecord supervisor read" ON public."SalaryRecord"
  FOR SELECT USING (public.current_user_role() = 'supervisor');

CREATE POLICY "SalaryRecord supervisor insert" ON public."SalaryRecord"
  FOR INSERT WITH CHECK (public.current_user_role() = 'supervisor');

CREATE POLICY "SalaryRecord supervisor update" ON public."SalaryRecord"
  FOR UPDATE USING (public.current_user_role() = 'supervisor')
  WITH CHECK (public.current_user_role() = 'supervisor');

-- No DELETE policy for supervisor = supervisor cannot delete
