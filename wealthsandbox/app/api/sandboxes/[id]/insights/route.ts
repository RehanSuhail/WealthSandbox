// ─── Sandbox Insights API ─────────────────────────────────────────────────────
// GET: List insights for a sandbox
// POST: Generate new AI insights

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { sandboxes, sessions, insights, generateId } from "@/lib/storage";
import { generateCombinedInsights } from "@/lib/llm";
import type { SandboxContext } from "@/lib/llm/prompts";
import type { Insight } from "@/lib/types";

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
    const url = new URL(req.url);
    const scope = url.searchParams.get("scope");
    const priority = url.searchParams.get("priority");
    const status = url.searchParams.get("status");

    let sandboxInsights = insights.getBySandboxId(id);

    // Clients only see client-scope insights
    if (user.role !== "advisor") {
      sandboxInsights = sandboxInsights.filter((i) => i.scope === "client");
    }

    if (scope) sandboxInsights = sandboxInsights.filter((i) => i.scope === scope);
    if (priority) sandboxInsights = sandboxInsights.filter((i) => i.priority === priority);
    if (status) sandboxInsights = sandboxInsights.filter((i) => i.status === status);

    return NextResponse.json({ success: true, data: sandboxInsights });
  } catch (error) {
    console.error("[Insights GET] Error:", error);
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
    if (!sandbox) {
      return NextResponse.json({ success: false, error: "Sandbox not found" }, { status: 404 });
    }

    // Get latest session for simulation results
    const latestSession = sessions.getLatestForSandbox(sandboxId);

    // Build context for LLM
    const context: SandboxContext = {
      portfolioType: sandbox.portfolioType,
      sliderState: sandbox.sliderState as Record<string, number | string>,
      goals: sandbox.goals.map((g) => ({
        label: g.label,
        targetYear: g.targetYear,
        targetAmount: g.targetAmount,
      })),
      simulationResults: {
        p50AtRetirement: latestSession?.chartP50?.[
          (sandbox.sliderState.retirementAge as number || 65) - (user.profile?.age || 35)
        ] || 0,
        probabilityOfSuccess: latestSession?.probSuccess || 0,
        fundsLastToAge: latestSession?.fundsLastToAge || 0,
        monthlySustainableWithdrawal: latestSession?.monthlySustainableWithdrawal || 0,
      },
      userAge: user.profile?.age,
      riskLevel: user.profile?.riskScore,
    };

    // Generate insights in a single API call (both client + advisor)
    const { client: clientInsightsRaw, advisor: advisorInsightsRaw } =
      await generateCombinedInsights(context);

    const sessionId = latestSession?.id || "";
    const now = new Date().toISOString();

    // Save client insights
    const clientInsights: Insight[] = clientInsightsRaw.map((raw) => ({
      id: generateId("ins"),
      sessionId,
      sandboxId,
      userId: user.id,
      scope: "client" as const,
      category: raw.category,
      priority: raw.priority,
      title: raw.title,
      body: "body" in raw ? raw.body : "",
      suggestedAction: "suggestedAction" in raw ? raw.suggestedAction : "",
      technicalAnalysis: undefined,
      recoveryActions: undefined,
      reviewFlag: undefined,
      status: "active" as const,
      sentToAdvisor: false,
      sentToAdvisorAt: null,
      advisorNote: null,
      createdAt: now,
    }));

    const advisorInsights: Insight[] = advisorInsightsRaw.map((raw) => ({
      id: generateId("ins"),
      sessionId,
      sandboxId,
      userId: user.id,
      scope: "advisor" as const,
      category: raw.category,
      priority: raw.priority,
      title: raw.title,
      body: "",
      suggestedAction: "",
      technicalAnalysis: "technicalAnalysis" in raw ? raw.technicalAnalysis : "",
      recoveryActions: "recoveryActions" in raw ? raw.recoveryActions : [],
      reviewFlag: "reviewFlag" in raw ? raw.reviewFlag : false,
      status: "active" as const,
      sentToAdvisor: false,
      sentToAdvisorAt: null,
      advisorNote: null,
      createdAt: now,
    }));

    insights.createMany([...clientInsights, ...advisorInsights]);

    return NextResponse.json({
      success: true,
      data: {
        clientInsights,
        advisorInsights: user.role === "advisor" ? advisorInsights : undefined,
      },
    });
  } catch (error) {
    console.error("[Insights POST] Error:", error);
    return NextResponse.json({ success: false, error: "Failed to generate insights" }, { status: 500 });
  }
}
