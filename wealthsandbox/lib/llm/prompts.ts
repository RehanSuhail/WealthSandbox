// â”€â”€â”€ LLM Prompt Templates â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Enterprise-grade prompts for LPL Financial WealthSandbox.
// Differentiated prompts for advisors (CFP/CFA level) vs clients (accessible).
// Covers: sequence-of-returns risk, behavioral finance, tax optimization,
// estate planning, benchmarking, market regime awareness, and goal gap analysis.

import type { InsightCategory, InsightPriority } from "@/lib/types";

export interface SandboxContext {
  portfolioType: string;
  sliderState: Record<string, number | string>;
  goals: Array<{ label: string; targetYear: number; targetAmount: number }>;
  simulationResults: {
    p50AtRetirement: number;
    probabilityOfSuccess: number;
    fundsLastToAge: number;
    monthlySustainableWithdrawal: number;
  };
  stressTests?: Array<{
    scenario: string;
    impactPct: number;
  }>;
  userAge?: number;
  riskLevel?: string;
  // Extended context for advanced analysis
  benchmarkReturn?: number;   // e.g. 10.0 for S&P 500 long-term avg
  taxBracket?: number;        // marginal federal bracket %
  stateTax?: number;          // state tax %
  netWorth?: number;          // total estimated net worth
  yearsToRetirement?: number;
  familyStatus?: string;
  hasAdvisor?: boolean;
  // advisor-only fields
  clientName?: string;
  advisorName?: string;
}

export interface ClientInsightData {
  category: InsightCategory;
  priority: InsightPriority;
  title: string;
  body: string;
  suggestedAction: string;
  confidenceNote?: string;    // plain-language confidence/limitation note
  impactScore?: number;       // 1-10 scale of financial impact
}

export interface AdvisorInsightData {
  category: InsightCategory;
  priority: InsightPriority;
  title: string;
  technicalAnalysis: string;
  recoveryActions: string[];
  reviewFlag: boolean;
  benchmarkDelta?: string;    // vs benchmark
  riskAdjustedNote?: string;  // Sharpe/Sortino observation
  complianceNote?: string;    // suitability / compliance observation
}

// â”€â”€â”€ Portfolio type labels and advanced context builders â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const TYPE_LABEL: Record<string, string> = {
  retirement: "Retirement Planning",
  equity: "General Equity/Investment",
  realestate: "Real Estate Investment",
  college: "Education/College Savings",
  emergency: "Emergency Fund",
  custom: "Custom Portfolio",
};

function getPortfolioTypeLabel(portfolioType: string): string {
  return TYPE_LABEL[portfolioType] || portfolioType;
}

