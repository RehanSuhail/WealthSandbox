"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardAction,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  FlaskConical,
  Plus,
  ExternalLink,
  Calendar,
  Clock,
  TrendingUp,
  TrendingDown,
  Activity,
  Bell,
  ChevronRight,
  Users,
  Loader2,
  Video,
  StickyNote,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────
interface DashSandbox {
  id: string;
  name: string;
  portfolioType: string;
  updatedAt: string;
  projectedWealth: number;
  trend: "up" | "down";
  sharedWithAdvisor: boolean;
}

interface DashInsight {
  id: string;
  title: string;
  priority: string;
  createdAt: string;
}

interface DashSession {
  sandboxId: string;
  sandboxName: string;
  projectedWealth: number;
  fundsLastToAge: number;
  createdAt: string;
}

interface MeetingItem {
  id: string;
  advisorName: string;
  title: string;
  description: string;
  scheduledAt: string;
  duration: number;
  status: string;
}

const TYPE_LABELS: Record<string, string> = {
  retirement: "Retirement",
  equity: "Equity",
  realestate: "Real Estate",
  college: "Education",
  emergency: "Emergency",
  custom: "Custom",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-3">
      {children}
    </p>
  );
}

/** Tiny sparkline-style placeholder bar chart */
function MiniChart({ trend }: { trend: "up" | "down" }) {
  const bars = trend === "up"
    ? [30, 45, 38, 52, 48, 62, 70]
    : [70, 60, 65, 50, 55, 42, 38];

  return (
    <div className="flex items-end gap-0.5 h-8 w-16 shrink-0">
      {bars.map((h, i) => (
        <div
          key={i}
          className={cn(
            "flex-1 rounded-sm",
            trend === "up" ? "bg-emerald-400/70" : "bg-red-400/70"
          )}
          style={{ height: `${h}%` }}
        />
      ))}
    </div>
  );
}

function HealthRing({ score }: { score: number | null }) {
  if (score === null) {
    return (
      <div className="flex items-center gap-4 rounded-xl p-4 bg-gray-50">
        <div className="relative w-16 h-16 shrink-0">
          <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r={28} fill="none" strokeWidth="6" className="stroke-gray-200" />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-base font-bold text-gray-400">—</span>
        </div>
        <div>
          <p className="font-semibold text-sm text-gray-400">No Data Yet</p>
          <p className="text-xs text-gray-400 mt-0.5">Create a sandbox to generate your health score</p>
          <Link href="/sandbox/new" className="text-xs text-[#1a3a6b] underline underline-offset-2 hover:opacity-75 mt-1 inline-block">Create Sandbox</Link>
        </div>
      </div>
    );
  }

  const color =
    score >= 75 ? "text-emerald-500" : score >= 50 ? "text-amber-500" : "text-red-500";
  const bgColor =
    score >= 75 ? "bg-emerald-50" : score >= 50 ? "bg-amber-50" : "bg-red-50";
  const label =
    score >= 75 ? "Healthy" : score >= 50 ? "Needs Attention" : "At Risk";

  const r = 28;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;

  return (
    <div className={cn("flex items-center gap-4 rounded-xl p-4", bgColor)}>
      <div className="relative w-16 h-16 shrink-0">
        <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r={r} fill="none" strokeWidth="6" className="stroke-gray-200" />
          <circle
            cx="32" cy="32" r={r} fill="none" strokeWidth="6"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className={cn(
              "transition-all duration-700",
              score >= 75 ? "stroke-emerald-500" : score >= 50 ? "stroke-amber-500" : "stroke-red-500"
            )}
          />
        </svg>
        <span className={cn("absolute inset-0 flex items-center justify-center text-base font-bold", color)}>
          {score}
        </span>
      </div>
      <div>
        <p className={cn("font-semibold text-sm", color)}>{label}</p>
        <p className="text-xs text-gray-500 mt-0.5">Based on latest insights</p>
        <Link
          href="/insights"
          className="text-xs text-[#1a3a6b] underline underline-offset-2 hover:opacity-75 mt-1 inline-block"
        >
          View full report
        </Link>
      </div>
    </div>
  );
}

