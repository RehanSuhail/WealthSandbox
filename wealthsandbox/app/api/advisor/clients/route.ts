// ─── Advisor Clients API ──────────────────────────────────────────────────────
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { advisorClients, users, sandboxes, insights } from "@/lib/storage";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "advisor") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const links = advisorClients.getByAdvisorId(user.id);
    const clients = links.map((link) => {
      const client = users.getById(link.clientId);
      if (!client) return null;

      const clientSandboxes = sandboxes.getByUserId(client.id);
      const clientInsights = insights.getByUserId(client.id);
      const pendingInsights = clientInsights.filter(
        (i) => i.sentToAdvisor && !i.advisorNote
      );

      return {
        id: client.id,
        firstName: client.firstName,
        lastName: client.lastName,
        email: client.email,
        onboardingComplete: client.onboardingComplete,
        sandboxCount: clientSandboxes.length,
        lastActivity: client.updatedAt,
        pendingInsightsCount: pendingInsights.length,
        connectedAt: link.connectedAt,
      };
    }).filter(Boolean);

    return NextResponse.json({ success: true, data: clients });
  } catch (error) {
    console.error("[Advisor Clients] Error:", error);
    return NextResponse.json({ success: false, error: "Failed" }, { status: 500 });
  }
}
