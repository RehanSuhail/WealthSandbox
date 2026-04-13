"""
Engine: Full Retirement Monte Carlo Simulation
Covers both accumulation (working years) and drawdown (retirement years)
through life expectancy, including employer match and Social Security.
Supports historical crisis stress testing.
"""

import numpy as np

from engines.crisis import build_crisis_months, build_crisis_window


def run_full_retirement_monte_carlo(req, num_simulations: int = 1000):
    """
    Parameters
    ----------
    req : contracts.RetirementRequest
        Pydantic model with all retirement-planning inputs.
    num_simulations : int
        Number of Monte Carlo paths to generate.

    Returns
    -------
    dict  –  keys: ages, metrics, paths, crisis_window
    """
    total_years = req.life_expectancy - req.current_age
    total_months = total_years * 12

    accumulation_months = (req.retirement_age - req.current_age) * 12
    ss_start_month = (req.ss_start_age - req.current_age) * 12

    # Map inputs to monthly metrics
    monthly_mu = req.expected_return / 12
    monthly_sig = req.volatility / np.sqrt(12)
    monthly_inflation = req.inflation_rate / 12

    # Build crisis shock map
    crisis_months = build_crisis_months(
        req.crisis_event, req.crisis_start_year, total_months
    )

    portfolio_values = np.zeros((num_simulations, total_months + 1))
    portfolio_values[:, 0] = req.current_savings

    for month in range(1, total_months + 1):
        if month - 1 in crisis_months:
            # Deterministic shock during crisis
            random_returns = np.full(num_simulations, crisis_months[month - 1])
        else:
            random_returns = np.random.normal(
                loc=monthly_mu, scale=monthly_sig, size=num_simulations
            )

        prev_balance = portfolio_values[:, month - 1]

        # Calculate Real Growth (Return – Inflation)
        net_returns = random_returns - monthly_inflation
        new_balance = prev_balance * (1 + net_returns)

        # -----------------------------------------
        # PHASE 1: ACCUMULATION (Working Years)
        # -----------------------------------------
        if month <= accumulation_months:
            total_monthly_addition = req.monthly_contrib * (
                1 + (req.employer_match_pct / 100)
            )
            new_balance += total_monthly_addition

        # -----------------------------------------
        # PHASE 2: DRAWDOWN (Retirement Years)
        # -----------------------------------------
        else:
            required_withdrawal = req.expected_monthly_income

            # If Social Security has kicked in, reduce withdrawal need
            if month >= ss_start_month:
                required_withdrawal -= req.ss_monthly_amount

            # Prevent negative withdrawals if SS pays more than they spend
            required_withdrawal = max(0, required_withdrawal)
            new_balance -= required_withdrawal

        # Floor the balance at $0
        portfolio_values[:, month] = np.maximum(new_balance, 0)

    # ── Extract percentile paths (sampled annually) ──
    p10_path = np.percentile(portfolio_values, 10, axis=0).tolist()
    p50_path = np.percentile(portfolio_values, 50, axis=0).tolist()
    p90_path = np.percentile(portfolio_values, 90, axis=0).tolist()

    # ── Probability of success (balance > 0 at life expectancy) ──
    final_balances = portfolio_values[:, -1]
    successful_simulations = np.sum(final_balances > 0)
    probability_of_success = (successful_simulations / num_simulations) * 100

    return {
        "ages": list(range(req.current_age, req.life_expectancy + 1)),
        "metrics": {
            "balance_at_retirement": round(p50_path[accumulation_months], 2),
            "probability_of_success": round(probability_of_success, 1),
        },
        "paths": {
            "p10_worst_case": [round(val, 2) for val in p10_path[::12]],
            "p50_base_case": [round(val, 2) for val in p50_path[::12]],
            "p90_best_case": [round(val, 2) for val in p90_path[::12]],
        },
        "crisis_window": build_crisis_window(req.crisis_event, req.crisis_start_year),
    }
