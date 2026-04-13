// â”€â”€â”€ LLM Service (Gemini API) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Enterprise-grade LLM layer for LPL Financial WealthSandbox.
// Features: role-differentiated prompts, portfolio health scoring,
// advisor deep analysis, advisor portfolio comparison, and streaming chat.

import { GoogleGenerativeAI } from "@google/generative-ai";
import { sanitizeContext } from "./sanitizer";
import {
  buildCombinedInsightPrompt,
  buildScopedChatSystemPrompt,
  buildStressTestAdvicePrompt,
  buildAdvisorDeepAnalysisPrompt,
  buildPortfolioHealthScorePrompt,
  type SandboxContext,
  type ClientInsightData,
  type AdvisorInsightData,
  type StressTestContext,
} from "./prompts";
import type { ChatMessage, PortfolioHealthScore } from "@/lib/types";

// â”€â”€â”€ Provider setup â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const API_KEY = process.env.GEMINI_API_KEY || "";

function getGenAI() {
  if (!API_KEY) {
    throw new Error("GEMINI_API_KEY is not set in environment variables");
  }
  return new GoogleGenerativeAI(API_KEY);
}

const MODEL_NAME = "gemini-2.5-flash";

// â”€â”€â”€ Insight cache (avoid duplicate API calls for same sandbox state) â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface CachedInsights {
  client: ClientInsightData[];
  advisor: AdvisorInsightData[];
  timestamp: number;
}

const insightCache = new Map<string, CachedInsights>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function getCacheKey(context: SandboxContext): string {
  const { simulationResults, sliderState, portfolioType } = context;
  return JSON.stringify({
    portfolioType,
    prob: Math.round(simulationResults.probabilityOfSuccess * 100),
    p50: Math.round(simulationResults.p50AtRetirement / 1000),
    msw: Math.round(simulationResults.monthlySustainableWithdrawal),
    fundsLast: simulationResults.fundsLastToAge,
    savings: sliderState.currentSavings,
    contrib: sliderState.monthlyContribution,
    retAge: sliderState.retirementAge,
    stocks: sliderState.stockPct,
    risk: context.riskLevel,
    age: context.userAge,
    // Include extended context in cache key
    taxBracket: context.taxBracket,
    familyStatus: context.familyStatus,
  });
}

// â”€â”€â”€ Combined insight generation (one API call for both scopes) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function generateCombinedInsights(
  context: SandboxContext
): Promise<{ client: ClientInsightData[]; advisor: AdvisorInsightData[] }> {
  const sanitized = sanitizeContext(context);
  const cacheKey = getCacheKey(sanitized);

  // Check cache first
  const cached = insightCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    console.log("[LLM] Serving insights from cache");
    return { client: cached.client, advisor: cached.advisor };
  }

  const prompt = buildCombinedInsightPrompt(sanitized);

  try {
    const genAI = getGenAI();
    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      generationConfig: {
        maxOutputTokens: 6144,  // increased for richer insights
        temperature: 0.35,      // slightly creative but consistent
        topP: 0.85,
      },
    });
    console.log("[LLM] Sending combined insight promptâ€¦");
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // Extract JSON â€” handle markdown fences or raw JSON
    let jsonText = text;
    const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) {
      jsonText = fenceMatch[1];
    } else {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) jsonText = jsonMatch[0];
    }

    try {
      const parsed = JSON.parse(jsonText);
      const clientInsights: ClientInsightData[] = parsed.client || [];
      const advisorInsights: AdvisorInsightData[] = parsed.advisor || [];

      // Cache the result
      insightCache.set(cacheKey, {
        client: clientInsights,
        advisor: advisorInsights,
        timestamp: Date.now(),
      });

      console.log("[LLM] Parsed insights:", clientInsights.length, "client,", advisorInsights.length, "advisor");
      return { client: clientInsights, advisor: advisorInsights };
    } catch (parseErr) {
      console.error("[LLM] JSON parse failed:", parseErr);
      console.error("[LLM] Raw response tail:", text.substring(Math.max(0, text.length - 200)));
      return getDefaultCombinedInsights(context);
    }
  } catch (error) {
    console.error("[LLM] Error generating combined insights:", error);
    return getDefaultCombinedInsights(context);
  }
}

// Legacy single-scope wrapper (backward compat)
export async function generateInsights(
  context: SandboxContext,
  scope: "client" | "advisor"
): Promise<(ClientInsightData | AdvisorInsightData)[]> {
  const combined = await generateCombinedInsights(context);
  return scope === "client" ? combined.client : combined.advisor;
}

