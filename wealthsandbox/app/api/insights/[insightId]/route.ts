// ─── Insight [id] API ─────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { insights } from "@/lib/storage";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ insightId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { insightId } = await params;
    const insight = insights.getById(insightId);
    if (!insight || insight.userId !== user.id) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    const body = await req.json();
    const updates: Record<string, unknown> = {};

    if (body.status !== undefined) updates.status = body.status;
    if (body.sentToAdvisor !== undefined) {
      updates.sentToAdvisor = body.sentToAdvisor;
      if (body.sentToAdvisor) {
        updates.sentToAdvisorAt = new Date().toISOString();
        updates.status = "sent_to_advisor";
      }
    }
    if (body.advisorNote !== undefined) updates.advisorNote = body.advisorNote;

    const updated = insights.update(insightId, updates as Partial<typeof insight>);
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("[Insight PATCH] Error:", error);
    return NextResponse.json({ success: false, error: "Failed" }, { status: 500 });
  }
}
