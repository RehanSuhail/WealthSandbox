"""
Shared crisis definitions and helper utilities.

Every portfolio engine imports from here to apply historical stress-test
scenarios consistently.
"""

from __future__ import annotations

# Annualised real returns for each crisis year.
# Each engine converts these to monthly shocks appropriate to its asset class.
CRISES: dict[str, list[float]] = {
    "GreatDepression": [-0.08, -0.25, -0.43, -0.08, 0.54],
    "OilCrisis1973":   [-0.15, -0.26,  0.37,  0.23],
    "DotCom2000":      [-0.09, -0.12, -0.22,  0.28],
    "Financial2008":   [-0.37, -0.05,  0.26,  0.15],
    "Covid2020":       [-0.34,  0.68],
    "RateShock2022":   [-0.19,  0.24],
}

# Human-readable labels used by the frontend
CRISIS_LABELS: dict[str, str] = {
    "GreatDepression": "Great Depression (1929-33)",
    "OilCrisis1973":   "Oil Crisis (1973-76)",
    "DotCom2000":      "Dot-Com Bubble (2000-03)",
    "Financial2008":   "Financial Crisis (2008-11)",
    "Covid2020":       "COVID-19 Crash (2020-21)",
    "RateShock2022":   "Rate Shock (2022-23)",
}


def build_crisis_months(
    crisis_event: str,
    crisis_start_year: int,
    total_months: int,
) -> dict[int, float]:
    """
    Build a mapping of  month_index → monthly_shock  for the given crisis.

    Parameters
    ----------
    crisis_event : str
        Key into CRISES (e.g. "Financial2008") or "None".
    crisis_start_year : int
        How many years from now the crisis begins.
    total_months : int
        Upper bound – shocks beyond this month are clipped.

    Returns
    -------
    dict[int, float]
        {month_index: monthly_return_shock}  (0-indexed, month 0 = start)
    """
    if crisis_event not in CRISES:
        return {}

    crisis_months: dict[int, float] = {}
    start_month = crisis_start_year * 12

    for year_offset, annual_return in enumerate(CRISES[crisis_event]):
        monthly_shock = (1 + annual_return) ** (1 / 12) - 1
        for m in range(12):
            target = start_month + year_offset * 12 + m
            if target < total_months:
                crisis_months[target] = monthly_shock

    return crisis_months


def build_crisis_window(
    crisis_event: str,
    crisis_start_year: int,
) -> dict | None:
    """
    Return frontend-friendly metadata for the crisis band overlay,
    or None if no crisis is selected.
    """
    if crisis_event not in CRISES:
        return None

    duration_years = len(CRISES[crisis_event])
    return {
        "event": CRISIS_LABELS.get(crisis_event, crisis_event),
        "start_year": crisis_start_year,
        "end_year": crisis_start_year + duration_years,
    }
