// ─── Session [sessionId] API ──────────────────────────────────────────────────
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { sessions } from "@/lib/storage";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { sessionId } = await params;
    const session = sessions.getById(sessionId);
    if (!session || session.userId !== user.id) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: session });
  } catch (error) {
    console.error("[Session GET] Error:", error);
    return NextResponse.json({ success: false, error: "Failed" }, { status: 500 });
  }
}
