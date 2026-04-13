// ─── Connection Status API ────────────────────────────────────────────────────
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { users } from "@/lib/storage";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (user.advisorId) {
      const advisor = users.getById(user.advisorId);
      return NextResponse.json({
        success: true,
        data: {
          connected: true,
          advisor: advisor
            ? { id: advisor.id, firstName: advisor.firstName, lastName: advisor.lastName, email: advisor.email }
            : null,
          advisorName: advisor ? `${advisor.firstName} ${advisor.lastName}` : null,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: { connected: false },
    });
  } catch (error) {
    console.error("[Status] Error:", error);
    return NextResponse.json({ success: false, error: "Failed" }, { status: 500 });
  }
}