function buildAdvancedDataBlock(context: SandboxContext): string {
  const sim = context.simulationResults;
  const ss = context.sliderState;
  const typeName = getPortfolioTypeLabel(context.portfolioType);

  const prob = (sim.probabilityOfSuccess * 100).toFixed(1);
  const p50 = Math.round(sim.p50AtRetirement).toLocaleString();
  const fla = sim.fundsLastToAge;
  const msw = Math.round(sim.monthlySustainableWithdrawal).toLocaleString();

  // Derive advanced metrics
  const age = context.userAge || Number(ss.currentAge) || 40;
  const retireAge = Number(ss.retirementAge) || 65;
  const yearsToRetire = Math.max(0, retireAge - age);
  const currentSavings = Number(ss.currentSavings) || Number(ss.currentBalance) || Number(ss.lumpSum) || 0;
  const monthly = Number(ss.monthlyContribution) || Number(ss.monthlyDca) || 0;
  const stockPct = Number(ss.stockPct) || 70;
  const bondPct = Number(ss.bondPct) || (100 - stockPct);
  const withdrawalRate = sim.p50AtRetirement > 0 && sim.monthlySustainableWithdrawal > 0
    ? ((sim.monthlySustainableWithdrawal * 12) / sim.p50AtRetirement * 100).toFixed(2)
    : "N/A";

  // Sequence of returns risk signal
  const sorRisk = stockPct > 80 && yearsToRetire < 10 ? "HIGH" : stockPct > 60 && yearsToRetire < 15 ? "ELEVATED" : "MODERATE";

  // Tax context
  const taxNote = context.taxBracket
    ? `Tax bracket: ${context.taxBracket}%${context.stateTax ? ` + ${context.stateTax}% state` : ""}`
    : "";

  // Goals section
  const goalsText = context.goals?.length
    ? `Goals:\n${context.goals.map(g => {
        const yrs = g.targetYear - new Date().getFullYear();
        const fundingNeeded = g.targetAmount - currentSavings;
        const impliedMonthly = fundingNeeded > 0 && yrs > 0
          ? Math.round(fundingNeeded / (yrs * 12)).toLocaleString()
          : "0";
        return `  â€¢ ${g.label}: $${g.targetAmount.toLocaleString()} by ${g.targetYear} (${yrs}yr) â€” implied monthly needed: $${impliedMonthly}`;
      }).join("\n")}`
    : "Goals: None defined";

  // Stress tests
  const stressText = context.stressTests?.length
    ? `Stress test results:\n${context.stressTests.map(s => `  â€¢ ${s.scenario}: âˆ’${s.impactPct}% portfolio impact`).join("\n")}`
    : "";

  // Benchmark context
  const benchmarkText = context.benchmarkReturn
    ? `Benchmark (S&P 500 avg): ${context.benchmarkReturn}% annual`
    : "";

  return `PORTFOLIO TYPE: ${typeName}
CLIENT PROFILE:
  â€¢ Age: ${age} | Retirement Age Target: ${retireAge} | Years to Retire: ${yearsToRetire}
  â€¢ Risk Profile: ${context.riskLevel || "Not specified"} | Family Status: ${context.familyStatus || "Not specified"}
  ${taxNote ? `â€¢ ${taxNote}` : ""}
  ${context.netWorth ? `â€¢ Estimated Net Worth: $${context.netWorth.toLocaleString()}` : ""}

PORTFOLIO STATE:
  â€¢ Current Savings/Principal: $${currentSavings.toLocaleString()}
  â€¢ Monthly Contribution: $${monthly.toLocaleString()}/mo
  â€¢ Asset Allocation: ${stockPct}% equities / ${bondPct}% fixed income${100 - stockPct - bondPct > 0 ? ` / ${100 - stockPct - bondPct}% alternatives` : ""}
  â€¢ Sequence-of-Returns Risk Level: ${sorRisk}

MONTE CARLO RESULTS (10,000 simulations):
  â€¢ Probability of Success: ${prob}%
  â€¢ P50 Projected Value at Retirement: $${p50}
  â€¢ Funds Last to Age: ${fla}${fla >= 90 ? "+" : ""}
  â€¢ Sustainable Monthly Withdrawal: $${msw}/mo (${withdrawalRate}% withdrawal rate)
  ${benchmarkText ? `â€¢ ${benchmarkText}` : ""}

${goalsText}
${stressText}`;
}

