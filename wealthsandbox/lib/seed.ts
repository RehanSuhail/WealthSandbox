// ─── Seed Script: Generate initial data ───────────────────────────────────────
// Run with: npx tsx lib/seed.ts
// Creates only the advisor account. Clients create accounts via onboarding.

import fs from "fs";
import path from "path";
import type { User } from "./types";

const DATA_DIR = path.join(process.cwd(), ".data");

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function writeJson(filePath: string, data: unknown) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

// ─── Advisor User ─────────────────────────────────────────────────────────────

const advisorUser: User = {
  id: "usr_dev_advisor",
  clerkId: "dev_advisor_clerk",
  email: "sarah.mitchell@lplfinancial.dev",
  firstName: "Sarah",
  lastName: "Mitchell",
  role: "advisor",
  onboardingComplete: true,
  profile: {
    name: "Sarah Mitchell",
    dob: "1982-03-20",
    age: 44,
    familyStatus: "married",
    kidAges: [],
    state: "California",
    savings: 0,
    income: 0,
    expenses: 0,
    debt: {},
    goals: [],
    riskAnswers: {},
    riskScore: "moderate",
    suggestedPortfolioType: "retirement",
  },
  advisorId: null,
  createdAt: "2025-08-01T10:00:00.000Z",
  updatedAt: "2026-04-06T10:00:00.000Z",
  archived: false,
};

// ─── Write all data ───────────────────────────────────────────────────────────

console.log("Writing seed data to .data/ directory...");

writeJson(path.join(DATA_DIR, "users.json"), [advisorUser]);
writeJson(path.join(DATA_DIR, "sandboxes.json"), []);
writeJson(path.join(DATA_DIR, "sessions.json"), []);
writeJson(path.join(DATA_DIR, "insights.json"), []);
writeJson(path.join(DATA_DIR, "advisor_clients.json"), []);
writeJson(path.join(DATA_DIR, "connection_invites.json"), []);
writeJson(path.join(DATA_DIR, "meetings.json"), []);
writeJson(path.join(DATA_DIR, "cache.json"), {});

console.log("✅ Seed data created successfully!");
console.log("   Users: 1 (advisor only)");
console.log("   Everything else: empty — clients create accounts via onboarding.");
console.log("\nData stored in: .data/");
