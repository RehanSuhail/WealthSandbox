// ─── Onboarding Complete API ──────────────────────────────────────────────────
// POST: Accept onboarding form data, save profile, create first sandbox.

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { users, generateId } from "@/lib/storage";
import type { GoalDefinition, UserProfile, RiskLevel, PortfolioType } from "@/lib/types";

// Map risk answers to risk level
function computeRiskLevel(answers: Record<string, string>): RiskLevel {
  const scores: Record<string, number> = {
    // Q1: market drop reaction
    sell: 0, hold: 1, partial: 2, buy: 3,
    // Q2: time horizon
    lt2: 0, "2to5": 1, "5to10": 2, gt10: 3,
    // Q3: experience
    none: 0, basic: 1, moderate: 2, advanced: 3,
    // Q4: comfort
    stable: 0, balanced: 1, growth: 2, aggressive: 3,
    // Q5: fear
    outlive: 1, crash: 0, goals: 2, legacy: 2,
  };

  let total = 0;
  let count = 0;
  for (const answer of Object.values(answers)) {
    if (scores[answer] !== undefined) {
      total += scores[answer];
      count++;
    }
  }

  const avg = count > 0 ? total / count : 1;
  if (avg < 0.8) return "conservative";
  if (avg < 1.5) return "moderate_low";
  if (avg < 2.0) return "moderate";
  if (avg < 2.5) return "moderate_high";
  return "aggressive";
}

function suggestPortfolioType(riskLevel: RiskLevel): PortfolioType {
  switch (riskLevel) {
    case "conservative": return "retirement";
    case "moderate_low": return "retirement";
    case "moderate": return "retirement";
    case "moderate_high": return "equity";
    case "aggressive": return "equity";
    default: return "retirement";
  }
}

function computeAge(dob: string): number {
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export async function POST(req: NextRequest) {
  try {
    let user = await getCurrentUser();

    const body = await req.json();
    const profileData = body.profile || body;
    const {
      name, dob, familyStatus, kidAges, state,
      savings, income, expenses, debt,
      goals: rawGoals, riskAnswers,
      email: providedEmail,
      phone: providedPhone,
    } = profileData;

    // If no user exists (new client), create one
    if (!user) {
      const firstName = (name || "").split(" ")[0] || "Client";
      const lastName = (name || "").split(" ").slice(1).join(" ") || "";
      const newId = generateId("usr");

      user = users.create({
        id: newId,
        clerkId: `clerk_${newId}`,
        email: providedEmail || `${firstName.toLowerCase()}@wealthsandbox.dev`,
        firstName,
        lastName,
        role: "client",
        onboardingComplete: false,
        profile: null as unknown as import("@/lib/types").UserProfile,
        advisorId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        archived: false,
      });

      // Set the client ID cookie so future requests use this user
      const { cookies } = await import("next/headers");
      const cookieStore = await cookies();
      cookieStore.set("ws_client_id", newId, {
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
        httpOnly: false,
        sameSite: "lax",
      });
    }

    // Compute derived values
    const age = computeAge(dob);
    const riskLevel = computeRiskLevel(riskAnswers || {});
    const portfolioType = suggestPortfolioType(riskLevel);

    // Build goals array
    const goalsList: GoalDefinition[] = [];
    if (rawGoals) {
      if (rawGoals.retire?.selected) {
        goalsList.push({
          id: generateId("goal"),
          type: "retire",
          label: `Retire at ${rawGoals.retire.age || 65}`,
          targetYear: new Date().getFullYear() + ((rawGoals.retire.age || 65) - age),
          targetAmount: 2000000,
        });
      }
      if (rawGoals.college?.selected) {
        goalsList.push({
          id: generateId("goal"),
          type: "college",
          label: "Kids' college fund",
          targetYear: parseInt(rawGoals.college.year) || new Date().getFullYear() + 13,
          targetAmount: parseInt(rawGoals.college.amount) || 80000,
        });
      }
      if (rawGoals.home?.selected) {
        goalsList.push({
          id: generateId("goal"),
          type: "home",
          label: "Buy a home",
          targetYear: parseInt(rawGoals.home.year) || new Date().getFullYear() + 3,
          targetAmount: parseInt(rawGoals.home.downPayment) || 100000,
        });
      }
      if (rawGoals.emergency?.selected) {
        goalsList.push({
          id: generateId("goal"),
          type: "emergency",
          label: `Emergency buffer (${rawGoals.emergency.months || 6} months)`,
          targetYear: new Date().getFullYear() + 1,
          targetAmount: (parseInt(expenses) || 4000) * (parseInt(rawGoals.emergency.months) || 6),
        });
      }
      if (rawGoals.generational?.selected) {
        goalsList.push({
          id: generateId("goal"),
          type: "generational",
          label: "Build generational wealth",
          targetYear: new Date().getFullYear() + 30,
          targetAmount: 5000000,
        });
      }
      if (rawGoals.custom?.selected) {
        goalsList.push({
          id: generateId("goal"),
          type: "custom",
          label: rawGoals.custom.text || "Custom goal",
          targetYear: parseInt(rawGoals.custom.year) || new Date().getFullYear() + 5,
          targetAmount: parseInt(rawGoals.custom.amount) || 50000,
        });
      }
    }

    // Build profile
    const profile: UserProfile = {
      name: name || "",
      dob: dob || "",
      age,
      familyStatus: familyStatus || "single",
      kidAges: (kidAges || []).map(Number).filter(Boolean),
      state: state || "",
      savings: parseFloat(savings) || 0,
      income: parseFloat(income) || 0,
      expenses: parseFloat(expenses) || 0,
      debt: debt || {},
      goals: goalsList,
      riskAnswers: riskAnswers || {},
      riskScore: riskLevel,
      suggestedPortfolioType: portfolioType,
    };

    // Compute total debt from onboarding debt entries
    const totalDebt = Object.values(debt || {}).reduce((sum: number, d: any) => {
      if (d?.enabled) return sum + (parseFloat(d.amount) || 0);
      return sum;
    }, 0);

    // Compute emergency months from goals
    const emergencyGoal = goalsList.find(g => g.type === "emergency");
    const emergencyMonths = rawGoals?.emergency?.months ? parseInt(rawGoals.emergency.months) : 0;

    // Build financial object for profile page
    const financial = {
      netWorth: parseFloat(savings) || 0,
      annualIncome: (parseFloat(income) || 0) * 12,
      monthlyExpenses: parseFloat(expenses) || 0,
      totalDebt,
      emergencyMonths,
    };

    // Update user with profile + financial + top-level fields for the profile page
    users.update(user.id, {
      profile,
      financial,
      onboardingComplete: true,
      firstName: name?.split(" ")[0] || user.firstName,
      lastName: name?.split(" ").slice(1).join(" ") || user.lastName,
      email: providedEmail || user.email,
      phone: providedPhone || "",
      dob: dob || "",
      state: state || "",
      familyStatus: familyStatus || "single",
      dependents: (kidAges || []).filter(Boolean).length,
    } as any);

    return NextResponse.json({
      success: true,
      data: {
        userId: user.id,
        portfolioType,
        riskLevel,
      },
    });
  } catch (error) {
    console.error("[Onboarding] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to complete onboarding" },
      { status: 500 }
    );
  }
}
