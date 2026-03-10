ALTER TABLE "Employee" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON "Employee";
CREATE POLICY "Enable all auth" ON "Employee" as PERMISSIVE FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE "SalaryRecord" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON "SalaryRecord";
CREATE POLICY "Enable all auth" ON "SalaryRecord" as PERMISSIVE FOR ALL USING (true) WITH CHECK (true);
