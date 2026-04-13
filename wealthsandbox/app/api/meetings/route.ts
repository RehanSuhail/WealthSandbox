import { NextRequest, NextResponse } from "next/server";
import { meetings, advisorClients, users } from "@/lib/storage";
import { v4 as uuid } from "uuid";
import type { Meeting } from "@/lib/types";

const DEV_ADVISOR_ID = "usr_dev_advisor";

/* GET /api/meetings – list meetings for current user */
export async function GET(req: NextRequest) {
  const role = req.cookies.get("ws_dev_role")?.value ?? "client";
  const clientId = req.cookies.get("ws_client_id")?.value;

  let items: Meeting[];
  if (role === "advisor") {
    items = await meetings.getByAdvisorId(DEV_ADVISOR_ID);
  } else {
    items = clientId ? await meetings.getByClientId(clientId) : [];
  }

  // Sort by scheduledAt descending (most recent first)
  items.sort(
    (a, b) =>
      new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()
  );

  return NextResponse.json({ data: items });
}

/* POST /api/meetings – advisor creates a meeting */
export async function POST(req: NextRequest) {
  const role = req.cookies.get("ws_dev_role")?.value;
  if (role !== "advisor")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { clientId, title, description, scheduledAt, duration } =
    await req.json();

  if (!clientId || !title || !scheduledAt)
    return NextResponse.json(
      { error: "clientId, title, and scheduledAt are required" },
      { status: 400 }
    );

  // Verify the advisor has a connection with this client
  const link = await advisorClients.getLink(DEV_ADVISOR_ID, clientId);
  if (!link)
    return NextResponse.json(
      { error: "No connection with this client" },
      { status: 400 }
    );

  // Get client name
  const client = await users.getById(clientId);
  const clientName = client
    ? `${client.firstName ?? ""} ${client.lastName ?? ""}`.trim() || "Client"
    : "Client";

  const meeting: Meeting = {
    id: uuid(),
    advisorId: DEV_ADVISOR_ID,
    clientId,
    advisorName: "Sarah Mitchell",
    clientName,
    title,
    description: description ?? "",
    scheduledAt,
    duration: duration ?? 30,
    status: "scheduled",
    createdAt: new Date().toISOString(),
  };

  const created = await meetings.create(meeting);
  return NextResponse.json({ data: created }, { status: 201 });
}

/* PATCH /api/meetings – update meeting status */
export async function PATCH(req: NextRequest) {
  const { meetingId, status } = await req.json();
  if (!meetingId || !status)
    return NextResponse.json(
      { error: "meetingId and status required" },
      { status: 400 }
    );

  const existing = await meetings.getById(meetingId);
  if (!existing)
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });

  const updated = await meetings.update(meetingId, { status });
  return NextResponse.json({ data: updated });
}
