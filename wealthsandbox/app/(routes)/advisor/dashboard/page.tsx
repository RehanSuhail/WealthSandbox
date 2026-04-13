"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Card, CardContent, CardHeader, CardTitle, CardAction,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Users, AlertTriangle, Clock, ExternalLink, FlaskConical,
  ChevronRight, UserPlus, DollarSign, Copy, Plus,
  CheckCircle2, Loader2, X, Calendar, Video, Activity,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Client {
  id: string;
  name: string;
  aum: number;
  riskLevel?: string;
  probSuccess?: number;
  age?: number;
  lastActivity?: string;
}

interface PendingRequest {
  id: string;
  clientId: string;
  clientName: string;
  requestedAt: string;
}

interface SandboxItem {
  id: string;
  name: string;
  lastUpdated: string;
  status: string;
}

interface MeetingItem {
  id: string;
  clientId: string;
  clientName: string;
  title: string;
  description: string;
  scheduledAt: string;
  duration: number;
  status: string;
}

interface AnalyticsData {
  totalAum: number;
  avgPortfolioHealth: number;
  clientsAtRisk: number;
  clientsOnTrack: number;
  clientsNeedingReview: number;
  totalInsightsGenerated: number;
  riskDistribution: Record<string, number>;
}

interface ClientDetail {
  clientId: string;
  name: string;
  age: number;
  aum: number;
  riskLevel: string;
  probSuccess: number;
  fundsLastToAge: number;
  healthScore: number;
  needsReview: boolean;
  openInsightCount: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-3">
      {children}
    </p>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdvisorDashboardPage() {
  const [clients, setClients]       = useState<Client[]>([]);
  const [pending, setPending]       = useState<PendingRequest[]>([]);
  const [sandboxes, setSandboxes]   = useState<SandboxItem[]>([]);
  const [advisorName, setAdvisorName] = useState("Advisor");
  const [totalAum, setTotalAum]     = useState(0);
  const [loading, setLoading]       = useState(true);

  // Advanced analytics state
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [clientDetails, setClientDetails] = useState<ClientDetail[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  // Meetings state
  const [meetingsList, setMeetingsList] = useState<MeetingItem[]>([]);
  const [showSchedule, setShowSchedule] = useState(false);
  const [mtgClientId, setMtgClientId] = useState("");
  const [mtgTitle, setMtgTitle] = useState("");
  const [mtgDesc, setMtgDesc] = useState("");
  const [mtgDate, setMtgDate] = useState("");
  const [mtgTime, setMtgTime] = useState("10:00");
  const [mtgDuration, setMtgDuration] = useState("30");
  const [scheduling, setScheduling] = useState(false);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const fetchData = useCallback(async () => {
    try {
      const [clientsRes, authRes, sbRes, pendingRes, mtgRes] = await Promise.all([
        fetch("/api/advisor/clients"),
        fetch("/api/auth/login"),
        fetch("/api/sandboxes"),
        fetch("/api/connect/request"),
        fetch("/api/meetings"),
      ]);

      if (authRes.ok) {
        const ad = await authRes.json();
        if (ad?.data?.name) setAdvisorName(ad.data.name);
      }

      if (clientsRes.ok) {
        const { data } = await clientsRes.json();
        if (data?.length) {
          const mapped: Client[] = data.map((c: Record<string, unknown>) => ({
            id: c.clientId || c.id,
            name: `${c.firstName || ""} ${c.lastName || ""}`.trim() || "Client",
            aum: Number(((c as Record<string, unknown>).profile as Record<string, unknown>)?.savings || 0),
          }));
          setClients(mapped);
          setTotalAum(mapped.reduce((s, c) => s + c.aum, 0));
        }
      }

      if (sbRes.ok) {
        const sbData = await sbRes.json();
        setSandboxes((sbData.data || []).map((sb: Record<string, unknown>) => ({
          id: sb.id as string,
          name: sb.name as string,
          lastUpdated: new Date(sb.updatedAt as string).toLocaleDateString(),
          status: sb.sharedWithAdvisor ? "ready" : "draft",
        })));
      }

      if (pendingRes.ok) {
        const pData = await pendingRes.json();
        setPending((pData.data?.requests || []).map((r: Record<string, unknown>) => ({
          id: r.id as string,
          clientId: r.clientId as string,
          clientName: r.clientName as string || "Client",
          requestedAt: new Date(r.createdAt as string).toLocaleDateString(),
        })));
      }

      if (mtgRes.ok) {
        const mData = await mtgRes.json();
        setMeetingsList(mData.data || []);
      }
    } catch { /* ignore */ }
    setLoading(false);

    // Fetch advanced analytics in parallel (non-blocking)
    try {
      const analyticsRes = await fetch("/api/advisor/analytics");
      if (analyticsRes.ok) {
        const analyticsData = await analyticsRes.json();
        if (analyticsData.data) {
          const a = analyticsData.data.analytics;
          setAnalytics({
            totalAum: a.totalAum,
            avgPortfolioHealth: a.avgPortfolioHealth,
            clientsAtRisk: a.clientsAtRisk,
            clientsOnTrack: a.clientsOnTrack,
            clientsNeedingReview: a.clientsNeedingReview,
            totalInsightsGenerated: a.totalInsightsGenerated,
            riskDistribution: a.riskDistribution || {},
          });
          setClientDetails(analyticsData.data.clientDetails || []);
        }
      }
    } catch { /* analytics is non-critical */ }
    setAnalyticsLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleConnectionAction = async (requestId: string, action: "accept" | "decline") => {
    try {
      await fetch("/api/connect/request", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action }),
      });
      fetchData();
    } catch { /* ignore */ }
  };

  const handleScheduleMeeting = async () => {
    if (!mtgClientId || !mtgTitle || !mtgDate) return;
    setScheduling(true);
    try {
      const scheduledAt = new Date(`${mtgDate}T${mtgTime}`).toISOString();
      const res = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: mtgClientId,
          title: mtgTitle,
          description: mtgDesc,
          scheduledAt,
          duration: Number(mtgDuration),
        }),
      });
      if (res.ok) {
        const { data } = await res.json();
        setMeetingsList((p) => [data, ...p]);
        setShowSchedule(false);
        setMtgClientId("");
        setMtgTitle("");
        setMtgDesc("");
        setMtgDate("");
        setMtgTime("10:00");
        setMtgDuration("30");
      }
    } catch {}
    setScheduling(false);
  };

  const handleCancelMeeting = async (meetingId: string) => {
    try {
      await fetch("/api/meetings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meetingId, status: "cancelled" }),
      });
      setMeetingsList((p) => p.map((m) => m.id === meetingId ? { ...m, status: "cancelled" } : m));
    } catch {}
  };

  const handleDuplicate = async (sandboxId: string) => {
    try {
      const res = await fetch(`/api/sandboxes/${sandboxId}/duplicate`, { method: "POST" });
      if (res.ok) fetchData();
    } catch { /* ignore */ }
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

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

          {/* ─── Top bar ─── */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-0.5">
                LPL Financial
              </p>
              <h1 className="text-2xl font-semibold text-[#1a3a6b]">
                {greeting}, {advisorName.split(" ")[0]} 👋
              </h1>
              <p className="text-sm text-gray-400 mt-0.5">{today}</p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5 shadow-sm">
                <Users className="w-4 h-4 text-[#1a3a6b] shrink-0" />
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider leading-none mb-0.5">Clients</p>
                  <p className="text-base font-bold text-gray-900">{clients.length}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5 shadow-sm">
                <DollarSign className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider leading-none mb-0.5">Total AUM</p>
                  <p className="text-base font-bold text-gray-900">
                    {totalAum >= 1_000_000 ? `$${(totalAum / 1_000_000).toFixed(1)}M` : `$${(totalAum / 1000).toFixed(0)}K`}
                  </p>
                </div>
              </div>

              {pending.length > 0 && (
                <div className="flex items-center gap-2 bg-white border border-amber-200 rounded-xl px-4 py-2.5 shadow-sm">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider leading-none mb-0.5">Pending</p>
                    <p className="text-base font-bold text-amber-600">{pending.length} request{pending.length !== 1 ? "s" : ""}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ─── Practice Analytics Cards ─── */}
          {clients.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-white">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">On Track</p>
                  </div>
                  <p className="text-2xl font-bold text-emerald-700">{analytics?.clientsOnTrack ?? "—"}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">≥85% success rate</p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-white">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">Need Review</p>
                  </div>
                  <p className="text-2xl font-bold text-amber-600">{analytics?.clientsNeedingReview ?? "—"}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">65–84% success</p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm bg-gradient-to-br from-red-50 to-white">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">At Risk</p>
                  </div>
                  <p className="text-2xl font-bold text-red-600">{analytics?.clientsAtRisk ?? "—"}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">&lt;65% success</p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-white">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <FlaskConical className="w-4 h-4 text-[#1a3a6b]" />
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">Avg Health</p>
                  </div>
                  <p className="text-2xl font-bold text-[#1a3a6b]">{analytics?.avgPortfolioHealth ?? "—"}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">out of 100</p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-white">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Activity className="w-4 h-4 text-purple-500" />
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">Insights</p>
                  </div>
                  <p className="text-2xl font-bold text-purple-700">{analytics?.totalInsightsGenerated ?? "—"}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">AI-generated</p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm bg-gradient-to-br from-gray-50 to-white">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="w-4 h-4 text-gray-500" />
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">Avg Age</p>
                  </div>
                  <p className="text-2xl font-bold text-gray-700">{analytics ? Math.round(clients.reduce((s, c) => s + (c.age || 45), 0) / clients.length) : "—"}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">client average</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ─── Client Health Heatmap (for advisors with clients) ─── */}
          {clientDetails.length > 0 && (
            <div>
              <SectionLabel>Client Health Overview</SectionLabel>
              <Card>
                <CardHeader className="border-b">
                  <CardTitle className="text-[#1a3a6b] flex items-center gap-2">
                    <Activity className="w-4 h-4" /> Portfolio Health Monitor
                  </CardTitle>
                  <CardAction>
                    <Badge variant="outline" className="text-[10px]">
                      {clientDetails.filter(c => c.needsReview).length} need review
                    </Badge>
                  </CardAction>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b bg-gray-50/50">
                          <th className="text-left px-4 py-2.5 text-gray-500 font-medium">Client</th>
                          <th className="text-center px-3 py-2.5 text-gray-500 font-medium">Health</th>
                          <th className="text-center px-3 py-2.5 text-gray-500 font-medium">P(Success)</th>
                          <th className="text-center px-3 py-2.5 text-gray-500 font-medium">Funds To</th>
                          <th className="text-center px-3 py-2.5 text-gray-500 font-medium">Risk</th>
                          <th className="text-center px-3 py-2.5 text-gray-500 font-medium">Alerts</th>
                          <th className="text-right px-4 py-2.5 text-gray-500 font-medium">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {clientDetails.slice(0, 8).map((cd, i) => {
                          const hColor = cd.healthScore >= 75 ? "bg-emerald-500" : cd.healthScore >= 50 ? "bg-amber-500" : "bg-red-500";
                          const pColor = cd.probSuccess >= 0.85 ? "text-emerald-600" : cd.probSuccess >= 0.65 ? "text-amber-600" : "text-red-600";
                          return (
                            <tr key={cd.clientId} className={cn("border-b last:border-0 hover:bg-gray-50/80 transition-colors", cd.needsReview && "bg-red-50/30")}>
                              <td className="px-4 py-2.5">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-[#1a3a6b]/10 text-[#1a3a6b] flex items-center justify-center text-[9px] font-bold shrink-0">
                                    {cd.name.split(" ").map(n => n[0]).join("")}
                                  </div>
                                  <div>
                                    <p className="font-medium text-gray-800">{cd.name}</p>
                                    <p className="text-[10px] text-gray-400">Age {cd.age}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="text-center px-3 py-2.5">
                                <div className="inline-flex items-center gap-1.5">
                                  <div className={cn("w-2 h-2 rounded-full", hColor)} />
                                  <span className="font-semibold">{cd.healthScore}</span>
                                </div>
                              </td>
                              <td className={cn("text-center px-3 py-2.5 font-semibold", pColor)}>
                                {cd.probSuccess > 0 ? `${(cd.probSuccess * 100).toFixed(0)}%` : "—"}
                              </td>
                              <td className="text-center px-3 py-2.5">
                                <span className={cn("font-semibold", cd.fundsLastToAge >= 90 ? "text-emerald-600" : cd.fundsLastToAge >= 80 ? "text-amber-600" : "text-red-600")}>
                                  {cd.fundsLastToAge > 0 ? `Age ${cd.fundsLastToAge}` : "—"}
                                </span>
                              </td>
                              <td className="text-center px-3 py-2.5">
                                <Badge variant="outline" className="text-[9px]">{cd.riskLevel}</Badge>
                              </td>
                              <td className="text-center px-3 py-2.5">
                                {cd.openInsightCount > 0 ? (
                                  <Badge className="bg-red-100 text-red-700 text-[9px]">{cd.openInsightCount}</Badge>
                                ) : (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mx-auto" />
                                )}
                              </td>
                              <td className="text-right px-4 py-2.5">
                                <Button variant="outline" size="xs" asChild>
                                  <Link href={`/advisor/clients/${cd.clientId}`}>
                                    <ChevronRight className="w-3 h-3" />
                                  </Link>
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ─── Content grid ─── */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">

            {/* ─── Left column ─── */}
            <div className="lg:col-span-3 space-y-6">

              {/* Client Roster */}
              <div>
                <SectionLabel>Client Roster</SectionLabel>
                <Card>
                  <CardHeader className="border-b">
                    <CardTitle className="text-[#1a3a6b]">Connected Clients</CardTitle>
                    <CardAction>
                      <Button variant="outline" size="sm" asChild className="gap-1 text-[#1a3a6b] border-[#1a3a6b]/30">
                        <Link href="/advisor/clients">
                          All Clients <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </Button>
                    </CardAction>
                  </CardHeader>
                  <CardContent className="p-0">
                    {clients.length === 0 ? (
                      <div className="px-4 py-8 text-center">
                        <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-400">No clients connected yet</p>
                        <p className="text-xs text-gray-400 mt-1">Clients will appear here once they send a connection request and you accept it.</p>
                      </div>
                    ) : clients.map((client, i) => (
                      <div key={client.id}>
                        {i > 0 && <Separator />}
                        <Link href={`/advisor/clients/${client.id}`}>
                          <div className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50/80 transition-colors cursor-pointer">
                            <div className="w-8 h-8 rounded-full bg-[#1a3a6b]/10 text-[#1a3a6b] flex items-center justify-center text-xs font-semibold shrink-0">
                              {client.name.split(" ").map(n => n[0]).join("")}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-800 truncate">{client.name}</p>
                              {client.aum > 0 && (
                                <span className="text-xs text-gray-400">AUM: ${(client.aum / 1000).toFixed(0)}K</span>
                              )}
                            </div>
                            <ExternalLink className="w-3.5 h-3.5 text-gray-300" />
                          </div>
                        </Link>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              {/* My Sandboxes */}
              <div>
                <SectionLabel>My Sandboxes</SectionLabel>
                <Card>
                  <CardHeader className="border-b">
                    <CardTitle className="text-[#1a3a6b]">Sandbox Workspace</CardTitle>
                    <CardAction>
                      <Button asChild size="sm" className="bg-[#1a3a6b] hover:bg-[#16325c] gap-1">
                        <Link href="/sandbox/new"><Plus className="w-3.5 h-3.5" /> New</Link>
                      </Button>
                    </CardAction>
                  </CardHeader>
                  <CardContent className="p-0">
                    {sandboxes.length === 0 ? (
                      <div className="px-4 py-6 text-center text-sm text-gray-400">No sandboxes yet</div>
                    ) : sandboxes.map((sb, i) => (
                      <div key={sb.id}>
                        {i > 0 && <Separator />}
                        <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50/80 transition-colors">
                          <FlaskConical className="w-4 h-4 text-[#1a3a6b]/50 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{sb.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-gray-400 flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {sb.lastUpdated}
                              </span>
                              <Badge variant="outline" className={cn("text-[10px]",
                                sb.status === "ready" ? "border-emerald-300 text-emerald-700" : "text-gray-400"
                              )}>
                                {sb.status === "ready" ? "Ready to share" : "Draft"}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="outline" size="icon-sm" asChild>
                                  <Link href={`/sandbox/${sb.id}`}><ExternalLink className="w-3.5 h-3.5" /></Link>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Open</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="outline" size="icon-sm" className="text-red-500 border-red-200 hover:bg-red-50" onClick={async () => {
                                  if (!confirm("Delete this sandbox?")) return;
                                  try {
                                    await fetch(`/api/sandboxes/${sb.id}`, { method: "DELETE" });
                                    fetchData();
                                  } catch {}
                                }}>
                                  <X className="w-3.5 h-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Delete</TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* ─── Right column ─── */}
            <div className="lg:col-span-2 space-y-6">

              {/* Pending Connections (from API) */}
              <div>
                <SectionLabel>Pending Connections</SectionLabel>
                <Card>
                  <CardContent className="p-0">
                    {pending.length === 0 ? (
                      <div className="flex items-center gap-2 px-4 py-4 text-sm text-gray-400">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        No pending requests
                      </div>
                    ) : pending.map((pc, i) => (
                      <div key={pc.id}>
                        {i > 0 && <Separator />}
                        <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50/80 transition-colors">
                          <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-semibold shrink-0">
                            {pc.clientName.split(" ").map(n => n[0]).join("")}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{pc.clientName}</p>
                            <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                              <Clock className="w-3 h-3" /> {pc.requestedAt}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Button size="xs" className="bg-[#1a3a6b] hover:bg-[#16325c] gap-1"
                              onClick={() => handleConnectionAction(pc.id, "accept")}
                            >
                              <UserPlus className="w-3 h-3" /> Accept
                            </Button>
                            <Button size="xs" variant="outline" className="text-gray-500 border-gray-200"
                              onClick={() => handleConnectionAction(pc.id, "decline")}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              {/* Schedule Meeting */}
              <div>
                <SectionLabel>Meetings</SectionLabel>
                <Card>
                  <CardHeader className="border-b">
                    <CardTitle className="text-[#1a3a6b] flex items-center gap-2">
                      <Calendar className="w-4 h-4" /> Meetings
                    </CardTitle>
                    <CardAction>
                      <Button
                        size="sm"
                        variant={showSchedule ? "outline" : "default"}
                        className={showSchedule ? "" : "bg-[#1a3a6b] hover:bg-[#16325c] gap-1"}
                        onClick={() => setShowSchedule(!showSchedule)}
                      >
                        {showSchedule ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                        {showSchedule ? "Cancel" : "Schedule"}
                      </Button>
                    </CardAction>
                  </CardHeader>

                  {showSchedule && (
                    <CardContent className="py-4 space-y-3 border-b bg-gray-50/50">
                      <Select value={mtgClientId} onValueChange={setMtgClientId}>
                        <SelectTrigger className="bg-white"><SelectValue placeholder="Select client…" /></SelectTrigger>
                        <SelectContent>
                          {clients.map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input placeholder="Meeting title" value={mtgTitle} onChange={(e) => setMtgTitle(e.target.value)} className="bg-white" />
                      <Textarea placeholder="Description (optional)" value={mtgDesc} onChange={(e) => setMtgDesc(e.target.value)} rows={2} className="resize-none bg-white" />
                      <div className="flex gap-2">
                        <Input type="date" value={mtgDate} onChange={(e) => setMtgDate(e.target.value)} className="bg-white flex-1" />
                        <Input type="time" value={mtgTime} onChange={(e) => setMtgTime(e.target.value)} className="bg-white w-28" />
                      </div>
                      <Select value={mtgDuration} onValueChange={setMtgDuration}>
                        <SelectTrigger className="bg-white w-40"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="15">15 min</SelectItem>
                          <SelectItem value="30">30 min</SelectItem>
                          <SelectItem value="45">45 min</SelectItem>
                          <SelectItem value="60">60 min</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        className="bg-[#1a3a6b] hover:bg-[#16325c] gap-1 w-full"
                        disabled={scheduling || !mtgClientId || !mtgTitle || !mtgDate}
                        onClick={handleScheduleMeeting}
                      >
                        {scheduling ? <Loader2 className="w-3 h-3 animate-spin" /> : <Calendar className="w-3 h-3" />}
                        Schedule Meeting
                      </Button>
                    </CardContent>
                  )}

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
                              {m.clientName} · {new Date(m.scheduledAt).toLocaleDateString()} at{" "}
                              {new Date(m.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · {m.duration}min
                            </p>
                          </div>
                          <Button
                            size="xs"
                            variant="outline"
                            className="text-red-500 border-red-200 hover:bg-red-50"
                            onClick={() => handleCancelMeeting(m.id)}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
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
