"""
Engine: Real Estate Investment – Deterministic Model
Mortgage amortisation, rental cash flow, appreciation, and equity build-up.
Supports historical crisis stress testing (shocks property appreciation).
"""

from engines.crisis import build_crisis_months, build_crisis_window


def run_real_estate_deterministic(req):
    """
    Parameters
    ----------
    req : contracts.RealEstateRequest
        Pydantic model with all real-estate inputs.

    Returns
    -------
    dict  –  keys: years, property_value, loan_balance, equity,
             cumulative_cash_flow, metrics
    """
    # ── 1. Initial Setup & Loan Math ──
    down_payment_amount = req.purchase_price * req.down_payment_pct
    loan_amount = req.purchase_price - down_payment_amount

    monthly_interest_rate = req.interest_rate / 12
    loan_term_months = 360  # Standard 30-year fixed mortgage

    # Standard Amortisation: M = P [ i(1+i)^n ] / [ (1+i)^n - 1 ]
    if monthly_interest_rate > 0:
        monthly_mortgage_payment = loan_amount * (
            monthly_interest_rate * (1 + monthly_interest_rate) ** loan_term_months
        ) / ((1 + monthly_interest_rate) ** loan_term_months - 1)
    else:
        monthly_mortgage_payment = loan_amount / loan_term_months

    # ── 2. Income & Expense Math ──
    monthly_vacancy_loss = req.monthly_rent * req.vacancy_rate
    effective_monthly_rent = req.monthly_rent - monthly_vacancy_loss
    monthly_operating_expenses = req.annual_expenses / 12

    # Net Operating Income (NOI) = Revenue − Operating Expenses (before mortgage)
    monthly_noi = effective_monthly_rent - monthly_operating_expenses
    annual_noi = monthly_noi * 12
    monthly_cash_flow = monthly_noi - monthly_mortgage_payment

    # ── 3. The Time Loop (Hold Period) ──
    hold_months = req.hold_period_years * 12
    monthly_appreciation_rate = req.annual_appreciation / 12

    # Build crisis shock map (shocks override appreciation)
    crisis_months = build_crisis_months(
        req.crisis_event, req.crisis_start_year, hold_months
    )

    current_loan_balance = loan_amount
    current_property_value = req.purchase_price

    # Year-0 snapshots
    years_list = [0]
    property_values = [round(req.purchase_price, 2)]
    loan_balances = [round(loan_amount, 2)]
    equities = [round(down_payment_amount, 2)]
    cumulative_cf = [0.0]

    running_cash_flow = 0.0

    for month in range(1, hold_months + 1):
        # Appreciation – use crisis shock if active, else normal rate
        if month - 1 in crisis_months:
            current_property_value *= 1 + crisis_months[month - 1]
        else:
            current_property_value *= 1 + monthly_appreciation_rate

        # Amortisation
        interest_payment = current_loan_balance * monthly_interest_rate
        principal_payment = monthly_mortgage_payment - interest_payment
        current_loan_balance -= principal_payment

        # Cash flow accumulation
        running_cash_flow += monthly_cash_flow

        # Equity = value − debt
        current_equity = current_property_value - current_loan_balance

        # Sample annually for the frontend chart
        if month % 12 == 0:
            years_list.append(month // 12)
            property_values.append(round(current_property_value, 2))
            loan_balances.append(round(max(current_loan_balance, 0), 2))
            equities.append(round(current_equity, 2))
            cumulative_cf.append(round(running_cash_flow, 2))

    # ── 4. Final Performance Metrics ──
    total_cash_flow = monthly_cash_flow * hold_months
    final_equity = current_property_value - current_loan_balance
    total_profit = (final_equity - down_payment_amount) + total_cash_flow

    # Industry-standard ratios
    cap_rate = (annual_noi / req.purchase_price) * 100
    cash_on_cash_return = ((monthly_cash_flow * 12) / down_payment_amount) * 100

    return {
        "years": years_list,
        "property_value": property_values,
        "loan_balance": loan_balances,
        "equity": equities,
        "cumulative_cash_flow": cumulative_cf,
        "metrics": {
            "down_payment": round(down_payment_amount, 2),
            "loan_amount": round(loan_amount, 2),
            "monthly_mortgage": round(monthly_mortgage_payment, 2),
            "monthly_cash_flow": round(monthly_cash_flow, 2),
            "cap_rate": round(cap_rate, 2),
            "cash_on_cash_return": round(cash_on_cash_return, 2),
            "total_profit": round(total_profit, 2),
        },
        "crisis_window": build_crisis_window(req.crisis_event, req.crisis_start_year),
    }
