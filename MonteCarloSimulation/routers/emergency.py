"""Router: Emergency / Liquidity Fund Simulation
POST /api/simulate/emergency
"""

from fastapi import APIRouter

from contracts import EmergencyLiquidityRequest, EmergencyLiquidityResponse
from engines.emergency_engine import run_emergency_liquidity_deterministic

router = APIRouter()


@router.post(
    "/emergency",
    response_model=EmergencyLiquidityResponse,
    summary="Simulate emergency fund growth toward a target buffer",
)
async def simulate_emergency(req: EmergencyLiquidityRequest):
    """
    Deterministic projection: compound HYSA interest vs inflation erosion.
    Shows month-by-month fund balance against the target buffer line.
    """
    result = run_emergency_liquidity_deterministic(req)

    target = result["metrics"]["target_safety_net"]
    timeline = result["timeline"]

    return EmergencyLiquidityResponse(
        months=[0] + [t["month"] for t in timeline],
        fund_balance=[req.current_savings] + [t["nominal_balance"] for t in timeline],
        real_purchasing_power=[req.current_savings] + [t["real_purchasing_power"] for t in timeline],
        target_line=[target] * (len(timeline) + 1),
        metrics=result["metrics"],
    )