// â”€â”€â”€ Portfolio Health Score generation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function generatePortfolioHealthScore(
  context: SandboxContext
): Promise<PortfolioHealthScore | null> {
  const prompt = buildPortfolioHealthScorePrompt(context);
  try {
    const genAI = getGenAI();
    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      generationConfig: { maxOutputTokens: 1024, temperature: 0.1 }, // low temp for scoring
    });
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    let jsonText = text;
    const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) {
      jsonText = fenceMatch[1];
    } else {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) jsonText = jsonMatch[0];
    }

    const parsed = JSON.parse(jsonText) as PortfolioHealthScore;
    parsed.computedAt = new Date().toISOString();
    console.log("[LLM] Portfolio health score:", parsed.score, parsed.grade);
    return parsed;
  } catch (error) {
    console.error("[LLM] Health score generation failed:", error);
    // Fallback: compute deterministically
    return computeDeterministicHealthScore(context);
  }
}

function computeDeterministicHealthScore(context: SandboxContext): PortfolioHealthScore {
  const prob = context.simulationResults.probabilityOfSuccess;
  const fundsLast = context.simulationResults.fundsLastToAge;
  const msw = context.simulationResults.monthlySustainableWithdrawal;
  const p50 = context.simulationResults.p50AtRetirement;

  const successPoints = prob >= 0.9 ? 40 : prob >= 0.8 ? 32 : prob >= 0.7 ? 24 : prob >= 0.6 ? 16 : 8;
  const longevityPoints = fundsLast >= 95 ? 25 : fundsLast >= 90 ? 20 : fundsLast >= 85 ? 15 : fundsLast >= 80 ? 10 : 5;
  const withdrawalRate = p50 > 0 ? (msw * 12) / p50 : 0;
  const withdrawalPoints = withdrawalRate <= 0.04 ? 20 : withdrawalRate <= 0.05 ? 15 : withdrawalRate <= 0.06 ? 10 : 5;
  const goalPoints = context.goals?.length > 0 ? 8 : 10; // partial credit when goals exist

  const score = successPoints + longevityPoints + withdrawalPoints + goalPoints;
  const grade: PortfolioHealthScore["grade"] = score >= 90 ? "A" : score >= 75 ? "B" : score >= 60 ? "C" : score >= 45 ? "D" : "F";
  const label: PortfolioHealthScore["label"] = score >= 90 ? "Excellent" : score >= 75 ? "Strong" : score >= 60 ? "Healthy" : score >= 45 ? "Needs Attention" : score >= 30 ? "At Risk" : "Critical";

  return {
    score,
    grade,
    label,
    breakdown: {
      successRate: successPoints,
      fundsLongevity: longevityPoints,
      withdrawalSustainability: withdrawalPoints,
      goalAlignment: goalPoints,
    },
    primaryStrength: prob >= 0.8 ? "Strong probability of success" : fundsLast >= 90 ? "Good funds longevity" : "Foundation established",
    primaryWeakness: prob < 0.7 ? "Success probability below 70% threshold" : fundsLast < 85 ? "Funds may not last through retirement" : "Portfolio needs optimization",
    nextBestAction: prob < 0.75 ? "Increase monthly contributions by 10-15% to raise success probability" : "Review asset allocation and consider stress testing",
    computedAt: new Date().toISOString(),
  };
}

// â”€â”€â”€ Advisor Deep Analysis â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function generateAdvisorDeepAnalysis(
  context: SandboxContext & { clientName?: string }
): Promise<{
  overallHealthScore: number;
  healthLabel: string;
  keyRisks: string[];
  opportunities: string[];
  withdrawalRateAssessment: string;
  sorRiskLevel: string;
  recommendedActions: { action: string; urgency: string; impact: string }[];
  clientTalkingPoints: string[];
  complianceFlags: string[];
  executiveSummary: string;
} | null> {
  const prompt = buildAdvisorDeepAnalysisPrompt(context);
  try {
    const genAI = getGenAI();
    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      generationConfig: { maxOutputTokens: 3072, temperature: 0.3 },
    });
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    let jsonText = text;
    const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) jsonText = fenceMatch[1];
    else { const m = text.match(/\{[\s\S]*\}/); if (m) jsonText = m[0]; }

    return JSON.parse(jsonText);
  } catch (error) {
    console.error("[LLM] Advisor deep analysis failed:", error);
    return null;
  }
}

