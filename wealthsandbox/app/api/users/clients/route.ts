import { NextResponse } from "next/server";
import { users } from "@/lib/storage";

/* GET /api/users/clients – list all client users (for login picker) */
export async function GET() {
  const all = users.getAll();
  const clients = all
    .filter((u) => u.role === "client" && !u.archived)
    .map((u) => ({
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      onboardingComplete: u.onboardingComplete,
    }));
  return NextResponse.json({ data: clients });
}
