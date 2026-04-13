// ─── Role Switch API ──────────────────────────────────────────────────────────
// GET  → returns current user's role
// POST → switches role between "client" and "advisor"

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { users } from "@/lib/storage";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }
    return NextResponse.json({ success: true, data: { role: user.role, userId: user.id, name: `${user.firstName} ${user.lastName}` } });
  } catch (error) {
    console.error("[Auth Role GET] Error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json();
    const newRole = body.role as "client" | "advisor";

    if (!["client", "advisor"].includes(newRole)) {
      return NextResponse.json({ success: false, error: "Invalid role. Must be 'client' or 'advisor'." }, { status: 400 });
    }

    const updated = users.upsertByClerkId(user.clerkId, {
      ...user,
      role: newRole,
    });

    return NextResponse.json({ success: true, data: { role: updated.role, userId: updated.id, name: `${updated.firstName} ${updated.lastName}` } });
  } catch (error) {
    console.error("[Auth Role POST] Error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
