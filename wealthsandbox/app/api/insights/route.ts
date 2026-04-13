// ─── Global Insights Feed API ─────────────────────────────────────────────────
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { insights } from "@/lib/storage";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const priority = url.searchParams.get("priority");
    const category = url.searchParams.get("category");
    const status = url.searchParams.get("status");
    const scope = url.searchParams.get("scope");
    const userId = url.searchParams.get("userId");

    // If userId is provided (advisor viewing client insights), use that user's insights
    const targetUserId = userId || user.id;

    let userInsights = insights.getByUserId(
      targetUserId,
      // For advisor viewing client: show insights sent to advisor
      // For client viewing own: show client-scope only
      userId ? undefined : (user.role !== "advisor" ? "client" : undefined)
    );

    // If advisor is viewing a client, only show insights that were shared (sentToAdvisor)
    if (userId && user.role === "advisor") {
      userInsights = userInsights.filter((i) => i.sentToAdvisor || i.scope === "advisor");
    }

    if (priority) userInsights = userInsights.filter((i) => i.priority === priority);
    if (category) userInsights = userInsights.filter((i) => i.category === category);
    if (status) userInsights = userInsights.filter((i) => i.status === status);
    if (scope) userInsights = userInsights.filter((i) => i.scope === scope);

    return NextResponse.json({ success: true, data: userInsights });
  } catch (error) {
    console.error("[Insights Feed] Error:", error);
    return NextResponse.json({ success: false, error: "Failed" }, { status: 500 });
  }
}