// ─── Helper: relative time ────────────────────────────────────────────────────
function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks} week${weeks > 1 ? "s" : ""} ago`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ClientDashboardPage() {
  const [sandboxes, setSandboxes] = useState<DashSandbox[]>([]);
  const [insights, setInsights] = useState<DashInsight[]>([]);
  const [lastSession, setLastSession] = useState<DashSession | null>(null);
  const [userName, setUserName] = useState("");
  const [advisorConnected, setAdvisorConnected] = useState(false);
  const [advisorName, setAdvisorName] = useState("");
  const [loading, setLoading] = useState(true);
  const [meetingsList, setMeetingsList] = useState<MeetingItem[]>([]);
  const [appNotifications, setAppNotifications] = useState<{ id: string; type: string; title: string; body: string; sandboxId?: string; read: boolean; createdAt: string }[]>([]);

  const fetchDashboard = useCallback(async () => {
    try {
      // Fetch sandboxes and insights in parallel
      const [sbRes, insRes, connRes] = await Promise.all([
        fetch("/api/sandboxes"),
        fetch("/api/insights?scope=client&limit=5"),
        fetch("/api/connect/status"),
      ]);

      if (sbRes.ok) {
        const sbData = await sbRes.json();
        const sbList = (sbData.data || []).map((sb: Record<string, unknown>) => {
          const latestSession = sb.latestSession as Record<string, unknown> | undefined;
          const p50 = (latestSession?.chartP50 as number[]) || [];
          const retireIdx = Math.floor(p50.length * 0.6);
          const projectedWealth = p50[retireIdx] || Number(((sb.sliderState as Record<string, unknown>)?.currentSavings || 0));
          const prev = p50[retireIdx - 1] || projectedWealth;
          return {
            id: sb.id as string,
            name: sb.name as string,
            portfolioType: sb.portfolioType as string,
            updatedAt: sb.updatedAt as string,
            projectedWealth,
            trend: projectedWealth >= prev ? "up" : "down",
            sharedWithAdvisor: Boolean(sb.sharedWithAdvisor),
          } as DashSandbox;
        });
        setSandboxes(sbList);

        // Set last session from first sandbox's latest session
        if (sbData.data?.[0]?.latestSession) {
          const sb = sbData.data[0];
          const ls = sb.latestSession;
          const p50 = ls.chartP50 || [];
          setLastSession({
            sandboxId: sb.id,
            sandboxName: sb.name,
            projectedWealth: p50[Math.floor(p50.length * 0.6)] || 0,
            fundsLastToAge: ls.fundsLastToAge || 0,
            createdAt: ls.createdAt,
          });
        }

      }

      // Always fetch user name
      {
        const authRes = await fetch("/api/auth/sync");
        if (authRes.ok) {
          const authData = await authRes.json();
          setUserName(authData.data?.firstName || "");
        }
      }

      if (insRes.ok) {
        const insData = await insRes.json();
        setInsights((insData.data || []).slice(0, 5));
      }

      if (connRes.ok) {
        const connData = await connRes.json();
        if (connData.data?.connected) {
          setAdvisorConnected(true);
          setAdvisorName(connData.data.advisorName || "Your Advisor");
        }
      }

      // Fetch meetings
      try {
        const mtgRes = await fetch("/api/meetings");
        if (mtgRes.ok) {
          const mtgData = await mtgRes.json();
          setMeetingsList(mtgData.data || []);
        }
      } catch {}

      // Fetch notifications
      try {
        const notifRes = await fetch("/api/notifications");
        if (notifRes.ok) {
          const notifData = await notifRes.json();
          setAppNotifications(notifData.data || []);
        }
      } catch {}
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const daysSinceReview = lastSession
    ? Math.floor((Date.now() - new Date(lastSession.createdAt).getTime()) / 86400000)
    : 0;
  const healthScore = sandboxes.length === 0 ? null : (
    insights.length === 0 ? null : (() => {
      let score = 100;
      for (const ins of insights) {
        if (ins.priority === "high") score -= 15;
        else if (ins.priority === "medium") score -= 8;
        else score -= 3;
      }
      return Math.max(0, Math.min(100, score));
    })()
  );

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const dateStr = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f8fafc]">
        <Loader2 className="w-8 h-8 animate-spin text-[#1a3a6b]" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="bg-[#f8fafc] min-h-screen">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-6">

          {/* ═══════════════════════════════════════════════════════
              ZONE A — Top bar
          ═══════════════════════════════════════════════════════ */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Greeting + date */}
            <div>
              <h1 className="text-2xl font-semibold text-[#1a3a6b]">
                {greeting}, {userName || "there"} 👋
              </h1>
              <p className="text-sm text-gray-400 mt-0.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                {dateStr}
              </p>
            </div>

            {/* Stat pills */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Active Sandboxes */}
              <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5 shadow-sm">
                <FlaskConical className="w-4 h-4 text-[#1a3a6b] shrink-0" />
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider leading-none mb-0.5">
                    Active Sandboxes
                  </p>
                  <p className="text-base font-bold text-gray-900">
                    {sandboxes.length}
                  </p>
                </div>
              </div>

              {/* Days since review */}
              <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5 shadow-sm">
                <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider leading-none mb-0.5">
                    Last Review
                  </p>
                  <p className="text-base font-bold text-gray-900">
                    {daysSinceReview} days ago
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════
              ZONE A+ — Advanced Financial Summary Cards
          ═══════════════════════════════════════════════════════ */}
          {sandboxes.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Retirement Countdown */}
              <Card className="border-0 shadow-sm bg-gradient-to-br from-[#1a3a6b]/5 to-white">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-[#1a3a6b]/10 flex items-center justify-center">
                      <Calendar className="w-4 h-4 text-[#1a3a6b]" />
                    </div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Retirement Countdown</p>
                  </div>
                  {(() => {
                    const retireAge = 65;
                    const currentAge = 35;
                    const yearsLeft = Math.max(0, retireAge - currentAge);
                    const monthsLeft = yearsLeft * 12;
                    return (
                      <div className="space-y-2">
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-bold text-[#1a3a6b]">{yearsLeft}</span>
                          <span className="text-sm text-gray-400">years</span>
                          <span className="text-lg font-semibold text-[#1a3a6b]/60 ml-1">{monthsLeft}</span>
                          <span className="text-xs text-gray-400">months</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-[#1a3a6b] h-2 rounded-full transition-all duration-700"
                            style={{ width: `${Math.min(100, ((currentAge - 22) / (retireAge - 22)) * 100)}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-gray-400">
                          {Math.round(((currentAge - 22) / (retireAge - 22)) * 100)}% of your accumulation phase complete
                        </p>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>

              {/* Total Projected Wealth */}
              <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50/50 to-white">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-emerald-600" />
                    </div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Projected Wealth</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-3xl font-bold text-emerald-700">
                      ${(() => {
                        const total = sandboxes.reduce((s, sb) => s + sb.projectedWealth, 0);
                        return total >= 1_000_000
                          ? `${(total / 1_000_000).toFixed(2)}M`
                          : total.toLocaleString();
                      })()}
                    </p>
                    <p className="text-[10px] text-gray-400">Combined across all {sandboxes.length} sandbox{sandboxes.length !== 1 ? "es" : ""}</p>
                    <div className="flex items-center gap-2 flex-wrap mt-1">
                      {sandboxes.slice(0, 3).map((sb) => (
                        <Badge key={sb.id} variant="outline" className="text-[9px]">
                          {TYPE_LABELS[sb.portfolioType] || sb.portfolioType}: ${sb.projectedWealth.toLocaleString()}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Financial Health Score */}
              <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50/50 to-white">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                      <Activity className="w-4 h-4 text-purple-600" />
                    </div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Financial Health</p>
                  </div>
                  <HealthRing score={healthScore} />
                </CardContent>
              </Card>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════
              ZONES B + C — Two-column body
          ═══════════════════════════════════════════════════════ */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">

            {/* ─── ZONE B (left, 60%) ─────────────────────────── */}
            <div className="lg:col-span-3 space-y-6">

              {/* Active Sandboxes */}
              <div>
                <SectionLabel>Active Sandboxes</SectionLabel>
                <Card>
                  <CardHeader className="border-b">
                    <CardTitle className="text-[#1a3a6b]">My Sandboxes</CardTitle>
                    <CardAction>
                      <Button
                        asChild
                        size="sm"
                        className="bg-[#1a3a6b] hover:bg-[#16325c] gap-1"
                      >
                        <Link href="/sandbox/new">
                          <Plus className="w-3.5 h-3.5" /> New Sandbox
                        </Link>
                      </Button>
                    </CardAction>
                  </CardHeader>
                  <CardContent className="p-0">
                    {sandboxes.map((sb, i) => (
                      <div key={sb.id}>
                        {i > 0 && <Separator />}
                        <div className="flex items-center gap-4 px-4 py-3.5 hover:bg-gray-50/80 transition-colors">
                          {/* Mini chart */}
                          <MiniChart trend={sb.trend} />

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-medium text-gray-800 truncate">
                                {sb.name}
                              </p>
                              <Badge variant="outline" className="text-[10px] shrink-0">
                                {TYPE_LABELS[sb.portfolioType] || sb.portfolioType}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 mt-0.5">
                              <span className="text-xs text-gray-400 flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {timeAgo(sb.updatedAt)}
                              </span>
                              <span className={cn(
                                "text-xs flex items-center gap-0.5 font-medium",
                                sb.trend === "up" ? "text-emerald-600" : "text-red-500"
                              )}>
                                {sb.trend === "up"
                                  ? <TrendingUp className="w-3 h-3" />
                                  : <TrendingDown className="w-3 h-3" />}
                                ${sb.projectedWealth.toLocaleString()}
                              </span>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="outline" size="icon-sm" asChild>
                                  <Link href={`/sandbox/${sb.id}`}>
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </Link>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Open</TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              {/* Recent Session */}
              <div>
                <SectionLabel>Recent Session</SectionLabel>
                <Card>
                  <CardHeader className="border-b">
                    <CardTitle className="text-[#1a3a6b]">Last Run</CardTitle>
                    <CardAction>
                      <Button variant="outline" size="sm" asChild className="gap-1 text-[#1a3a6b] border-[#1a3a6b]/30">
                        <Link href={`/sandbox/${lastSession?.sandboxId || sandboxes[0]?.id || "new"}`}>
                          Re-open <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </Button>
                    </CardAction>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-4">
                    <div className="flex items-center gap-2">
                      <FlaskConical className="w-4 h-4 text-[#1a3a6b]" />
                      <span className="text-sm font-medium text-gray-800">
                        {lastSession?.sandboxName || "No sessions yet"}
                      </span>
                      <span className="text-xs text-gray-400 ml-auto flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {lastSession ? timeAgo(lastSession.createdAt) : "–"}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-[#1a3a6b]/5 rounded-xl p-3">
                        <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">
                          Projected Wealth at Retirement
                        </p>
                        <p className="text-lg font-bold text-[#1a3a6b]">
                          ${(lastSession?.projectedWealth || 0).toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-emerald-50 rounded-xl p-3">
                        <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">
                          Funds Last To Age
                        </p>
                        <p className="text-lg font-bold text-emerald-700">
                          {lastSession?.fundsLastToAge || "–"}
                        </p>
                      </div>
                    </div>
                    {/* AI Health Score merged here */}
                    <Separator />
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-2">Last Insight Score</p>
                      <HealthRing score={healthScore} />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* ─── ZONE C (right, 40%) ─────────────────────────── */}
            <div className="lg:col-span-2 space-y-6">

              {/* My Advisor */}
              <div>
                <SectionLabel>My Advisor</SectionLabel>
                <Card>
                  <CardContent className="pt-4">
                    {advisorConnected ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-full bg-[#1a3a6b] flex items-center justify-center text-white font-semibold text-sm shrink-0">
                            {advisorName.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-800">
                              {advisorName}
                            </p>
                            <p className="text-xs text-gray-400">Financial Advisor</p>
                          </div>
                        </div>
                        <Button className="w-full bg-[#1a3a6b] hover:bg-[#16325c] gap-1.5" size="sm" asChild>
                          <Link href={(() => {
                            const shared = sandboxes.find(s => s.sharedWithAdvisor);
                            return shared ? `/sandbox/${shared.id}` : "/sandbox";
                          })()}>
                            <ExternalLink className="w-3.5 h-3.5" />
                            Open Shared Session
                          </Link>
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center py-4 space-y-3">
                        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto">
                          <Users className="w-5 h-5 text-gray-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-700">No advisor connected</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            Connect with an advisor to unlock shared sessions.
                          </p>
                        </div>
                        <Button variant="outline" size="sm" asChild className="border-[#1a3a6b]/30 text-[#1a3a6b] hover:bg-[#1a3a6b]/5">
                          <Link href="/connect">Find an Advisor</Link>
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Upcoming Meetings */}
              <div>
                <SectionLabel>Upcoming Meetings</SectionLabel>
                <Card>
                  <CardContent className="p-0">
                    {meetingsList.filter(m => m.status === "scheduled").length === 0 ? (
                      <div className="px-4 py-6 text-center text-sm text-gray-400">
                        <Video className="w-6 h-6 mx-auto mb-1 text-gray-300" />
                        No upcoming meetings
                      </div>
                    ) : meetingsList.filter(m => m.status === "scheduled").map((m, i) => (
                      <div key={m.id}>
                        {i > 0 && <Separator />}
                        <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50/80 transition-colors">
                          <Video className="w-4 h-4 text-[#1a3a6b]/50 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{m.title}</p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              with {m.advisorName} · {new Date(m.scheduledAt).toLocaleDateString()} at{" "}
                              {new Date(m.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · {m.duration}min
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              {/* Notifications */}
              <div>
                <SectionLabel>Notifications</SectionLabel>
                <Card>
                  <CardContent className="p-0">
                    {(() => {
                      const notifications: { id: string; icon: React.ReactNode; iconBg: string; title: string; sub: string; date: string; href?: string; unread?: boolean }[] = [];
                      // Add app notifications (advisor notes, etc.)
                      for (const n of appNotifications) {
                        notifications.push({
                          id: `notif-${n.id}`,
                          icon: n.type === "advisor_note" ? <StickyNote className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />,
                          iconBg: n.type === "advisor_note" ? "bg-amber-100 text-amber-600" : "bg-blue-100 text-blue-600",
                          title: n.title,
                          sub: n.body.length > 80 ? n.body.slice(0, 80) + "…" : n.body,
                          date: n.createdAt,
                          href: n.sandboxId ? `/sandbox/${n.sandboxId}` : undefined,
                          unread: !n.read,
                        });
                      }
                      // Add insights as notifications
                      for (const ins of insights) {
                        notifications.push({
                          id: `ins-${ins.id}`,
                          icon: ins.priority === "high" ? <Activity className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />,
                          iconBg: ins.priority === "high" ? "bg-red-100 text-red-600" : ins.priority === "medium" ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-500",
                          title: ins.title,
                          sub: `Insight · ${ins.priority} priority`,
                          date: ins.createdAt,
                        });
                      }
                      // Add upcoming meetings as notifications
                      for (const m of meetingsList.filter(mtg => mtg.status === "scheduled")) {
                        notifications.push({
                          id: `mtg-${m.id}`,
                          icon: <Video className="w-3.5 h-3.5" />,
                          iconBg: "bg-purple-100 text-purple-600",
                          title: m.title,
                          sub: `Meeting with ${m.advisorName} · ${new Date(m.scheduledAt).toLocaleDateString()}`,
                          date: m.scheduledAt,
                        });
                      }
                      // Sort by date descending
                      notifications.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                      if (notifications.length === 0) {
                        return <div className="px-4 py-6 text-center text-sm text-gray-400">No notifications yet</div>;
                      }
                      return notifications.slice(0, 8).map((n, i) => (
                        <div key={n.id}>
                          {i > 0 && <Separator />}
                          {n.href ? (
                            <Link href={n.href} className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-gray-50/80 bg-[#1a3a6b]/[0.03]">
                              <div className={cn("w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5", n.iconBg)}>
                                {n.icon}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs leading-snug text-gray-800 font-medium">{n.title}</p>
                                <p className="text-[10px] text-gray-400 mt-0.5">{n.sub} · {timeAgo(n.date)}</p>
                              </div>
                              {n.unread && <div className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 shrink-0 animate-pulse" />}
                            </Link>
                          ) : (
                          <div className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-gray-50/80 bg-[#1a3a6b]/[0.03]">
                            <div className={cn("w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5", n.iconBg)}>
                              {n.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs leading-snug text-gray-800 font-medium">{n.title}</p>
                              <p className="text-[10px] text-gray-400 mt-0.5">{n.sub} · {timeAgo(n.date)}</p>
                            </div>
                            <div className="w-1.5 h-1.5 rounded-full bg-[#1a3a6b] mt-1.5 shrink-0" />
                          </div>
                          )}
                        </div>
                      ));
                    })()}
                  </CardContent>
                </Card>
              </div>



            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
