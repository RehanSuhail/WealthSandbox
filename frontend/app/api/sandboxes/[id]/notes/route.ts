import { NextRequest, NextResponse } from "next/server";
import { sandboxes } from "@/lib/storage";
import type { AdvisorNote } from "@/lib/types";
import { v4 as uuid } from "uuid";

const DEV_ADVISOR_ID = "usr_dev_advisor";

/* GET  /api/sandboxes/:id/notes  – list advisor notes for a sandbox */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sb = await sandboxes.getById(id);
  if (!sb) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Also include notes from the source sandbox if this is a clone
  let notes = [...(sb.advisorNotes ?? [])];
  const sourceSandboxId = (sb as any).sourceSandboxId;
  if (sourceSandboxId) {
    const source = await sandboxes.getById(sourceSandboxId);
    if (source?.advisorNotes?.length) {
      const existingIds = new Set(notes.map(n => n.id));
      for (const n of source.advisorNotes) {
        if (!existingIds.has(n.id)) notes.push(n);
      }
    }
  }

  // Sort by date ascending
  notes.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  return NextResponse.json({ data: notes });
}

/* POST /api/sandboxes/:id/notes  – advisor adds a note */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const role = req.cookies.get("ws_dev_role")?.value;
  if (role !== "advisor")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const sb = await sandboxes.getById(id);
  if (!sb) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { text } = await req.json();
  if (!text?.trim())
    return NextResponse.json({ error: "Text required" }, { status: 400 });

  const note: AdvisorNote = {
    id: uuid(),
    advisorId: DEV_ADVISOR_ID,
    advisorName: "Sarah Mitchell",
    text: text.trim(),
    createdAt: new Date().toISOString(),
  };

  // Add note to this sandbox
  const existing = sb.advisorNotes ?? [];
  await sandboxes.update(id, { advisorNotes: [...existing, note] } as any);

  // Also sync to source sandbox if this is a clone
  const sourceSandboxId = (sb as any).sourceSandboxId;
  if (sourceSandboxId) {
    const source = await sandboxes.getById(sourceSandboxId);
    if (source) {
      const sourceNotes = source.advisorNotes ?? [];
      await sandboxes.update(sourceSandboxId, { advisorNotes: [...sourceNotes, note] } as any);
    }
  }

  return NextResponse.json({ data: note }, { status: 201 });
}
