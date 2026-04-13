// ─── Client Disconnect API ────────────────────────────────────────────────────
// Called by a client to disconnect from their advisor.

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { users, advisorClients } from "@/lib/storage";

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    if (!user.advisorId) {
      return NextResponse.json({ success: false, error: "No advisor connected" }, { status: 400 });
    }

    const advisorId = user.advisorId;

    // Remove the advisor-client link record
    advisorClients.removeLink(advisorId, user.id);

    // Clear advisorId on the client's user record
    users.update(user.id, { advisorId: null });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Connect Disconnect] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
