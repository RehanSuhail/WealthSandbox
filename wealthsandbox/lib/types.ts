// ─── Shared TypeScript types (API contracts) ─────────────────────────────────
// These types define the data model for WealthSandbox.
// When migrating to AWS, these become the DynamoDB document shapes.

export type Role = "client" | "advisor";

export type PortfolioType =
  | "retirement"
  | "equity"
  | "realestate"
  | "college"
  | "emergency"
  | "custom";

export type RiskLevel =
  | "conservative"
  | "moderate_low"
  | "moderate"
  | "moderate_high"
  | "aggressive";

export type FamilyStatus = "single" | "married" | "married_kids";

export type InsightScope = "client" | "advisor";
export type InsightPriority = "high" | "medium" | "low";
export type InsightCategory =
  | "retirement_gap"
  | "crisis_vulnerability"
  | "goal_funding"
  | "opportunity"
  | "review_trigger";
export type InsightStatus = "active" | "resolved" | "sent_to_advisor";

export type ConnectionStatus = "pending" | "accepted" | "declined" | "expired";

// ─── Advanced Financial Analysis Types ────────────────────────────────────────

export type HealthGrade = "A" | "B" | "C" | "D" | "F";
export type HealthLabel = "Excellent" | "Strong" | "Healthy" | "Needs Attention" | "At Risk" | "Critical";
export type UrgencyLevel = "immediate" | "30-days" | "quarterly";
export type SoRRiskLevel = "Low" | "Moderate" | "Elevated" | "High";

export interface PortfolioHealthScore {
  score: number;           // 0-100
  grade: HealthGrade;
  label: HealthLabel;
  breakdown: {
    successRate: number;           // 0-40
    fundsLongevity: number;        // 0-25
    withdrawalSustainability: number; // 0-20
    goalAlignment: number;         // 0-15
  };
  primaryStrength: string;
  primaryWeakness: string;
  nextBestAction: string;
  computedAt: string;
}

export interface RiskMetrics {
  sharpeRatio?: number;          // risk-adjusted return
  sortinoRatio?: number;         // downside-only risk
  maxDrawdown?: number;          // worst peak-to-trough %
  volatilityAnnualized?: number; // annualized std dev %
  valueAtRisk95?: number;        // 95% VaR (dollar or %)
  sequenceRisk: SoRRiskLevel;
  betaVsSP500?: number;
}

export interface BenchmarkComparison {
  benchmarkName: string;         // "S&P 500", "60/40 Blended", etc.
  benchmarkReturn: number;       // annualized %
  portfolioReturn: number;       // annualized % (estimated)
  alphaBps: number;              // basis points alpha vs benchmark
  trackingError?: number;
  informationRatio?: number;
}

export interface LifeEvent {
  id: string;
  userId: string;
  type: "marriage" | "divorce" | "child_birth" | "job_change" | "inheritance" | "home_purchase" | "business_start" | "disability" | "retirement" | "other";
  label: string;
  date: string;
  financialImpact?: number;      // estimated $ impact
  notes?: string;
  linkedSandboxIds?: string[];
  createdAt: string;
}

export interface AdvisorAlert {
  id: string;
  advisorId: string;
  clientId: string;
  clientName: string;
  type: "portfolio_drift" | "success_rate_drop" | "goal_off_track" | "review_due" | "high_priority_insight" | "sandbox_shared" | "stress_test_critical";
  severity: "critical" | "warning" | "info";
  title: string;
  body: string;
  sandboxId?: string;
  acknowledged: boolean;
  createdAt: string;
  expiresAt?: string;
}

export interface AdvisorAnalytics {
  advisorId: string;
  totalClients: number;
  totalAum: number;
  aum30DayChange: number;        // % change
  avgPortfolioHealth: number;    // 0-100
  clientsNeedingReview: number;
  clientsAtRisk: number;         // P(success) < 65%
  clientsOnTrack: number;        // P(success) >= 85%
  totalSandboxes: number;
  totalInsightsGenerated: number;
  meetingsScheduled: number;
  avgClientAge: number;
  riskDistribution: Record<RiskLevel, number>; // count per risk level
  updatedAt: string;
}

export interface GoalProgress {
  goalId: string;
  label: string;
  targetAmount: number;
  targetYear: number;
  currentProjected: number;      // from latest simulation
  fundingProgress: number;       // 0-100% (currentProjected / targetAmount)
  onTrack: boolean;
  monthlyShortfall: number;      // how much more/month needed to fund
  status: "on_track" | "slightly_behind" | "at_risk" | "underfunded";
}

