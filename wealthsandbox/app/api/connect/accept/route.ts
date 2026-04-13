// ─── Connection Accept API ────────────────────────────────────────────────────
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { connectionInvites, advisorClients, users, generateId } from "@/lib/storage";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json({ success: false, error: "Token required" }, { status: 400 });
    }

    const invite = connectionInvites.getByToken(token);
    if (!invite) {
      return NextResponse.json({ success: false, error: "Invalid token" }, { status: 404 });
    }

    if (invite.status !== "pending") {
      return NextResponse.json({ success: false, error: `Invite already ${invite.status}` }, { status: 400 });
    }

    if (new Date(invite.expiresAt) < new Date()) {
      connectionInvites.update(invite.id, { status: "expired" });
      return NextResponse.json({ success: false, error: "Invite expired" }, { status: 400 });
    }

    // Get current user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Please sign in first" }, { status: 401 });
    }

    // Create advisor-client link
    advisorClients.create({
      id: generateId("ac"),
      advisorId: invite.advisorId,
      clientId: user.id,
      connectedAt: new Date().toISOString(),
      permissions: {
        canModifySandbox: false,
        canViewInsights: true,
        canAnnotate: true,
      },
    });

    // Update user's advisorId
    users.update(user.id, { advisorId: invite.advisorId });

    // Update invite status
    connectionInvites.update(invite.id, { status: "accepted" });

    // Get advisor name
    const advisor = users.getById(invite.advisorId);

    return NextResponse.json({
      success: true,
      data: {
        advisorName: advisor ? `${advisor.firstName} ${advisor.lastName}` : "Your advisor",
      },
    });
  } catch (error) {
    console.error("[Accept] Error:", error);
    return NextResponse.json({ success: false, error: "Failed" }, { status: 500 });
  }
}
