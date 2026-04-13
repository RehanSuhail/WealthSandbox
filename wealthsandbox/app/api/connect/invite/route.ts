// ─── Connection Invite API ────────────────────────────────────────────────────
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { connectionInvites, generateId } from "@/lib/storage";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "advisor") {
      return NextResponse.json({ success: false, error: "Advisors only" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const token = crypto.randomBytes(32).toString("hex");
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

    const invite = connectionInvites.create({
      id: generateId("inv"),
      advisorId: user.id,
      token,
      clientEmail: body.clientEmail || null,
      status: "pending",
      expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(), // 72h
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      data: {
        token,
        inviteUrl: `${baseUrl}/connect/accept/${token}`,
        expiresAt: invite.expiresAt,
      },
    });
  } catch (error) {
    console.error("[Invite] Error:", error);
    return NextResponse.json({ success: false, error: "Failed" }, { status: 500 });
  }
}