export interface WithdrawalStrategyAnalysis {
  strategy: "4pct_rule" | "dynamic" | "bucket" | "floor_and_upside";
  safeWithdrawalRate: number;    // %
  monthlySustainable: number;    // $
  portfoiloLifespan: number;     // to age
  legacyRemaining: number;       // estimated at death
  successProbability: number;    // 0-1
}

export interface ScenarioComparison {
  id: string;
  sandboxId: string;
  baselineSessionId: string;
  comparisonSessionId: string;
  label: string;
  deltaP50: number;              // $ difference in P50
  deltaProbSuccess: number;      // % point difference
  deltaFundsLastAge: number;     // years difference
  createdAt: string;
}

// ─── User ─────────────────────────────────────────────────────────────────────

export interface DebtInfo {
  enabled: boolean;
  amount: number;
  payment: number;
}

export interface UserProfile {
  name: string;
  dob: string;
  age: number;
  familyStatus: FamilyStatus;
  kidAges: number[];
  state: string;
  savings: number;
  income: number;
  expenses: number;
  debt: {
    mortgage?: DebtInfo;
    student?: DebtInfo;
    other?: DebtInfo;
  };
  goals: GoalDefinition[];
  riskAnswers: Record<string, string>;
  riskScore: RiskLevel;
  suggestedPortfolioType: PortfolioType;
  // Enhanced fields
  taxBracket?: number;           // marginal federal bracket %
  stateTax?: number;             // state income tax %
  netWorth?: number;             // total net worth estimate
  employerMatch?: number;        // % employer 401k match
  socialSecurityEstimate?: number; // monthly SS estimate at 67
  lifeInsuranceCoverage?: number;
  hasWill?: boolean;
  hasPowerOfAttorney?: boolean;
}

export interface User {
  id: string;
  clerkId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  onboardingComplete: boolean;
  profile: UserProfile | null;
  advisorId: string | null;
  createdAt: string;
  updatedAt: string;
  archived: boolean;
}

// ─── Goals ────────────────────────────────────────────────────────────────────

export interface GoalDefinition {
  id: string;
  type: string;
  label: string;
  targetYear: number;
  targetAmount: number;
  details?: Record<string, unknown>;
  // Enhanced goal tracking
  priority?: "must_have" | "want_to_have" | "nice_to_have";
  currentProgress?: number;      // % funded
  linkedSandboxId?: string;
}

// ─── Sandbox ──────────────────────────────────────────────────────────────────

export interface SliderState {
  [key: string]: number | string | boolean | null;
}

export interface Sandbox {
  id: string;
  userId: string;
  name: string;
  portfolioType: PortfolioType;
  sliderState: SliderState;
  goals: GoalDefinition[];
  sharedWithAdvisor: boolean;
  advisorNotes: AdvisorNote[];
  sourceSandboxId?: string;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
  // Enhanced fields
  tags?: string[];               // e.g., ["primary", "optimistic", "conservative"]
  healthScore?: PortfolioHealthScore;
  riskMetrics?: RiskMetrics;
  benchmarkComparison?: BenchmarkComparison;
  lastAnalyzedAt?: string;
}

// ─── Advisor Note ─────────────────────────────────────────────────────────────

export interface AdvisorNote {
  id: string;
  advisorId: string;
  advisorName: string;
  text: string;
  createdAt: string;
  // Enhanced fields
  category?: "general" | "action_required" | "compliance" | "opportunity";
  isHighPriority?: boolean;
}

// ─── Notification ─────────────────────────────────────────────────────────────

export interface Notification {
  id: string;
  userId: string;        // recipient
  type: "advisor_note" | "insight" | "sandbox_shared" | "meeting_reminder" | "goal_milestone" | "portfolio_alert";
  title: string;
  body: string;
  sandboxId?: string;
  read: boolean;
  createdAt: string;
  actionUrl?: string;
  priority?: "urgent" | "normal" | "low";
}

// ─── Meeting ──────────────────────────────────────────────────────────────────

export interface Meeting {
  id: string;
  advisorId: string;
  clientId: string;
  advisorName: string;
  clientName: string;
  title: string;
  description: string;
  scheduledAt: string;
  duration: number; // minutes
  status: "scheduled" | "completed" | "cancelled";
  createdAt: string;
  // Enhanced fields
  meetingType?: "review" | "onboarding" | "planning" | "urgent_review" | "annual";
  sandboxIds?: string[];         // sandboxes to review in meeting
  agendaItems?: string[];
  meetingNotes?: string;         // post-meeting notes
  followUpActions?: string[];
  videoLink?: string;
}