// â”€â”€â”€ Combined insight prompt (one API call for both client + advisor) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function buildCombinedInsightPrompt(context: SandboxContext): string {
  const typeName = getPortfolioTypeLabel(context.portfolioType);
  const sim = context.simulationResults;
  const ss = context.sliderState;
  const age = context.userAge || Number(ss.currentAge) || 40;
  const retireAge = Number(ss.retirementAge) || 65;
  const prob = sim.probabilityOfSuccess * 100;
  const stockPct = Number(ss.stockPct) || 70;

  // Context-aware category weighting based on portfolio state
  const criticalCategories: string[] = [];
  if (prob < 70) criticalCategories.push("retirement_gap (CRITICAL â€” probability below threshold)");
  if (sim.fundsLastToAge < 85) criticalCategories.push("crisis_vulnerability (funds depletion risk)");
  if (context.goals?.length > 0) criticalCategories.push("goal_funding (active goals detected)");
  if (stockPct > 85 || stockPct < 20) criticalCategories.push("opportunity (asset allocation imbalance)");
  if (retireAge - age < 10 && stockPct > 70) criticalCategories.push("review_trigger (approaching retirement with high equity exposure)");

  const dataBlock = buildAdvancedDataBlock(context);

  return `You are an enterprise financial planning AI at LPL Financial, the nation's largest independent broker-dealer. Analyze this ${typeName} sandbox and generate exactly 5 CLIENT insights and 5 ADVISOR insights.

${dataBlock}

â•â•â•â•â•â•â•â•â•â•â• CLIENT INSIGHT REQUIREMENTS â•â•â•â•â•â•â•â•â•â•â•
Generate 5 insights for a NON-EXPERT client. Use warm, clear, empowering language.
Each insight must:
- Be specific to THIS client's numbers (age ${age}, ${prob.toFixed(0)}% success rate, retirement age ${retireAge})
- Address a DIFFERENT financial dimension
- Include a concrete, immediate action they can take today
- Avoid jargon â€” explain any financial term you use
- Acknowledge emotional context (retirement stress, fear of outliving savings, etc.)
- Connect to their life, not just numbers

CLIENT insight categories to cover: retirement_gap, crisis_vulnerability, goal_funding, opportunity, review_trigger
${criticalCategories.length > 0 ? `PRIORITIZE these critical areas first: ${criticalCategories.join("; ")}` : ""}

â•â•â•â•â•â•â•â•â•â•â• ADVISOR INSIGHT REQUIREMENTS â•â•â•â•â•â•â•â•â•â•â•
Generate 5 insights for a licensed CFP/CFA advisor. Use technical financial language.
Each insight must:
- Provide quantitative analysis with specific numbers from the simulation data
- Reference industry benchmarks, withdrawal rate standards (e.g., 4% rule variants), sequence-of-returns risk frameworks
- Include suitability and compliance considerations
- Suggest specific planning techniques: Roth conversion ladders, tax-loss harvesting, glide-path adjustments, bucket strategies, Social Security optimization
- Assess whether this client needs immediate advisor review
- Note any behavioral finance risks (recency bias, panic selling, anchoring)

â•â•â•â•â•â•â•â•â•â•â• OUTPUT FORMAT â•â•â•â•â•â•â•â•â•â•â•
OUTPUT exactly this JSON object (no markdown fences, no extra text):
{
  "client": [
    {
      "category": "retirement_gap|crisis_vulnerability|goal_funding|opportunity|review_trigger",
      "priority": "high|medium|low",
      "title": "Specific, actionable title (max 8 words)",
      "body": "2-3 warm, clear sentences using their actual numbers. No jargon. Acknowledge the emotional reality of their situation.",
      "suggestedAction": "One concrete step they can take this week with a specific number or timeframe",
      "confidenceNote": "Brief note on simulation confidence level",
      "impactScore": 1-10
    }
  ],
  "advisor": [
    {
      "category": "retirement_gap|crisis_vulnerability|goal_funding|opportunity|review_trigger",
      "priority": "high|medium|low",
      "title": "Technical finding title for advisor (CFP-level)",
      "technicalAnalysis": "2-3 sentences with quantitative analysis: cite probability %, withdrawal rates, Sharpe ratio implications, sequence-of-returns risk, benchmark comparisons, or tax drag calculations",
      "recoveryActions": ["3-4 specific CFP-level interventions with techniques, timelines, and measurable targets"],
      "reviewFlag": true|false,
      "benchmarkDelta": "Performance vs benchmark if applicable",
      "riskAdjustedNote": "Risk-adjusted performance observation",
      "complianceNote": "Suitability assessment or compliance flag"
    }
  ]
}

COMPLIANCE RULES (mandatory):
- These are Monte Carlo projections, not guarantees
- Never recommend specific securities, tickers, mutual funds, or insurance products by name
- Never provide specific tax advice â€” suggest consulting a tax professional
- For estate planning, suggest consulting an estate attorney
- Spread priorities across high/medium/low â€” realistic distribution, not all high
- Each of the 5 client insights and 5 advisor insights must address a distinctly different topic`;
}

// â”€â”€â”€ Stress test recovery advice prompt â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface StressTestContext {
  portfolioType: string;
  scenarioName: string;
  scenarioDescription: string;
  currentAge: number;
  retirementAge: number;
  currentSavings: number;
  monthlyContribution: number;
  stockPct: number;
  baseWealth: number;
  stressedWealth: number;
  impactPct: number;
  riskLevel?: string;
  taxBracket?: number;
  familyStatus?: string;
}

