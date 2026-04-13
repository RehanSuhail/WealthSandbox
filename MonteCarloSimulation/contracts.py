"""
Pydantic data contracts for the 5 portfolio sandbox simulators.

Each request model maps directly to the UI sliders for its sandbox.
Each response model defines the shape of the JSON returned to the frontend.
"""

from pydantic import BaseModel, Field


# =========================================================================
# 1. RETIREMENT PORTFOLIO
# =========================================================================

class RetirementRequest(BaseModel):
    current_age: int = Field(..., ge=20, le=60, description="Client's current age")
    retirement_age: int = Field(..., ge=50, le=75, description="Target retirement age")
    life_expectancy: int = Field(..., ge=70, le=100, description="Assumed life expectancy")
    current_savings: float = Field(..., ge=0, description="Current retirement savings ($)")
    monthly_contrib: float = Field(..., ge=0, description="Monthly contribution ($)")
    expected_return: float = Field(..., ge=0.02, le=0.15, description="Expected annual return (e.g. 0.08)")
    volatility: float = Field(..., ge=0.05, le=0.25, description="Portfolio volatility / std dev (e.g. 0.15)")
    inflation_rate: float = Field(..., ge=0.01, le=0.06, description="Annual inflation rate (e.g. 0.03)")
    employer_match_pct: float = Field(default=0, ge=0, le=100, description="Employer match as % of contribution (e.g. 50 = 50%)")
    expected_monthly_income: float = Field(..., ge=0, description="Desired monthly income in retirement ($)")
    ss_start_age: int = Field(..., ge=62, le=70, description="Age when Social Security benefits begin")
    ss_monthly_amount: float = Field(default=0, ge=0, description="Expected monthly Social Security benefit ($)")
    crisis_event: str = Field(default="None", description="Stress-test crisis key or 'None'")
    crisis_start_year: int = Field(default=0, ge=0, description="Years from now when crisis begins")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "current_age": 30,
                    "retirement_age": 65,
                    "life_expectancy": 90,
                    "current_savings": 80000,
                    "monthly_contrib": 2000,
                    "expected_return": 0.08,
                    "volatility": 0.15,
                    "inflation_rate": 0.03,
                    "employer_match_pct": 50,
                    "expected_monthly_income": 5000,
                    "ss_start_age": 67,
                    "ss_monthly_amount": 2000,
                    "crisis_event": "Financial2008",
                    "crisis_start_year": 5,
                }
            ]
        }
    }


class RetirementResponse(BaseModel):
    ages: list[int]
    paths: dict[str, list[float]]
    metrics: dict[str, float]
    crisis_window: dict | None = None


# =========================================================================
# 2. EQUITY GROWTH PORTFOLIO
# =========================================================================

class EquityGrowthRequest(BaseModel):
    initial_lump_sum: float = Field(..., ge=0, description="One-time initial investment ($)")
    monthly_dca: float = Field(..., ge=0, description="Monthly dollar-cost-averaging amount ($)")
    time_horizon_years: int = Field(..., ge=1, le=40, description="Investment horizon (years)")
    expected_return: float = Field(..., ge=0.02, le=0.15, description="Expected annual return (e.g. 0.10)")
    volatility: float = Field(
        ..., ge=0.05, le=0.25,
        description="Portfolio volatility / std dev (derived from Large/Mid/Intl split)",
    )
    expense_ratio: float = Field(..., ge=0.0003, le=0.015, description="Annual fund expense ratio (e.g. 0.002)")
    crisis_event: str = Field(default="None", description="Stress-test crisis key or 'None'")
    crisis_start_year: int = Field(default=0, ge=0, description="Years from now when crisis begins")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "initial_lump_sum": 50000,
                    "monthly_dca": 1000,
                    "time_horizon_years": 20,
                    "expected_return": 0.10,
                    "volatility": 0.17,
                    "expense_ratio": 0.002,
                    "crisis_event": "DotCom2000",
                    "crisis_start_year": 3,
                }
            ]
        }
    }


class EquityGrowthResponse(BaseModel):
    years: list[int]
    paths: dict[str, list[float]]
    metrics: dict[str, float]
    crisis_window: dict | None = None


# =========================================================================
# 3. REAL ESTATE PORTFOLIO
# =========================================================================

