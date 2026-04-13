"""
Equity Growth Portfolio – Monte Carlo Simulation Engine

Pure growth projection with dollar-cost averaging, expense-ratio drag,
and no inflation drawdown.  Supports historical crisis stress testing.
"""

import numpy as np

from contracts import EquityGrowthRequest
from engines.crisis import build_crisis_months, build_crisis_window


def run_equity_growth_monte_carlo(req: EquityGrowthRequest, num_simulations: int = 1000) -> dict:
    months = req.time_horizon_years * 12

    # Convert annual assumptions to monthly
    monthly_mu = req.expected_return / 12
    monthly_sig = req.volatility / np.sqrt(12)
    monthly_fee = req.expense_ratio / 12  # The "Fee Drag"

    # Build crisis shock map
    crisis_months = build_crisis_months(
        req.crisis_event, req.crisis_start_year, months
    )

    portfolio_values = np.zeros((num_simulations, months + 1))
    portfolio_values[:, 0] = req.initial_lump_sum

    for month in range(1, months + 1):
        if month - 1 in crisis_months:
            # Deterministic shock during crisis
            random_returns = np.full(num_simulations, crisis_months[month - 1])
        else:
            # 1. Roll the die for the stochastic market return
            random_returns = np.random.normal(
                loc=monthly_mu, scale=monthly_sig, size=num_simulations
            )

        # 2. Apply the fee drag (subtract the ETF/Fund expense ratio)
        net_returns = random_returns - monthly_fee

        # 3. Calculate new balance and add the DCA contribution
        prev_balance = portfolio_values[:, month - 1]
        new_balance = prev_balance * (1 + net_returns) + req.monthly_dca

        portfolio_values[:, month] = np.maximum(new_balance, 0)

    # Extract Percentiles
    p10_path = np.percentile(portfolio_values, 10, axis=0).tolist()
    p50_path = np.percentile(portfolio_values, 50, axis=0).tolist()
    p90_path = np.percentile(portfolio_values, 90, axis=0).tolist()

    # Compute metrics
    total_contributed = req.initial_lump_sum + (req.monthly_dca * 12 * req.time_horizon_years)
    projected_value = p50_path[::12][-1]  # last annual data point of base case
    total_return = projected_value - total_contributed
    cagr = (projected_value / req.initial_lump_sum) ** (1 / req.time_horizon_years) - 1 if req.initial_lump_sum > 0 else 0.0

    # Expense drag: compare a hypothetical no-fee p50 final value
    # Approximation: total_contributed * (1 + expense_ratio) ^ years gives the drag
    expense_drag = total_contributed * ((1 + req.expense_ratio) ** req.time_horizon_years - 1)

    return {
        "years": list(range(req.time_horizon_years + 1)),
        "paths": {
            "p10_worst_case": [round(val, 2) for val in p10_path[::12]],
            "p50_base_case": [round(val, 2) for val in p50_path[::12]],
            "p90_best_case": [round(val, 2) for val in p90_path[::12]],
        },
        "metrics": {
            "total_contributed": round(total_contributed, 2),
            "projected_value": round(projected_value, 2),
            "total_return": round(total_return, 2),
            "cagr_pct": round(cagr * 100, 2),
            "expense_drag": round(expense_drag, 2),
        },
        "crisis_window": build_crisis_window(req.crisis_event, req.crisis_start_year),
    }
