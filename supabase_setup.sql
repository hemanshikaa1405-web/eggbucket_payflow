-- SQL script to create tables for SalesCalc

-- 1. Create Employee table
CREATE TABLE IF NOT EXISTS public."Employee" (
  "id" UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  "name" TEXT NOT NULL,
  "department" TEXT,
  "phone" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create SalaryRecord table
CREATE TABLE IF NOT EXISTS public."SalaryRecord" (
  "id" UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  "employeeId" UUID NOT NULL REFERENCES public."Employee"(id) ON DELETE CASCADE,
  "employeeName" TEXT,
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
