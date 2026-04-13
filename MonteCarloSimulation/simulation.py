import numpy as np


def simulate_retirement_accumulation(
    current_age: int,
    retirement_age: int,
    current_savings: float,
    monthly_contrib: float,
    stock_pct: float,
    inflation_rate: float,
    crisis_event: str = "None",
    crisis_start_year: int = 0,
    num_simulations: int = 1000,
):
    years = retirement_age - current_age
    months = years * 12

    # 1. Map user inputs to asset class proxies
    weight_stocks = stock_pct / 100.0
    weight_bonds = 1.0 - weight_stocks
    mu_stocks, sig_stocks = 0.105, 0.17
    mu_bonds, sig_bonds = 0.045, 0.06
    correlation = -0.15

    port_mu = (weight_stocks * mu_stocks) + (weight_bonds * mu_bonds)
    port_var = (
        (weight_stocks**2 * sig_stocks**2)
        + (weight_bonds**2 * sig_bonds**2)
        + (2 * weight_stocks * weight_bonds * sig_stocks * sig_bonds * correlation)
    )
    port_sig = np.sqrt(port_var)

    monthly_mu = port_mu / 12
    monthly_sig = port_sig / np.sqrt(12)
    monthly_inflation = inflation_rate / 12

    # 2. Define Crisis Sequences (annualised returns → converted to monthly)
    CRISES = {
        "GreatDepression": [-0.08, -0.25, -0.43, -0.08, 0.54],
        "OilCrisis1973":   [-0.15, -0.26, 0.37, 0.23],
        "DotCom2000":      [-0.09, -0.12, -0.22, 0.28],
        "Financial2008":   [-0.37, -0.05, 0.26, 0.15],
        "Covid2020":       [-0.34, 0.68],
        "RateShock2022":   [-0.19, 0.24]
    }

    # Pre-calculate which months are hijacked by the crisis
    crisis_months: dict[int, float] = {}
    if crisis_event in CRISES:
        start_month = crisis_start_year * 12
        for year_offset, annual_return in enumerate(CRISES[crisis_event]):
            monthly_shock = (1 + annual_return) ** (1 / 12) - 1
            for m in range(12):
                target_month = start_month + (year_offset * 12) + m
                if target_month < months:
                    crisis_months[target_month] = monthly_shock

    # 3. Initialize the Monte Carlo array
    portfolio_values = np.zeros((num_simulations, months + 1))
    portfolio_values[:, 0] = current_savings

    # 4. Run the Simulation with Crisis Hijack Logic
    for month in range(1, months + 1):
        if month in crisis_months:
            # Deterministic shock applied equally to all simulations
            current_returns = np.full(num_simulations, crisis_months[month])
        else:
            # Normal Monte Carlo random draw
            current_returns = np.random.normal(
                loc=monthly_mu, scale=monthly_sig, size=num_simulations
            )

        prev_balance = portfolio_values[:, month - 1]
        new_balance = prev_balance * (1 + current_returns) + monthly_contrib
        new_balance = new_balance / (1 + monthly_inflation)
        portfolio_values[:, month] = np.maximum(new_balance, 0)

    # 5. Extract Percentiles
    p10_path = np.percentile(portfolio_values, 10, axis=0).tolist()
    p50_path = np.percentile(portfolio_values, 50, axis=0).tolist()
    p90_path = np.percentile(portfolio_values, 90, axis=0).tolist()

    # 6. Build crisis window metadata for the frontend
    crisis_window = None
    if crisis_event in CRISES:
        c_start_age = current_age + crisis_start_year
        c_end_age = c_start_age + len(CRISES[crisis_event])
        crisis_window = {
            "event": crisis_event,
            "start_age": c_start_age,
            "end_age": min(c_end_age, retirement_age),
        }

    # 7. Compute investment analysis metrics
    total_principal = current_savings + (monthly_contrib * 12 * years)
    projected_wealth = p50_path[::12][-1]  # last annual data point of base case
    wealth_generated = projected_wealth - total_principal
    roi = (wealth_generated / total_principal * 100) if total_principal > 0 else 0.0

    return {
        "ages": list(range(current_age, retirement_age + 1)),
        "paths": {
            "p10_worst_case": [round(val, 2) for val in p10_path[::12]],
            "p50_base_case": [round(val, 2) for val in p50_path[::12]],
            "p90_best_case": [round(val, 2) for val in p90_path[::12]],
        },
        "crisis_window": crisis_window,
        "metrics": {
            "total_principal": round(total_principal, 2),
            "projected_wealth": round(projected_wealth, 2),
            "wealth_generated": round(wealth_generated, 2),
            "roi_pct": round(roi, 2),
        },
    }
