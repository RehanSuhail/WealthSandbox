// ─── Advisor Analytics API ────────────────────────────────────────────────────
// GET: Returns comprehensive practice-level analytics for the logged-in advisor.
// This endpoint aggregates across all connected clients to provide book-of-business
// health metrics, risk distribution, and flagged clients needing review.

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { users, sessions, sandboxes, insights as insightStorage } from "@/lib/storage";
import type { AdvisorAnalytics, RiskLevel } from "@/lib/types";

export async function GET() {
  try {
    const advisor = await getCurrentUser();
    if (!advisor || advisor.role !== "advisor") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // Load advisor-client relationships
    const { advisorClients } = await import("@/lib/storage");
    const connections = advisorClients.getByAdvisorId(advisor.id);
    const clientIds = connections.map((c: { clientId: string }) => c.clientId);

    // Fetch all clients
    const allUsers = users.getAll();
    const clients = allUsers.filter((u) => clientIds.includes(u.id));

    // Compute total AUM (sum of profile savings)
    const totalAum = clients.reduce(
      (sum, c) => sum + (c.profile?.savings || 0),
      0
    );

    // Risk distribution
    const riskDist: Record<RiskLevel, number> = {
      conservative: 0,
      moderate_low: 0,
      moderate: 0,
      moderate_high: 0,
      aggressive: 0,
    };
    let avgAgeSum = 0;
    for (const c of clients) {
      if (c.profile?.riskScore) {
        riskDist[c.profile.riskScore] = (riskDist[c.profile.riskScore] || 0) + 1;
      }
      avgAgeSum += c.profile?.age || 45;
    }

    // Per-client health metrics
    let clientsAtRisk = 0;
    let clientsOnTrack = 0;
    let clientsNeedingReview = 0;
    let healthScoreSum = 0;
    let healthScoreCount = 0;

    const clientDetails: Array<{
      clientId: string;
      name: string;
      age: number;
      aum: number;
      riskLevel: string;
      portfolioType: string;
      probSuccess: number;
      fundsLastToAge: number;
      healthScore: number;
      lastActivity: string;
      needsReview: boolean;
      sharedSandboxCount: number;
      openInsightCount: number;
    }> = [];

    for (const client of clients) {
      // Get client's sandboxes
      const clientSandboxes = sandboxes.getByUserId(client.id).filter((s: { archived: boolean }) => !s.archived);
      const sharedCount = clientSandboxes.filter((s: { sharedWithAdvisor: boolean }) => s.sharedWithAdvisor).length;

      // Get latest session across all sandboxes
      let latestProbSuccess = 0;
      let latestFundsLast = 90;
      let latestActivity = client.updatedAt;
      let bestHealth = 0;

      for (const sb of clientSandboxes) {
        const sess = sessions.getLatestForSandbox(sb.id);
        if (sess) {
          latestProbSuccess = Math.max(latestProbSuccess, sess.probSuccess);
          if (sess.fundsLastToAge > 0) latestFundsLast = Math.min(latestFundsLast, sess.fundsLastToAge);
          if (sess.createdAt > latestActivity) latestActivity = sess.createdAt;

          // Compute health score from session
          const p = sess.probSuccess;
          const f = sess.fundsLastToAge;
          const successPts = p >= 0.9 ? 40 : p >= 0.8 ? 32 : p >= 0.7 ? 24 : p >= 0.6 ? 16 : 8;
          const longevityPts = f >= 95 ? 25 : f >= 90 ? 20 : f >= 85 ? 15 : f >= 80 ? 10 : 5;
          const h = successPts + longevityPts + 20; // approximate
          if (h > bestHealth) bestHealth = h;
        }
      }

      // Count open insights
      const clientInsights = insightStorage.getByUserId(client.id);
      const openInsights = clientInsights.filter(
        (i: { status: string; scope: string }) => i.status === "active" && i.scope === "advisor"
      ).length;

      const needsReview = latestProbSuccess < 0.7 || latestFundsLast < 82 || openInsights > 3;

      if (latestProbSuccess > 0) {
        if (latestProbSuccess < 0.65) clientsAtRisk++;
        else if (latestProbSuccess >= 0.85) clientsOnTrack++;
        else clientsNeedingReview++;
        healthScoreSum += bestHealth;
        healthScoreCount++;
      } else {
        clientsNeedingReview++;
      }

      if (needsReview) clientsNeedingReview++;

      clientDetails.push({
        clientId: client.id,
        name: `${client.firstName} ${client.lastName}`.trim(),
        age: client.profile?.age || 45,
        aum: client.profile?.savings || 0,
        riskLevel: client.profile?.riskScore || "moderate",
        portfolioType: client.profile?.suggestedPortfolioType || "retirement",
        probSuccess: latestProbSuccess,
        fundsLastToAge: latestFundsLast,
        healthScore: bestHealth || 50,
        lastActivity: latestActivity,
        needsReview,
        sharedSandboxCount: sharedCount,
        openInsightCount: openInsights,
      });
    }

    const analytics: AdvisorAnalytics = {
      advisorId: advisor.id,
      totalClients: clients.length,
      totalAum,
      aum30DayChange: 0, // Would require historical data
      avgPortfolioHealth: healthScoreCount > 0 ? Math.round(healthScoreSum / healthScoreCount) : 0,
      clientsNeedingReview: Math.min(clientsNeedingReview, clients.length),
      clientsAtRisk,
      clientsOnTrack,
      totalSandboxes: clients.reduce((s, c) => s + sandboxes.getByUserId(c.id).filter((sb: { archived: boolean }) => !sb.archived).length, 0),
      totalInsightsGenerated: clients.reduce((s, c) => s + insightStorage.getByUserId(c.id).length, 0),
      meetingsScheduled: 0, // Would need meetings storage query
      avgClientAge: clients.length > 0 ? Math.round(avgAgeSum / clients.length) : 0,
      riskDistribution: riskDist,
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      data: {
        analytics,
        clientDetails: clientDetails.sort((a, b) => a.probSuccess - b.probSuccess), // lowest success first
      },
    });
  } catch (error) {
    console.error("[Advisor Analytics] Error:", error);
    return NextResponse.json({ success: false, error: "Failed to compute analytics" }, { status: 500 });
  }
}
