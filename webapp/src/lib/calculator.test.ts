import { describe, it, expect } from 'vitest';
import {
    accrueHoursBetween,
    allocateUsage,
    calculateBalance,
    FERIE_HOURS_PER_MONTH,
    PAR_HOURS_PER_MONTH,
} from './calculator';

describe('Calculator Logic', () => {
    it('accrues correctly for a full month', () => {
        // Jan 2024 has 31 days
        // 2024-01-01 to 2024-01-31
        const hours = accrueHoursBetween('2024-01-01', '2024-01-31', 100);
        // Should be exactly 100
        expect(hours).toBeCloseTo(100, 5);
    });

    it('accrues correctly for partial month', () => {
        // Jan 2024 has 31 days. 15 days (1st to 15th inclusive)
        const hours = accrueHoursBetween('2024-01-01', '2024-01-15', 310);
        // 310 * (15/31) = 150
        expect(hours).toBeCloseTo(150, 5);
    });

    it('accrues across multiple months', () => {
        // Jan (31) + Feb 2024 (29 - leap year)
        // Rate 100/mo
        // Total = 100 + 100 = 200
        const hours = accrueHoursBetween('2024-01-01', '2024-02-29', 100);
        expect(hours).toBeCloseTo(200, 5);
    });

    it('accrues ferie and par correctly (constants)', () => {
        const hours = accrueHoursBetween('2024-01-01', '2024-01-31', FERIE_HOURS_PER_MONTH);
        expect(hours).toBeCloseTo(FERIE_HOURS_PER_MONTH, 5);
    });

    it('allocates usage correctly (simple)', () => {
        const res = allocateUsage(20, 10, 5);
        expect(res).toEqual({ ferie: 15, par: 10 });
    });

    it('allocates usage correctly (drains ferie)', () => {
        const res = allocateUsage(5, 10, 10);
        // Take 5 ferie -> F=0, rem=5
        // Take 5 par -> P=5
        expect(res).toEqual({ ferie: 0, par: 5 });
    });

    it('allocates usage correctly (excess usage)', () => {
        const res = allocateUsage(5, 10, 20);
        // Take 5 F -> F=0, rem=15
        // Take 10 P -> P=0, rem=5
        // Excess 5 -> F = -5
        expect(res).toEqual({ ferie: -5, par: 0 });
    });

    it('calculates balance report', () => {
        // Start 2024-01-01
        // As Of 2024-01-31
        // Earned: 1 month of Ferie and PAR
        // Used: 1 day (8 hours) on 2024-01-15
        const leaves = [
            { d: '2024-01-15', hours: 8, note: 'Test' }, // Included
            { d: '2024-02-01', hours: 8, note: 'Future' }, // Excluded
        ];

        const rep = calculateBalance('2024-01-31', '2024-01-01', leaves);

        expect(rep.ferie_earned).toBeCloseTo(FERIE_HOURS_PER_MONTH, 5);
        expect(rep.par_earned).toBeCloseTo(PAR_HOURS_PER_MONTH, 5);
        expect(rep.used).toBe(8);

        // Usage 8 < Ferie (13.33)
        // Ferie Rem = 13.33 - 8 = 5.33
        expect(rep.ferie_rem).toBeCloseTo(FERIE_HOURS_PER_MONTH - 8, 5);
        expect(rep.par_rem).toBeCloseTo(PAR_HOURS_PER_MONTH, 5);
    });
});
