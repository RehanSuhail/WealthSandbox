// ─── Sandbox Duplicate API ────────────────────────────────────────────────────
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { sandboxes, sessions, insights, generateId } from "@/lib/storage";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const original = sandboxes.getById(id);
    if (!original) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    // Use latest session's slider state if available, otherwise fall back to sandbox state
    const latestSession = sessions.getLatestForSandbox(id);
    const sliderState = latestSession?.sliderState ?? original.sliderState;
    const goals = latestSession?.goals ?? original.goals;

    const newSandboxId = generateId("sb");
    const newSandbox = sandboxes.create({
      id: newSandboxId,
      userId: user.id,
      name: `${original.name} — Copy`,
      portfolioType: original.portfolioType,
      sliderState: { ...sliderState },
      goals: [...goals],
      sharedWithAdvisor: false,
      advisorNotes: [...(original.advisorNotes || [])],
      sourceSandboxId: original.id,
      archived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Copy latest session data so the clone starts with full chart data
    if (latestSession) {
      sessions.create({
        id: generateId("sess"),
        sandboxId: newSandboxId,
        userId: user.id,
        name: `Cloned session from ${original.name}`,
        sessionType: "auto",
        sliderState: { ...latestSession.sliderState },
        goals: [...latestSession.goals],
        chartP10: [...latestSession.chartP10],
        chartP50: [...latestSession.chartP50],
        chartP90: [...latestSession.chartP90],
        probSuccess: latestSession.probSuccess,
        fundsLastToAge: latestSession.fundsLastToAge,
        monthlySustainableWithdrawal: latestSession.monthlySustainableWithdrawal,
        stressTestsRun: [],
        chatExcerpts: [],
        createdAt: new Date().toISOString(),
      });
    }

    // Copy client-scope insights from the original sandbox
    const originalInsights = insights.getBySandboxId(id);
    if (originalInsights.length > 0) {
      const copiedInsights = originalInsights.map(ins => ({
        ...ins,
        id: generateId("ins"),
        sandboxId: newSandboxId,
        userId: user.id,
        sentToAdvisor: false,
        sentToAdvisorAt: null,
        advisorNote: null,
        createdAt: new Date().toISOString(),
      }));
      insights.createMany(copiedInsights);
    }

    return NextResponse.json({ success: true, data: newSandbox });
  } catch (error) {
    console.error("[Duplicate] Error:", error);
    return NextResponse.json({ success: false, error: "Failed" }, { status: 500 });
  }
}
