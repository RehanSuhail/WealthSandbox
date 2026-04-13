// ─── Monte Carlo Simulation – API Bridge to Python FastAPI Backend ────────────
// Replaces the old in-process TypeScript engine with HTTP calls to the dedicated
// Monte Carlo micro-service running at MC_API_URL (default http://localhost:8000).

import type { McSimulateParams, McSimulateResult } from "@/lib/types";
import crypto from "crypto";

const MC_API_URL = process.env.MC_API_URL || "http://localhost:8000";

// ─── Python API response types ────────────────────────────────────────────────

interface CrisisWindow {
  event: string;
  start_year: number;
  end_year: number;
}

interface RetirementResponse {
  ages: number[];
  paths: { p10_worst_case: number[]; p50_base_case: number[]; p90_best_case: number[] };
  metrics: { balance_at_retirement: number; probability_of_success: number };
  crisis_window?: CrisisWindow | null;
}

interface EquityResponse {
  years: number[];
  paths: { p10_worst_case: number[]; p50_base_case: number[]; p90_best_case: number[] };
  metrics: { total_contributed: number; projected_value: number; total_return: number; cagr_pct: number; expense_drag: number };
  crisis_window?: CrisisWindow | null;
}

interface RealEstateResponse {
  years: number[];
  property_value: number[];
  loan_balance: number[];
  equity: number[];
  cumulative_cash_flow: number[];
  metrics: {
    down_payment: number; loan_amount: number; monthly_mortgage: number;
    monthly_cash_flow: number; cap_rate: number; cash_on_cash_return: number; total_profit: number;
  };
}

interface CollegeResponse {
  ages: number[];
  paths: { p10_worst_case: number[]; p50_base_case: number[]; p90_best_case: number[] };
  metrics: { total_contributed: number; projected_base_case: number; gap_to_target: number; goal_probability: number };
  goal_probability: number;
  crisis_window?: CrisisWindow | null;
}

interface EmergencyResponse {
  months: number[];
  fund_balance: number[];
  real_purchasing_power: number[];
  target_line: number[];
  metrics: {
    target_safety_net: number; current_months_covered: number;
    months_to_target: number | string; net_real_yield_pct: number;
  };
}

// ─── Frontend scenario → Python crisis key mapping ────────────────────────────

const SCENARIO_TO_CRISIS_KEY: Record<string, string> = {
  "2008": "Financial2008",
  "2020_covid": "Covid2020",
  "dotcom_2000": "DotCom2000",
  "stagflation_1970s": "OilCrisis1973",
  "Financial2008": "Financial2008",
  "Covid2020": "Covid2020",
  "DotCom2000": "DotCom2000",
  "GreatDepression": "GreatDepression",
  "OilCrisis1973": "OilCrisis1973",
  "RateShock2022": "RateShock2022",
};

function getCrisisFields(crisisOverlay?: { scenario: string } | null): { crisis_event: string; crisis_start_year: number } {
  if (!crisisOverlay || crisisOverlay.scenario === "custom") {
    return { crisis_event: "None", crisis_start_year: 0 };
  }
  const key = SCENARIO_TO_CRISIS_KEY[crisisOverlay.scenario];
  return { crisis_event: key || "None", crisis_start_year: 5 };
}

// ─── Payload builders (slider state → Python contract) ────────────────────────

export function buildRetirementPayload(
  sliderState: Record<string, number>,
  currentAge: number,
  crisis?: { crisis_event: string; crisis_start_year: number }
) {
  return {
    current_age: sliderState.currentAge ?? currentAge,
    retirement_age: sliderState.retirementAge ?? 65,
    life_expectancy: sliderState.lifeExpectancy ?? 90,
    current_savings: sliderState.currentSavings ?? 80000,
    monthly_contrib: sliderState.monthlyContribution ?? 2000,
    expected_return: (sliderState.expectedReturnMean ?? 8) / 100,
    volatility: (sliderState.expectedReturnStd ?? sliderState.volatility ?? 15) / 100,
    inflation_rate: (sliderState.inflation ?? 3) / 100,
    employer_match_pct: sliderState.employerMatchPct ?? 50,
    expected_monthly_income: sliderState.expectedMonthlyIncome ??
      (sliderState.withdrawalAmountAnnual ? Math.round(sliderState.withdrawalAmountAnnual / 12) : 5000),
    ss_start_age: sliderState.socialSecurityAge ?? 67,
    ss_monthly_amount: sliderState.socialSecurityMonthly ?? 2000,
    crisis_event: crisis?.crisis_event ?? "None",
    crisis_start_year: crisis?.crisis_start_year ?? 0,
  };
}

