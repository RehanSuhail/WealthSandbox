// ─── Portfolio Health Score API ────────────────────────────────────────────────
// GET: Compute portfolio health score for a specific sandbox
// Uses LLM when available, falls back to deterministic scoring

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { sandboxes, sessions } from "@/lib/storage";
import { generatePortfolioHealthScore } from "@/lib/llm";
import type { SandboxContext } from "@/lib/llm/prompts";

export async function GET(
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

    const latestSession = sessions.getLatestForSandbox(sandboxId);
    if (!latestSession) {
      return NextResponse.json({
        success: true,
        data: {
          score: 0,
          grade: "F",
          label: "No Data",
          breakdown: { successRate: 0, fundsLongevity: 0, withdrawalSustainability: 0, goalAlignment: 0 },
          primaryStrength: "N/A",
          primaryWeakness: "Run a simulation to generate your health score",
          nextBestAction: "Run your first simulation",
          computedAt: new Date().toISOString(),
        },
      });
    }

    const retIdx = ((sandbox.sliderState.retirementAge as number) || 65) - (user.profile?.age || 35);

    const context: SandboxContext = {
      portfolioType: sandbox.portfolioType,
      sliderState: sandbox.sliderState as Record<string, number | string>,
      goals: sandbox.goals.map((g) => ({
        label: g.label,
        targetYear: g.targetYear,
        targetAmount: g.targetAmount,
      })),
      simulationResults: {
        p50AtRetirement: latestSession.chartP50?.[retIdx] || 0,
        probabilityOfSuccess: latestSession.probSuccess || 0,
        fundsLastToAge: latestSession.fundsLastToAge || 0,
        monthlySustainableWithdrawal: latestSession.monthlySustainableWithdrawal || 0,
      },
      userAge: user.profile?.age,
      riskLevel: user.profile?.riskScore,
      familyStatus: user.profile?.familyStatus,
      taxBracket: user.profile?.taxBracket,
    };

    const healthScore = await generatePortfolioHealthScore(context);

    // Persist to sandbox so it survives page reloads
    sandboxes.update(sandboxId, {
      healthScore,
      lastAnalyzedAt: new Date().toISOString(),
    } as Partial<import("@/lib/types").Sandbox>);

    return NextResponse.json({
      success: true,
      data: healthScore,
    });
  } catch (error) {
    console.error("[Health Score] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to compute health score" },
      { status: 500 }
    );
  }
}