export function buildStressTestAdvicePrompt(ctx: StressTestContext): string {
  const typeName = getPortfolioTypeLabel(ctx.portfolioType);
  const yearsToRetire = ctx.retirementAge - ctx.currentAge;
  const dollarLoss = (ctx.baseWealth - ctx.stressedWealth).toLocaleString();
  const recoveryImplication = yearsToRetire < 10
    ? "near-retirement client with limited recovery runway"
    : yearsToRetire < 20
    ? "mid-career client with moderate recovery time"
    : "early-career client with ample recovery time";

  // Portfolio-specific resilience strategies
  const resilienceStrategiesByType: Record<string, string> = {
    retirement: [
      "(1) 401k/IRA contribution timing during market dislocations â€” capitalize on lower NAV via systematic contributions",
      "(2) Asset allocation glide-path adjustments â€” de-risking equity exposure as retirement approaches",
      "(3) Social Security optimization â€” delaying SS to age 70 as a longevity hedge",
      "(4) Bucket strategy implementation â€” segmenting assets by time horizon to avoid sequence-of-returns risk",
      "(5) Roth conversion opportunities â€” using market drawdowns to convert at lower tax cost",
    ].join("; "),
    equity: [
      "(1) Dollar-cost averaging through volatility â€” systematic investment regardless of market level",
      "(2) Sector and factor diversification â€” reducing concentration risk",
      "(3) Tax-loss harvesting â€” capturing losses to offset future gains",
      "(4) Volatility-targeting rebalancing â€” trimming winners, adding to laggards systematically",
      "(5) International diversification â€” reducing home-country bias with non-correlated returns",
    ].join("; "),
    realestate: [
      "(1) Cash reserve sizing for vacancy and maintenance during economic downturns",
      "(2) Debt service coverage ratio management during rising rate environments",
      "(3) Rental pricing strategy during recessionary periods",
      "(4) Property type diversification â€” multifamily vs commercial vs residential",
      "(5) REIT exposure as a liquid complement to direct real estate holdings",
    ].join("; "),
    college: [
      "(1) 529 plan contribution acceleration during market dips â€” buying at lower prices",
      "(2) Age-based allocation glide-path tightening as enrollment date approaches",
      "(3) Financial aid strategy â€” timing asset positioning for FAFSA calculation years",
      "(4) Coverdell ESA and UTMA account tax diversification",
      "(5) Income share agreements and scholarship pipeline as funding backstops",
    ].join("; "),
    emergency: [
      "(1) High-yield savings account vs money market fund optimization for maximum yield",
      "(2) I-Bond allocation for inflation-protected emergency liquidity",
      "(3) Home equity line of credit (HELOC) as a secondary emergency backstop",
      "(4) Insurance audit â€” disability, umbrella, and life insurance as emergency risk reducers",
      "(5) Income diversification â€” side income streams to maintain contributions during primary income disruption",
    ].join("; "),
  };

  const strategies = resilienceStrategiesByType[ctx.portfolioType] || resilienceStrategiesByType.retirement;

  return `You are a senior financial planning specialist at LPL Financial. A client just stress-tested their ${typeName} portfolio against the "${ctx.scenarioName}" historical crisis. Generate exactly 5 specific, quantified preparedness strategies written as a professional financial educator.

â•â•â•â•â•â•â•â•â•â•â• CRISIS SCENARIO â•â•â•â•â•â•â•â•â•â•â•
Crisis: "${ctx.scenarioName}"
${ctx.scenarioDescription}

â•â•â•â•â•â•â•â•â•â•â• CLIENT PROFILE & IMPACT â•â•â•â•â•â•â•â•â•â•â•
Portfolio type: ${typeName}
Client profile: Age ${ctx.currentAge} | Target retirement age ${ctx.retirementAge} | ${yearsToRetire} years remaining | ${recoveryImplication}
Current savings: $${ctx.currentSavings.toLocaleString()} | Monthly contribution: $${ctx.monthlyContribution.toLocaleString()}/mo
Equity allocation: ${ctx.stockPct}% stocks
${ctx.riskLevel ? `Risk tolerance: ${ctx.riskLevel}` : ""}
${ctx.taxBracket ? `Tax bracket: ${ctx.taxBracket}%` : ""}

SIMULATION IMPACT:
  Baseline projected value:        $${ctx.baseWealth.toLocaleString()}
  Value under "${ctx.scenarioName}": $${ctx.stressedWealth.toLocaleString()}
  Portfolio impact:                âˆ’${ctx.impactPct}% (lost $${dollarLoss})

â•â•â•â•â•â•â•â•â•â•â• STRATEGY REQUIREMENTS â•â•â•â•â•â•â•â•â•â•â•
Generate exactly 5 preparedness strategies, covering these distinct angles:
${strategies}

Each strategy must:
1. Reference specific details of the "${ctx.scenarioName}" crisis (what happened, timeline, magnitude)
2. Use this client's EXACT numbers: age ${ctx.currentAge}, $${ctx.monthlyContribution.toLocaleString()}/mo, ${ctx.stockPct}% stocks, ${yearsToRetire} years to retire, âˆ’${ctx.impactPct}% impact
3. Be quantified â€” include percentages, dollar amounts, or timeframes where applicable
4. Explain the MECHANISM (why this strategy works against this specific type of crisis)
5. Be written in professional but accessible language â€” no jargon without explanation

OUTPUT exactly a JSON array of 5 strings (no markdown fences, no wrapper object):
["strategy 1", "strategy 2", "strategy 3", "strategy 4", "strategy 5"]

COMPLIANCE: Never recommend specific securities, funds, tickers, or insurance products by name. These are general educational strategies, not personalized financial advice. Past crisis patterns do not guarantee future results.`;
}