// ─── Session ──────────────────────────────────────────────────────────────────

export interface StressTestResult {
  scenario: string;
  description: string;
  baseWealth: number;
  stressedWealth: number;
  impactPct: number;
  recoveryActions: string[];
  runAt: string;
}

export interface Session {
  id: string;
  sandboxId: string;
  userId: string;
  name: string;
  sessionType: string; // "auto" | "manual" | "stress_test" | "insight_generation"
  sliderState: SliderState;
  goals: GoalDefinition[];
  chartP10: number[];
  chartP50: number[];
  chartP90: number[];
  probSuccess: number;
  fundsLastToAge: number;
  monthlySustainableWithdrawal: number;
  stressTestsRun: StressTestResult[];
  chatExcerpts: ChatMessage[];
  createdAt: string;
  // Enhanced fields
  healthScore?: number;          // 0-100 snapshot at time of session
  riskMetrics?: RiskMetrics;
  withdrawalAnalysis?: WithdrawalStrategyAnalysis[];
  goalProgress?: GoalProgress[];
  benchmarkComparison?: BenchmarkComparison;
  label?: string;                // user-named label for session
}

// ─── Insight ──────────────────────────────────────────────────────────────────

export interface Insight {
  id: string;
  sessionId: string;
  sandboxId: string;
  userId: string;
  scope: InsightScope;
  category: InsightCategory;
  priority: InsightPriority;
  title: string;
  body: string;
  suggestedAction: string;
  technicalAnalysis?: string;
  recoveryActions?: string[];
  reviewFlag?: boolean;
  status: InsightStatus;
  sentToAdvisor: boolean;
  sentToAdvisorAt: string | null;
  advisorNote: string | null;
  createdAt: string;
  // Enhanced fields
  confidenceNote?: string;       // simulation confidence note
  impactScore?: number;          // 1-10 estimated financial impact
  benchmarkDelta?: string;       // vs benchmark observation
  riskAdjustedNote?: string;     // risk-adjusted performance note
  complianceNote?: string;       // compliance/suitability flag
  resolvedAt?: string;           // when was it resolved
  resolvedBy?: string;           // who resolved it (advisor/client)
}

// ─── Advisor-Client Connection ────────────────────────────────────────────────

export interface AdvisorClient {
  id: string;
  advisorId: string;
  clientId: string;
  connectedAt: string;
  permissions: {
    canModifySandbox: boolean;
    canViewInsights: boolean;
    canAnnotate: boolean;
  };
}

export interface ConnectionInvite {
  id: string;
  advisorId: string;
  token: string;
  clientEmail: string | null;
  clientId?: string;
  status: ConnectionStatus;
  expiresAt: string;
  createdAt: string;
}

// ─── Chat ─────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
}

// ─── Monte Carlo ──────────────────────────────────────────────────────────────

export interface McSimulateParams {
  portfolioType: PortfolioType;
  currentSavings: number;
  monthlyContribution: number;
  currentAge: number;
  retirementAge: number;
  lifeExpectancy: number;
  expectedReturnMean: number;
  expectedReturnStd: number;
  inflation: number;
  stockPct: number;
  bondPct: number;
  withdrawalAmountAnnual: number;
  goals: Array<{ year: number; amount: number }>;
  nSimulations: number;
  crisisOverlay: CrisisOverlay | null;
}

export interface CrisisOverlay {
  scenario: string;
  yearlyReturns?: number[];
  drawdownPct?: number;
  recoveryYears?: number;
  inflationOverride?: number;
  returnOverride?: number;
  duration?: number;
  description: string;
}

export interface McSimulateResult {
  p10: number[];
  p50: number[];
  p90: number[];
  probabilityOfSuccess: number;
  fundsLastToAge: number;
  monthlySustainableWithdrawal: number;
  computationMs: number;
  // Enhanced result fields
  maxDrawdown?: number;
  sharpeRatio?: number;
  annualizedReturn?: number;
  volatility?: number;
}

// ─── API Response Types ───────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    page?: number;
    totalCount?: number;
    generatedAt?: string;
  };
}

// Re-export advanced types for convenience
export type {
  PortfolioHealthScore,
  RiskMetrics,
  BenchmarkComparison,
  LifeEvent,
  AdvisorAlert,
  AdvisorAnalytics,
  GoalProgress,
  WithdrawalStrategyAnalysis,
  ScenarioComparison,
  HealthGrade,
  HealthLabel,
  SoRRiskLevel,
};