// â”€â”€â”€ Chat Streaming (role-aware: advisor vs client) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function* streamChatResponse(
  messages: ChatMessage[],
  sandboxContext: SandboxContext | null,
  userRole: "advisor" | "client" = "client"
): AsyncGenerator<string> {
  const sanitized = sandboxContext ? sanitizeContext(sandboxContext) : null;

  try {
    const genAI = getGenAI();
    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      generationConfig: {
        maxOutputTokens: userRole === "advisor" ? 1200 : 800,
        temperature: userRole === "advisor" ? 0.3 : 0.45,
      },
    });

    const systemPrompt = buildScopedChatSystemPrompt(sanitized, userRole);

    // Limit history to last 8 messages for advisors (need more context), 6 for clients
    const historyLimit = userRole === "advisor" ? 9 : 7;
    const recentMessages = messages.slice(-historyLimit);
    const history = recentMessages.slice(0, -1).map((m) => ({
      role: m.role === "user" ? "user" as const : "model" as const,
      parts: [{ text: m.content }],
    }));

    const chat = model.startChat({
      history: [
        { role: "user", parts: [{ text: systemPrompt }] },
        {
          role: "model",
          parts: [{ text: userRole === "advisor"
            ? "Understood. I'm WealthAdvisor AI, ready to provide technical financial analysis at CFP/CFA level."
            : "Got it! I'm WealthBot, here to help you understand and improve your financial plan. What would you like to explore?"
          }]
        },
        ...history,
      ],
    });

    const lastMessage = messages[messages.length - 1]?.content || "Hello";
    const result = await chat.sendMessageStream(lastMessage);

    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) {
        yield text;
      }
    }
  } catch (error) {
    console.error("[LLM] Chat streaming error:", error);
    yield userRole === "advisor"
      ? "I'm experiencing a connectivity issue. Please try again in a moment."
      : "I'm sorry, I'm having trouble connecting right now. Please try again in a moment.";
  }
}

// â”€â”€â”€ Non-streaming chat (fallback) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function generateChatResponse(
  messages: ChatMessage[],
  sandboxContext: SandboxContext | null,
  userRole: "advisor" | "client" = "client"
): Promise<string> {
  const chunks: string[] = [];
  for await (const chunk of streamChatResponse(messages, sandboxContext, userRole)) {
    chunks.push(chunk);
  }
  return chunks.join("");
}

