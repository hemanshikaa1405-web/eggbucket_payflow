-- Migration: One salary record per employee per month
-- Run this in Supabase SQL Editor if you have an existing database.
-- For fresh setups, supabase_setup.sql already includes the constraint.

-- Step 1: Remove duplicate records (keep the most recent one per employee+month)
DELETE FROM public."SalaryRecord" a
USING public."SalaryRecord" b
WHERE a.id > b.id
  AND a."employeeId" = b."employeeId"
  AND a."month" = b."month";

-- Step 2: Add UNIQUE constraint
ALTER TABLE public."SalaryRecord"
  DROP CONSTRAINT IF EXISTS salaryrecord_employee_month_unique;
ALTER TABLE public."SalaryRecord"
  ADD CONSTRAINT salaryrecord_employee_month_unique UNIQUE ("employeeId", "month");
