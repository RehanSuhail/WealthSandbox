// ─── Sessions API ─────────────────────────────────────────────────────────────
// GET: List sessions for a sandbox
// POST: Save current state as a new session

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { sandboxes, sessions, generateId, cache, CacheKeys } from "@/lib/storage";
import { simulateMonteCarlo, buildMcParams, getMcParamsHash } from "@/lib/monte-carlo";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const sandboxSessions = sessions.getBySandboxId(id);

    // Return lightweight list (no chart arrays)
    const list = sandboxSessions.map((s) => ({
      id: s.id,
      name: s.name,
      sessionType: s.sessionType,
      createdAt: s.createdAt,
      probSuccess: s.probSuccess,
      fundsLastToAge: s.fundsLastToAge,
      stressTestCount: s.stressTestsRun.length,
      sliderSummary: summarizeSliders(s.sliderState),
    }));

    return NextResponse.json({ success: true, data: list });
  } catch (error) {
    console.error("[Sessions GET] Error:", error);
    return NextResponse.json({ success: false, error: "Failed" }, { status: 500 });
  }
}

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
    if (!sandbox || sandbox.userId !== user.id) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const { name, sessionType } = body;

    // Get MC result from cache or compute fresh
    const age = user.profile?.age || 35;
    const sliderState = sandbox.sliderState as Record<string, number>;
    const mcGoals = (sandbox.goals || []).map((g) => ({
      year: g.targetYear - new Date().getFullYear() + age,
      amount: g.targetAmount,
    }));

    const mcParams = buildMcParams(sliderState, sandbox.portfolioType, age, mcGoals);
    const paramsHash = getMcParamsHash(mcParams);
    const cacheKey = CacheKeys.mcResult(sandboxId, paramsHash);
    const cached = cache.get(cacheKey);

    let mcResult;
    if (cached) {
      mcResult = JSON.parse(cached);
    } else {
      mcResult = await simulateMonteCarlo(mcParams);
      cache.set(cacheKey, JSON.stringify(mcResult), 1800);
    }

    const sessionId = generateId("sess");
    const session = sessions.create({
      id: sessionId,
      sandboxId,
      userId: user.id,
      name: name || `Session — ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`,
      sessionType: sessionType || "manual",
      sliderState: sandbox.sliderState,
      goals: sandbox.goals,
      chartP10: mcResult.p10,
      chartP50: mcResult.p50,
      chartP90: mcResult.p90,
      probSuccess: mcResult.probabilityOfSuccess,
      fundsLastToAge: mcResult.fundsLastToAge,
      monthlySustainableWithdrawal: mcResult.monthlySustainableWithdrawal,
      stressTestsRun: [],
      chatExcerpts: [],
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, data: session });
  } catch (error) {
    console.error("[Sessions POST] Error:", error);
    return NextResponse.json({ success: false, error: "Failed" }, { status: 500 });
  }
}

function summarizeSliders(state: Record<string, unknown>): string {
  const parts: string[] = [];
  if (state.monthlyContribution) parts.push(`Monthly: $${Number(state.monthlyContribution).toLocaleString()}`);
  if (state.retirementAge) parts.push(`Retire: ${state.retirementAge}`);
  if (state.stockPct) parts.push(`Stocks: ${state.stockPct}%`);
  return parts.join(" · ") || "Default settings";
}