// â”€â”€â”€ Default insights (fallback when LLM is unavailable) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function getDefaultCombinedInsights(
  context: SandboxContext
): { client: ClientInsightData[]; advisor: AdvisorInsightData[] } {
  const prob = context.simulationResults.probabilityOfSuccess;
  const wealth = context.simulationResults.p50AtRetirement;
  const fundsLast = context.simulationResults.fundsLastToAge;
  const msw = context.simulationResults.monthlySustainableWithdrawal;
  const withdrawalRate = wealth > 0 ? ((msw * 12) / wealth * 100).toFixed(1) : "N/A";
  const age = context.userAge || 40;
  const retireAge = Number(context.sliderState.retirementAge) || 65;
  const yearsToRetire = retireAge - age;
  const stockPct = Number(context.sliderState.stockPct) || 70;

  const client: ClientInsightData[] = [];
  const advisor: AdvisorInsightData[] = [];

  // 1. Success rate insight
  if (prob < 0.85) {
    client.push({
      category: "retirement_gap",
      priority: prob < 0.65 ? "high" : "medium",
      title: prob < 0.65 ? "Your retirement plan needs attention" : "Boost your retirement success rate",
      body: `Your current plan has a ${(prob * 100).toFixed(0)}% probability of lasting through retirement â€” the industry target is 85% or higher. With ${yearsToRetire} years until retirement, you have time to close this gap through small but consistent changes.`,
      suggestedAction: `Increase your monthly contribution by 10-15% to push your success rate above 85%. Even an extra $${Math.round(Number(context.sliderState.monthlyContribution || 1000) * 0.12).toLocaleString()}/mo makes a significant difference over ${yearsToRetire} years.`,
      confidenceNote: "Based on 10,000 Monte Carlo simulations",
      impactScore: prob < 0.65 ? 9 : 7,
    });
    advisor.push({
      category: "retirement_gap",
      priority: prob < 0.65 ? "high" : "medium",
      title: `Sub-optimal P(success) at ${(prob * 100).toFixed(0)}% â€” below 85% threshold`,
      technicalAnalysis: `Monte Carlo analysis shows ${(prob * 100).toFixed(0)}% P(success), P50 projected at $${wealth.toLocaleString()}. Implied withdrawal rate of ${withdrawalRate}% is ${parseFloat(withdrawalRate) > 5 ? "above the 5% caution threshold" : "approaching the 4% guideline boundary"}. Sequence-of-returns risk is ${stockPct > 75 && yearsToRetire < 15 ? "elevated given high equity concentration near retirement" : "moderate given current allocation"}.`,
      recoveryActions: [
        `Increase monthly contribution by 10-15% â€” estimated success rate improvement: +8-12 percentage points`,
        `Review Social Security claiming strategy â€” delaying to age 70 adds ~32% vs claiming at 62`,
        `Consider dynamic withdrawal strategy (Guyton-Klinger) instead of fixed to improve longevity probability`,
        `Stress-test against 2008 Financial Crisis scenario to quantify tail risk exposure`,
      ],
      reviewFlag: prob < 0.70,
      riskAdjustedNote: `Equity allocation of ${stockPct}% with ${yearsToRetire} years to retirement implies ${yearsToRetire < 10 ? "elevated" : "moderate"} sequence-of-returns risk`,
      complianceNote: prob < 0.65 ? "Suitability review recommended â€” plan materially below minimum success threshold" : undefined,
    });
  } else {
    client.push({
      category: "opportunity",
      priority: "medium",
      title: "Your plan is on solid footing â€” optimize further",
      body: `With an ${(prob * 100).toFixed(0)}% probability of success, your retirement plan is performing well. This puts you ahead of many Americans. Now is a great time to refine your strategy and explore tax-advantaged opportunities.`,
      suggestedAction: "Review your asset allocation annually and consider whether you can afford to reduce risk as you get closer to retirement.",
      confidenceNote: "Based on 10,000 Monte Carlo simulations",
      impactScore: 5,
    });
    advisor.push({
      category: "opportunity",
      priority: "low",
      title: "Strong P(success) â€” optimize tax efficiency and allocation",
      technicalAnalysis: `${(prob * 100).toFixed(0)}% P(success) is above the 85% target. Withdrawal rate of ${withdrawalRate}% is ${parseFloat(withdrawalRate) <= 4 ? "within safe range per Bengen research" : "slightly above 4% rule â€” consider stress testing"}. Focus should shift to tax optimization and legacy planning.`,
      recoveryActions: [
        "Assess Roth conversion opportunity during current tax year",
        "Review beneficiary designations and estate planning documents",
        "Evaluate asset location strategy to minimize tax drag",
      ],
      reviewFlag: false,
      complianceNote: "Annual review recommended to maintain suitability alignment",
    });
  }

  // 2. Funds longevity insight
  if (fundsLast < 88) {
    client.push({
      category: "crisis_vulnerability",
      priority: "high",
      title: "Your savings may run out in retirement",
      body: `Your projected savings are expected to last to age ${fundsLast}. If you live longer â€” which is increasingly common â€” you could outlive your money. This is called longevity risk, and it's one of the most important risks to plan for.`,
      suggestedAction: `Consider reducing your planned annual withdrawal by 5-10%, or working 2 additional years to significantly extend how long your money lasts.`,
      impactScore: 9,
    });
    advisor.push({
      category: "crisis_vulnerability",
      priority: "high",
      title: `Longevity risk â€” funds projected to deplete at age ${fundsLast}`,
      technicalAnalysis: `P50 trajectory shows fund depletion at age ${fundsLast}, below the 90th-percentile life expectancy for a ${age}-year-old. Social Security bridge strategy or annuity allocation may be appropriate to floor essential income. Current withdrawal rate of ${withdrawalRate}% is the primary driver of premature depletion.`,
      recoveryActions: [
        `Reduce withdrawal rate to 3.5-4% â€” sustainable per Kitces research across 30-year horizons`,
        `Evaluate flooring strategy: annuitize essential income (20-30% of portfolio) for longevity protection`,
        `Extend accumulation phase by 2 years â€” disproportionate impact on depletion age`,
        `Model QLAC allocation to defer RMDs and extend tax-deferred growth`,
      ],
      reviewFlag: true,
      riskAdjustedNote: "Longevity risk is the primary threat â€” not market risk",
      complianceNote: "Suitability review warranted â€” current plan does not address longevity risk adequately",
    });
  }

  // 3. Opportunity insight (always include)
  client.push({
    category: "opportunity",
    priority: "medium",
    title: "Run a stress test to prepare for market downturns",
    body: "Market crashes are unpredictable, but their impact on your portfolio doesn't have to be. Running a historical stress test lets you see exactly how events like the 2008 financial crisis or COVID crash would have affected your plan â€” and what you can do about it.",
    suggestedAction: "Click 'Stress Test' to simulate how your portfolio holds up against historical market crises.",
    impactScore: 6,
  });

  // 4. Goal funding (if goals exist)
  if (context.goals?.length > 0) {
    const g = context.goals[0];
    const yrsToGoal = g.targetYear - new Date().getFullYear();
    client.push({
      category: "goal_funding",
      priority: "medium",
      title: `Tracking your ${g.label} goal`,
      body: `Your goal to save $${g.targetAmount.toLocaleString()} for ${g.label} by ${g.targetYear} (${yrsToGoal} years away) requires consistent progress. Run the simulation to see if your current contribution rate will get you there.`,
      suggestedAction: `Review your contribution level specifically for the ${g.label} goal and compare it against the monthly amount needed.`,
      impactScore: 7,
    });
    advisor.push({
      category: "goal_funding",
      priority: "medium",
      title: `Goal gap analysis: ${g.label} â€” $${g.targetAmount.toLocaleString()} by ${g.targetYear}`,
      technicalAnalysis: `Client has a ${g.label} goal of $${g.targetAmount.toLocaleString()} with a ${yrsToGoal}-year horizon. Required monthly contribution at 6% net return: ~$${Math.round(g.targetAmount / (yrsToGoal * 12)).toLocaleString()}/mo. Compare against current contribution to identify shortfall.`,
      recoveryActions: [
        `Calculate precise monthly contribution needed using time-value-of-money analysis`,
        `Assess whether current sandbox contributions are allocated to goal-specific accounts`,
        `Consider laddering goal with intermediate milestones for behavioral reinforcement`,
      ],
      reviewFlag: false,
    });
  }

  // 5. Review trigger
  client.push({
    category: "review_trigger",
    priority: "low",
    title: "Share your plan with your advisor",
    body: "Your financial advisor can review your sandbox in detail, provide personalized guidance, and help you optimize your strategy for your specific tax situation and goals.",
    suggestedAction: "Click 'Share with Advisor' to give your advisor access to this sandbox for a comprehensive review.",
    impactScore: 4,
  });
  advisor.push({
    category: "review_trigger",
    priority: "low",
    title: "Quarterly plan review recommended",
    technicalAnalysis: `Current ${(prob * 100).toFixed(0)}% success rate should be monitored quarterly. Key metrics to track: P(success) drift, withdrawal rate vs 4% guideline, and allocation vs target glide path.`,
    recoveryActions: [
      "Schedule 30-minute annual review to calibrate assumptions to current market conditions",
      "Update income/expense assumptions annually for inflation accuracy",
      "Re-run stress tests after any major market event (>15% drawdown)",
    ],
    reviewFlag: false,
  });

  return { client, advisor };
}

