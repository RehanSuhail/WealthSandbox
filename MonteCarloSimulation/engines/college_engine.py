"""
College Savings (529 Plan) – Monte Carlo Simulation Engine

Projects 529 plan growth toward a target college cost, with
percentile paths, gap analysis, and goal probability.
Supports historical crisis stress testing.
"""

import numpy as np

from contracts import CollegeSavingsRequest
from engines.crisis import build_crisis_months, build_crisis_window


def run_college_savings_monte_carlo(req: CollegeSavingsRequest, num_simulations: int = 1000) -> dict:
    years = req.target_start_age - req.child_age
    months = years * 12

    monthly_mu = req.expected_return / 12
    monthly_sig = req.volatility / np.sqrt(12)

    # Build crisis shock map
    crisis_months = build_crisis_months(
        req.crisis_event, req.crisis_start_year, months
    )

    portfolio_values = np.zeros((num_simulations, months + 1))
    portfolio_values[:, 0] = req.current_balance

    for month in range(1, months + 1):
        if month - 1 in crisis_months:
            random_returns = np.full(num_simulations, crisis_months[month - 1])
        else:
            random_returns = np.random.normal(
                loc=monthly_mu, scale=monthly_sig, size=num_simulations
            )

        prev_balance = portfolio_values[:, month - 1]
        new_balance = prev_balance * (1 + random_returns) + req.monthly_contrib

        portfolio_values[:, month] = np.maximum(new_balance, 0)

    # Extract Percentiles
    p10_path = np.percentile(portfolio_values, 10, axis=0).tolist()
    p50_path = np.percentile(portfolio_values, 50, axis=0).tolist()
    p90_path = np.percentile(portfolio_values, 90, axis=0).tolist()

    # Calculate Success Metrics
    final_balances = portfolio_values[:, -1]
    successful_simulations = np.sum(final_balances >= req.target_cost)
    probability_of_success = (successful_simulations / num_simulations) * 100

    total_contributed = req.current_balance + (req.monthly_contrib * 12 * years)
    base_case_final = p50_path[-1]
    gap_to_target = max(0, req.target_cost - base_case_final)

    return {
        "ages": list(range(req.child_age, req.target_start_age + 1)),
        "paths": {
            "p10_worst_case": [round(val, 2) for val in p10_path[::12]],
            "p50_base_case": [round(val, 2) for val in p50_path[::12]],
            "p90_best_case": [round(val, 2) for val in p90_path[::12]],
        },
        "metrics": {
            "total_contributed": round(total_contributed, 2),
            "projected_base_case": round(base_case_final, 2),
            "gap_to_target": round(gap_to_target, 2),
            "target_cost": req.target_cost,
            "probability_of_success": round(probability_of_success, 1),
        },
        "goal_probability": round(probability_of_success, 1),
        "crisis_window": build_crisis_window(req.crisis_event, req.crisis_start_year),
    }
