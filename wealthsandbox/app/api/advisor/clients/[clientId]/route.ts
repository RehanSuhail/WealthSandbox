// ─── Advisor Client [id] API ──────────────────────────────────────────────────
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { users, sandboxes, insights, advisorClients } from "@/lib/storage";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "advisor") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { clientId } = await params;

    // Verify link exists
    const link = advisorClients.getLink(user.id, clientId);
    if (!link) {
      return NextResponse.json({ success: false, error: "Not linked" }, { status: 404 });
    }

    // Remove the advisor-client link
    advisorClients.removeLink(user.id, clientId);

    // Clear advisorId on the client's user record
    users.update(clientId, { advisorId: null });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Advisor Client DELETE] Error:", error);
    return NextResponse.json({ success: false, error: "Failed" }, { status: 500 });
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "advisor") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { clientId } = await params;

    // Verify link exists
    const link = advisorClients.getLink(user.id, clientId);
    if (!link) {
      return NextResponse.json({ success: false, error: "Not linked" }, { status: 403 });
    }

    const client = users.getById(clientId);
    if (!client) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    const clientSandboxes = sandboxes.getByUserId(clientId);
    const clientInsights = insights.getByUserId(clientId).filter((i) => i.sentToAdvisor);

    return NextResponse.json({
      success: true,
      data: {
        client: {
          id: client.id,
          firstName: client.firstName,
          lastName: client.lastName,
          email: client.email,
          profile: client.profile,
          onboardingComplete: client.onboardingComplete,
        },
        sandboxes: clientSandboxes,
        insights: clientInsights,
      },
    });
  } catch (error) {
    console.error("[Advisor Client] Error:", error);
    return NextResponse.json({ success: false, error: "Failed" }, { status: 500 });
  }
}
