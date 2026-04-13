// ─── Monte Carlo Simulate API ─────────────────────────────────────────────────
// POST: Run Monte Carlo simulation directly

import { NextRequest, NextResponse } from "next/server";
import { simulateMonteCarlo } from "@/lib/monte-carlo";
import type { McSimulateParams } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const params: McSimulateParams = {
      portfolioType: body.portfolioType || "retirement",
      currentSavings: body.currentSavings || 50000,
      monthlyContribution: body.monthlyContribution || 1000,
      currentAge: body.currentAge || 35,
      retirementAge: body.retirementAge || 65,
      lifeExpectancy: body.lifeExpectancy || 90,
      expectedReturnMean: body.expectedReturnMean || 0.07,
      expectedReturnStd: body.expectedReturnStd || 0.12,
      inflation: body.inflation || 0.03,
      stockPct: body.stockPct || 0.60,
      bondPct: body.bondPct || 0.40,
      withdrawalAmountAnnual: body.withdrawalAmountAnnual || 60000,
      goals: body.goals || [],
      nSimulations: body.nSimulations || 500,
      crisisOverlay: body.crisisOverlay || null,
    };

    const result = await simulateMonteCarlo(params);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("[MC Simulate] Error:", error);
    return NextResponse.json({ success: false, error: "Simulation failed" }, { status: 500 });
  }
}
