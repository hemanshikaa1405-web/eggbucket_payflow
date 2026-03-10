// Simple test runner for the engine to validate correct logic decoupled from UI
const { calculateSalary } = require('./salaryEngine.js');

function assertEqual(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(`FAIL: ${message} | Expected ${expected} but got ${actual}`);
    }
}

function runTests() {
    console.log("Running Salary Engine Tests...");

    try {
        // 1. Base case handling
        const baseCaseZero = calculateSalary({ units: 0 });
        assertEqual(baseCaseZero.totalSalary, 15000, "Base case zero items");

        const baseCaseEdge = calculateSalary({ units: 3000 });
        assertEqual(baseCaseEdge.totalSalary, 15000, "Base case exact limit");

        // 2. Increment logic (+1 unit) correctly testing proportionality
        // Over 3000 gets 1.67 per tray
        const plusOne = calculateSalary({ units: 3001 });
        // 15000 + Math.round(1.67) => 15002
        assertEqual(plusOne.totalSalary, 15002, "Increment (+1 unit)");

        // Check a mid-range value
        const mid = calculateSalary({ units: 4500 });
        // extra = 1500 * 1.67 = 2505 -> total 17505
        assertEqual(mid.totalSalary, 17505, "Middle of range");

        // Exactly 6000 units
        const atSixK = calculateSalary({ units: 6000 });
        // extra = 3000 * 1.67 = 5010 => total 20010
        assertEqual(atSixK.totalSalary, 20010, "Six thousand units");

        // Exactly 9000 units
        const atNineK = calculateSalary({ units: 9000 });
        // extra = 6000 * 1.67 = 10020 -> total 25020
        assertEqual(atNineK.totalSalary, 25020, "Nine thousand units");

        // Scaling beyond 9000 still uses same rate
        const pastNine = calculateSalary({ units: 9003 });
        // extra = 6003 * 1.67 ≈ 10025 -> total 25025 (rounded)
        assertEqual(pastNine.totalSalary, 25025, "Scaling past nine thousand");

        // 3. Error / Validation tests
        let errorCaught = false;
        try {
            calculateSalary({ units: -500 });
        } catch (e) {
            errorCaught = true;
        }
        assertEqual(errorCaught, true, "Throws on negative units");

        console.log("✅ All Salary Engine tests passed successfully!");
    } catch (e) {
        console.error(e.message);
        process.exit(1);
    }
}

runTests();
