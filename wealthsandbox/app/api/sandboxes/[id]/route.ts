// ─── Sandbox [id] API ─────────────────────────────────────────────────────────
// GET: Get single sandbox with latest session
// PATCH: Update sandbox (sliders, goals, name)
// DELETE: Archive sandbox (soft delete)

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { sandboxes, sessions, insights, generateId, cache, CacheKeys } from "@/lib/storage";
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
    const sandbox = sandboxes.getById(id);
    if (!sandbox) {
      return NextResponse.json({ success: false, error: "Sandbox not found" }, { status: 404 });
    }

    // Verify access (owner or connected advisor)
    if (sandbox.userId !== user.id) {
      // TODO: check advisor access
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const latestSession = sessions.getLatestForSandbox(id);
    const allSessions = sessions.getBySandboxId(id);

    return NextResponse.json({
      success: true,
      data: {
        ...sandbox,
        latestSession,
        sessionCount: allSessions.length,
      },
    });
  } catch (error) {
    console.error("[Sandbox GET] Error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const sandbox = sandboxes.getById(id);
    if (!sandbox || sandbox.userId !== user.id) {
      return NextResponse.json({ success: false, error: "Not found or forbidden" }, { status: 404 });
    }

    const body = await req.json();
    const { name, sliderState, goals, sharedWithAdvisor } = body;

    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (goals !== undefined) updates.goals = goals;
    if (sliderState !== undefined) updates.sliderState = sliderState;
    // One-way sharing: once shared, stays shared permanently
    if (sharedWithAdvisor === true) {
      updates.sharedWithAdvisor = true;
      // Auto-share all insights for this sandbox
      const sbInsights = insights.getBySandboxId(id);
      for (const ins of sbInsights) {
        if (!ins.sentToAdvisor) {
          insights.update(ins.id, { sentToAdvisor: true, sentToAdvisorAt: new Date().toISOString() });
        }
      }
    }

    const updated = sandboxes.update(id, updates as Partial<typeof sandbox>);

    // If slider state changed, run new MC simulation
    if (sliderState) {
      const age = user.profile?.age || 35;
      const mcGoals = (goals || sandbox.goals || []).map((g: { targetYear: number; targetAmount: number }) => ({
        year: g.targetYear - new Date().getFullYear() + age,
        amount: g.targetAmount,
      }));

      const mcParams = buildMcParams(
        sliderState as Record<string, number>,
        sandbox.portfolioType,
        age,
        mcGoals
      );

      // Check cache
      const paramsHash = getMcParamsHash(mcParams);
      const cacheKey = CacheKeys.mcResult(id, paramsHash);
      const cached = cache.get(cacheKey);

      let mcResult;
      if (cached) {
        mcResult = JSON.parse(cached);
      } else {
        mcResult = await simulateMonteCarlo(mcParams);
        cache.set(cacheKey, JSON.stringify(mcResult), 1800); // 30 min TTL
      }

      // Create new session
      const sessionId = generateId("sess");
      sessions.create({
        id: sessionId,
        sandboxId: id,
        userId: user.id,
        name: `Session — ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`,
        sessionType: "auto",
        sliderState,
        goals: goals || sandbox.goals,
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
        data: {
          sandbox: updated,
          latestSession: {
            chartP10: mcResult.p10,
            chartP50: mcResult.p50,
            chartP90: mcResult.p90,
            probSuccess: mcResult.probabilityOfSuccess,
            fundsLastToAge: mcResult.fundsLastToAge,
            monthlySustainableWithdrawal: mcResult.monthlySustainableWithdrawal,
          },
          sessionId,
        },
      });
    }

    return NextResponse.json({ success: true, data: { sandbox: updated } });
  } catch (error) {
    console.error("[Sandbox PATCH] Error:", error);
    return NextResponse.json({ success: false, error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const sandbox = sandboxes.getById(id);
    if (!sandbox || sandbox.userId !== user.id) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    sandboxes.delete(id);
    cache.del(CacheKeys.sandboxState(id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Sandbox DELETE] Error:", error);
    return NextResponse.json({ success: false, error: "Delete failed" }, { status: 500 });
  }
}
