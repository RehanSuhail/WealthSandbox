import { NextRequest, NextResponse } from "next/server";
import { users } from "@/lib/storage";

/* GET /api/auth/profile – return current user profile */
export async function GET(req: NextRequest) {
  const clientId = req.cookies.get("ws_client_id")?.value;
  if (!clientId)
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const user = await users.getById(clientId);
  if (!user)
    return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json({ data: user });
}
