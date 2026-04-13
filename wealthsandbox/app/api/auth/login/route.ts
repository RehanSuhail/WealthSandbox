// ─── Dev Login API ────────────────────────────────────────────────────────────
// POST { role, clientId? } → sets cookies and returns user
// GET → returns current logged-in user

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/auth";
import { users } from "@/lib/storage";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const role = body.role as string;
    const clientId = body.clientId as string | undefined;

    if (!["client", "advisor"].includes(role)) {
      return NextResponse.json({ success: false, error: "Invalid role" }, { status: 400 });
    }

    const cookieStore = await cookies();

    // Set role cookie
    cookieStore.set("ws_dev_role", role, {
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
      httpOnly: false,
      sameSite: "lax",
    });

    // For client logins, set/clear the client ID cookie
    if (role === "client" && clientId) {
      cookieStore.set("ws_client_id", clientId, {
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
        httpOnly: false,
        sameSite: "lax",
      });
    } else if (role === "advisor") {
      // Clear client cookie when switching to advisor
      cookieStore.delete("ws_client_id");
    }

    // Fetch user after cookies are set
    let user;
    if (role === "client" && clientId) {
      user = users.getById(clientId);
    } else {
      user = await getCurrentUser();
    }

    return NextResponse.json({
      success: true,
      data: {
        role,
        userId: user?.id,
        name: user ? `${user.firstName} ${user.lastName}` : null,
      },
    });
  } catch (error) {
    console.error("[Login] Error:", error);
    return NextResponse.json({ success: false, error: "Failed" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Not logged in" }, { status: 401 });
    }
    return NextResponse.json({
      success: true,
      data: {
        role: user.role,
        userId: user.id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("[Login GET] Error:", error);
    return NextResponse.json({ success: false, error: "Failed" }, { status: 500 });
  }
}
