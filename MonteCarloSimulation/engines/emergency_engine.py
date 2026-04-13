"""
Engine: Emergency / Liquidity Fund – Deterministic Projection
Compound HYSA interest vs inflation erosion over a 60-month horizon.

Note: No crisis stress-testing for this engine.  HYSA accounts are
FDIC-insured; equity-market crash data is not applicable to savings
products.
"""


def run_emergency_liquidity_deterministic(req):
    """
    Parameters
    ----------
    req : contracts.EmergencyLiquidityRequest
        Pydantic model with emergency-fund inputs.

    Returns
    -------
    dict  –  keys: metrics, timeline
    """
    target_safety_net = req.monthly_expenses * req.target_buffer_months

    monthly_hysa_rate = req.hysa_yield_rate / 12
    monthly_inflation_rate = req.inflation_rate / 12

    # Project out 60 months (5 years) to see the full trajectory
    projection_months = 60

    current_nominal_balance = req.current_savings
    months_to_target = -1  # -1 means target not yet reached

    timeline_data = []

    for month in range(1, projection_months + 1):
        # 1. Add interest and contributions (Nominal Growth)
        interest_earned = current_nominal_balance * monthly_hysa_rate
        current_nominal_balance += interest_earned + req.monthly_addition

        # 2. Discount nominal balance by compounded inflation → "Real" value
        cumulative_inflation_factor = (1 + monthly_inflation_rate) ** month
        real_purchasing_power = current_nominal_balance / cumulative_inflation_factor

        # 3. Check if they hit the target this month (using Real dollars)
        if real_purchasing_power >= target_safety_net and months_to_target == -1:
            months_to_target = month

        timeline_data.append({
            "month": month,
            "nominal_balance": round(current_nominal_balance, 2),
            "real_purchasing_power": round(real_purchasing_power, 2),
        })

    # Current status metrics
    current_months_covered = req.current_savings / req.monthly_expenses
    net_real_yield = (req.hysa_yield_rate - req.inflation_rate) * 100

    return {
        "metrics": {
            "target_safety_net": round(target_safety_net, 2),
            "current_months_covered": round(current_months_covered, 1),
            "months_to_target": months_to_target if months_to_target != -1 else "60+",
            "net_real_yield_pct": round(net_real_yield, 2),
        },
        "timeline": timeline_data,
    }
