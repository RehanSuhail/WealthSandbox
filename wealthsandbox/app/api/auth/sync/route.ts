// ─── Auth Sync API ────────────────────────────────────────────────────────────
// Returns the current dev user from cookie-based auth.

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { users, sandboxes, advisorClients } from "@/lib/storage";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }
    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    console.error("[Auth Sync] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - update user profile fields
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json();

    // Merge updates into existing user
    const updates: Record<string, unknown> = {};
    if (body.firstName !== undefined) updates.firstName = body.firstName;
    if (body.lastName !== undefined) updates.lastName = body.lastName;
    if (body.email !== undefined) updates.email = body.email;
    if (body.phone !== undefined) updates.phone = body.phone;
    if (body.dob !== undefined) updates.dob = body.dob;
    if (body.state !== undefined) updates.state = body.state;
    if (body.familyStatus !== undefined) updates.familyStatus = body.familyStatus;
    if (body.dependents !== undefined) updates.dependents = body.dependents;
    if (body.role !== undefined) updates.role = body.role;
    if (body.onboardingComplete !== undefined) updates.onboardingComplete = body.onboardingComplete;

    // Financial data — merge with existing
    if (body.financial) {
      const existing = (user as any).financial || {};
      updates.financial = { ...existing, ...body.financial };
    }

    // Advisor data — merge with existing
    if (body.advisorData) {
      const existing = (user as any).advisorData || {};
      updates.advisorData = { ...existing, ...body.advisorData };
    }

    const updated = users.update(user.id, updates as any);

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("[Auth Sync POST] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - permanently delete the current user and all their data
export async function DELETE() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    const userId = user.id;

    // Archive all user's sandboxes
    const userSandboxes = sandboxes.getByUserId(userId);
    for (const sb of userSandboxes) {
      sandboxes.delete(sb.id); // sets archived: true
    }

    // Clean up advisor-client connections
    // If this user is a client, clear their advisor link
    if (user.advisorId) {
      advisorClients.removeLink(user.advisorId, userId);
    }
    // If this user is an advisor, clear advisorId on all connected clients
    const linkedClients = advisorClients.getByAdvisorId(userId);
    for (const link of linkedClients) {
      users.update(link.clientId, { advisorId: null });
    }
    // Remove all advisor-client links involving this user
    advisorClients.removeByUserId(userId);

    // Mark user as deleted (soft delete)
    users.update(userId, {
      email: `deleted_${Date.now()}@deleted.local`,
      firstName: "Deleted",
      lastName: "User",
      archived: true,
    } as Partial<typeof user>);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Auth Sync DELETE] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}