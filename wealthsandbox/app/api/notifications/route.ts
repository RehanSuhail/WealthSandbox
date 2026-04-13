import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { notifications } from "@/lib/storage";

/* GET  /api/notifications  – list notifications for current user */
export async function GET(_req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const items = notifications.getByUserId(user.id);
  return NextResponse.json({ data: items });
}

/* PATCH /api/notifications  – mark all notifications as read */
export async function PATCH(_req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  notifications.markAllRead(user.id);
  return NextResponse.json({ success: true });
}
