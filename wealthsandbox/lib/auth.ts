// ─── Auth Helpers ─────────────────────────────────────────────────────────────
// Cookie-based dev auth.
// Advisor is a fixed account. Clients are dynamic (created via onboarding).
// ws_dev_role = "advisor" | "client"
// ws_client_id = "<user-id>"  (only for client role)

import { cookies } from "next/headers";
import { users } from "@/lib/storage";
import type { User } from "@/lib/types";

// ─── Hardcoded Advisor Account ───────────────────────────────────────────────

const DEV_ADVISOR_ID = "usr_dev_advisor";

function getOrCreateAdvisor(): User {
  let user = users.getById(DEV_ADVISOR_ID);
  if (user) return user;
  user = users.create({
    id: DEV_ADVISOR_ID,
    clerkId: "dev_advisor_clerk",
    email: "sarah.mitchell@lplfinancial.dev",
    firstName: "Sarah",
    lastName: "Mitchell",
    role: "advisor",
    onboardingComplete: true,
    profile: null as unknown as User["profile"],
    advisorId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    archived: false,
  });
  return user;
}

// ─── Cookie-based user selection ─────────────────────────────────────────────

export async function getCurrentUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies();
    const devRole = cookieStore.get("ws_dev_role")?.value;

    if (devRole === "advisor") {
      return getOrCreateAdvisor();
    }

    // Client role – must have a ws_client_id cookie
    const clientId = cookieStore.get("ws_client_id")?.value;
    if (clientId) {
      const user = users.getById(clientId);
      if (user) return user;
    }

    return null;
  } catch {
    return null;
  }
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

export async function requireAdvisor(): Promise<User> {
  const user = await requireUser();
  if (user.role !== "advisor") throw new Error("Forbidden: advisor role required");
  return user;
}

// Export IDs for reference
export { DEV_ADVISOR_ID };
