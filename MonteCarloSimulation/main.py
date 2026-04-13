import os

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from simulation import simulate_retirement_accumulation
from routers import retirement, equity, real_estate, college, emergency

FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "frontend")

# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class SimulationRequest(BaseModel):
    current_age: int = Field(..., ge=18, le=100, description="Client's current age")
    retirement_age: int = Field(..., ge=19, le=100, description="Target retirement age")
    current_savings: float = Field(..., ge=0, description="Current savings balance ($)")
    monthly_contribution: float = Field(..., ge=0, description="Monthly contribution ($)")
    stock_allocation: float = Field(
        ..., ge=0, le=100, description="Stock allocation percentage (0-100)"
    )
    inflation_rate: float = Field(
        default=0.03, ge=0, le=0.2, description="Annual inflation rate (e.g. 0.03 = 3%)"
    )
    crisis_event: str = Field(
        default="None",
        description="Stress-test scenario: 'None', 'GreatDepression', 'OilCrisis1973', 'DotCom2000', 'Financial2008', 'Covid2020', or 'RateShock2022'",
    )
    crisis_start_year: int = Field(
        default=0, ge=0, description="Years from today when the crisis event begins",
    )
    num_simulations: int = Field(
        default=1000, ge=100, le=10000, description="Number of Monte Carlo simulations"
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "current_age": 30,
                    "retirement_age": 65,
                    "current_savings": 50000,
                    "monthly_contribution": 1500,
                    "stock_allocation": 70,
                    "inflation_rate": 0.03,
                    "crisis_event": "Financial2008",
                    "crisis_start_year": 5,
                    "num_simulations": 1000,
                }
            ]
        }
    }


class PathsResponse(BaseModel):
    p10_worst_case: list[float]
    p50_base_case: list[float]
    p90_best_case: list[float]


class CrisisWindowResponse(BaseModel):
    event: str
    start_age: int
    end_age: int


class MetricsResponse(BaseModel):
    total_principal: float
    projected_wealth: float
    wealth_generated: float
    roi_pct: float


class SimulationResponse(BaseModel):
    ages: list[int]
    paths: PathsResponse
    crisis_window: CrisisWindowResponse | None = None
    metrics: MetricsResponse


# ---------------------------------------------------------------------------
# FastAPI application
# ---------------------------------------------------------------------------

app = FastAPI(
    title="LPL Wealth Management – Monte Carlo Simulation API",
    description=(
        "Run Monte Carlo retirement-accumulation simulations to project "
        "portfolio growth across different market scenarios."
    ),
    version="1.0.0",
)

# Allow frontend origins (adjust as needed for production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Portfolio sandbox routers (/api/simulate/*)
# ---------------------------------------------------------------------------

app.include_router(retirement.router,  prefix="/api/simulate", tags=["Retirement Portfolio"])
app.include_router(equity.router,      prefix="/api/simulate", tags=["Equity Growth Portfolio"])
app.include_router(real_estate.router,  prefix="/api/simulate", tags=["Real Estate Portfolio"])
app.include_router(college.router,     prefix="/api/simulate", tags=["College Savings Portfolio"])
app.include_router(emergency.router,   prefix="/api/simulate", tags=["Emergency / Liquidity Portfolio"])


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "healthy"}


# ---------------------------------------------------------------------------
# Simulation endpoint
# ---------------------------------------------------------------------------

@app.post(
    "/simulate",
    response_model=SimulationResponse,
    tags=["Simulation"],
    summary="Run a Monte Carlo retirement accumulation simulation",
)
async def run_simulation(request: SimulationRequest):
    """
    Accepts client financial parameters and returns projected portfolio
    values at the 10th, 50th, and 90th percentiles (sampled annually).
    """
    if request.retirement_age <= request.current_age:
        raise HTTPException(
            status_code=422,
            detail="retirement_age must be greater than current_age",
        )

    result = simulate_retirement_accumulation(
        current_age=request.current_age,
        retirement_age=request.retirement_age,
        current_savings=request.current_savings,
        monthly_contrib=request.monthly_contribution,
        stock_pct=request.stock_allocation,
        inflation_rate=request.inflation_rate,
        crisis_event=request.crisis_event,
        crisis_start_year=request.crisis_start_year,
        num_simulations=request.num_simulations,
    )

    return result


# ---------------------------------------------------------------------------
# Serve frontend
# ---------------------------------------------------------------------------

@app.get("/", tags=["Frontend"])
async def serve_frontend():
    return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))


@app.get("/sandboxes", tags=["Frontend"])
async def serve_sandboxes():
    return FileResponse(os.path.join(FRONTEND_DIR, "sandboxes.html"))


app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="frontend")