// Legacy wrappers (kept for backward compat, but prefer buildCombinedInsightPrompt)
export function buildClientInsightPrompt(context: SandboxContext): string {
  return buildCombinedInsightPrompt(context);
}

export function buildAdvisorInsightPrompt(context: SandboxContext): string {
  return buildCombinedInsightPrompt(context);
}

// â”€â”€â”€ Advisor-specific deep analysis prompt â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function buildAdvisorDeepAnalysisPrompt(context: SandboxContext & { clientName?: string }): string {
  const typeName = getPortfolioTypeLabel(context.portfolioType);
  const dataBlock = buildAdvancedDataBlock(context);
  const clientLabel = context.clientName ? `for client "${context.clientName}"` : "";
  const prob = (context.simulationResults.probabilityOfSuccess * 100).toFixed(0);

  return `You are a senior financial planning specialist at LPL Financial conducting a comprehensive portfolio analysis ${clientLabel}. This analysis is for an advisor's eyes only â€” use full technical CFP/CFA-level language.

${dataBlock}

GENERATE A COMPREHENSIVE ADVISOR ANALYSIS covering:

1. PORTFOLIO HEALTH ASSESSMENT
   - Monte Carlo interpretation: what does the ${prob}% success rate mean in context of industry benchmarks (70% is minimum acceptable, 85%+ is target)?
   - Withdrawal rate analysis vs 4% rule variants (Bengen, Kitces, dynamic withdrawal strategies)
   - Sequence-of-returns risk quantification given current equity allocation

2. RISK-ADJUSTED PERFORMANCE INDICATORS
   - Asset allocation assessment vs age-appropriate target
   - Volatility drag estimation
   - Downside risk exposure from stress tests if available

3. PLANNING GAPS & OPPORTUNITIES
   - Identify the 3 most critical gaps with quantified impact
   - Tax optimization opportunities (bracket management, Roth conversions, loss harvesting)
   - Social Security optimization potential if retirement sandbox

4. BEHAVIORAL FINANCE OBSERVATIONS
   - Signs of over-conservatism or overconfidence in settings
   - Common cognitive biases that may be affecting this client's plan

5. RECOMMENDED ADVISOR ACTIONS
   - Ranked list of specific interventions with urgency levels
   - Client conversation talking points
   - Compliance/suitability flags

OUTPUT as a structured JSON (no markdown fences):
{
  "overallHealthScore": 0-100,
  "healthLabel": "Excellent|Strong|Healthy|Needs Attention|At Risk|Critical",
  "keyRisks": ["risk 1", "risk 2", "risk 3"],
  "opportunities": ["opp 1", "opp 2", "opp 3"],
  "withdrawalRateAssessment": "string",
  "sorRiskLevel": "Low|Moderate|Elevated|High",
  "recommendedActions": [{"action": "string", "urgency": "immediate|30-days|quarterly", "impact": "high|medium|low"}],
  "clientTalkingPoints": ["point 1", "point 2", "point 3"],
  "complianceFlags": [],
  "executiveSummary": "3-4 sentence professional summary"
}

COMPLIANCE: Never recommend specific securities. Flag any suitability concerns. These are planning observations only.`;
}

