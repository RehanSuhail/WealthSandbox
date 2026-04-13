"""
Router: Retirement Portfolio Simulation
POST /api/simulate/retirement
"""

from fastapi import APIRouter, HTTPException

from contracts import RetirementRequest, RetirementResponse
from engines.retirement_engine import run_full_retirement_monte_carlo

router = APIRouter()


@router.post(
    "/retirement",
    response_model=RetirementResponse,
    summary="Full lifecycle retirement simulation (accumulation + drawdown)",
)
async def simulate_retirement(req: RetirementRequest):
    """
    Monte Carlo simulation covering working-year accumulation and
    retirement-year drawdown through life expectancy.
    Includes employer match, Social Security, and probability of success.
    """
    if req.retirement_age <= req.current_age:
        raise HTTPException(
            status_code=422,
            detail="retirement_age must be greater than current_age",
        )
    if req.life_expectancy <= req.retirement_age:
        raise HTTPException(
            status_code=422,
            detail="life_expectancy must be greater than retirement_age",
        )
    if req.ss_start_age < req.retirement_age:
        raise HTTPException(
            status_code=422,
            detail="ss_start_age should not be earlier than retirement_age",
        )

    result = run_full_retirement_monte_carlo(req)
    return RetirementResponse(**result)
