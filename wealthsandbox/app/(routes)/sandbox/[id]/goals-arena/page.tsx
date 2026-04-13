"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ComposedChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  ArrowLeft, Target, GraduationCap, Home, PiggyBank, Loader2,
  Swords, Trophy, AlertTriangle, CheckCircle2, RefreshCw,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Breadcrumb } from "@/components/breadcrumb";

// ─── Types ────────────────────────────────────────────────────────────────────

interface GoalDef {
  id: string;
  label: string;
  type: "retirement" | "college" | "realestate" | "equity" | "emergency" | "custom";
  targetAmount: number;
  targetYear: number;
  allocation: number; // 0–100, sum = 100
  color: string;
  icon: React.ReactNode;
}

interface GoalResult {
  goalId: string;
  probability: number;
  projectedAmount: number;
  shortfall: number;
  chartData: { year: number; p50: number; p90: number; p10: number }[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const GOAL_COLORS = [
  "#1a3a6b", // navy
  "#7c3aed", // purple
  "#0891b2", // cyan
  "#d97706", // amber
  "#059669", // emerald
];

const GOAL_ICONS: Record<string, React.ReactNode> = {
  retirement: <Target className="w-4 h-4" />,
  college:    <GraduationCap className="w-4 h-4" />,
  realestate: <Home className="w-4 h-4" />,
  equity:     <TrendingUp className="w-4 h-4" />,
  emergency:  <PiggyBank className="w-4 h-4" />,
  custom:     <Trophy className="w-4 h-4" />,
};

// ─── Custom tooltip ───────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ArenaTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const fmt = (v: number) => v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(2)}M` : `$${(v / 1_000).toFixed(0)}K`;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 text-xs">
      <p className="font-semibold text-gray-700 mb-1.5">Year {label}</p>
      {payload.map((p: { dataKey: string; color: string; value: number; name: string }) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
          <span className="text-gray-500">{p.name}:</span>
          <span className="font-semibold text-gray-800">{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Triangle Allocation Widget ───────────────────────────────────────────────

function TriangleWidget({
  goals,
  onAllocationChange,
}: {
  goals: GoalDef[];
  onAllocationChange: (id: string, value: number) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">Drag sliders to reallocate monthly contribution across goals. Total must equal 100%.</p>
      {goals.map((goal, idx) => {
        const others = goals.filter(g => g.id !== goal.id);
        const maxAlloc = 100 - others.reduce((s, g) => s + Math.min(g.allocation, 5), 0);

        return (
          <div key={goal.id} className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: GOAL_COLORS[idx % GOAL_COLORS.length] }} />
                <span className="text-xs font-medium text-gray-700 truncate max-w-[160px]">{goal.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-900">{goal.allocation}%</span>
                <span className="text-[10px] text-gray-400">${Math.round(goal.allocation / 100 * 3000).toLocaleString()}/mo</span>
              </div>
            </div>
            <Slider
              min={0}
              max={maxAlloc}
              step={1}
              value={[goal.allocation]}
              onValueChange={([v]) => onAllocationChange(goal.id, v)}
              className="w-full"
              style={{ "--slider-color": GOAL_COLORS[idx % GOAL_COLORS.length] } as React.CSSProperties}
            />
          </div>
        );
      })}

      {/* Total indicator */}
      {(() => {
        const total = goals.reduce((s, g) => s + g.allocation, 0);
        const isOk = total === 100;
        return (
          <div className={cn(
            "flex items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold border",
            isOk
              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
              : "bg-amber-50 border-amber-200 text-amber-700"
          )}>
            <span>{isOk ? <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" /> : <AlertTriangle className="w-3.5 h-3.5 inline mr-1" />}
              Total allocation
            </span>
            <span>{total}% / 100%</span>
          </div>
        );
      })()}
    </div>
  );
}

// ─── Goal Result Card ──────────────────────────────────────────────────────────

function GoalResultCard({
  goal,
  result,
  idx,
  totalMonthly,
}: {
  goal: GoalDef;
  result: GoalResult | null;
  idx: number;
  totalMonthly: number;
}) {
  const color = GOAL_COLORS[idx % GOAL_COLORS.length];
  const allocatedMonthly = Math.round(goal.allocation / 100 * totalMonthly);
  const prob = result?.probability ?? null;
  const status = prob === null ? "pending" : prob >= 75 ? "on-track" : prob >= 50 ? "close" : "at-risk";

  return (
    <Card className={cn("border-l-4 transition-all", { "opacity-60": goal.allocation === 0 })}
      style={{ borderLeftColor: color }}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0" style={{ backgroundColor: color }}>
            {GOAL_ICONS[goal.type] || GOAL_ICONS.custom}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-gray-800 truncate">{goal.label}</p>
              <Badge className={cn("text-[9px] px-1.5",
                status === "on-track" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                status === "close"    ? "bg-amber-50 text-amber-700 border-amber-200" :
                status === "at-risk"  ? "bg-red-50 text-red-700 border-red-200" :
                "bg-gray-50 text-gray-500 border-gray-200"
              )}>
                {status === "on-track" ? "✓ On Track" : status === "close" ? "⚠ Close" : status === "at-risk" ? "✗ At Risk" : "…"}
              </Badge>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-2">
              <div>
                <p className="text-[9px] text-gray-400 uppercase tracking-wider">Allocation</p>
                <p className="text-sm font-bold" style={{ color }}>{goal.allocation}%</p>
                <p className="text-[10px] text-gray-400">${allocatedMonthly.toLocaleString()}/mo</p>
              </div>
              <div>
                <p className="text-[9px] text-gray-400 uppercase tracking-wider">P(Success)</p>
                <p className={cn("text-sm font-bold",
                  prob === null ? "text-gray-400" :
                  prob >= 75 ? "text-emerald-600" : prob >= 50 ? "text-amber-600" : "text-red-600"
                )}>
                  {prob === null ? "—" : `${prob.toFixed(0)}%`}
                </p>
              </div>
              <div>
                <p className="text-[9px] text-gray-400 uppercase tracking-wider">Target</p>
                <p className="text-sm font-bold text-gray-700">
                  ${goal.targetAmount >= 1_000_000
                    ? `${(goal.targetAmount / 1_000_000).toFixed(1)}M`
                    : `${Math.round(goal.targetAmount / 1000)}K`}
                </p>
                <p className="text-[10px] text-gray-400">{goal.targetYear}</p>
              </div>
            </div>

            {/* Progress bar */}
            {result && result.projectedAmount > 0 && (
              <div className="mt-2">
                <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-1.5 rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.min(100, (result.projectedAmount / goal.targetAmount) * 100)}%`,
                      backgroundColor: color,
                    }}
                  />
                </div>
                <p className="text-[9px] text-gray-400 mt-0.5">
                  Projected: ${result.projectedAmount >= 1_000_000
                    ? `${(result.projectedAmount / 1_000_000).toFixed(2)}M`
                    : `${Math.round(result.projectedAmount / 1000)}K`}
                  {result.shortfall > 0 && (
                    <span className="text-red-500"> · Gap: ${Math.round(result.shortfall / 1000)}K</span>
                  )}
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function GoalsArenaPage() {
  const params = useParams();
  const sandboxId = params.id as string;

  const [sandboxName, setSandboxName]   = useState("Loading…");
  const [goals, setGoals]               = useState<GoalDef[]>([]);
  const [totalMonthly, setTotalMonthly] = useState(3000);
  const [currentAge, setCurrentAge]     = useState(35);
  const [results, setResults]           = useState<Record<string, GoalResult>>({});
  const [loading, setLoading]           = useState(true);
  const [simulating, setSimulating]     = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Load sandbox data and build goal set
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/sandboxes/${sandboxId}`);
        if (!res.ok) return;
        const { data } = await res.json();

        setSandboxName(data.name || "Sandbox");
        const age = data.userAge || data.sliderState?.currentAge || 35;
        setCurrentAge(age);
        const monthly = data.sliderState?.monthlyContribution || 3000;
        setTotalMonthly(monthly);

        // Build goal list from sandbox goals
        const rawGoals = data.goals || [];
        if (rawGoals.length >= 2) {
          const evenAlloc = Math.floor(100 / rawGoals.length);
          const remainder = 100 - evenAlloc * rawGoals.length;
          const mapped: GoalDef[] = rawGoals.map((g: Record<string, unknown>, idx: number) => ({
            id: g.id as string,
            label: (g.label || g.type) as string,
            type: (g.type as GoalDef["type"]) || "custom",
            targetAmount: (g.targetAmount as number) || 500000,
            targetYear: (g.targetYear as number) || new Date().getFullYear() + 20,
            allocation: idx === 0 ? evenAlloc + remainder : evenAlloc,
            color: GOAL_COLORS[idx % GOAL_COLORS.length],
            icon: GOAL_ICONS[(g.type as string) || "custom"],
          }));
          setGoals(mapped);
        } else {
          // Demo goals if sandbox doesn't have multiple
          setGoals([
            { id: "ret",  label: "Retire at 65",         type: "retirement", targetAmount: 2_000_000, targetYear: new Date().getFullYear() + (65 - age), allocation: 50, color: GOAL_COLORS[0], icon: GOAL_ICONS.retirement },
            { id: "col",  label: "College Fund",         type: "college",    targetAmount: 200_000,   targetYear: new Date().getFullYear() + 15,           allocation: 30, color: GOAL_COLORS[1], icon: GOAL_ICONS.college },
            { id: "home", label: "Buy a House",          type: "realestate", targetAmount: 100_000,   targetYear: new Date().getFullYear() + 7,            allocation: 20, color: GOAL_COLORS[2], icon: GOAL_ICONS.realestate },
          ]);
        }
      } catch (e) {
        console.error(e);
        // Fallback demo
        setGoals([
          { id: "ret",  label: "Retire at 65",    type: "retirement", targetAmount: 2_000_000, targetYear: new Date().getFullYear() + 30, allocation: 50, color: GOAL_COLORS[0], icon: GOAL_ICONS.retirement },
          { id: "col",  label: "College Fund",    type: "college",    targetAmount: 200_000,   targetYear: new Date().getFullYear() + 15, allocation: 30, color: GOAL_COLORS[1], icon: GOAL_ICONS.college },
          { id: "home", label: "Buy a House",     type: "realestate", targetAmount: 100_000,   targetYear: new Date().getFullYear() + 7,  allocation: 20, color: GOAL_COLORS[2], icon: GOAL_ICONS.realestate },
        ]);
      } finally {
        setLoading(false);
      }
    })();
  }, [sandboxId]);

  // Simulate all goals whenever allocations change
  const simulate = useCallback(async (goalList: GoalDef[]) => {
    if (goalList.length === 0) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setSimulating(true);

    const newResults: Record<string, GoalResult> = {};

    await Promise.allSettled(
      goalList.map(async (goal) => {
        if (goal.allocation === 0) {
          newResults[goal.id] = { goalId: goal.id, probability: 0, projectedAmount: 0, shortfall: goal.targetAmount, chartData: [] };
          return;
        }

        const allocated = totalMonthly * (goal.allocation / 100);
        const yearsToGoal = Math.max(1, goal.targetYear - new Date().getFullYear());
        const currentYear = new Date().getFullYear();

        try {
          let payload: Record<string, unknown>;
          let endpoint = "retirement";

          if (goal.type === "college") {
            endpoint = "college";
            payload = {
              child_age: 3,
              target_start_age: 18,
              target_cost: goal.targetAmount,
              current_balance: 0,
              monthly_contrib: allocated,
              expected_return: 0.06,
              volatility: 0.08,
            };
          } else if (goal.type === "realestate") {
            endpoint = "equity"; // use equity as proxy for house down payment savings
            payload = {
              initial_lump_sum: 0,
              monthly_dca: allocated,
              time_horizon_years: yearsToGoal,
              expected_return: 0.05,
              volatility: 0.08,
              expense_ratio: 0.001,
            };
          } else {
            endpoint = "equity";
            payload = {
              initial_lump_sum: 0,
              monthly_dca: allocated,
              time_horizon_years: yearsToGoal,
              expected_return: goal.type === "retirement" ? 0.08 : 0.07,
              volatility: goal.type === "retirement" ? 0.15 : 0.12,
              expense_ratio: 0.002,
            };
          }

          const res = await fetch(`/mc-api/${endpoint}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            signal: ctrl.signal,
          });

          if (res.ok) {
            const data = await res.json();
            const years: number[] = data.years || Array.from({ length: yearsToGoal + 1 }, (_, i) => i);
            const p50: number[] = data.paths?.p50_base_case || data.paths?.p50 || [];
            const p90: number[] = data.paths?.p90_best_case || [];
            const p10: number[] = data.paths?.p10_worst_case || [];

            const projectedBase = p50[p50.length - 1] || 0;
            const projectedBest = p90[p90.length - 1] || 0;

            // Probability = fraction of simulations that exceed target
            const m = data.metrics || {};
            let prob: number;
            if (goal.type === "college" && data.goal_probability !== undefined) {
              prob = data.goal_probability;
            } else if (m.probability_of_success !== undefined) {
              prob = m.probability_of_success;
            } else {
              // Estimate: if base case reaches 75% of target, ~50% probability
              prob = Math.min(99, Math.max(1, (projectedBase / goal.targetAmount) * 65));
            }

            const chartData = years.slice(0, yearsToGoal + 1).map((yr: number, i: number) => ({
              year: currentYear + yr,
              p50: p50[i] || 0,
              p90: p90[i] || 0,
              p10: p10[i] || 0,
            }));

            newResults[goal.id] = {
              goalId: goal.id,
              probability: prob,
              projectedAmount: projectedBase,
              shortfall: Math.max(0, goal.targetAmount - projectedBase),
              chartData,
            };
          }
        } catch (err) {
          if (err instanceof Error && err.name === "AbortError") return;
          newResults[goal.id] = { goalId: goal.id, probability: 0, projectedAmount: 0, shortfall: goal.targetAmount, chartData: [] };
        }
      })
    );

    if (!ctrl.signal.aborted) {
      setResults(newResults);
      setSimulating(false);
    }
  }, [totalMonthly]);

  // Debounce simulation on allocation change
  const simDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (loading || goals.length === 0) return;
    if (simDebounceRef.current) clearTimeout(simDebounceRef.current);
    simDebounceRef.current = setTimeout(() => simulate(goals), 500);
    return () => { if (simDebounceRef.current) clearTimeout(simDebounceRef.current); };
  }, [goals, simulate, loading]);

  // Handle allocation change — redistribute the remainder evenly
  const handleAllocationChange = useCallback((id: string, newVal: number) => {
    setGoals(prev => {
      const target = prev.find(g => g.id === id);
      if (!target) return prev;

      const others = prev.filter(g => g.id !== id);
      const remainder = 100 - newVal;
      const totalOthers = others.reduce((s, g) => s + g.allocation, 0);

      let updated: GoalDef[];
      if (totalOthers === 0) {
        // Distribute evenly among others
        const each = Math.floor(remainder / others.length);
        const leftover = remainder - each * others.length;
        updated = prev.map((g, idx) => {
          if (g.id === id) return { ...g, allocation: newVal };
          const isLast = idx === prev.length - 1 && g.id !== id;
          return { ...g, allocation: each + (isLast ? leftover : 0) };
        });
      } else {
        // Scale others proportionally
        updated = prev.map(g => {
          if (g.id === id) return { ...g, allocation: newVal };
          const scaled = Math.round((g.allocation / totalOthers) * remainder);
          return { ...g, allocation: scaled };
        });
        // Fix rounding error
        const sum = updated.reduce((s, g) => s + g.allocation, 0);
        if (sum !== 100) {
          const lastOther = updated.filter(g => g.id !== id).at(-1);
          if (lastOther) {
            updated = updated.map(g =>
              g.id === lastOther.id ? { ...g, allocation: g.allocation + (100 - sum) } : g
            );
          }
        }
      }

      return updated;
    });
  }, []);

  // Combined chart data (all goals' P50 on one chart)
  const combinedChartData = useMemo(() => {
    if (Object.keys(results).length === 0) return [];
    const allYears = new Set<number>();
    goals.forEach(g => {
      (results[g.id]?.chartData || []).forEach(d => allYears.add(d.year));
    });
    return Array.from(allYears).sort((a, b) => a - b).map(year => {
      const point: Record<string, number> = { year };
      goals.forEach(g => {
        const d = results[g.id]?.chartData.find(x => x.year === year);
        point[`${g.id}_p50`] = d?.p50 || 0;
      });
      return point;
    });
  }, [results, goals]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-[#1a3a6b]" />
      </div>
    );
  }

  const totalAllocation = goals.reduce((s, g) => s + g.allocation, 0);

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <div className="max-w-6xl mx-auto px-5 py-7 space-y-6">

        {/* Breadcrumb */}
        <Breadcrumb items={[
          { label: "Dashboard", href: "/client/dashboard" },
          { label: sandboxName, href: `/sandbox/${sandboxId}` },
          { label: "Goals Arena" },
        ]} />

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center shrink-0">
              <Swords className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#1a3a6b]">Competing Goals Arena</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Your goals share one contribution stream — drag to reallocate and watch each goal&apos;s probability update live.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {simulating && (
              <span className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full">
                <Loader2 className="w-3 h-3 animate-spin" /> Simulating…
              </span>
            )}
            <Button variant="outline" size="sm" asChild className="gap-1.5 text-[#1a3a6b] border-[#1a3a6b]/30">
              <Link href={`/sandbox/${sandboxId}`}>
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Sandbox
              </Link>
            </Button>
          </div>
        </div>

        {/* Total monthly banner */}
        <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3">
          <div className="w-2 h-2 rounded-full bg-[#1a3a6b] shrink-0" />
          <p className="text-sm text-gray-700">
            <span className="font-semibold text-[#1a3a6b]">${totalMonthly.toLocaleString()}/month</span> total contribution being split across {goals.length} goals
          </p>
          {totalAllocation !== 100 && (
            <Badge variant="outline" className="ml-auto text-[10px] border-amber-200 text-amber-600 bg-amber-50">
              Allocation: {totalAllocation}% (not 100%)
            </Badge>
          )}
        </div>

        {/* Main layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* LEFT: Allocation widget */}
          <div className="lg:col-span-1 space-y-4">
            <Card className="border bg-white">
              <CardHeader className="border-b pb-3">
                <CardTitle className="text-sm font-semibold text-[#1a3a6b] flex items-center gap-2">
                  <Swords className="w-4 h-4" /> Allocation Control
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <TriangleWidget goals={goals} onAllocationChange={handleAllocationChange} />
              </CardContent>
            </Card>

            {/* Summary stats */}
            <Card className="border bg-white">
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wider">Arena Summary</p>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Goals on track (≥75%)</span>
                    <span className="font-semibold text-emerald-600">
                      {goals.filter(g => (results[g.id]?.probability || 0) >= 75).length} / {goals.length}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Goals at risk (&lt;50%)</span>
                    <span className="font-semibold text-red-600">
                      {goals.filter(g => results[g.id] && (results[g.id]?.probability || 0) < 50).length} / {goals.length}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Total projected shortfall</span>
                    <span className="font-semibold text-amber-600">
                      ${Math.round(Object.values(results).reduce((s, r) => s + r.shortfall, 0) / 1000)}K
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Avg success probability</span>
                    <span className="font-semibold text-[#1a3a6b]">
                      {goals.length > 0 && Object.values(results).length > 0
                        ? Math.round(Object.values(results).reduce((s, r) => s + r.probability, 0) / Object.values(results).length)
                        : "—"}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT: Chart + goal cards */}
          <div className="lg:col-span-2 space-y-4">

            {/* Combined projection chart */}
            <Card className="border bg-white">
              <CardHeader className="border-b pb-3">
                <CardTitle className="text-sm font-semibold text-[#1a3a6b] flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" /> All Goals — Competing for the Same Contribution
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {combinedChartData.length === 0 ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-[#1a3a6b]" />
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <ComposedChart data={combinedChartData} margin={{ top: 8, right: 16, bottom: 16, left: 8 }}>
                      <defs>
                        {goals.map((g, idx) => (
                          <linearGradient key={g.id} id={`grad-${g.id}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor={GOAL_COLORS[idx % GOAL_COLORS.length]} stopOpacity={0.2} />
                            <stop offset="95%" stopColor={GOAL_COLORS[idx % GOAL_COLORS.length]} stopOpacity={0} />
                          </linearGradient>
                        ))}
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="year" tick={{ fontSize: 11, fill: "#9ca3af" }} />
                      <YAxis
                        tick={{ fontSize: 11, fill: "#9ca3af" }} width={64}
                        tickFormatter={v => v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : `$${(v / 1_000).toFixed(0)}K`}
                      />
                      <RTooltip content={<ArenaTooltip />} />
                      {goals.map((g, idx) => (
                        <Area
                          key={g.id}
                          type="monotone"
                          dataKey={`${g.id}_p50`}
                          name={g.label}
                          stroke={GOAL_COLORS[idx % GOAL_COLORS.length]}
                          fill={`url(#grad-${g.id})`}
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 4 }}
                        />
                      ))}
                      <Legend
                        wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                        formatter={(v) => <span style={{ color: "#6b7280" }}>{v}</span>}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Individual goal cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {goals.map((goal, idx) => (
                <GoalResultCard
                  key={goal.id}
                  goal={goal}
                  result={results[goal.id] || null}
                  idx={idx}
                  totalMonthly={totalMonthly}
                />
              ))}
            </div>

            {/* Trade-off insight */}
            {Object.keys(results).length === goals.length && (
              <Card className="border bg-gradient-to-br from-[#1a3a6b]/5 to-purple-50 border-[#1a3a6b]/15">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Swords className="w-4 h-4 text-[#1a3a6b] shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-[#1a3a6b] mb-1">Arena Trade-off Analysis</p>
                      {(() => {
                        const sorted = [...goals].sort((a, b) => (results[b.id]?.probability || 0) - (results[a.id]?.probability || 0));
                        const winner = sorted[0];
                        const loser = sorted[sorted.length - 1];
                        const avgProb = goals.reduce((s, g) => s + (results[g.id]?.probability || 0), 0) / goals.length;
                        return (
                          <p className="text-xs text-gray-600 leading-relaxed">
                            With your current allocation, <strong>{winner?.label}</strong> has the highest success probability
                            ({results[winner?.id]?.probability?.toFixed(0) || 0}%) while <strong>{loser?.label}</strong> is most at risk
                            ({results[loser?.id]?.probability?.toFixed(0) || 0}%).
                            {avgProb < 60 && " Consider increasing total monthly contributions — your goals are competing for insufficient funds."}
                            {avgProb >= 60 && avgProb < 80 && " Your allocation is balanced but some goals need more support. Try shifting 10% from your strongest goal."}
                            {avgProb >= 80 && " Excellent! All goals are well-funded at current allocation rates."}
                          </p>
                        );
                      })()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Re-run button */}
        <div className="flex justify-center pt-2">
          <Button
            onClick={() => simulate(goals)}
            disabled={simulating}
            variant="outline"
            className="gap-2 text-[#1a3a6b] border-[#1a3a6b]/30"
          >
            {simulating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Re-run All Simulations
          </Button>
        </div>

      </div>
    </div>
  );
}