// â”€â”€â”€ Advisor portfolio comparison prompt â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function buildAdvisorPortfolioComparisonPrompt(
  clients: Array<{
    name: string;
    portfolioType: string;
    probabilityOfSuccess: number;
    fundsLastToAge: number;
    riskLevel: string;
    age: number;
    retirementAge: number;
  }>
): string {
  const clientSummaries = clients
    .sort((a, b) => a.probabilityOfSuccess - b.probabilityOfSuccess)
    .map((c, i) => {
      const urgency = c.probabilityOfSuccess < 0.65 ? "CRITICAL" : c.probabilityOfSuccess < 0.75 ? "NEEDS REVIEW" : "OK";
      return `${i + 1}. ${c.name} | Age ${c.age} â†’ ${c.retirementAge} | ${c.portfolioType} | P(success): ${(c.probabilityOfSuccess * 100).toFixed(0)}% [${urgency}] | Funds to: ${c.fundsLastToAge}`;
    })
    .join("\n");

  return `You are a financial advisor at LPL Financial reviewing your full client book for portfolio health. Analyze this client roster and generate a practice management report.

CLIENT ROSTER:
${clientSummaries}

GENERATE:
1. CLIENTS NEEDING IMMEDIATE ATTENTION (P(success) < 70% or funds_last < 80)
2. PORTFOLIO TRENDS â€” common risks across your book
3. PRACTICE MANAGEMENT RECOMMENDATIONS â€” who to meet with first
4. REGULATORY CONSIDERATIONS â€” any suitability flags

OUTPUT as JSON (no markdown fences):
{
  "urgentClients": [{"name": "string", "reason": "string", "priority": 1-10}],
  "bookHealthScore": 0-100,
  "commonRisks": ["risk 1", "risk 2"],
  "meetingPriorities": [{"name": "string", "suggestedTopic": "string"}],
  "practiceInsights": ["insight 1", "insight 2"]
}`;
}

// â”€â”€â”€ Scoped chatbot prompt (role-aware: advisor vs client) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function buildScopedChatSystemPrompt(
  context: SandboxContext | null,
  userRole: "advisor" | "client" = "client"
): string {
  const typeName = context
    ? getPortfolioTypeLabel(context.portfolioType)
    : "financial planning";

  let sliderDetail = "";
  if (context) {
    const ss = context.sliderState;
    const entries = Object.entries(ss).filter(([, v]) => v !== undefined && v !== null);
    if (entries.length > 0) {
      sliderDetail = `\nDETAILED SANDBOX PARAMETERS:\n${entries.map(([k, v]) => `  â€¢ ${k}: ${v}`).join("\n")}`;
    }
  }

  const scope = context
    ? `
â•â•â•â•â•â•â•â•â•â•â•â• CURRENT SANDBOX STATE â•â•â•â•â•â•â•â•â•â•â•â•
Portfolio Type: ${typeName}
Client Age: ${context.userAge || "Unknown"} | Risk Profile: ${context.riskLevel || "Not set"} | Family: ${context.familyStatus || "Not set"}

Key Inputs:
  â€¢ Current Savings: $${Number(context.sliderState.currentSavings || 0).toLocaleString()}
  â€¢ Monthly Contribution: $${Number(context.sliderState.monthlyContribution || 0).toLocaleString()}/mo
  â€¢ Target Retirement Age: ${context.sliderState.retirementAge || "N/A"}
  â€¢ Equity Allocation: ${context.sliderState.stockPct || "N/A"}%

Monte Carlo Results (10,000 simulations):
  â€¢ Probability of Success: ${(context.simulationResults.probabilityOfSuccess * 100).toFixed(1)}%
  â€¢ Projected Value at Retirement (P50): $${Math.round(context.simulationResults.p50AtRetirement).toLocaleString()}
  â€¢ Funds Last to Age: ${context.simulationResults.fundsLastToAge}${context.simulationResults.fundsLastToAge >= 90 ? "+" : ""}
  â€¢ Sustainable Monthly Withdrawal: $${Math.round(context.simulationResults.monthlySustainableWithdrawal).toLocaleString()}/mo
${context.goals.length ? `\nFinancial Goals:\n${context.goals.map(g => `  â€¢ ${g.label}: $${g.targetAmount.toLocaleString()} by ${g.targetYear}`).join("\n")}` : ""}
${context.stressTests?.length ? `\nCompleted Stress Tests:\n${context.stressTests.map(s => `  â€¢ ${s.scenario}: âˆ’${s.impactPct}% impact`).join("\n")}` : ""}${sliderDetail}`
    : "\nNo sandbox loaded â€” providing general financial planning guidance.";

  const isAdvisor = userRole === "advisor";

  const expertiseBlock = isAdvisor
    ? `You speak at CFP/CFA level. Use technical language freely: sequence-of-returns risk, Monte Carlo interpretation, withdrawal rate strategies (4% rule, dynamic withdrawal, flooring-and-upside), Roth conversion ladders, tax-loss harvesting, asset location, glide path, IRMAA thresholds, RMDs, Social Security optimization, and practice management. When you identify compliance concerns, explicitly flag them.`
    : `You explain financial concepts in plain English. When you use a financial term, briefly define it. Be warm and encouraging â€” financial planning can feel overwhelming, and your job is to make it approachable and empowering.`;

  const scopeBlock = isAdvisor
    ? `Advanced portfolio analytics, suitability assessment, planning techniques, comparative analysis, compliance context, behavioral finance, practice management, regulatory context (FINRA, SEC, DOL fiduciary), estate planning, tax optimization strategies.`
    : `Retirement savings strategies, investment basics, how Monte Carlo simulations work, what probability of success means, how to improve their plan, goal setting, emergency fund basics, dollar-cost averaging, compound interest, inflation impact, Social Security basics, and their specific sandbox settings.`;

  const toneBlock = isAdvisor
    ? `Professional, precise, and efficient. Advisors want quick, quantified, actionable insights.`
    : `Warm, encouraging, clear. Clients deserve to feel confident, not confused. Use analogies to explain complex ideas.`;

  const restrictionBlock = isAdvisor
    ? `Provide category-level guidance; product selection requires full suitability analysis. Always include suitability and compliance context.`
    : `Never use unexplained jargon. For taxes or legal matters, say "Your advisor or a tax professional can give you personalized guidance on that." Never recommend specific investment products.`;

  return `You are ${isAdvisor ? "WealthAdvisor AI, your professional financial planning assistant at LPL Financial" : "WealthBot, your friendly financial planning guide at WealthSandbox by LPL Financial"}.

${expertiseBlock}

WHAT YOU CAN DISCUSS:
${scopeBlock}

YOUR TONE:
${toneBlock}

IMPORTANT RULES:
1. When the user asks about their specific portfolio values, numbers, or simulation results â€” answer directly and precisely using the sandbox data below. Never claim you don't have access to data that's shown below.
2. ${restrictionBlock}
3. When asked about changing settings, explain the likely effect AND suggest they try it with the sliders to see the simulation update.
4. For topics unrelated to finance, say: "I'm focused on your financial planning â€” let me know what I can help you explore about your sandbox or financial goals."
5. All projections are Monte Carlo estimates, not guarantees. Remind users of this when discussing specific numbers.
6. Keep responses focused: 3-6 sentences typically, unless the user asks for detail.
7. ${isAdvisor ? "When you identify a compliance concern, explicitly flag it with [COMPLIANCE NOTE]." : "If a question needs a real advisor, say: 'Your advisor can give you personalized guidance on that â€” consider sharing this sandbox with them.'"}
${scope}`;
}

