"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, ResponsiveContainer, ReferenceLine, Legend,
  LineChart,
} from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardAction } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  PanelLeftClose, PanelLeft, Pencil, TrendingUp, Share2,
  MessageCircle, AlertTriangle, CheckCircle2, ChevronRight, Plus, X,
  Send, Bot, RefreshCw, History, Lightbulb, Sparkles, FlaskConical,
  RotateCcw, Activity, ZapOff, BookOpen, Target, Shield, Loader2,
  StickyNote,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Breadcrumb } from "@/components/breadcrumb";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Goal {
  id: string;
  label: string;
  targetYear: number;
  targetAge: number;
  amount: number;
  status: "on-track" | "close" | "at-risk";
}

interface StressScenario {
  id: string;
  name: string;
  icon: string;
  drop: number;
  recoveryYears: number;
  description: string;
}

interface ChatMessage {
  role: "user" | "bot";
  content: string;
}

// ─── Python API payload builders (client-side mirror of monte-carlo.ts) ──────

function buildRetirementPayload(ss: Record<string, number>, currentAge: number) {
  return {
    current_age: currentAge,
    retirement_age: ss.retirementAge ?? 65,
    life_expectancy: ss.lifeExpectancy ?? 90,
    current_savings: ss.currentSavings ?? 50000,
    monthly_contrib: ss.monthlyContribution ?? 1000,
    expected_return: (ss.expectedReturnMean ?? 7) / 100,
    volatility: (ss.expectedReturnStd ?? ss.volatility ?? 15) / 100,
    inflation_rate: (ss.inflation ?? 3) / 100,
    employer_match_pct: ss.employerMatchPct ?? 0,
    expected_monthly_income: ss.expectedMonthlyIncome ?? 5000,
    ss_start_age: ss.socialSecurityAge ?? 67,
    ss_monthly_amount: ss.socialSecurityMonthly ?? 2000,
  };
}

function buildEquityPayload(ss: Record<string, number>) {
  return {
    initial_lump_sum: ss.lumpSum ?? ss.currentSavings ?? 50000,
    monthly_dca: ss.monthlyDca ?? ss.monthlyContribution ?? 1000,
    time_horizon_years: ss.timeHorizonYears ?? 20,
    expected_return: (ss.expectedReturnMean ?? 9) / 100,
    volatility: (ss.volatility ?? ss.expectedReturnStd ?? 15) / 100,
    expense_ratio: (ss.expenseRatio ?? 0.20) / 100,
  };
}

function buildRealEstatePayload(ss: Record<string, number>) {
  return {
    purchase_price: ss.purchasePrice ?? 400000,
    down_payment_pct: (ss.downPaymentPct ?? 20) / 100,
    interest_rate: (ss.interestRate ?? 6.5) / 100,
    monthly_rent: ss.monthlyRent ?? 2400,
    annual_appreciation: (ss.annualAppreciation ?? 4) / 100,
    vacancy_rate: (ss.vacancyRate ?? 8) / 100,
    annual_expenses: ss.annualExpenses ?? 6000,
    hold_period_years: ss.holdPeriodYears ?? 10,
  };
}

function buildCollegePayload(ss: Record<string, number>) {
  return {
    child_age: ss.childAge ?? 5,
    target_start_age: ss.collegeStartAge ?? 18,
    target_cost: ss.targetCost ?? 120000,
    current_balance: ss.currentBalance ?? 0,
    monthly_contrib: ss.monthlyContribution ?? 500,
    expected_return: (ss.expectedReturnMean ?? 7) / 100,
    volatility: (ss.volatility ?? ss.expectedReturnStd ?? 12) / 100,
  };
}

function buildEmergencyPayload(ss: Record<string, number>) {
  return {
    monthly_expenses: ss.monthlyExpenses ?? 4000,
    target_buffer_months: ss.targetMonths ?? 6,
    current_savings: ss.currentLiquid ?? ss.currentSavings ?? 5000,
    monthly_addition: ss.monthlyAddition ?? 500,
    hysa_yield_rate: (ss.hyRate ?? 4.5) / 100,
    inflation_rate: (ss.inflation ?? 3) / 100,
  };
}

const MC_ENDPOINTS: Record<string, string> = {
  retirement: "retirement",
  equity: "equity",
  realestate: "real-estate",
  college: "college",
  emergency: "emergency",
};

// ─── Mock data — replaced on mount by API fetch ──────────────────────────────

const INITIAL_META = {
  name: "Loading…",
  type: "Retirement",
  createdAt: "",
  lastModified: "",
  sessionCount: 0,
  currentAge: 35,
  advisor: { connected: false, name: "", initials: "", lastViewed: "", insightsSent: 0 },
};

const INITIAL_GOALS: Goal[] = [];

const STRESS_SCENARIOS: StressScenario[] = [
  { id: "2008",        name: "2008 Financial Crisis", icon: "🏦", drop: 50, recoveryYears: 6,  description: "S&P 500 lost ~50% peak-to-trough. Recovery took ~6 years." },
  { id: "2020",        name: "2020 COVID Crash",       icon: "🦠", drop: 34, recoveryYears: 1,  description: "S&P 500 dropped 34% in 5 weeks. Record 6-month recovery." },
  { id: "dotcom",      name: "Dot-com Bust 2000",      icon: "💻", drop: 49, recoveryYears: 7,  description: "NASDAQ fell 78%. S&P 500 took 7 years to recover." },
  { id: "stagflation", name: "1970s Stagflation",      icon: "📉", drop: 48, recoveryYears: 10, description: "Oil shock + inflation. Real returns negative for a decade." },
  { id: "custom",      name: "Custom Scenario",        icon: "✏️", drop: 30, recoveryYears: 4,  description: "Define your own crisis: drop % and recovery timeline." },
];

const INITIAL_INSIGHTS: { id: string; title: string; severity: "green" | "amber" | "red"; sentToAdvisor: boolean; body: string }[] = [
  { id: "ins-placeholder", title: "Generate insights to analyze your plan", severity: "amber", sentToAdvisor: false, body: "Click 'Generate fresh insights' to get AI-powered analysis of your financial plan." },
];

// ─── Simulation data helper ───────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SimResponse = any; // Raw Python API response – differs per portfolio type