export function buildEquityPayload(
  sliderState: Record<string, number>,
  crisis?: { crisis_event: string; crisis_start_year: number }
) {
  return {
    initial_lump_sum: sliderState.lumpSum ?? sliderState.currentSavings ?? 50000,
    monthly_dca: sliderState.monthlyDca ?? sliderState.monthlyContribution ?? 1000,
    time_horizon_years: sliderState.timeHorizonYears ?? 20,
    expected_return: (sliderState.expectedReturnMean ?? 10) / 100,
    volatility: (sliderState.volatility ?? sliderState.expectedReturnStd ?? 17) / 100,
    expense_ratio: (sliderState.expenseRatio ?? 0.20) / 100,
    crisis_event: crisis?.crisis_event ?? "None",
    crisis_start_year: crisis?.crisis_start_year ?? 0,
  };
}

export function buildRealEstatePayload(sliderState: Record<string, number>) {
  return {
    purchase_price: sliderState.purchasePrice ?? 400000,
    down_payment_pct: (sliderState.downPaymentPct ?? 20) / 100,
    interest_rate: (sliderState.interestRate ?? 6.5) / 100,
    monthly_rent: sliderState.monthlyRent ?? 2500,
    annual_appreciation: (sliderState.annualAppreciation ?? 3) / 100,
    vacancy_rate: (sliderState.vacancyRate ?? 5) / 100,
    annual_expenses: sliderState.annualExpenses ?? 6000,
    hold_period_years: sliderState.holdPeriodYears ?? 10,
  };
}

export function buildCollegePayload(
  sliderState: Record<string, number>,
  crisis?: { crisis_event: string; crisis_start_year: number }
) {
  return {
    child_age: sliderState.childAge ?? 3,
    target_start_age: sliderState.collegeStartAge ?? 18,
    target_cost: sliderState.targetCost ?? 200000,
    current_balance: sliderState.currentBalance ?? 15000,
    monthly_contrib: sliderState.monthlyContribution ?? 500,
    expected_return: (sliderState.expectedReturnMean ?? 6) / 100,
    volatility: (sliderState.volatility ?? sliderState.expectedReturnStd ?? 8) / 100,
    crisis_event: crisis?.crisis_event ?? "None",
    crisis_start_year: crisis?.crisis_start_year ?? 0,
  };
}

export function buildEmergencyPayload(sliderState: Record<string, number>) {
  return {
    monthly_expenses: sliderState.monthlyExpenses ?? 5000,
    target_buffer_months: sliderState.targetMonths ?? 6,
    current_savings: sliderState.currentLiquid ?? sliderState.currentSavings ?? 8000,
    monthly_addition: sliderState.monthlyAddition ?? 500,
    hysa_yield_rate: (sliderState.hyRate ?? 4.5) / 100,
    inflation_rate: (sliderState.inflation ?? 3) / 100,
  };
}

// ─── Call Python API ──────────────────────────────────────────────────────────

