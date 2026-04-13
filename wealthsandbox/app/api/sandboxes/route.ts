// ─── Sandboxes API ────────────────────────────────────────────────────────────
// GET: List all sandboxes for current user
// POST: Create a new sandbox

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  sandboxes,
  sessions,
  generateId,
} from "@/lib/storage";
import {
  simulateMonteCarlo,
  getDefaultSliderState,
  buildMcParams,
} from "@/lib/monte-carlo";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // If clientId is provided (advisor viewing a client's sandboxes), return that client's sandboxes
    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId") || searchParams.get("userId");
    const targetUserId = clientId || user.id;

    const userSandboxes = sandboxes.getByUserId(targetUserId);

    // If advisor is viewing a client, only show shared sandboxes
    const filtered = clientId
      ? userSandboxes.filter((sb) => sb.sharedWithAdvisor)
      : userSandboxes;

    // Add session count
    const withCounts = filtered.map((sb) => ({
      ...sb,
      sessionCount: sessions.getBySandboxId(sb.id).length,
      latestSession: sessions.getLatestForSandbox(sb.id),
    }));

    return NextResponse.json({ success: true, data: withCounts });
  } catch (error) {
    console.error("[Sandboxes GET] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, portfolioType, sliderState: customSliders, goals } = body;

    const sliderState =
      customSliders || getDefaultSliderState(portfolioType, {
        savings: user.profile?.savings,
        income: user.profile?.income,
        expenses: user.profile?.expenses,
        age: user.profile?.age,
      });

    const sandboxId = generateId("sb");
    const sandbox = sandboxes.create({
      id: sandboxId,
      userId: user.id,
      name: name || `${portfolioType} — ${new Date().toLocaleDateString()}`,
      portfolioType: portfolioType || "retirement",
      sliderState,
      goals: goals || [],
      sharedWithAdvisor: false,
      advisorNotes: [],
      archived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Run MC simulation
    const age = user.profile?.age || 35;
    const mcGoals = (goals || []).map((g: { targetYear: number; targetAmount: number }) => ({
      year: g.targetYear - new Date().getFullYear() + age,
      amount: g.targetAmount,
    }));

    const mcParams = buildMcParams(
      sliderState as Record<string, number>,
      portfolioType || "retirement",
      age,
      mcGoals
    );
    const mcResult = await simulateMonteCarlo(mcParams);

    // Create first session
    const sessionId = generateId("sess");
    const session = sessions.create({
      id: sessionId,
      sandboxId,
      userId: user.id,
      name: `Session — ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`,
      sessionType: "auto",
      sliderState,
      goals: goals || [],
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

    return NextResponse.json({
      success: true,
      data: { sandbox, session },
    });
  } catch (error) {
    console.error("[Sandboxes POST] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create sandbox" },
      { status: 500 }
    );
  }
}
