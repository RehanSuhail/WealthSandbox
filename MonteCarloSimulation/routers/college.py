"""
Router: College Savings (529 Plan) Simulation
POST /api/simulate/college
"""

from fastapi import APIRouter, HTTPException

from contracts import CollegeSavingsRequest, CollegeSavingsResponse
from engines.college_engine import run_college_savings_monte_carlo

router = APIRouter()


@router.post(
    "/college",
    response_model=CollegeSavingsResponse,
    summary="Simulate college savings growth toward a target cost",
)
async def simulate_college(req: CollegeSavingsRequest):
    """
    Monte Carlo simulation targeting a specific college cost by a deadline.
    Returns percentile paths, gap analysis, and goal probability.
    """
    if req.target_start_age <= req.child_age:
        raise HTTPException(
            status_code=422,
            detail="target_start_age must be greater than child_age",
        )

    result = run_college_savings_monte_carlo(req)
    return result
