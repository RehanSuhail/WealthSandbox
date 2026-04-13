// ─── Advisor Deep Analysis API ────────────────────────────────────────────────
// POST: Generate CFP-level deep analysis for a specific client's sandbox
// Advisor-only endpoint providing technical portfolio analysis

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { sandboxes, sessions, users } from "@/lib/storage";
import { generateAdvisorDeepAnalysis } from "@/lib/llm";
import type { SandboxContext } from "@/lib/llm/prompts";

export async function POST(req: NextRequest) {
  try {
    const advisor = await getCurrentUser();
    if (!advisor || advisor.role !== "advisor") {
      return NextResponse.json({ success: false, error: "Advisor access required" }, { status: 403 });
    }

    const body = await req.json();
    const { sandboxId, clientId } = body as { sandboxId: string; clientId?: string };

    if (!sandboxId) {
      return NextResponse.json({ success: false, error: "sandboxId required" }, { status: 400 });
    }

    const sandbox = sandboxes.getById(sandboxId);
    if (!sandbox) {
      return NextResponse.json({ success: false, error: "Sandbox not found" }, { status: 404 });
    }

    // Get client info if available
    let clientName: string | undefined;
    if (clientId) {
      const allUsers = users.getAll();
      const client = allUsers.find((u) => u.id === clientId);
      if (client) {
        clientName = `${client.firstName} ${client.lastName}`.trim();
      }
    }

    const latestSession = sessions.getLatestForSandbox(sandboxId);
    const userId = sandbox.userId;
    const allUsers = users.getAll();
    const owner = allUsers.find((u) => u.id === userId);
    const ownerAge = owner?.profile?.age || 40;
    const retIdx = ((sandbox.sliderState.retirementAge as number) || 65) - ownerAge;

    const context: SandboxContext & { clientName?: string } = {
      portfolioType: sandbox.portfolioType,
      sliderState: sandbox.sliderState as Record<string, number | string>,
      goals: sandbox.goals.map((g) => ({
        label: g.label,
        targetYear: g.targetYear,
        targetAmount: g.targetAmount,
      })),
      simulationResults: {
        p50AtRetirement: latestSession?.chartP50?.[retIdx] || 0,
        probabilityOfSuccess: latestSession?.probSuccess || 0,
        fundsLastToAge: latestSession?.fundsLastToAge || 0,
        monthlySustainableWithdrawal: latestSession?.monthlySustainableWithdrawal || 0,
      },
      stressTests: latestSession?.stressTestsRun.map((st) => ({
        scenario: st.scenario,
        impactPct: st.impactPct,
      })),
      userAge: ownerAge,
      riskLevel: owner?.profile?.riskScore,
      familyStatus: owner?.profile?.familyStatus,
      taxBracket: owner?.profile?.taxBracket,
      netWorth: owner?.profile?.netWorth,
      clientName,
    };

    const analysis = await generateAdvisorDeepAnalysis(context);

    if (!analysis) {
      return NextResponse.json({ success: false, error: "Analysis generation failed" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: analysis,
    });
  } catch (error) {
    console.error("[Deep Analysis] Error:", error);
    return NextResponse.json(
      { success: false, error: "Analysis failed" },
      { status: 500 }
    );
  }
}
