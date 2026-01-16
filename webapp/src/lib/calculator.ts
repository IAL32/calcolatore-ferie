export const FERIE_HOURS_PER_MONTH = 13.3333333;
export const PAR_HOURS_PER_MONTH = 8.6666666;
export const HOURS_PER_WORKDAY = 8.0;

export interface LeaveEntry {
    d: string; // YYYY-MM-DD
    hours: number;
    note: string;
    type?: 'ferie' | 'festa';
}

export interface BalanceReport {
    as_of: string;
    ferie_earned: number;
    par_earned: number;
    used: number;
    ferie_rem: number;
    par_rem: number;
    total_rem: number;
}

// Helpers
export function parseDate(s: string): Date {
    // s is YYYY-MM-DD
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d);
}

export function formatDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

export function getWorkingDaysInRange(startStr: string, endStr: string): string[] {
    const start = parseDate(startStr);
    const end = parseDate(endStr);
    const dates: string[] = [];

    // Safety check: avoid infinite loop if dates are swapped
    if (start > end) return [];

    const cur = new Date(start);
    while (cur <= end) {
        const dayOfWeek = cur.getDay(); // 0=Sun, 6=Sat
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            dates.push(formatDate(cur));
        }
        cur.setDate(cur.getDate() + 1);
    }
    return dates;
}


function daysInMonth(y: number, m: number): number {
    // m is 1-12
    return new Date(y, m, 0).getDate();
}

function dateIsBefore(d1: Date, d2: Date): boolean {
    return d1 < d2;
}

function dateIsAfter(d1: Date, d2: Date): boolean {
    return d1 > d2;
}

function dateIsEqual(d1: Date, d2: Date): boolean {
    return d1.getTime() === d2.getTime();
}

function monthStart(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), 1);
}

function nextMonthStart(d: Date): Date {
    if (d.getMonth() === 11) {
        return new Date(d.getFullYear() + 1, 0, 1);
    }
    return new Date(d.getFullYear(), d.getMonth() + 1, 1);
}

function addDays(d: Date, days: number): Date {
    const newDate = new Date(d);
    newDate.setDate(d.getDate() + days);
    return newDate;
}

function diffDays(d1: Date, d2: Date): number {
    // Return difference in days (absolute usually, but here direction matters if d1 > d2)
    const oneDay = 24 * 60 * 60 * 1000;
    return Math.round((d1.getTime() - d2.getTime()) / oneDay);
}

function* iterMonthStarts(start: Date, end: Date) {
    let cur = monthStart(start);
    const last = monthStart(end);
    while (cur <= last) {
        yield new Date(cur);
        cur = nextMonthStart(cur);
    }
}

export function accrueHoursBetween(
    startStr: string,
    endStr: string,
    hoursPerMonth: number
): number {
    const start = parseDate(startStr);
    const end = parseDate(endStr);

    if (end < start) return 0.0;

    let total = 0.0;
    for (const ms of iterMonthStarts(start, end)) {
        const me = addDays(nextMonthStart(ms), -1);

        // seg_start = max(start, ms)
        const segStart = start > ms ? start : ms;
        // seg_end = min(end, me)
        const segEnd = end < me ? end : me;

        if (segEnd < segStart) continue;

        const dim = daysInMonth(ms.getFullYear(), ms.getMonth() + 1);
        // days = (seg_end - seg_start).days + 1
        const days = diffDays(segEnd, segStart) + 1;
        total += hoursPerMonth * (days / dim);
    }
    return total;
}

export function earnedAsOf(
    asOf: string,
    start: string,
    feriePerYear: number = FERIE_HOURS_PER_MONTH * 12,
    parPerYear: number = PAR_HOURS_PER_MONTH * 12
): { ferie: number; par: number } {
    const ferie = accrueHoursBetween(start, asOf, feriePerYear / 12);
    const par = accrueHoursBetween(start, asOf, parPerYear / 12);
    return { ferie, par };
}

export function allocateUsage(
    ferie: number,
    par: number,
    used: number
): { ferie: number; par: number } {
    let f = ferie;
    let p = par;
    let u = used;

    const takeFerie = Math.min(f, u);
    f -= takeFerie;
    u -= takeFerie;

    const takePar = Math.min(p, u);
    p -= takePar;
    u -= takePar;

    // If u > 0, it means we used more than available, subtract from ferie (go negative)
    // Logic in python: ferie -= used (where used is the remaining used)
    f -= u;

    return { ferie: f, par: p };
}

export function calculateBalance(
    asOf: string,
    start: string,
    leaves: LeaveEntry[],
    feriePerYear?: number,
    parPerYear?: number
): BalanceReport {
    const { ferie, par } = earnedAsOf(asOf, start, feriePerYear, parPerYear);

    // used = sum(le.hours for le in leaves if le.d <= as_of)
    const asOfDate = parseDate(asOf);
    const used = leaves
        //.filter((l) => parseDate(l.d) <= asOfDate) // User requested to include future leaves
        .reduce((acc, l) => acc + l.hours, 0);

    const { ferie: ferieRem, par: parRem } = allocateUsage(ferie, par, used);

    return {
        as_of: asOf,
        ferie_earned: ferie,
        par_earned: par,
        used,
        ferie_rem: ferieRem,
        par_rem: parRem,
        total_rem: ferieRem + parRem,
    };
}

// Helper to calculate Easter (Western)
function calculateEaster(year: number): Date {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(year, month - 1, day);
}

export type Province = 'MI' | 'IT'; // IT is generic national

export function getHolidaysForYear(year: number, province: Province = 'MI'): LeaveEntry[] {
    const fixedHolidays: { month: number; day: number; note: string }[] = [
        { month: 0, day: 1, note: 'Capodanno' },
        { month: 0, day: 6, note: 'Epifania' },
        { month: 3, day: 25, note: 'Liberazione' },
        { month: 4, day: 1, note: 'Festa dei Lavoratori' },
        { month: 5, day: 2, note: 'Festa della Repubblica' },
        { month: 7, day: 15, note: 'Ferragosto' },
        { month: 10, day: 1, note: 'Ognissanti' },
        { month: 11, day: 8, note: 'Immacolata Concezione' },
        { month: 11, day: 25, note: 'Natale' },
        { month: 11, day: 26, note: 'Santo Stefano' },
    ];

    if (province === 'MI') {
        fixedHolidays.push({ month: 11, day: 7, note: "Sant'Ambrogio" }); // Patron Saint of Milan
    }

    const holidays: LeaveEntry[] = fixedHolidays.map((h) => ({
        d: formatDate(new Date(year, h.month, h.day)),
        hours: 0,
        type: 'festa',
        note: h.note,
    }));

    // Easter
    const easter = calculateEaster(year);
    holidays.push({
        d: formatDate(easter),
        hours: 0,
        type: 'festa',
        note: 'Pasqua',
    });

    // Pasquetta (Monday after Easter)
    const pasquetta = new Date(easter);
    pasquetta.setDate(easter.getDate() + 1);
    holidays.push({
        d: formatDate(pasquetta),
        hours: 0,
        type: 'festa',
        note: 'Pasquetta',
    });

    return holidays.sort((a, b) => a.d.localeCompare(b.d));
}