class RealEstateRequest(BaseModel):
    purchase_price: float = Field(..., ge=50000, description="Property purchase price ($)")
    down_payment_pct: float = Field(..., ge=0.035, le=0.50, description="Down payment percentage (e.g. 0.20)")
    interest_rate: float = Field(..., ge=0.03, le=0.10, description="Mortgage interest rate (e.g. 0.065)")
    monthly_rent: float = Field(..., ge=0, description="Expected monthly rental income ($)")
    annual_appreciation: float = Field(..., ge=0, le=0.10, description="Annual property appreciation rate (e.g. 0.03)")
    vacancy_rate: float = Field(..., ge=0, le=0.20, description="Expected vacancy rate (e.g. 0.05)")
    annual_expenses: float = Field(..., ge=0, description="Annual maintenance, taxes & insurance ($)")
    hold_period_years: int = Field(..., ge=1, le=30, description="How many years you plan to hold the property")
    crisis_event: str = Field(default="None", description="Stress-test crisis key or 'None'")
    crisis_start_year: int = Field(default=0, ge=0, description="Years from now when crisis begins")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "purchase_price": 400000,
                    "down_payment_pct": 0.20,
                    "interest_rate": 0.065,
                    "monthly_rent": 2500,
                    "annual_appreciation": 0.03,
                    "vacancy_rate": 0.05,
                    "annual_expenses": 6000,
                    "hold_period_years": 10,
                    "crisis_event": "Financial2008",
                    "crisis_start_year": 2,
                }
            ]
        }
    }


class RealEstateResponse(BaseModel):
    years: list[int]
    property_value: list[float]
    loan_balance: list[float]
    equity: list[float]
    cumulative_cash_flow: list[float]
    metrics: dict[str, float]
    crisis_window: dict | None = None


# =========================================================================
# 4. COLLEGE SAVINGS PORTFOLIO (529 PLAN)
# =========================================================================

class CollegeSavingsRequest(BaseModel):
    child_age: int = Field(..., ge=0, le=18, description="Child's current age")
    target_start_age: int = Field(..., ge=16, le=20, description="Age when college starts")
    target_cost: float = Field(..., ge=0, description="Total target college cost ($)")
    current_balance: float = Field(..., ge=0, description="Current 529 plan balance ($)")
    monthly_contrib: float = Field(..., ge=0, description="Monthly contribution ($)")
    expected_return: float = Field(..., ge=0.02, le=0.10, description="Expected annual return (e.g. 0.06)")
    volatility: float = Field(..., ge=0.04, le=0.15, description="Portfolio volatility (e.g. 0.08)")
    crisis_event: str = Field(default="None", description="Stress-test crisis key or 'None'")
    crisis_start_year: int = Field(default=0, ge=0, description="Years from now when crisis begins")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "child_age": 3,
                    "target_start_age": 18,
                    "target_cost": 200000,
                    "current_balance": 15000,
                    "monthly_contrib": 500,
                    "expected_return": 0.06,
                    "volatility": 0.08,
                    "crisis_event": "Covid2020",
                    "crisis_start_year": 5,
                }
            ]
        }
    }


class CollegeSavingsResponse(BaseModel):
    ages: list[int]
    paths: dict[str, list[float]]
    metrics: dict[str, float]
    goal_probability: float = Field(description="Probability of meeting target_cost (%)")
    crisis_window: dict | None = None


# =========================================================================
# 5. EMERGENCY / LIQUIDITY PORTFOLIO
# =========================================================================

class EmergencyLiquidityRequest(BaseModel):
    monthly_expenses: float = Field(..., ge=1000, description="Monthly living expenses ($)")
    target_buffer_months: int = Field(..., ge=1, le=24, description="Target emergency buffer (months)")
    current_savings: float = Field(..., ge=0, description="Current emergency fund balance ($)")
    monthly_addition: float = Field(..., ge=0, description="Monthly contribution to fund ($)")
    hysa_yield_rate: float = Field(..., ge=0, le=0.08, description="High-yield savings account APY (e.g. 0.045)")
    inflation_rate: float = Field(..., ge=0.01, le=0.06, description="Annual inflation rate (e.g. 0.03)")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "monthly_expenses": 5000,
                    "target_buffer_months": 6,
                    "current_savings": 8000,
                    "monthly_addition": 500,
                    "hysa_yield_rate": 0.045,
                    "inflation_rate": 0.03,
                }
            ]
        }
    }


class EmergencyLiquidityResponse(BaseModel):
    months: list[int]
    fund_balance: list[float]
    real_purchasing_power: list[float]
    target_line: list[float]
    metrics: dict[str, float | str]