// â”€â”€â”€ Stress test advice generation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function generateStressTestAdvice(
  context: StressTestContext
): Promise<string[]> {
  const prompt = buildStressTestAdvicePrompt(context);

  try {
    const genAI = getGenAI();
    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      generationConfig: { maxOutputTokens: 3072, temperature: 0.35 },
    });
    console.log("[LLM] Sending stress test advice promptâ€¦");
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // Extract JSON array â€” try greedy match first, then non-greedy
    const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    const rawText = fenceMatch ? fenceMatch[1] : text;
    const jsonMatch = rawText.match(/\[\s*"[\s\S]*"\s*\]/) || rawText.match(/\[\s*"[\s\S]*?\]/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed) && parsed.length > 0) {
          console.log("[LLM] Parsed stress test advice:", parsed.length, "items");
          return parsed;
        }
      } catch {
        // Try to fix truncated JSON
        const fixedJson = jsonMatch[0].replace(/,?\s*"[^"]*$/, "") + "]";
        try {
          const parsed = JSON.parse(fixedJson);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        } catch { /* fall through */ }
      }
    }
    console.error("[LLM] Could not parse stress advice JSON:", text.substring(0, 300));
    return [];
  } catch (error) {
    console.error("[LLM] Stress test advice error:", error);
    return [];
  }
}

export type { SandboxContext, ClientInsightData, AdvisorInsightData, StressTestContext };
