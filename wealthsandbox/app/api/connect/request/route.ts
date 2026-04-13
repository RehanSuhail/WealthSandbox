// ─── Connection Request API ───────────────────────────────────────────────────
// Client sends a connection request to the advisor.
// GET  → list pending connection requests (for advisor)
// POST → create a new connection request (from client)
// PATCH → accept or decline a connection request (by advisor)

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { connectionInvites, advisorClients, users, generateId } from "@/lib/storage";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (user.role === "advisor") {
      // Return pending connection requests for this advisor
      const invites = connectionInvites.getByAdvisorId(user.id);
      const pending = invites
        .filter(inv => inv.status === "pending")
        .map(inv => {
          const client = inv.clientEmail ? users.getByEmail(inv.clientEmail) : null;
          const clientUser = inv.clientId
            ? users.getById(inv.clientId)
            : client;
          return {
            id: inv.id,
            clientName: clientUser ? `${clientUser.firstName} ${clientUser.lastName}` : (inv.clientEmail || "Unknown"),
            clientId: clientUser?.id || null,
            requestedAt: inv.createdAt,
          };
        });
      return NextResponse.json({ success: true, data: { requests: pending } });
    }

    // Client: check if they have a pending request
    const allInvites = connectionInvites.getAll();
    const myRequest = allInvites.find(
      inv => inv.clientId === user.id && inv.status === "pending"
    );
    return NextResponse.json({
      success: true,
      data: { hasPendingRequest: !!myRequest },
    });
  } catch (error) {
    console.error("[Connection Requests GET] Error:", error);
    return NextResponse.json({ success: false, error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const advisorId = body.advisorId || "usr_dev_advisor"; // Default to dev advisor

    // Check if already connected
    if (user.advisorId) {
      return NextResponse.json({ success: false, error: "Already connected to an advisor" }, { status: 400 });
    }

    // Check if already has a pending request
    const allInvites = connectionInvites.getAll();
    const existing = allInvites.find(
      inv => inv.clientId === user.id && inv.status === "pending"
    );
    if (existing) {
      return NextResponse.json({ success: false, error: "Request already pending" }, { status: 400 });
    }

    // Create connection request
    const invite = connectionInvites.create({
      id: generateId("inv"),
      advisorId,
      token: generateId("tok"),
      clientEmail: user.email,
      clientId: user.id,
      status: "pending",
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, data: { requestId: invite.id } });
  } catch (error) {
    console.error("[Connection Requests POST] Error:", error);
    return NextResponse.json({ success: false, error: "Failed" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "advisor") {
      return NextResponse.json({ success: false, error: "Advisor only" }, { status: 403 });
    }

    const body = await req.json();
    const { requestId, action } = body; // action: "accept" | "decline"

    if (!requestId || !["accept", "decline"].includes(action)) {
      return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 });
    }

    const allInvites = connectionInvites.getAll();
    const invite = allInvites.find(inv => inv.id === requestId);
    if (!invite || invite.advisorId !== user.id) {
      return NextResponse.json({ success: false, error: "Request not found" }, { status: 404 });
    }

    if (action === "accept") {
      const clientId = invite.clientId;
      if (clientId) {
        // Create advisor-client link
        advisorClients.create({
          id: generateId("ac"),
          advisorId: user.id,
          clientId,
          connectedAt: new Date().toISOString(),
          permissions: { canModifySandbox: false, canViewInsights: true, canAnnotate: true },
        });
        // Update client's advisorId
        users.update(clientId, { advisorId: user.id });
      }
      connectionInvites.update(invite.id, { status: "accepted" });
      return NextResponse.json({ success: true, data: { status: "accepted" } });
    } else {
      connectionInvites.update(invite.id, { status: "declined" });
      return NextResponse.json({ success: true, data: { status: "declined" } });
    }
  } catch (error) {
    console.error("[Connection Requests PATCH] Error:", error);
    return NextResponse.json({ success: false, error: "Failed" }, { status: 500 });
  }
}