async function callPythonAPI(endpoint: string, payload: unknown): Promise<unknown> {
  const res = await fetch(`${MC_API_URL}/api/simulate/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "Unknown error");
    throw new Error(`MC API error (${res.status}): ${errText}`);
  }
  return res.json();
}

// ─── Map Python responses → McSimulateResult ──────────────────────────────────

function mapRetirementToResult(data: RetirementResponse, startTime: number): McSimulateResult {
  const p10 = data.paths.p10_worst_case;
  const p50 = data.paths.p50_base_case;
  const p90 = data.paths.p90_best_case;

  let fundsLastToAge = data.ages[data.ages.length - 1];
  for (let i = p50.length - 1; i >= 0; i--) {
    if (p50[i] > 0) { fundsLastToAge = data.ages[i]; break; }
  }

  return {
    p10, p50, p90,
    probabilityOfSuccess: (data.metrics.probability_of_success ?? 0) / 100,
    fundsLastToAge,
    monthlySustainableWithdrawal: Math.round((data.metrics.balance_at_retirement ?? 0) * 0.04 / 12),
    computationMs: Date.now() - startTime,
  };
}

function mapEquityToResult(data: EquityResponse, startTime: number): McSimulateResult {
  return {
    p10: data.paths.p10_worst_case,
    p50: data.paths.p50_base_case,
    p90: data.paths.p90_best_case,
    probabilityOfSuccess: 0.85,
    fundsLastToAge: 0,
    monthlySustainableWithdrawal: 0,
    computationMs: Date.now() - startTime,
  };
}

function mapRealEstateToResult(data: RealEstateResponse, startTime: number): McSimulateResult {
  return {
    p10: data.loan_balance,
    p50: data.equity,
    p90: data.property_value,
    probabilityOfSuccess: data.metrics.cash_on_cash_return > 0 ? 0.9 : 0.5,
    fundsLastToAge: 0,
    monthlySustainableWithdrawal: Math.round(data.metrics.monthly_cash_flow),
    computationMs: Date.now() - startTime,
  };
}

function mapCollegeToResult(data: CollegeResponse, startTime: number): McSimulateResult {
  return {
    p10: data.paths.p10_worst_case,
    p50: data.paths.p50_base_case,
    p90: data.paths.p90_best_case,
    probabilityOfSuccess: (data.goal_probability ?? 0) / 100,
    fundsLastToAge: 0,
    monthlySustainableWithdrawal: 0,
    computationMs: Date.now() - startTime,
  };
}

function mapEmergencyToResult(data: EmergencyResponse, startTime: number): McSimulateResult {
  const mtt = data.metrics.months_to_target;
  const monthsNum = typeof mtt === "number" ? mtt : 61; // "60+" → treat as 61
  return {
    p10: data.real_purchasing_power,
    p50: data.fund_balance,
    p90: data.target_line,
    probabilityOfSuccess: monthsNum <= 12 ? 0.95 : monthsNum <= 36 ? 0.8 : 0.6,
    fundsLastToAge: 0,
    monthlySustainableWithdrawal: 0,
    computationMs: Date.now() - startTime,
  };
}

// ─── Main simulation function (async – calls Python API) ─────────────────────

export async function simulateMonteCarlo(params: McSimulateParams): Promise<McSimulateResult> {
  const startTime = Date.now();
  const portfolioType = params.portfolioType || "retirement";

  // Reconstruct slider-like values from McSimulateParams
  const sliderState: Record<string, number> = {
    currentSavings: params.currentSavings,
    monthlyContribution: params.monthlyContribution,
    retirementAge: params.retirementAge,
    lifeExpectancy: params.lifeExpectancy,
    expectedReturnMean: params.expectedReturnMean * 100,
    expectedReturnStd: params.expectedReturnStd * 100,
    volatility: params.expectedReturnStd * 100,
    inflation: params.inflation * 100,
    stockPct: params.stockPct * 100,
    bondPct: params.bondPct * 100,
    withdrawalAmountAnnual: params.withdrawalAmountAnnual,
  };

  // Resolve crisis fields from overlay
  const crisis = getCrisisFields(params.crisisOverlay);

  try {
    switch (portfolioType) {
      case "equity": {
        const payload = buildEquityPayload(sliderState, crisis);
        const data = (await callPythonAPI("equity", payload)) as EquityResponse;
        return mapEquityToResult(data, startTime);
      }
      case "realestate": {
        const payload = buildRealEstatePayload(sliderState);
        const data = (await callPythonAPI("real-estate", payload)) as RealEstateResponse;
        return mapRealEstateToResult(data, startTime);
      }
      case "college": {
        const payload = buildCollegePayload(sliderState, crisis);
        const data = (await callPythonAPI("college", payload)) as CollegeResponse;
        return mapCollegeToResult(data, startTime);
      }
      case "emergency": {
        const payload = buildEmergencyPayload(sliderState);
        const data = (await callPythonAPI("emergency", payload)) as EmergencyResponse;
        return mapEmergencyToResult(data, startTime);
      }
      case "retirement":
      default: {
        const payload = buildRetirementPayload(sliderState, params.currentAge, crisis);
        const data = (await callPythonAPI("retirement", payload)) as RetirementResponse;
        return mapRetirementToResult(data, startTime);
      }
    }
  } catch (error) {
    console.error("[MC API] Error calling Python backend:", error);
    return {
      p10: [], p50: [], p90: [],
      probabilityOfSuccess: 0,
      fundsLastToAge: 0,
      monthlySustainableWithdrawal: 0,
      computationMs: Date.now() - startTime,
    };
  }
}

// ─── Parameter hash for caching ───────────────────────────────────────────────

export function getMcParamsHash(params: McSimulateParams): string {
  const sorted = JSON.stringify(params, Object.keys(params).sort());
  return crypto.createHash("md5").update(sorted).digest("hex").substring(0, 12);
}

// ─── Default slider states by portfolio type ──────────────────────────────────

export function getDefaultSliderState(
  portfolioType: string,
  profile?: { savings?: number; income?: number; expenses?: number; age?: number }
): Record<string, number> {
  const savings = profile?.savings || 50000;
  const income = profile?.income || 6500;
  const expenses = profile?.expenses || 4000;

  switch (portfolioType) {
    case "retirement":
      return {
        currentAge: profile?.age || 30,
        currentSavings: savings,
        monthlyContribution: Math.round(income * 0.1),
        retirementAge: 65,
        lifeExpectancy: 90,
        expectedReturnMean: 8,
        expectedReturnStd: 15,
        inflation: 3,
        employerMatchPct: 50,
        expectedMonthlyIncome: 5000,
        socialSecurityAge: 67,
        socialSecurityMonthly: 2000,
        stockPct: 60,
        bondPct: 40,
        withdrawalAmountAnnual: Math.round(income * 12 * 0.8),
      };
    case "equity":
      return {
        lumpSum: savings,
        monthlyDca: Math.round(income * 0.1),
        timeHorizonYears: 20,
        expectedReturnMean: 10,
        volatility: 17,
        expenseRatio: 0.20,
      };
    case "realestate":
      return {
        purchasePrice: 400000,
        downPaymentPct: 20,
        interestRate: 6.5,
        monthlyRent: 2500,
        annualAppreciation: 3,
        vacancyRate: 5,
        annualExpenses: 6000,
        holdPeriodYears: 10,
      };
    case "college":
      return {
        childAge: 3,
        collegeStartAge: 18,
        targetCost: 200000,
        currentBalance: 15000,
        monthlyContribution: 500,
        expectedReturnMean: 6,
        volatility: 8,
      };
    case "emergency":
      return {
        monthlyExpenses: expenses,
        targetMonths: 6,
        currentLiquid: Math.round(savings * 0.1),
        monthlyAddition: 500,
        hyRate: 4.5,
        inflation: 3,
      };
    default:
      return {
        currentAge: profile?.age || 30,
        currentSavings: savings,
        monthlyContribution: Math.round(income * 0.1),
        retirementAge: 65,
        lifeExpectancy: 90,
        expectedReturnMean: 8,
        expectedReturnStd: 15,
        inflation: 3,
        employerMatchPct: 50,
        expectedMonthlyIncome: 5000,
        socialSecurityAge: 67,
        socialSecurityMonthly: 2000,
        stockPct: 60,
        bondPct: 40,
        withdrawalAmountAnnual: Math.round(income * 12 * 0.8),
      };
  }
}

// ─── Build McSimulateParams from slider state ─────────────────────────────────

export function buildMcParams(
  sliderState: Record<string, number>,
  portfolioType: string,
  currentAge: number,
  goals: Array<{ year: number; amount: number }> = [],
  crisisOverlay: McSimulateParams["crisisOverlay"] = null,
  nSimulations: number = 50
): McSimulateParams {
  return {
    portfolioType: portfolioType as McSimulateParams["portfolioType"],
    currentSavings: sliderState.currentSavings || sliderState.lumpSum || 50000,
    monthlyContribution: sliderState.monthlyContribution || sliderState.monthlyDca || 1000,
    currentAge,
    retirementAge: sliderState.retirementAge || 65,
    lifeExpectancy: sliderState.lifeExpectancy || 90,
    expectedReturnMean: (sliderState.expectedReturnMean || 7) / 100,
    expectedReturnStd: (sliderState.expectedReturnStd || sliderState.volatility || 12) / 100,
    inflation: (sliderState.inflation || 3) / 100,
    stockPct: (sliderState.stockPct || 60) / 100,
    bondPct: (sliderState.bondPct || 40) / 100,
    withdrawalAmountAnnual: sliderState.withdrawalAmountAnnual || 60000,
    goals,
    nSimulations,
    crisisOverlay,
  };
}