// Legacy wrapper
export function buildChatSystemPrompt(context: SandboxContext): string {
  return buildScopedChatSystemPrompt(context, "client");
}

// â”€â”€â”€ Portfolio health score prompt â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function buildPortfolioHealthScorePrompt(context: SandboxContext): string {
  const dataBlock = buildAdvancedDataBlock(context);
  return `You are a portfolio health scoring system at LPL Financial. Calculate a 0-100 health score for this portfolio.

${dataBlock}

SCORING CRITERIA:
- Probability of success (40 points): 90%+ = 40, 80-89% = 32, 70-79% = 24, 60-69% = 16, <60% = 8
- Funds longevity (25 points): age 95+ = 25, 90-94 = 20, 85-89 = 15, 80-84 = 10, <80 = 5
- Withdrawal sustainability (20 points): â‰¤4% rate = 20, 4-5% = 15, 5-6% = 10, >6% = 5
- Goal alignment (15 points): All funded = 15, Partial = 8, None defined = 10

OUTPUT as JSON (no markdown fences):
{
  "score": 0-100,
  "grade": "A|B|C|D|F",
  "label": "Excellent|Strong|Healthy|Needs Attention|At Risk|Critical",
  "breakdown": {"successRate": 0-40, "fundsLongevity": 0-25, "withdrawalSustainability": 0-20, "goalAlignment": 0-15},
  "primaryStrength": "one sentence",
  "primaryWeakness": "one sentence",
  "nextBestAction": "one specific action with a number or timeframe"
}`;
}
