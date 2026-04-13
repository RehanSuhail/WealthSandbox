"""
Router: Real Estate Portfolio Simulation
POST /api/simulate/real-estate
"""

from fastapi import APIRouter

from contracts import RealEstateRequest, RealEstateResponse
from engines.real_estate_engine import run_real_estate_deterministic

router = APIRouter()


@router.post(
    "/real-estate",
    response_model=RealEstateResponse,
    summary="Simulate real estate investment cash flow and equity growth",
)
async def simulate_real_estate(req: RealEstateRequest):
    """
    Deterministic model: mortgage amortisation, rental cash flow,
    property appreciation, and equity build-up over the hold period.
    """
    result = run_real_estate_deterministic(req)
    return RealEstateResponse(**result)
