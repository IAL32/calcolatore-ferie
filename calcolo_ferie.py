from __future__ import annotations
import csv
import argparse
from dataclasses import dataclass
from datetime import date, datetime, timedelta
import calendar
from pathlib import Path

# ---- CONFIGURAZIONE FISSA ----
FERIE_HOURS_PER_MONTH = 13.3333333
PAR_HOURS_PER_MONTH = 8.6666666
HOURS_PER_WORKDAY = 8.0
# -----------------------------


def parse_date(s: str) -> date:
    return datetime.strptime(s.strip(), "%Y-%m-%d").date()


def days_in_month(y: int, m: int) -> int:
    return calendar.monthrange(y, m)[1]


def month_start(d: date) -> date:
    return date(d.year, d.month, 1)


def next_month_start(d: date) -> date:
    if d.month == 12:
        return date(d.year + 1, 1, 1)
    return date(d.year, d.month + 1, 1)


def iter_month_starts(start: date, end: date):
    cur = month_start(start)
    last = month_start(end)
    while cur <= last:
        yield cur
        cur = next_month_start(cur)


@dataclass
class LeaveEntry:
    d: date
    hours: float
    note: str = ""


def read_leave_log(path: Path) -> list[LeaveEntry]:
    if not path.exists():
        return []
    out: list[LeaveEntry] = []
    with open(path, newline="", encoding="utf-8") as f:
        r = csv.DictReader(f)
        for row in r:
            out.append(
                LeaveEntry(
                    d=parse_date(row["date"]),
                    hours=float(row["hours_taken"]),
                    note=row.get("note", "") or "",
                )
            )
    return out


def accrue_hours_between(start: date, end: date, hours_per_month: float) -> float:
    if end < start:
        return 0.0

    total = 0.0
    for ms in iter_month_starts(start, end):
        me = next_month_start(ms) - timedelta(days=1)
        seg_start = max(start, ms)
        seg_end = min(end, me)
        if seg_end < seg_start:
            continue
        dim = days_in_month(ms.year, ms.month)
        days = (seg_end - seg_start).days + 1
        total += hours_per_month * (days / dim)
    return total


def earned_as_of(as_of: date, start: date) -> tuple[float, float]:
    ferie = accrue_hours_between(start, as_of, FERIE_HOURS_PER_MONTH)
    par = accrue_hours_between(start, as_of, PAR_HOURS_PER_MONTH)
    return ferie, par


def allocate_usage(ferie: float, par: float, used: float) -> tuple[float, float]:
    take_ferie = min(ferie, used)
    ferie -= take_ferie
    used -= take_ferie

    take_par = min(par, used)
    par -= take_par
    used -= take_par

    # se used > 0 → va in negativo (segnale)
    ferie -= used
    return ferie, par


def balance(as_of: date, start: date, leaves: list[LeaveEntry]) -> dict:
    ferie_e, par_e = earned_as_of(as_of, start)
    used = sum(le.hours for le in leaves if le.d <= as_of)
    ferie_r, par_r = allocate_usage(ferie_e, par_e, used)

    return {
        "as_of": as_of,
        "ferie_earned": ferie_e,
        "par_earned": par_e,
        "used": used,
        "ferie_rem": ferie_r,
        "par_rem": par_r,
        "total_rem": ferie_r + par_r,
    }


def fmt_h(h: float) -> str:
    return f"{h:.2f} h"


def fmt_d(h: float) -> str:
    return f"{h / HOURS_PER_WORKDAY:.2f} gg"


def print_balance(rep: dict) -> None:
    print(f"\nSaldo al {rep['as_of'].isoformat()}")
    print(
        f"  Ferie maturate: {fmt_h(rep['ferie_earned'])} ({fmt_d(rep['ferie_earned'])})"
    )
    print(f"  PAR maturati:   {fmt_h(rep['par_earned'])} ({fmt_d(rep['par_earned'])})")
    print(f"  Usate totali:   {fmt_h(rep['used'])} ({fmt_d(rep['used'])})")
    print(f"  Residuo Ferie:  {fmt_h(rep['ferie_rem'])} ({fmt_d(rep['ferie_rem'])})")
    print(f"  Residuo PAR:    {fmt_h(rep['par_rem'])} ({fmt_d(rep['par_rem'])})")
    print(f"  Residuo TOTALE: {fmt_h(rep['total_rem'])} ({fmt_d(rep['total_rem'])})")


# ---------------- CLI ----------------


def main():
    parser = argparse.ArgumentParser(
        description="Calcolo ferie e PAR (maturazione mensile, scala Ferie → PAR)"
    )
    parser.add_argument(
        "--leave-log",
        default="leave_log.csv",
        help="File CSV delle ferie usate (default: leave_log.csv)",
    )

    sub = parser.add_subparsers(dest="command", required=True)

    saldo = sub.add_parser("saldo", help="Mostra il saldo a una certa data")
    saldo.add_argument(
        "--as-of",
        required=True,
        type=parse_date,
        help="Data di riferimento (YYYY-MM-DD)",
    )
    saldo.add_argument(
        "--start", required=True, type=parse_date, help="Data inizio maturazione"
    )

    sim = sub.add_parser("simula", help="Simula una richiesta ferie")
    sim.add_argument(
        "--date", required=True, type=parse_date, help="Data della richiesta"
    )
    sim.add_argument("--hours", required=True, type=float, help="Ore da prendere")
    sim.add_argument(
        "--start", required=True, type=parse_date, help="Data inizio maturazione"
    )

    args = parser.parse_args()
    leaves = read_leave_log(Path(args.leave_log))

    if args.command == "saldo":
        rep = balance(args.as_of, args.start, leaves)
        print_balance(rep)

    elif args.command == "simula":
        rep = balance(args.date, args.start, leaves)
        ferie_a, par_a = allocate_usage(
            rep["ferie_earned"], rep["par_earned"], rep["used"] + args.hours
        )
        print_balance(rep)
        print("\nDopo la richiesta:")
        print(f"  Ferie residue: {fmt_h(ferie_a)} ({fmt_d(ferie_a)})")
        print(f"  PAR residui:   {fmt_h(par_a)} ({fmt_d(par_a)})")
        print(f"  Totale:        {fmt_h(ferie_a + par_a)} ({fmt_d(ferie_a + par_a)})")
        print(f"  Sufficiente?   {'SI' if ferie_a + par_a >= 0 else 'NO'}")


if __name__ == "__main__":
    main()
