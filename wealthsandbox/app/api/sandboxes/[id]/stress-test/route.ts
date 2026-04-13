// ─── Stress Test API ──────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { sandboxes, sessions } from "@/lib/storage";
import { simulateMonteCarlo, buildMcParams } from "@/lib/monte-carlo";
import { generateStressTestAdvice } from "@/lib/llm";
import type { CrisisOverlay, StressTestResult } from "@/lib/types";

const CRISIS_DEFINITIONS: Record<string, CrisisOverlay> = {
  "2008": {
    scenario: "2008",
    yearlyReturns: [-0.37, -0.05, 0.26, 0.15, 0.02, 0.16],
    description: "2008 Financial Crisis — S&P 500 lost ~50% peak-to-trough",
  },
  "Financial2008": {
    scenario: "Financial2008",
    yearlyReturns: [-0.37, -0.05, 0.26, 0.15],
    description: "2008 Financial Crisis — S&P 500 lost ~37%. Four-year crisis window.",
  },
  "2020_covid": {
    scenario: "2020_covid",
    yearlyReturns: [-0.34, 0.68, 0.27, -0.19, 0.26],
    description: "2020 COVID Crash — 34% drop in 5 weeks, record recovery",
  },
  "Covid2020": {
    scenario: "Covid2020",
    yearlyReturns: [-0.34, 0.68],
    description: "COVID-19 Crash — S&P 500 dropped 34% in 5 weeks. Record rapid recovery.",
  },
  "dotcom_2000": {
    scenario: "dotcom_2000",
    yearlyReturns: [-0.10, -0.13, -0.23, 0.29, 0.11, 0.05, 0.16],
    description: "Dot-com Bust 2000 — NASDAQ fell 78%, 7-year S&P recovery",
  },
  "DotCom2000": {
    scenario: "DotCom2000",
    yearlyReturns: [-0.09, -0.12, -0.22, 0.28],
    description: "Dot-Com Bubble — NASDAQ collapsed, multi-year recovery.",
  },
  "stagflation_1970s": {
    scenario: "stagflation_1970s",
    inflationOverride: 0.09,
    returnOverride: 3,
    duration: 10,
    description: "1970s Stagflation — decade of low returns and high inflation",
  },
  "OilCrisis1973": {
    scenario: "OilCrisis1973",
    yearlyReturns: [-0.15, -0.26, 0.37, 0.23],
    description: "1973 Oil Crisis — Oil embargo + stagflation.",
  },
  "GreatDepression": {
    scenario: "GreatDepression",
    yearlyReturns: [-0.08, -0.25, -0.43, -0.08, 0.54],
    description: "Great Depression — The worst crash in history, 1929 to 1933.",
  },
  "RateShock2022": {
    scenario: "RateShock2022",
    yearlyReturns: [-0.19, 0.24],
    description: "2022 Rate Shock — Aggressive Fed rate hikes. Stocks and bonds both fell.",
  },
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id: sandboxId } = await params;
    const sandbox = sandboxes.getById(sandboxId);
    if (!sandbox) {
      return NextResponse.json({ success: false, error: "Sandbox not found" }, { status: 404 });
    }

    const body = await req.json();
    const { scenario, customParams, scenarioName, scenarioDescription, clientBaseWealth, clientStressedWealth, clientImpactPct, portfolioType: clientPortfolioType, crisisStartYear } = body;

    // Get crisis overlay
    let crisisOverlay: CrisisOverlay;
    if (scenario === "custom" && customParams) {
      crisisOverlay = {
        scenario: "custom",
        drawdownPct: customParams.drawdownPct || 30,
        recoveryYears: customParams.recoveryYears || 4,
        description: `Custom Scenario — ${customParams.drawdownPct}% drawdown, ${customParams.recoveryYears}yr recovery`,
      };
    } else {
      crisisOverlay = CRISIS_DEFINITIONS[scenario];
      if (!crisisOverlay) {
        return NextResponse.json({ success: false, error: "Invalid scenario" }, { status: 400 });
      }
    }

    // Use more descriptive scenario name/description from frontend if available
    const effectiveScenarioName = scenarioName || crisisOverlay.scenario;
    const effectiveDescription = scenarioDescription || crisisOverlay.description;

    const age = user.profile?.age || 35;
    const sliderState = sandbox.sliderState as Record<string, number>;
    const pType = clientPortfolioType || sandbox.portfolioType;
    const mcGoals = (sandbox.goals || []).map((g) => ({
      year: g.targetYear - new Date().getFullYear() + age,
      amount: g.targetAmount,
    }));

    // Run with crisis
    const stressedParams = buildMcParams(sliderState, sandbox.portfolioType, age, mcGoals, crisisOverlay);
    const stressedResult = await simulateMonteCarlo(stressedParams);

    // Run baseline (no crisis)
    const baselineParams = buildMcParams(sliderState, sandbox.portfolioType, age, mcGoals, null);
    const baselineResult = await simulateMonteCarlo(baselineParams);

    // Calculate impact — prefer client-provided values (they used the Python MC), fallback to local MC
    const retIdx = (sliderState.retirementAge || 65) - age;
    const baseWealth = typeof clientBaseWealth === "number" ? clientBaseWealth : (baselineResult.p50[retIdx] || 0);
    const stressedWealth = typeof clientStressedWealth === "number" ? clientStressedWealth : (stressedResult.p50[retIdx] || 0);
    const impactPct = typeof clientImpactPct === "number" ? clientImpactPct : (baseWealth > 0 ? Math.round(((baseWealth - stressedWealth) / baseWealth) * 100) : 0);

    // AI-generated recovery actions
    let recoveryActions: string[] = [];
    try {
      recoveryActions = await generateStressTestAdvice({
        portfolioType: pType,
        scenarioName: effectiveScenarioName,
        scenarioDescription: effectiveDescription,
        currentAge: age,
        retirementAge: sliderState.retirementAge || 65,
        currentSavings: sliderState.currentSavings || sliderState.lumpSum || sliderState.currentBalance || sliderState.currentLiquid || 0,
        monthlyContribution: sliderState.monthlyContribution || sliderState.monthlyDca || sliderState.monthlyAddition || 1000,
        stockPct: sliderState.stockPct || 70,
        baseWealth,
        stressedWealth,
        impactPct,
        riskLevel: user.profile?.riskScore,
      });
    } catch (e) {
      console.error("[Stress Test] AI advice failed, using fallback:", e);
    }

    // Fallback if AI returned nothing — make it crisis-specific
    if (!recoveryActions.length) {
      const monthlyStr = `$${(sliderState.monthlyContribution || sliderState.monthlyDca || sliderState.monthlyAddition || 1000).toLocaleString()}`;
      const lostStr = `$${(baseWealth - stressedWealth).toLocaleString()}`;
      const scenarioLabel = effectiveScenarioName || crisisOverlay.scenario;
      recoveryActions = [
        `During the ${scenarioLabel}, maintaining your ${monthlyStr}/mo contributions through the downturn would have allowed you to buy at lower prices, accelerating recovery via dollar-cost averaging.`,
        impactPct > 25
          ? `With a −${impactPct}% impact, reducing your stock allocation from ${sliderState.stockPct || 70}% to a more balanced mix before the crisis would have significantly cushioned the ${lostStr} loss.`
          : `Your ${sliderState.stockPct || 70}% stock allocation experienced a −${impactPct}% hit — consider a glide-path approach that gradually reduces equity exposure as you near your target date.`,
        age > 50
          ? `At age ${age}, being closer to retirement means less time to recover from the ${scenarioLabel}. Having 2-3 years of expenses in cash or short-term bonds would have avoided forced selling at depressed prices.`
          : `At age ${age} with ${(sliderState.retirementAge || 65) - age} years until retirement, time is on your side — staying fully invested through the ${scenarioLabel} recovery phase would have recaptured most losses.`,
        `Building a cash buffer of 6-12 months of living expenses before the ${scenarioLabel} hit would have prevented the need to liquidate investments at their lowest point.`,
        `Diversifying across asset classes with low correlation to stocks (such as bonds, real assets, and international markets) would have reduced the concentrated impact of the ${scenarioLabel} on your portfolio.`,
      ];
    }

    // Save to latest session
    const latestSession = sessions.getLatestForSandbox(sandboxId);
    if (latestSession) {
      const stressResult: StressTestResult = {
        scenario: crisisOverlay.scenario,
        description: crisisOverlay.description,
        baseWealth,
        stressedWealth,
        impactPct,
        recoveryActions,
        runAt: new Date().toISOString(),
      };

      sessions.update(latestSession.id, {
        stressTestsRun: [...latestSession.stressTestsRun, stressResult],
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        scenario: crisisOverlay.scenario,
        description: crisisOverlay.description,
        baseline: {
          p10: baselineResult.p10,
          p50: baselineResult.p50,
          p90: baselineResult.p90,
          wealthAtRetirement: baseWealth,
          probSuccess: baselineResult.probabilityOfSuccess,
        },
        stressed: {
          p10: stressedResult.p10,
          p50: stressedResult.p50,
          p90: stressedResult.p90,
          wealthAtRetirement: stressedWealth,
          probSuccess: stressedResult.probabilityOfSuccess,
        },
        impact: {
          wealthLost: baseWealth - stressedWealth,
          impactPct,
          recoveryActions,
        },
      },
    });
  } catch (error) {
    console.error("[Stress Test] Error:", error);
    return NextResponse.json({ success: false, error: "Stress test failed" }, { status: 500 });
  }
}
