/**
 * Core engine for mapping tray sales into salary.
 * This is a pure function isolated from the UI layer to fulfill exact math constraints.
 *
 * Rules:
 * - Base Salary (up to 3,000 trays): ₹15,000 fixed.
 * - After 3,000 trays, every additional tray earns ₹1.67 extra (rounded to nearest rupee).
 *   The rate continues indefinitely for any number of trays.
 *
 * @param {Object} input - Input parameters.
 * @param {number} input.units - Total trays sold.
 * @returns {Object} SalaryBreakdown
 */
function calculateSalary({ units }) {
    if (typeof units !== 'number' || units < 0 || !Number.isFinite(units)) {
        throw new Error('Valid, non-negative number of units is required.');
    }

    const BASE_UNITS = 3000;
    const BASE_SALARY = 15000;
    // linear rate per tray beyond base
    const RATE = 1.67; // rupees per tray

    let incentive = 0;
    let breakdownTier = 'Base';

    if (units > BASE_UNITS) {
        const extraUnits = units - BASE_UNITS;
        incentive = extraUnits * RATE;
        // choose tier label for UI purposes
        if (units <= BASE_UNITS * 2) {
            breakdownTier = 'Tier 1';
        } else {
            breakdownTier = 'Tier 2';
        }
    }

    // Rounding to nearest whole rupee assuming currency rules
    const roundedIncentive = Math.round(incentive);
    const totalSalary = BASE_SALARY + roundedIncentive;

    return {
        baseSalary: BASE_SALARY,
        incentive: roundedIncentive,
        totalSalary: totalSalary,
        breakdownInfo: {
            currentTier: breakdownTier,
            units: units
        }
    };
}

// Export for tests if running in Node, else attach to window for browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { calculateSalary };
} else {
    window.calculateSalary = calculateSalary;
}
