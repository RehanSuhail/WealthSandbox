"""
Router: Equity Growth Portfolio Simulation
POST /api/simulate/equity
"""

from fastapi import APIRouter

from contracts import EquityGrowthRequest, EquityGrowthResponse
from engines.equity_engine import run_equity_growth_monte_carlo

router = APIRouter()


@router.post(
    "/equity",
    response_model=EquityGrowthResponse,
    summary="Simulate equity growth with dollar-cost averaging",
)
async def simulate_equity(req: EquityGrowthRequest):
    """
    Pure Monte Carlo growth projection without inflation drawdown.
    Models lump-sum + monthly DCA with configurable return, volatility, and expense ratio.
    """
    result = run_equity_growth_monte_carlo(req)
    return result