// ─── Custom chart tooltip ─────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ProjectionTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const fmt = (v: number) => v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(2)}M` : `$${(v / 1_000).toFixed(0)}K`;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 text-xs">
      <p className="font-semibold text-[#1a3a6b] mb-1.5">Age {label}</p>
      {payload.map((p: { dataKey: string; color: string; value: number }) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
          <span className="text-gray-500 capitalize">{p.dataKey}:</span>
          <span className="font-semibold text-gray-800">{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SIDEBAR
// ═══════════════════════════════════════════════════════════════════════════════

function SandboxSidebar({
  collapsed, onToggle, sliderState, goals, onGoalClick, onOpenChat, onOpenStressTest,
  meta, sessions, stressTests, simResult, portfolioType, advisorNotes, onToggleNotes,
}: {
  collapsed: boolean;
  onToggle: () => void;
  sliderState: Record<string, number>;
  goals: Goal[];
  onGoalClick: (g: Goal) => void;
  onOpenChat: () => void;
  onOpenStressTest: () => void;
  meta: typeof INITIAL_META;
  sessions: { id: string; label: string; current: boolean; sliders: string; insightCount: number; stressCount: number }[];
  stressTests: { id: string; name: string; icon: string; impact: number }[];
  simResult: SimResponse | null;
  portfolioType: string;
  advisorNotes: { id: string; advisorName: string; text: string; createdAt: string }[];
  onToggleNotes: () => void;
}) {
  const [sandboxName, setSandboxName] = useState(meta.name);
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);
  useEffect(() => { setSandboxName(meta.name); }, [meta.name]);

  // Derive summary metrics from simulation result
  const projectedWealth = (() => {
    if (!simResult) return 0;
    if (portfolioType === "retirement") return simResult.metrics?.balance_at_retirement ?? 0;
    if (portfolioType === "equity") return simResult.metrics?.projected_value ?? 0;
    if (portfolioType === "realestate") return simResult.metrics?.total_profit ?? 0;
    if (portfolioType === "college") return simResult.metrics?.projected_balance ?? 0;
    if (portfolioType === "emergency") return simResult.metrics?.real_value_60mo ?? 0;
    return 0;
  })();
  const successProb = (() => {
    if (!simResult) return 0;
    if (portfolioType === "retirement") return simResult.metrics?.probability_of_success ?? 0;
    if (portfolioType === "college") return simResult.goal_probability ?? 0;
    return 85;
  })();
  const fundsLastTo = (() => {
    if (!simResult || portfolioType !== "retirement") return 90;
    const p50 = simResult.paths?.p50_base_case;
    const ages = simResult.ages;
    if (!p50 || !ages) return 90;
    for (let i = p50.length - 1; i >= 0; i--) { if (p50[i] > 0) return ages[i]; }
    return 65;
  })();
  const gap = (() => {
    if (portfolioType === "retirement") {
      const target = 2_000_000;
      if (projectedWealth >= target) return 0;
      const yearsToRet = Math.max(1, (sliderState.retirementAge || 65) - meta.currentAge);
      return Math.round((target - projectedWealth) / (12 * yearsToRet));
    }
    if (portfolioType === "college") {
      const shortfall = simResult?.metrics?.shortfall ?? 0;
      if (shortfall <= 0) return 0;
      const yearsToCollege = Math.max(1, (sliderState.collegeStartAge || 18) - (sliderState.childAge || 5));
      return Math.round(shortfall / (12 * yearsToCollege));
    }
    return 0;
  })();

  const STATUS_DOT = { "on-track": "bg-emerald-500", "close": "bg-amber-500", "at-risk": "bg-red-500" };

  if (collapsed) return (
    <div className="w-12 border-r border-gray-200 bg-white flex flex-col items-center py-3 gap-3 shrink-0">
      <button onClick={onToggle} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
        <PanelLeft className="w-4 h-4" />
      </button>
      <Separator />
      {([
        { icon: <FlaskConical className="w-4 h-4" />, label: "Identity" },
        { icon: <TrendingUp className="w-4 h-4" />,  label: "Summary" },
        { icon: <Target className="w-4 h-4" />,       label: "Goals" },
        { icon: <Share2 className="w-4 h-4" />,       label: "Sharing" },
      ] as { icon: React.ReactNode; label: string }[]).map(({ icon, label }) => (
        <Tooltip key={label}>
          <TooltipTrigger asChild>
            <button onClick={onToggle} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">{icon}</button>
          </TooltipTrigger>
          <TooltipContent side="right">{label}</TooltipContent>
        </Tooltip>
      ))}
      <div className="mt-auto pb-2">
        <button onClick={onOpenChat} className="p-1.5 rounded-lg hover:bg-[#1a3a6b]/10 text-[#1a3a6b]">
          <Bot className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="w-[280px] shrink-0 border-r border-gray-200 bg-white flex flex-col overflow-hidden">
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-5 overflow-hidden">
          {/* Toggle */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest whitespace-nowrap">Sandbox</span>
            <button onClick={onToggle} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 shrink-0">
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>

          {/* § 1 Identity */}
          <div className="space-y-2">
            {editing ? (
              <input ref={inputRef} value={sandboxName}
                onChange={e => setSandboxName(e.target.value)}
                onBlur={() => setEditing(false)}
                onKeyDown={e => e.key === "Enter" && setEditing(false)}
                className="text-sm font-semibold text-[#1a3a6b] w-full border-b border-[#1a3a6b] outline-none bg-transparent pb-0.5"
              />
            ) : (
              <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 group text-left w-full">
                <span className="text-sm font-semibold text-[#1a3a6b] break-words line-clamp-2">{sandboxName}</span>
                <Pencil className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 shrink-0 transition-opacity" />
              </button>
            )}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-[10px] border-blue-200 text-blue-700 bg-blue-50">{meta.type}</Badge>
              <span className="text-[10px] text-gray-400">{meta.sessionCount} sessions</span>
            </div>
            <p className="text-[10px] text-gray-400">Created {meta.createdAt} · Modified {meta.lastModified}</p>
          </div>

          <Separator />

          {/* § 2 Portfolio summary (live) */}
          <div className="space-y-2">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Live Summary</p>
            {([
              { label: "Projected wealth at retirement", value: `$${(projectedWealth / 1_000_000).toFixed(2)}M`, color: "text-[#1a3a6b]" },
              { label: "Probability of success",         value: `${successProb}%`,       color: successProb >= 75 ? "text-emerald-600" : successProb >= 55 ? "text-amber-500" : "text-red-500" },
              { label: "Funds last to age",              value: `${fundsLastTo >= 90 ? `${fundsLastTo}+` : fundsLastTo}`, color: fundsLastTo >= 85 ? "text-emerald-600" : fundsLastTo >= 75 ? "text-amber-500" : "text-red-500" },
              { label: "Monthly gap",                    value: gap > 0 ? `+$${gap.toLocaleString()}/mo needed` : "On track ✓", color: gap > 0 ? "text-amber-500" : "text-emerald-600" },
            ] as { label: string; value: string; color: string }[]).map(({ label, value, color }) => (
              <div key={label} className="flex items-start justify-between gap-1">
                <span className="text-xs text-gray-500 leading-tight break-words min-w-0 flex-1">{label}</span>
                <span className={cn("text-xs font-semibold shrink-0 text-right", color)}>{value}</span>
              </div>
            ))}
          </div>

          <Separator />

          {/* § 3 Goals */}
          <div className="space-y-2">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Goals</p>
            {goals.map(g => (
              <button key={g.id} onClick={() => onGoalClick(g)}
                className="w-full flex items-center gap-2 text-left hover:bg-gray-50 rounded-lg px-2 py-1.5 transition-colors group"
              >
                <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", STATUS_DOT[g.status])} />
                <div className="flex-1 min-w-0 overflow-hidden">
                  <p className="text-xs font-medium text-gray-700 break-words line-clamp-2">{g.label}</p>
                  <p className="text-[10px] text-gray-400">{g.targetYear} · ${(g.amount / 1000).toFixed(0)}K</p>
                </div>
                <ChevronRight className="w-3 h-3 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </button>
            ))}
            <button className="flex items-center gap-1 text-xs text-[#1a3a6b] hover:underline mt-1 px-2">
              <Plus className="w-3 h-3" /> Add goal
            </button>
          </div>

          <Separator />

          {/* § 5 Sharing */}
          <div className="space-y-2">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Advisor</p>
            {meta.advisor.connected ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-[#1a3a6b] text-white flex items-center justify-center text-[10px] font-semibold shrink-0">
                    {meta.advisor.initials}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-700">{meta.advisor.name}</p>
                    <p className="text-[10px] text-gray-400">Viewed {meta.advisor.lastViewed}</p>
                  </div>
                </div>
                <p className="text-[10px] text-gray-400 flex items-center gap-1">
                  <Send className="w-3 h-3" /> {meta.advisor.insightsSent} insights sent
                </p>
                <Button size="xs" variant="outline" className="w-full border-[#1a3a6b]/30 text-[#1a3a6b] gap-1">
                  <Share2 className="w-3 h-3" /> Invite to shared session
                </Button>
              </div>
            ) : (
              <p className="text-xs text-gray-400">No advisor connected.{" "}
                <Link href="/connect" className="text-[#1a3a6b] underline">Connect one</Link>
              </p>
            )}
          </div>

          {/* § 6 Advisor Notes (in sidebar) */}
          {advisorNotes.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Advisor Notes</p>
                  <Badge className="h-4 px-1.5 text-[10px] bg-amber-500 text-white">{advisorNotes.length}</Badge>
                </div>
                {advisorNotes.slice(0, 3).map(n => (
                  <div key={n.id} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                    <p className="text-xs text-gray-700 leading-snug line-clamp-2">{n.text}</p>
                    <p className="text-[10px] text-gray-400 mt-1">{n.advisorName} · {new Date(n.createdAt).toLocaleDateString()}</p>
                  </div>
                ))}
                {advisorNotes.length > 3 && (
                  <button onClick={onToggleNotes} className="text-xs text-[#1a3a6b] hover:underline">
                    View all {advisorNotes.length} notes
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </ScrollArea>

      {/* § 7 Chatbot entry */}
      <div className="border-t border-gray-200 p-3 shrink-0">
        <button onClick={onOpenChat}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg bg-[#1a3a6b]/5 hover:bg-[#1a3a6b]/10 transition-colors text-left"
        >
          <Bot className="w-4 h-4 text-[#1a3a6b] shrink-0" />
          <div>
            <p className="text-xs font-semibold text-[#1a3a6b]">Ask WealthBot</p>
            <p className="text-[10px] text-gray-400">Ask about this sandbox</p>
          </div>
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 1: PLAN SIMULATOR (Portfolio-Type-Specific)
// ═══════════════════════════════════════════════════════════════════════════════

// Slider configuration per portfolio type
interface SliderDef {
  key: string; label: string; min: number; max: number; step: number;
  fmt: (v: number) => string; lo: string; hi: string;
}

const RETIREMENT_SLIDERS: SliderDef[] = [
  { key: "currentSavings",       label: "Current Savings",        min: 0, max: 2_000_000, step: 5000,  fmt: v => `$${(v/1000).toFixed(0)}K`, lo: "$0", hi: "$2M" },
  { key: "monthlyContribution",  label: "Monthly Contribution",   min: 0, max: 15_000,    step: 100,   fmt: v => `$${v.toLocaleString()}`,   lo: "$0", hi: "$15K" },
  { key: "retirementAge",        label: "Retirement Age",         min: 50, max: 75,        step: 1,     fmt: v => `${v}`,                     lo: "50", hi: "75" },
  { key: "lifeExpectancy",       label: "Life Expectancy",        min: 70, max: 100,       step: 1,     fmt: v => `${v}`,                     lo: "70", hi: "100" },
  { key: "expectedReturnMean",   label: "Expected Return (%)",    min: 2, max: 15,         step: 0.5,   fmt: v => `${v}%`,                    lo: "2%", hi: "15%" },
  { key: "expectedReturnStd",    label: "Volatility (%)",         min: 5, max: 25,         step: 1,     fmt: v => `${v}%`,                    lo: "5%", hi: "25%" },
  { key: "inflation",            label: "Inflation Rate (%)",     min: 1, max: 6,          step: 0.5,   fmt: v => `${v}%`,                    lo: "1%", hi: "6%" },
  { key: "employerMatchPct",     label: "Employer Match (%)",     min: 0, max: 100,        step: 1,     fmt: v => `${v}%`,                    lo: "0%", hi: "100%" },
  { key: "expectedMonthlyIncome",label: "Monthly Income at Retirement", min: 2000, max: 20000, step: 500, fmt: v => `$${v.toLocaleString()}`, lo: "$2K", hi: "$20K" },
  { key: "socialSecurityAge",    label: "Social Security Start Age", min: 62, max: 70,     step: 1,     fmt: v => `${v}`,                     lo: "62", hi: "70" },
  { key: "socialSecurityMonthly",label: "SS Monthly Amount",      min: 0, max: 4000,       step: 100,   fmt: v => `$${v.toLocaleString()}`,   lo: "$0", hi: "$4K" },
];

const EQUITY_SLIDERS: SliderDef[] = [
  { key: "lumpSum",              label: "Initial Lump Sum",       min: 0, max: 1_000_000, step: 5000,  fmt: v => `$${(v/1000).toFixed(0)}K`, lo: "$0", hi: "$1M" },
  { key: "monthlyDca",           label: "Monthly DCA",            min: 0, max: 10_000,    step: 100,   fmt: v => `$${v.toLocaleString()}`,   lo: "$0", hi: "$10K" },
  { key: "timeHorizonYears",     label: "Time Horizon (years)",   min: 1, max: 40,        step: 1,     fmt: v => `${v} yr`,                  lo: "1", hi: "40" },
  { key: "expectedReturnMean",   label: "Expected Return (%)",    min: 2, max: 15,        step: 0.5,   fmt: v => `${v}%`,                    lo: "2%", hi: "15%" },
  { key: "volatility",           label: "Volatility (%)",         min: 5, max: 25,        step: 1,     fmt: v => `${v}%`,                    lo: "5%", hi: "25%" },
  { key: "expenseRatio",         label: "Expense Ratio (%)",      min: 0.03, max: 1.5,    step: 0.01,  fmt: v => `${v.toFixed(2)}%`,         lo: "0.03%", hi: "1.5%" },
];

const REALESTATE_SLIDERS: SliderDef[] = [
  { key: "purchasePrice",        label: "Purchase Price",         min: 50000, max: 2_000_000, step: 10000, fmt: v => `$${(v/1000).toFixed(0)}K`, lo: "$50K", hi: "$2M" },
  { key: "downPaymentPct",       label: "Down Payment (%)",       min: 3.5, max: 50,      step: 0.5,   fmt: v => `${v}%`,                    lo: "3.5%", hi: "50%" },
  { key: "interestRate",         label: "Interest Rate (%)",      min: 3, max: 10,        step: 0.125, fmt: v => `${v.toFixed(3)}%`,         lo: "3%", hi: "10%" },
  { key: "monthlyRent",          label: "Monthly Rent",           min: 0, max: 10_000,    step: 100,   fmt: v => `$${v.toLocaleString()}`,   lo: "$0", hi: "$10K" },
  { key: "annualAppreciation",   label: "Annual Appreciation (%)",min: 0, max: 10,        step: 0.5,   fmt: v => `${v}%`,                    lo: "0%", hi: "10%" },
  { key: "vacancyRate",          label: "Vacancy Rate (%)",       min: 0, max: 20,        step: 1,     fmt: v => `${v}%`,                    lo: "0%", hi: "20%" },
  { key: "annualExpenses",       label: "Annual Expenses",        min: 0, max: 20000,     step: 500,   fmt: v => `$${v.toLocaleString()}`,   lo: "$0", hi: "$20K" },
  { key: "holdPeriodYears",      label: "Hold Period (years)",    min: 1, max: 30,        step: 1,     fmt: v => `${v} yr`,                  lo: "1", hi: "30" },
];

const COLLEGE_SLIDERS: SliderDef[] = [
  { key: "childAge",             label: "Child's Current Age",    min: 0, max: 18,        step: 1,     fmt: v => `${v}`,                     lo: "0", hi: "18" },
  { key: "collegeStartAge",      label: "College Start Age",      min: 16, max: 20,       step: 1,     fmt: v => `${v}`,                     lo: "16", hi: "20" },
  { key: "targetCost",           label: "Target College Cost",    min: 20000, max: 500000, step: 5000, fmt: v => `$${(v/1000).toFixed(0)}K`, lo: "$20K", hi: "$500K" },
  { key: "currentBalance",       label: "Current 529 Balance",    min: 0, max: 200000,    step: 1000,  fmt: v => `$${(v/1000).toFixed(0)}K`, lo: "$0", hi: "$200K" },
  { key: "monthlyContribution",  label: "Monthly Contribution",   min: 0, max: 5000,      step: 50,    fmt: v => `$${v.toLocaleString()}`,   lo: "$0", hi: "$5K" },
  { key: "expectedReturnMean",   label: "Expected Return (%)",    min: 2, max: 10,        step: 0.5,   fmt: v => `${v}%`,                    lo: "2%", hi: "10%" },
  { key: "volatility",           label: "Volatility (%)",         min: 4, max: 15,        step: 1,     fmt: v => `${v}%`,                    lo: "4%", hi: "15%" },
];

const EMERGENCY_SLIDERS: SliderDef[] = [
  { key: "monthlyExpenses",      label: "Monthly Expenses",       min: 1000, max: 20000,  step: 500,   fmt: v => `$${v.toLocaleString()}`,   lo: "$1K", hi: "$20K" },
  { key: "targetMonths",         label: "Target Buffer (months)", min: 1, max: 24,        step: 1,     fmt: v => `${v} mo`,                  lo: "1", hi: "24" },
  { key: "currentLiquid",        label: "Current Savings",        min: 0, max: 100000,    step: 1000,  fmt: v => `$${(v/1000).toFixed(0)}K`, lo: "$0", hi: "$100K" },
  { key: "monthlyAddition",      label: "Monthly Addition",       min: 0, max: 5000,      step: 50,    fmt: v => `$${v.toLocaleString()}`,   lo: "$0", hi: "$5K" },
  { key: "hyRate",               label: "HYSA Yield (%)",         min: 0, max: 8,         step: 0.25,  fmt: v => `${v}%`,                    lo: "0%", hi: "8%" },
  { key: "inflation",            label: "Inflation Rate (%)",     min: 1, max: 6,         step: 0.5,   fmt: v => `${v}%`,                    lo: "1%", hi: "6%" },
];

const SLIDERS_BY_TYPE: Record<string, SliderDef[]> = {
  retirement: RETIREMENT_SLIDERS,
  equity: EQUITY_SLIDERS,
  realestate: REALESTATE_SLIDERS,
  college: COLLEGE_SLIDERS,
  emergency: EMERGENCY_SLIDERS,
};

function PlanSimulatorTab({ portfolioType, sliderState, onSliderChange, currentAge }: {
  portfolioType: string;
  sliderState: Record<string, number>;
  onSliderChange: (key: string, value: number) => void;
  currentAge: number;
}) {
  const [simData, setSimData] = useState<SimResponse | null>(null);
  const [simLoading, setSimLoading] = useState(false);
  const [simError, setSimError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Debounced Python API call
  useEffect(() => {
    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setSimLoading(true);
      setSimError(null);

      try {
        const endpoint = MC_ENDPOINTS[portfolioType] || "retirement";
        let payload: unknown;
        switch (portfolioType) {
          case "equity":     payload = buildEquityPayload(sliderState); break;
          case "realestate": payload = buildRealEstatePayload(sliderState); break;
          case "college":    payload = buildCollegePayload(sliderState); break;
          case "emergency":  payload = buildEmergencyPayload(sliderState); break;
          default:           payload = buildRetirementPayload(sliderState, currentAge); break;
        }
        const res = await fetch(`/mc-api/${endpoint}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: ctrl.signal,
        });
        if (!res.ok) throw new Error(`API error ${res.status}`);
        const data = await res.json();
        if (!ctrl.signal.aborted) setSimData(data);
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== "AbortError") setSimError("Simulation failed — is the Python MC server running on port 8000?");
      } finally {
        if (!ctrl.signal.aborted) setSimLoading(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [sliderState, portfolioType, currentAge]);

  const sliderDefs = SLIDERS_BY_TYPE[portfolioType] || RETIREMENT_SLIDERS;
  const fmt = (v: number) => v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(2)}M` : `$${(v / 1_000).toFixed(0)}K`;

  // Build chart data from simData
  const chartData = useMemo(() => {
    if (!simData) return [];
    if (portfolioType === "retirement") {
      return (simData.ages || []).map((age: number, i: number) => ({
        age,
        best: simData.paths?.p90_best_case?.[i] ?? 0,
        base: simData.paths?.p50_base_case?.[i] ?? 0,
        worst: simData.paths?.p10_worst_case?.[i] ?? 0,
      }));
    }
    if (portfolioType === "equity") {
      return (simData.years || []).map((yr: number, i: number) => ({
        age: yr,
        best: simData.paths?.p90_best_case?.[i] ?? 0,
        base: simData.paths?.p50_base_case?.[i] ?? 0,
        worst: simData.paths?.p10_worst_case?.[i] ?? 0,
      }));
    }
    if (portfolioType === "college") {
      return (simData.ages || []).map((age: number, i: number) => ({
        age,
        best: simData.paths?.p90_best_case?.[i] ?? 0,
        base: simData.paths?.p50_base_case?.[i] ?? 0,
        worst: simData.paths?.p10_worst_case?.[i] ?? 0,
      }));
    }
    if (portfolioType === "realestate") {
      return (simData.years || []).map((yr: number, i: number) => ({
        age: yr,
        propertyValue: simData.property_value?.[i] ?? 0,
        equity: simData.equity?.[i] ?? 0,
        loanBalance: simData.loan_balance?.[i] ?? 0,
        cashFlow: simData.cumulative_cash_flow?.[i] ?? 0,
      }));
    }
    if (portfolioType === "emergency") {
      return (simData.months || []).map((mo: number, i: number) => ({
        age: mo,
        fundBalance: simData.fund_balance?.[i] ?? 0,
        purchasingPower: simData.real_purchasing_power?.[i] ?? 0,
        target: simData.target_line?.[i] ?? 0,
      }));
    }
    return [];
  }, [simData, portfolioType]);

  // Build metrics from simData
  const metrics = useMemo(() => {
    if (!simData?.metrics) return [];
    const m = simData.metrics;
    if (portfolioType === "retirement") return [
      { label: "Balance at Retirement", value: fmt(m.balance_at_retirement ?? 0), color: "text-[#1a3a6b] border-[#1a3a6b]/15 bg-[#1a3a6b]/5" },
      { label: "Probability of Success", value: `${(m.probability_of_success ?? 0).toFixed(1)}%`, color: (m.probability_of_success ?? 0) >= 75 ? "text-emerald-600 border-emerald-100 bg-emerald-50" : "text-amber-500 border-amber-100 bg-amber-50" },
    ];
    if (portfolioType === "equity") return [
      { label: "Projected Value", value: fmt(m.projected_value ?? 0), color: "text-[#1a3a6b] border-[#1a3a6b]/15 bg-[#1a3a6b]/5" },
      { label: "Total Contributed", value: fmt(m.total_contributed ?? 0), color: "text-gray-700 border-gray-200 bg-gray-50" },
      { label: "CAGR", value: `${(m.cagr_pct ?? 0).toFixed(1)}%`, color: "text-emerald-600 border-emerald-100 bg-emerald-50" },
      { label: "Expense Drag", value: fmt(m.expense_drag ?? 0), color: "text-amber-500 border-amber-100 bg-amber-50" },
    ];
    if (portfolioType === "realestate") return [
      { label: "Monthly Cash Flow", value: `$${Math.round(m.monthly_cash_flow ?? 0).toLocaleString()}`, color: (m.monthly_cash_flow ?? 0) >= 0 ? "text-emerald-600 border-emerald-100 bg-emerald-50" : "text-red-500 border-red-100 bg-red-50" },
      { label: "Cap Rate", value: `${(m.cap_rate ?? 0).toFixed(1)}%`, color: "text-[#1a3a6b] border-[#1a3a6b]/15 bg-[#1a3a6b]/5" },
      { label: "Cash-on-Cash Return", value: `${(m.cash_on_cash_return ?? 0).toFixed(1)}%`, color: "text-emerald-600 border-emerald-100 bg-emerald-50" },
      { label: "Total Profit", value: fmt(m.total_profit ?? 0), color: "text-[#1a3a6b] border-[#1a3a6b]/15 bg-[#1a3a6b]/5" },
    ];
    if (portfolioType === "college") return [
      { label: "Projected Balance", value: fmt(m.projected_balance ?? 0), color: "text-[#1a3a6b] border-[#1a3a6b]/15 bg-[#1a3a6b]/5" },
      { label: "Shortfall", value: (m.shortfall ?? 0) > 0 ? `-${fmt(m.shortfall)}` : "On track ✓", color: (m.shortfall ?? 0) > 0 ? "text-red-500 border-red-100 bg-red-50" : "text-emerald-600 border-emerald-100 bg-emerald-50" },
      { label: "Goal Probability", value: `${(simData.goal_probability ?? 0).toFixed(1)}%`, color: (simData.goal_probability ?? 0) >= 75 ? "text-emerald-600 border-emerald-100 bg-emerald-50" : "text-amber-500 border-amber-100 bg-amber-50" },
    ];
    if (portfolioType === "emergency") return [
      { label: "Months to Target", value: `${m.months_to_target ?? "—"} mo`, color: "text-[#1a3a6b] border-[#1a3a6b]/15 bg-[#1a3a6b]/5" },
      { label: "Current Buffer", value: `${(m.current_buffer_months ?? 0).toFixed(1)} mo`, color: (m.current_buffer_months ?? 0) >= (sliderState.targetMonths ?? 6) ? "text-emerald-600 border-emerald-100 bg-emerald-50" : "text-amber-500 border-amber-100 bg-amber-50" },
      { label: "Real Value at 60mo", value: fmt(m.real_value_60mo ?? 0), color: "text-gray-700 border-gray-200 bg-gray-50" },
      { label: "Inflation Drag", value: fmt(m.inflation_drag_60mo ?? 0), color: "text-red-500 border-red-100 bg-red-50" },
    ];
    return [];
  }, [simData, portfolioType, sliderState.targetMonths, fmt]);

  const TYPE_LABELS: Record<string, string> = {
    retirement: "Retirement Projection", equity: "Equity Growth Projection",
    realestate: "Real Estate Investment Analysis", college: "College Savings Projection",
    emergency: "Emergency Fund Projection",
  };

  // Determine chart x-axis label
  const xLabel = portfolioType === "emergency" ? "Month" : portfolioType === "retirement" || portfolioType === "college" ? "Age" : "Year";

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle className="text-[#1a3a6b] text-base">{TYPE_LABELS[portfolioType] || "Wealth Projection"}</CardTitle>
          <CardAction>
            {simLoading ? (
              <span className="text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> Simulating…
              </span>
            ) : (
              <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                Powered by Monte Carlo Engine
              </span>
            )}
          </CardAction>
        </CardHeader>
        <CardContent>
          {simError ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertTriangle className="w-8 h-8 text-amber-500 mb-2" />
              <p className="text-sm text-gray-600">{simError}</p>
              <p className="text-xs text-gray-400 mt-1">Ensure the Python backend is running: python -m uvicorn main:app --port 8000</p>
            </div>
          ) : chartData.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-[#1a3a6b]" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              {portfolioType === "realestate" ? (
                <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 16, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="age" tick={{ fontSize: 11, fill: "#9ca3af" }}
                    label={{ value: xLabel, position: "insideBottom", offset: -4, style: { fontSize: 11, fill: "#9ca3af" } }}
                  />
                  <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} width={64}
                    tickFormatter={v => v >= 1_000_000 ? `$${(v/1_000_000).toFixed(1)}M` : `$${(v/1_000).toFixed(0)}K`}
                  />
                  <RTooltip content={<ProjectionTooltip />} />
                  <Line type="monotone" dataKey="propertyValue" stroke="#1a3a6b" strokeWidth={2} dot={false} name="Property Value" />
                  <Line type="monotone" dataKey="equity" stroke="#10b981" strokeWidth={2} dot={false} name="Equity" />
                  <Line type="monotone" dataKey="loanBalance" stroke="#ef4444" strokeWidth={2} dot={false} name="Loan Balance" strokeDasharray="4 2" />
                  <Line type="monotone" dataKey="cashFlow" stroke="#f59e0b" strokeWidth={2} dot={false} name="Cumulative Cash Flow" />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                </LineChart>
              ) : portfolioType === "emergency" ? (
                <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 16, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="age" tick={{ fontSize: 11, fill: "#9ca3af" }}
                    label={{ value: xLabel, position: "insideBottom", offset: -4, style: { fontSize: 11, fill: "#9ca3af" } }}
                  />
                  <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} width={64}
                    tickFormatter={v => v >= 1_000_000 ? `$${(v/1_000_000).toFixed(1)}M` : `$${(v/1_000).toFixed(0)}K`}
                  />
                  <RTooltip content={<ProjectionTooltip />} />
                  <Line type="monotone" dataKey="fundBalance" stroke="#1a3a6b" strokeWidth={2} dot={false} name="Fund Balance" />
                  <Line type="monotone" dataKey="purchasingPower" stroke="#10b981" strokeWidth={2} dot={false} name="Real Purchasing Power" strokeDasharray="4 2" />
                  <Line type="monotone" dataKey="target" stroke="#ef4444" strokeWidth={2} dot={false} name="Target" strokeDasharray="6 3" />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                </LineChart>
              ) : (
                <ComposedChart data={chartData} margin={{ top: 8, right: 16, bottom: 16, left: 8 }}>
                  <defs>
                    <linearGradient id="bestG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#10b981" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="worstG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="age" tick={{ fontSize: 11, fill: "#9ca3af" }}
                    label={{ value: xLabel, position: "insideBottom", offset: -4, style: { fontSize: 11, fill: "#9ca3af" } }}
                  />
                  <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} width={64}
                    tickFormatter={v => v >= 1_000_000 ? `$${(v/1_000_000).toFixed(1)}M` : `$${(v/1_000).toFixed(0)}K`}
                  />
                  <RTooltip content={<ProjectionTooltip />} />
                  <Area type="monotone" dataKey="best"  stroke="#10b981" strokeWidth={1.5} fill="url(#bestG)"  strokeDasharray="4 2" name="Best (P90)"  dot={false} activeDot={false} />
                  <Area type="monotone" dataKey="worst" stroke="#ef4444" strokeWidth={1.5} fill="url(#worstG)" strokeDasharray="4 2" name="Worst (P10)" dot={false} activeDot={false} />
                  <Line type="monotone" dataKey="base"  stroke="#1a3a6b" strokeWidth={2.5} dot={false} name="Base (P50)" activeDot={{ r: 5, fill: "#1a3a6b" }} />
                  {portfolioType === "retirement" && (
                    <ReferenceLine x={sliderState.retirementAge || 65} stroke="#1a3a6b" strokeDasharray="3 3" strokeWidth={1.5}
                      label={{ value: `Retire ${sliderState.retirementAge || 65}`, position: "top", style: { fontSize: 10, fill: "#1a3a6b" } }}
                    />
                  )}
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                    formatter={(v) => <span style={{ color: "#6b7280" }}>{v}</span>}
                  />
                </ComposedChart>
              )}
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Input parameters */}
        <Card>
          <CardContent className="p-5 space-y-4">
            <p className="text-sm font-semibold text-[#1a3a6b]">Adjust Parameters</p>
            <div className="grid grid-cols-1 gap-3">
              {sliderDefs.map(({ key, label, min, max, step, fmt: f }) => (
                <div key={key} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm text-gray-700">{label}</Label>
                    <span className="text-[10px] text-gray-400">{f(min)} — {f(max)}</span>
                  </div>
                  <Input
                    type="number"
                    min={min}
                    max={max}
                    step={step}
                    value={sliderState[key] ?? min}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val)) onSliderChange(key, Math.min(max, Math.max(min, val)));
                    }}
                    className="h-9 text-sm font-medium text-[#1a3a6b]"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Metrics */}
        <Card>
          <CardContent className="p-5 space-y-4">
            <p className="text-sm font-semibold text-[#1a3a6b]">Key Metrics</p>
            {metrics.length === 0 && !simLoading && (
              <p className="text-xs text-gray-400">Waiting for simulation results…</p>
            )}
            {simLoading && metrics.length === 0 && (
              <div className="flex items-center gap-2 py-4">
                <Loader2 className="w-4 h-4 animate-spin text-[#1a3a6b]" />
                <span className="text-xs text-gray-500">Running simulation…</span>
              </div>
            )}
            {metrics.map(({ label, value, color }) => (
              <div key={label} className={cn("flex items-center justify-between border rounded-xl px-4 py-2.5", color)}>
                <span className="text-xs opacity-80">{label}</span>
                <span className="text-base font-bold">{value}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 2: CRISIS STRESS TEST
// ═══════════════════════════════════════════════════════════════════════════════

function StressTestTab({ sliderState, sandboxId, currentAge }: { sliderState: Record<string, number>; sandboxId: string; currentAge: number }) {
  const retirementAge = sliderState.retirementAge || 65;
  const monthly = sliderState.monthlyContribution || sliderState.monthlyDca || 2200;

  const [selected, setSelected]       = useState<StressScenario | null>(null);
  const [customDrop, setCustomDrop]   = useState(30);
  const [customRec, setCustomRec]     = useState(4);
  const [ran, setRan]                 = useState(false);
  const [running, setRunning]         = useState(false);
  const [stressResult, setStressResult] = useState<{
    baseWealth: number; stressedWealth: number; impact: number; recoveryActions: string[];
    baseP50: number[]; stressedP50: number[]; ages: number[];
  } | null>(null);

  const handleRunStressTest = async () => {
    if (!selected) return;
    setRunning(true);
    try {
      const res = await fetch(`/api/sandboxes/${sandboxId}/stress-test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenario: selected.id === "custom" ? "custom" : selected.id === "2008" ? "2008" : selected.id === "2020" ? "2020_covid" : selected.id === "dotcom" ? "dotcom_2000" : selected.id === "stagflation" ? "stagflation_1970s" : selected.id,
          customParams: selected.id === "custom" ? { drawdownPct: customDrop, recoveryYears: customRec } : undefined,
        }),
      });
      if (res.ok) {
        const { data } = await res.json();
        setStressResult({
          baseWealth: data?.baseline?.wealthAtRetirement || 0,
          stressedWealth: data?.stressed?.wealthAtRetirement || 0,
          impact: data?.impact?.impactPct || 0,
          recoveryActions: data?.impact?.recoveryActions || [],
          baseP50: data?.baseline?.p50 || [],
          stressedP50: data?.stressed?.p50 || [],
          ages: Array.from({ length: (data?.baseline?.p50 || []).length }, (_, i) => currentAge + i),
        });
      }
    } catch { /* use fallback */ }
    setRan(true);
    setRunning(false);
  };

  const stressChartData = useMemo(() => {
    if (!stressResult || !ran) return null;
    return stressResult.ages.map((age: number, i: number) => ({
      age,
      base: stressResult.baseP50[i] ?? 0,
      stressed: stressResult.stressedP50[i] ?? 0,
    }));
  }, [stressResult, ran]);

  const impact = stressResult ? {
    base: stressResult.baseWealth,
    stressed: stressResult.stressedWealth,
    diff: stressResult.baseWealth - stressResult.stressedWealth,
    pct: stressResult.impact,
  } : null;

  const fmt = (v: number) => v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(2)}M` : `$${(v / 1_000).toFixed(0)}K`;

  return (
    <div className="space-y-5">
      {/* Scenario tiles */}
      <div>
        <p className="text-sm font-semibold text-[#1a3a6b] mb-3">Choose a Scenario</p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {STRESS_SCENARIOS.map(s => (
            <button key={s.id} onClick={() => { setSelected(s); setRan(false); }}
              className={cn(
                "text-left border rounded-xl p-3 space-y-1.5 transition-all hover:border-[#1a3a6b]/40",
                selected?.id === s.id ? "border-[#1a3a6b] bg-[#1a3a6b]/5 ring-1 ring-[#1a3a6b]/20" : "border-gray-200 bg-white"
              )}
            >
              <span className="text-xl">{s.icon}</span>
              <p className="text-xs font-semibold text-gray-800 leading-tight">{s.name}</p>
              {s.id !== "custom" && <p className="text-[10px] text-red-500 font-medium">−{s.drop}% peak</p>}
            </button>
          ))}
        </div>
        {selected && <p className="text-xs text-gray-400 mt-2">{selected.description}</p>}
      </div>

      {/* Custom config */}
      {selected?.id === "custom" && (
        <Card>
          <CardContent className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm text-gray-700">Market Drop</Label>
                <span className="text-sm font-semibold text-red-500">−{customDrop}%</span>
              </div>
              <Slider min={5} max={80} step={5} value={[customDrop]} onValueChange={([v]) => setCustomDrop(v)} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm text-gray-700">Recovery Years</Label>
                <span className="text-sm font-semibold text-[#1a3a6b]">{customRec} yrs</span>
              </div>
              <Slider min={1} max={15} step={1} value={[customRec]} onValueChange={([v]) => setCustomRec(v)} />
            </div>
          </CardContent>
        </Card>
      )}

      {selected && (
        <Button className="bg-[#1a3a6b] hover:bg-[#16325c] gap-2" onClick={handleRunStressTest} disabled={running}>
          {running ? <><Loader2 className="w-4 h-4 animate-spin" /> Running…</> : <><Activity className="w-4 h-4" /> Run &quot;{selected.name}&quot; Scenario</>}
        </Button>
      )}

      {ran && stressChartData && impact && (
        <div className="space-y-5">
          {/* Before / after cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {([
              { label: "Without crisis",   value: fmt(impact.base),            sub: `at age ${retirementAge}`, color: "bg-emerald-50 border-emerald-200 text-emerald-700" },
              { label: "With crisis",      value: fmt(impact.stressed),        sub: `at age ${retirementAge}`, color: "bg-red-50 border-red-200 text-red-700" },
              { label: "Wealth lost",      value: `-${fmt(impact.diff)}`,      sub: "retirement impact",       color: "bg-amber-50 border-amber-200 text-amber-700" },
              { label: "Portfolio impact", value: `−${impact.pct}%`,           sub: "at retirement",           color: "bg-[#1a3a6b]/5 border-[#1a3a6b]/20 text-[#1a3a6b]" },
            ]).map(({ label, value, sub, color }) => (
              <div key={label} className={cn("border rounded-xl p-3", color)}>
                <p className="text-[10px] uppercase tracking-wider opacity-70">{label}</p>
                <p className="text-lg font-bold mt-0.5">{value}</p>
                <p className="text-[10px] opacity-60">{sub}</p>
              </div>
            ))}
          </div>

          {/* Recovery path chart */}
          <Card>
            <CardHeader><CardTitle className="text-[#1a3a6b] text-base">Recovery Path</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={stressChartData} margin={{ top: 5, right: 16, bottom: 0, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="age" tick={{ fontSize: 11, fill: "#9ca3af" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} width={64}
                    tickFormatter={v => v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : `$${(v / 1_000).toFixed(0)}K`}
                  />
                  <RTooltip content={<ProjectionTooltip />} />
                  <Line type="monotone" dataKey="base"     stroke="#10b981" strokeWidth={2}   dot={false} name="Base (no crisis)" />
                  <Line type="monotone" dataKey="stressed" stroke="#ef4444" strokeWidth={2}   dot={false} name="With crisis" strokeDasharray="4 2" />
                  <ReferenceLine x={currentAge + 5} stroke="#f59e0b" strokeDasharray="3 3"
                    label={{ value: "Crisis", position: "top", style: { fontSize: 10, fill: "#f59e0b" } }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Recovery actions — AI-generated */}
          <Card>
            <CardHeader><CardTitle className="text-[#1a3a6b] text-base">What Would Have Helped</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {stressResult?.recoveryActions && stressResult.recoveryActions.length > 0 ? (
                stressResult.recoveryActions.map((action: string, i: number) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100">
                    <span className="text-xl shrink-0">{["💡", "🛡️", "📊", "📅", "💰"][i % 5]}</span>
                    <div>
                      <p className="text-sm text-gray-700 leading-relaxed">{action}</p>
                    </div>
                  </div>
                ))
              ) : (
                [
                  { icon: "🛡️", text: "Consider gradually shifting your portfolio toward more conservative allocations as you approach your target date to reduce vulnerability to market downturns." },
                  { icon: "📅", text: "Extending your investment horizon by a few years could give your portfolio additional time to recover from significant market disruptions." },
                  { icon: "📊", text: "Maintaining consistent contributions during market declines can help accelerate your recovery through dollar-cost averaging benefits." },
                ].map(a => (
                  <div key={a.text} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100">
                    <span className="text-xl shrink-0">{a.icon}</span>
                    <div>
                      <p className="text-sm text-gray-700 leading-relaxed">{a.text}</p>
                    </div>
                  </div>
                ))
              )}
              <p className="text-[10px] text-gray-400 mt-2">These suggestions are educational only and do not constitute personalized financial advice. Consult your advisor for specific recommendations.</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 3: AI INSIGHTS
// ═══════════════════════════════════════════════════════════════════════════════

function InsightsTab({ sandboxId }: { sandboxId: string }) {
  const [insights, setInsights] = useState<{ id: string; title: string; severity: "green" | "amber" | "red"; sentToAdvisor: boolean; body: string }[]>([]);
  const [generating, setGenerating] = useState(false);
  const [hasExisting, setHasExisting] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Fetch insights on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/sandboxes/${sandboxId}/insights?scope=client`);
        if (res.ok) {
          const { data } = await res.json();
          if (data?.length) {
            setInsights(data.map((ins: Record<string, unknown>) => ({
              id: String(ins.id),
              title: String(ins.title),
              severity: ins.priority === "high" ? "red" as const : ins.priority === "medium" ? "amber" as const : "green" as const,
              sentToAdvisor: Boolean(ins.sentToAdvisor),
              body: String(ins.body),
            })));
            setHasExisting(true);
          }
        }
      } catch { /* use defaults */ }
      setLoaded(true);
    })();
  }, [sandboxId]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch(`/api/sandboxes/${sandboxId}/insights`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const { data } = await res.json();
        const list = data?.clientInsights || data;
        if (Array.isArray(list) && list.length) {
          setInsights(list.map((ins: Record<string, unknown>) => ({
            id: String(ins.id),
            title: String(ins.title),
            severity: ins.priority === "high" ? "red" as const : ins.priority === "medium" ? "amber" as const : "green" as const,
            sentToAdvisor: Boolean(ins.sentToAdvisor),
            body: String(ins.body || ins.suggestedAction || ""),
          })));
          setHasExisting(true);
        }
      }
    } catch { /* keep existing */ }
    setGenerating(false);
  };

  const SEVERITY = {
    green: { card: "border-emerald-200 bg-emerald-50", icon: <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> },
    amber: { card: "border-amber-200 bg-amber-50",     icon: <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" /> },
    red:   { card: "border-red-200 bg-red-50",         icon: <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" /> },
  };

  if (!loaded) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-[#1a3a6b]" />
      </div>
    );
  }

  // Empty state — no insights exist yet
  if (!hasExisting && insights.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
        <Lightbulb className="w-10 h-10 text-gray-300" />
        <div>
          <p className="text-sm font-semibold text-gray-700">No insights generated yet</p>
          <p className="text-xs text-gray-400 mt-1">Generate AI-powered insights based on your current sandbox data.</p>
        </div>
        <Button onClick={handleGenerate} disabled={generating} className="bg-[#1a3a6b] hover:bg-[#16325c] gap-2">
          {generating
            ? <><RefreshCw className="w-4 h-4 animate-spin" /> Generating…</>
            : <><Sparkles className="w-4 h-4" /> Generate Insights</>}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Button onClick={handleGenerate}
        disabled={generating} className="bg-[#1a3a6b] hover:bg-[#16325c] gap-2"
      >
        {generating
          ? <><RefreshCw className="w-4 h-4 animate-spin" /> Generating…</>
          : <><Sparkles className="w-4 h-4" /> Generate Fresh Insights</>}
      </Button>

      <div className="space-y-3">
        {insights.map(ins => (
          <Card key={ins.id} className={cn("border", SEVERITY[ins.severity].card)}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                {SEVERITY[ins.severity].icon}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{ins.title}</p>
                  <p className="text-xs text-gray-600 mt-1 leading-relaxed">{ins.body}</p>
                </div>
              </div>

            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 4: SESSION HISTORY
// ═══════════════════════════════════════════════════════════════════════════════

function SessionHistoryTab({ sessions, sandboxId }: { sessions: { id: string; label: string; current: boolean; sliders: string; insightCount: number; stressCount: number }[]; sandboxId: string }) {
  const handleRestore = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/sandboxes/${sandboxId}/duplicate`, { method: "POST" });
      if (res.ok) {
        const { data } = await res.json();
        window.location.href = `/sandbox/${data?.id || sandboxId}`;
      }
    } catch {}
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        Each session is an auto-saved snapshot of your plan. Open read-only, compare to current, or restore as a new sandbox.
      </p>
      {sessions.length === 0 ? (
        <Card><CardContent className="p-6 text-center text-sm text-gray-400">No sessions yet. Adjust your sliders to create your first session.</CardContent></Card>
      ) : (
      <Card>
        <CardContent className="p-0">
          {sessions.map((s, i) => (
            <div key={s.id}>
              {i > 0 && <Separator />}
              <div className={cn("flex items-start gap-4 px-4 py-4 hover:bg-gray-50/80 transition-colors", s.current && "bg-[#1a3a6b]/[0.03]")}>
                <div className={cn("w-2 h-2 rounded-full shrink-0 mt-1.5", s.current ? "bg-[#1a3a6b]" : "bg-gray-300")} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={cn("text-sm font-medium", s.current ? "text-[#1a3a6b]" : "text-gray-800")}>{s.label}</p>
                    {s.current && <Badge variant="outline" className="text-[10px] border-[#1a3a6b]/30 text-[#1a3a6b]">Current</Badge>}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{s.sliders}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] text-gray-400">{s.insightCount} insight{s.insightCount !== 1 ? "s" : ""}</span>
                    <span className="text-[10px] text-gray-400">{s.stressCount} stress test{s.stressCount !== 1 ? "s" : ""}</span>
                  </div>
                </div>
                {!s.current && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button variant="outline" size="xs" className="gap-1 text-gray-600 border-gray-200" asChild>
                      <Link href={`/sandbox/${sandboxId}/history`}><BookOpen className="w-3 h-3" /> View</Link>
                    </Button>
                    <Button variant="outline" size="xs" className="gap-1 text-[#1a3a6b] border-[#1a3a6b]/30"
                      onClick={() => handleRestore(s.id)}>
                      <RotateCcw className="w-3 h-3" /> Restore
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHATBOT PANEL
// ═══════════════════════════════════════════════════════════════════════════════

const BOT_RESPONSES: Record<string, string> = {
  "retire at 60": "Retiring at 60 reduces your accumulation phase by 5 years and extends withdrawals. Your projected wealth at 60 would be ~28% less than at 65. Try moving the Retirement Age slider to 60 to see the full impact live. Your advisor can model a phased retirement to bridge the gap.",
  "more do i need": "Based on your sandbox, you have a ~$320/mo gap to fully fund your $2M retirement target at 65. Try moving the Monthly Contribution slider to $2,520 to close it at base-case returns.",
  "2008 crash": "The 2008 crisis demonstrated sequence-of-returns risk — the timing of a crash matters as much as its size. A crash early in your accumulation phase (like now) is less damaging than one in the 5 years before retirement. Your sandbox is 30 years from retirement, which gives substantial recovery time.",
  "best case worst": "The spread between best and worst at retirement reflects uncertainty in annual returns. Real outcomes tend to cluster near the base over 30+ year periods.",
};

function ChatbotPanel({ open, onClose, sandboxId, portfolioType }: { open: boolean; onClose: () => void; sandboxId: string; portfolioType?: string }) {
  const [messages, setMessages]       = useState<ChatMessage[]>([]);
  const [input, setInput]             = useState("");
  const [loading, setLoading]         = useState(false);
  const [disclaimer, setDisclaimer]   = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // Dynamic suggested questions based on portfolio type
  const QUICK_Q_MAP: Record<string, string[]> = {
    retirement: [
      "What happens if I retire at 60 instead of 65?",
      "How much more should I save to reach my goal?",
      "How does inflation impact my retirement plan?",
      "What's my probability of success with current savings?",
    ],
    equity: [
      "What return can I expect over my time horizon?",
      "How does dollar-cost averaging help my portfolio?",
      "What's the impact of expense ratios on my returns?",
      "Should I increase my monthly DCA amount?",
    ],
    realestate: [
      "Is this rental property cash-flow positive?",
      "What's my projected equity after the hold period?",
      "How does vacancy rate affect my returns?",
      "Should I put more money down to reduce my mortgage?",
    ],
    college: [
      "Will I have enough saved by the time my child starts college?",
      "How much more do I need to contribute monthly?",
      "What if tuition increases faster than expected?",
      "Should I switch to a more aggressive allocation?",
    ],
    emergency: [
      "How many months will my emergency fund cover?",
      "When will I reach my target buffer?",
      "How does inflation erode my emergency fund?",
      "Should I move some savings to a high-yield account?",
    ],
  };

  const QUICK_Q = QUICK_Q_MAP[portfolioType || "retirement"] || QUICK_Q_MAP.retirement;

  const send = async (text: string) => {
    if (!text.trim()) return;
    const userMsg: ChatMessage = { role: "user", content: text };
    setMessages(p => [...p, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg].map(m => ({ role: m.role === "bot" ? "assistant" : m.role, content: m.content })),
          sandboxId,
        }),
      });

      if (!res.ok || !res.body) {
        // Fallback to local responses
        const key = Object.keys(BOT_RESPONSES).find(k => text.toLowerCase().includes(k));
        const reply = key ? BOT_RESPONSES[key] : "I'm having trouble connecting right now. Please try again in a moment.";
        setMessages(p => [...p, { role: "bot", content: reply }]);
        setLoading(false);
        return;
      }

      // Stream response
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accum = "";

      setMessages(p => [...p, { role: "bot", content: "" }]);
      setLoading(false);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        // Parse SSE data lines
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") break;
            accum += data;
            setMessages(p => {
              const updated = [...p];
              updated[updated.length - 1] = { role: "bot", content: accum };
              return updated;
            });
          }
        }
      }
    } catch {
      const key = Object.keys(BOT_RESPONSES).find(k => text.toLowerCase().includes(k));
      const reply = key ? BOT_RESPONSES[key] : "I'm having trouble connecting right now. Please try again in a moment.";
      setMessages(p => [...p, { role: "bot", content: reply }]);
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed bottom-6 right-6 w-[380px] max-h-[520px] bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#1a3a6b] shrink-0">
        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
          <Bot className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-white">WealthBot</p>
          <p className="text-[10px] text-white/60 truncate">Your sandbox assistant</p>
        </div>
        <button onClick={onClose} className="text-white/60 hover:text-white transition-colors p-1">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Disclaimer */}
      {!disclaimer && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 shrink-0">
          <p className="text-[11px] text-amber-800 leading-snug">
            WealthBot uses your sandbox data to answer questions. Responses are educational and{" "}
            <strong>not personalized financial advice</strong>. For investment decisions, consult your registered advisor.
          </p>
          <button onClick={() => setDisclaimer(true)} className="text-[11px] text-amber-700 font-semibold underline mt-1.5">
            Got it, continue
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
        {messages.length === 0 && (
          <div className="space-y-2.5">
            <p className="text-xs text-gray-400 text-center">Suggested questions</p>
            {QUICK_Q.map(q => (
              <button key={q} onClick={() => send(q)}
                className="w-full text-left text-xs text-[#1a3a6b] bg-[#1a3a6b]/5 hover:bg-[#1a3a6b]/10 border border-[#1a3a6b]/15 rounded-lg px-3 py-2 transition-colors"
              >{q}</button>
            ))}
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div className={cn("max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed",
              m.role === "user" ? "bg-[#1a3a6b] text-white" : "bg-gray-100 text-gray-700"
            )}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-xl px-3 py-2.5 flex gap-1 items-center">
              {[0, 1, 2].map(i => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-100 px-3 py-2.5 flex items-center gap-2 shrink-0">
        <Input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && send(input)}
          placeholder="Ask about this sandbox…" className="h-8 text-xs border-gray-200"
        />
        <Button size="icon-sm" className="bg-[#1a3a6b] hover:bg-[#16325c] shrink-0"
          onClick={() => send(input)} disabled={!input.trim()}
        >
          <Send className="w-3.5 h-3.5" />
        </Button>
      </div>
      <p className="text-center text-[9px] text-gray-400 pb-2 px-4">
        Educational only · Not financial advice · Consult your advisor for decisions
      </p>
    </div>
  );
}

// ─── Helper: relative time ────────────────────────────────────────────────────
function timeAgoShort(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  return `${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? "s" : ""} ago`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════

export default function SandboxEditorPage() {
  const params = useParams();
  const sandboxId = params.id as string;

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sliderState, setSliderState]           = useState<Record<string, number>>({});
  const [portfolioType, setPortfolioType]       = useState<string>("retirement");
  const [goals, setGoals]                       = useState<Goal[]>(INITIAL_GOALS);
  const [focusAge, setFocusAge]                 = useState<number | null>(null);
  const [activeTab, setActiveTab]               = useState("plan");
  const [chatOpen, setChatOpen]                 = useState(false);
  const [loading, setLoading]                   = useState(true);
  const [sandboxName, setSandboxName]           = useState("Loading…");
  const [simResult, setSimResult]               = useState<SimResponse | null>(null);
  const [meta, setMeta]                         = useState(INITIAL_META);
  const [sessionsList, setSessionsList]         = useState<{ id: string; label: string; current: boolean; sliders: string; insightCount: number; stressCount: number }[]>([]);
  const [stressTestsRun, setStressTestsRun]     = useState<{ id: string; name: string; icon: string; impact: number }[]>([]);

  // Advisor notes state
  const [advisorNotes, setAdvisorNotes] = useState<{ id: string; advisorName: string; text: string; createdAt: string }[]>([]);
  const [isSharedSandbox, setIsSharedSandbox] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);

  // Fetch sandbox data on mount
  const fetchSandbox = useCallback(async () => {
    try {
      const res = await fetch(`/api/sandboxes/${sandboxId}`);
      if (!res.ok) return;
      const { data } = await res.json();

      // Update meta
      const sb = data;
      setSandboxName(sb.name);
      setPortfolioType(sb.portfolioType || "retirement");
      const newMeta = {
        name: sb.name,
        type: sb.portfolioType,
        createdAt: new Date(sb.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        lastModified: timeAgoShort(sb.updatedAt),
        sessionCount: sb.sessionCount || 0,
        currentAge: sb.userAge || 35,
        advisor: INITIAL_META.advisor,
      };
      setMeta(newMeta);

      // Update sliders from sandbox state (portfolio-type-specific)
      const ss = sb.sliderState || {};
      const numericSliders: Record<string, number> = {};
      for (const [k, v] of Object.entries(ss)) {
        if (typeof v === "number") numericSliders[k] = v;
      }
      setSliderState(numericSliders);

      // Update goals from sandbox
      if (sb.goals?.length) {
        setGoals(sb.goals.map((g: { id: string; label: string; type: string; targetYear: number; targetAmount: number }) => ({
          id: g.id,
          label: g.label || g.type,
          targetYear: g.targetYear,
          targetAge: g.targetYear - new Date().getFullYear() + (newMeta.currentAge),
          amount: g.targetAmount,
          status: "on-track" as const,
        })));
      }

      // Load sessions
      const sessRes = await fetch(`/api/sandboxes/${sandboxId}/sessions`);
      if (sessRes.ok) {
        const sessData = await sessRes.json();
        setSessionsList((sessData.data || []).map((s: Record<string, unknown>, i: number) => ({
          id: s.id as string,
          label: s.name as string || new Date(s.createdAt as string).toLocaleDateString(),
          current: i === 0,
          sliders: `Session ${i + 1}`,
          insightCount: 0,
          stressCount: (s.stressTestsRun as unknown[])?.length || 0,
        })));
      }

      // Load insights - handled by InsightsTab component directly

      // Check if sandbox is shared and load advisor notes
      if (sb.sharedWithAdvisor) {
        setIsSharedSandbox(true);
      }
      // Always load advisor notes (available on both shared and cloned sandboxes)
      try {
        const notesRes = await fetch(`/api/sandboxes/${sandboxId}/notes`);
        if (notesRes.ok) {
          const notesData = await notesRes.json();
          setAdvisorNotes(notesData.data || []);
          if ((notesData.data || []).length > 0) setIsSharedSandbox(true);
        }
      } catch {}

    } catch (err) {
      console.error("Failed to load sandbox:", err);
    } finally {
      setLoading(false);
    }
  }, [sandboxId]);

  useEffect(() => { fetchSandbox(); }, [fetchSandbox]);

  // Debounced slider save + simulation for sidebar metrics
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const simTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fire a Python API call for sidebar summary metrics
  useEffect(() => {
    if (loading || Object.keys(sliderState).length === 0) return;
    if (simTimerRef.current) clearTimeout(simTimerRef.current);
    simTimerRef.current = setTimeout(async () => {
      try {
        const endpoint = MC_ENDPOINTS[portfolioType] || "retirement";
        let payload: unknown;
        switch (portfolioType) {
          case "equity":     payload = buildEquityPayload(sliderState); break;
          case "realestate": payload = buildRealEstatePayload(sliderState); break;
          case "college":    payload = buildCollegePayload(sliderState); break;
          case "emergency":  payload = buildEmergencyPayload(sliderState); break;
          default:           payload = buildRetirementPayload(sliderState, meta.currentAge); break;
        }
        const res = await fetch(`/mc-api/${endpoint}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) setSimResult(await res.json());
      } catch { /* ignore for sidebar */ }
    }, 500);
    return () => { if (simTimerRef.current) clearTimeout(simTimerRef.current); };
  }, [sliderState, portfolioType, meta.currentAge, loading]);

  // Debounced save to server
  useEffect(() => {
    if (loading || Object.keys(sliderState).length === 0) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        await fetch(`/api/sandboxes/${sandboxId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sliderState }),
        });
      } catch (err) {
        console.error("Failed to save slider state:", err);
      }
    }, 1500);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [sliderState, sandboxId, loading]);

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ height: "calc(100vh - 56px)" }}>
        <Loader2 className="w-8 h-8 animate-spin text-[#1a3a6b]" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col" style={{ height: "calc(100vh - 56px)" }}>

        {/* Breadcrumb bar */}
        <div className="px-5 py-3 border-b border-gray-100 bg-white shrink-0 flex items-center justify-between">
          <Breadcrumb items={[
            { label: "Dashboard",  href: "/client/dashboard" },
            { label: "Sandboxes",  href: "/sandbox" },
            { label: sandboxName },
          ]} />

          {isSharedSandbox && (
            <div className="relative">
              <Button
                variant={advisorNotes.length > 0 ? "default" : "outline"}
                size="sm"
                className={cn(
                  "gap-1.5",
                  advisorNotes.length > 0
                    ? "bg-amber-500 hover:bg-amber-600 text-white shadow-sm"
                    : "text-[#1a3a6b] border-[#1a3a6b]/30"
                )}
                onClick={() => setNotesOpen(!notesOpen)}
              >
                <StickyNote className="w-3.5 h-3.5" />
                Advisor Notes
                {advisorNotes.length > 0 && (
                  <Badge className="ml-1 h-4 px-1.5 text-[10px] bg-white text-amber-600">
                    {advisorNotes.length}
                  </Badge>
                )}
              </Button>

              {notesOpen && (
                <div className="absolute right-0 top-full mt-2 w-96 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b bg-amber-50 flex items-center justify-between">
                    <p className="text-sm font-semibold text-amber-800 flex items-center gap-1.5">
                      <StickyNote className="w-4 h-4" /> Advisor Notes
                    </p>
                    <Button variant="ghost" size="icon-sm" onClick={() => setNotesOpen(false)}>
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {advisorNotes.length === 0 ? (
                      <div className="px-4 py-6 text-center text-sm text-gray-400">
                        <StickyNote className="w-5 h-5 mx-auto mb-1 text-gray-300" />
                        No notes from your advisor yet.
                      </div>
                    ) : advisorNotes.map(n => (
                      <div key={n.id} className="px-4 py-3 border-b last:border-b-0 hover:bg-amber-50/40">
                        <p className="text-sm text-gray-700 leading-relaxed">{n.text}</p>
                        <p className="text-[10px] text-gray-400 mt-1.5 flex items-center gap-1">
                          <span className="w-4 h-4 rounded-full bg-[#1a3a6b] text-white flex items-center justify-center text-[8px] font-bold shrink-0">
                            {n.advisorName?.[0] || "A"}
                          </span>
                          {n.advisorName} · {new Date(n.createdAt).toLocaleDateString()}{" "}
                          {new Date(n.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Advisor notes banner */}
        {isSharedSandbox && advisorNotes.length > 0 && !notesOpen && (
          <button
            onClick={() => setNotesOpen(true)}
            className="w-full px-5 py-2 bg-amber-50 border-b border-amber-200 flex items-center gap-2 hover:bg-amber-100 transition-colors text-left shrink-0"
          >
            <StickyNote className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <p className="text-xs text-amber-800 flex-1">
              <span className="font-semibold">{advisorNotes.length} advisor note{advisorNotes.length !== 1 ? "s" : ""}</span>
              {" — "}
              <span className="text-amber-600">&ldquo;{advisorNotes[0].text.slice(0, 80)}{advisorNotes[0].text.length > 80 ? "…" : ""}&rdquo;</span>
            </p>
            <span className="text-[10px] text-amber-500 shrink-0">Click to view</span>
          </button>
        )}

        {/* Sidebar + main */}
        <div className="flex flex-1 overflow-hidden">

          {/* Sidebar */}
          <SandboxSidebar
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed(c => !c)}
            sliderState={sliderState}
            goals={goals}
            onGoalClick={g => { setFocusAge(g.targetAge); setActiveTab("plan"); }}
            onOpenChat={() => setChatOpen(true)}
            onOpenStressTest={() => setActiveTab("stress")}
            meta={meta}
            sessions={sessionsList}
            stressTests={stressTestsRun}
            simResult={simResult}
            portfolioType={portfolioType}
            advisorNotes={advisorNotes}
            onToggleNotes={() => setNotesOpen(p => !p)}
          />

          {/* Main content */}
          <div className="flex-1 overflow-y-auto bg-[#f8fafc]">
            <div className="p-5 md:p-6 max-w-5xl">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-5">
                  <TabsTrigger value="plan"     className="flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5" /> Plan Simulator</TabsTrigger>
                  <TabsTrigger value="stress"   className="flex items-center gap-1.5"><ZapOff     className="w-3.5 h-3.5" /> Crisis Stress Test</TabsTrigger>
                  <TabsTrigger value="insights" className="flex items-center gap-1.5"><Lightbulb  className="w-3.5 h-3.5" /> AI Insights</TabsTrigger>
                </TabsList>

                <TabsContent value="plan">
                  <PlanSimulatorTab
                    portfolioType={portfolioType}
                    sliderState={sliderState}
                    onSliderChange={(key, value) => setSliderState(prev => ({ ...prev, [key]: value }))}
                    currentAge={meta.currentAge}
                  />
                </TabsContent>
                <TabsContent value="stress">
                  <StressTestTab sliderState={sliderState} sandboxId={sandboxId} currentAge={meta.currentAge} />
                </TabsContent>
                <TabsContent value="insights">
                  <InsightsTab sandboxId={sandboxId} />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>

        {/* Floating chatbot button */}
        {!chatOpen && (
          <button onClick={() => setChatOpen(true)}
            className="fixed bottom-6 right-6 w-12 h-12 rounded-full bg-[#1a3a6b] hover:bg-[#16325c] text-white shadow-lg shadow-[#1a3a6b]/30 flex items-center justify-center transition-all hover:scale-105 active:scale-95 z-40"
            aria-label="Open WealthBot"
          >
            <MessageCircle className="w-5 h-5" />
          </button>
        )}

        <ChatbotPanel open={chatOpen} onClose={() => setChatOpen(false)} sandboxId={sandboxId} portfolioType={portfolioType} />
      </div>
    </TooltipProvider>
  );
}
