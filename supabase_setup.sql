-- SQL script to create tables for SalesCalc

-- 1. Create Employee table
CREATE TABLE IF NOT EXISTS public."Employee" (
  "id" UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  "name" TEXT NOT NULL,
  "department" TEXT,
  "phone" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- If the table already existed, ensure the column exists and defaults to active
ALTER TABLE public."Employee"
  ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN NOT NULL DEFAULT TRUE;

-- 2. Create SalaryRecord table
CREATE TABLE IF NOT EXISTS public."SalaryRecord" (
  "id" UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  "employeeId" UUID NOT NULL REFERENCES public."Employee"(id) ON DELETE CASCADE,
  "employeeName" TEXT,
  "department" TEXT,
  "month" TEXT NOT NULL,
  "trays" INTEGER,
  "bonus" REAL,
  "type" TEXT,
  "aqCount" INTEGER,
  "aqCost" REAL,
  "monthlySalary" REAL,
  "baseSalary" REAL NOT NULL,
  "incentive" REAL NOT NULL,
  "totalSalary" REAL NOT NULL,
  "inputs" JSONB NOT NULL,
  "results" JSONB,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Disable Row Level Security (RLS) so the frontend can read/write directly
ALTER TABLE public."Employee" DISABLE ROW LEVEL SECURITY;
ALTER TABLE public."SalaryRecord" DISABLE ROW LEVEL SECURITY;

-- Department-at-time-of-record (preserve historical department if employee department changes later)
ALTER TABLE public."SalaryRecord"
  ADD COLUMN IF NOT EXISTS "department" TEXT;

-- Backfill department once for existing records that don't have it yet.
-- This sets department to the employee's department as of migration time.
UPDATE public."SalaryRecord" sr
SET "department" = e."department"
FROM public."Employee" e
WHERE sr."department" IS NULL OR sr."department" = ''
  AND sr."employeeId" = e."id";
