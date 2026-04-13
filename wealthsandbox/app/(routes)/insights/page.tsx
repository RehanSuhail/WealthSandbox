"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle, CheckCircle2, TrendingUp, Target, Bell,
  Lightbulb, Search, RotateCcw, SlidersHorizontal,
  Sparkles, ChevronDown, ChevronUp, Pencil, X, Check,
  Clock, ArrowUpRight, Loader2, BarChart3, ListChecks,
  Shield, Zap, Calendar, PieChart, FileText, ArrowRight,
  Eye, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Breadcrumb } from "@/components/breadcrumb";

// ─── Types ─────────────────────────────────────────────────────────────────────

type Priority = "high" | "medium" | "low";
type Category =
  | "Retirement Gap"
  | "Crisis Vulnerability"
  | "Goal Funding"
  | "Opportunity"
  | "Review Trigger";

interface AdvisorNote {
  text: string;
  date: string;
}

interface Insight {
  id: string;
  priority: Priority;
  category: Category;
  sandbox: { id: string; name: string };
  summary: string;
  suggestedAction: string;
  dateGenerated: string;
  resolved: boolean;
  sentToAdvisor: boolean;
  advisorNote?: AdvisorNote;
  // advisor-only fields
  clientId?: string;
  clientName?: string;
  advisorAnnotation?: string;
  // enhanced fields
  confidenceNote?: string;
  impactScore?: number;      // 1-10
  complianceNote?: string;
  benchmarkDelta?: string;
}

// ─── Config maps ────────────────────────────────────────────────────────────────

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; icon: React.ReactNode; dot: string }> = {
  high:   { label: "High",   color: "border-red-200 text-red-700 bg-red-50",       icon: <AlertTriangle className="w-3 h-3" />, dot: "bg-red-500"     },
  medium: { label: "Medium", color: "border-amber-200 text-amber-700 bg-amber-50", icon: <Clock className="w-3 h-3" />,         dot: "bg-amber-400"   },
  low:    { label: "Low",    color: "border-gray-200 text-gray-500 bg-gray-50",    icon: <Lightbulb className="w-3 h-3" />,     dot: "bg-gray-300"    },
};

const CATEGORY_CONFIG: Record<Category, { color: string; icon: React.ReactNode }> = {
  "Retirement Gap":      { color: "border-[#1a3a6b]/25 text-[#1a3a6b] bg-[#1a3a6b]/5",      icon: <TrendingUp  className="w-3 h-3" /> },
  "Crisis Vulnerability":{ color: "border-red-200 text-red-700 bg-red-50",                    icon: <AlertTriangle className="w-3 h-3" /> },
  "Goal Funding":        { color: "border-emerald-200 text-emerald-700 bg-emerald-50",        icon: <Target      className="w-3 h-3" /> },
  "Opportunity":         { color: "border-teal-200 text-teal-700 bg-teal-50",                 icon: <Sparkles    className="w-3 h-3" /> },
  "Review Trigger":      { color: "border-purple-200 text-purple-700 bg-purple-50",           icon: <Bell        className="w-3 h-3" /> },
};

const ALL_CATEGORIES: Category[] = [
  "Retirement Gap", "Crisis Vulnerability", "Goal Funding", "Opportunity", "Review Trigger",
];

// ─── Insight Card ───────────────────────────────────────────────────────────────

function InsightCard({
  insight,
  isAdvisor,
  onToggleResolved,
  onSaveAnnotation,
}: {
  insight: Insight;
  isAdvisor: boolean;
  onToggleResolved: (id: string) => void;
  onSaveAnnotation: (id: string, text: string) => void;
}) {
  const [expanded, setExpanded]         = useState(false);
  const [annotating, setAnnotating]     = useState(false);
  const [annotationDraft, setAnnotationDraft] = useState(insight.advisorAnnotation ?? "");

  const pCfg = PRIORITY_CONFIG[insight.priority];
  const cCfg = CATEGORY_CONFIG[insight.category];

  return (
    <Card className={cn(
      "border transition-all",
      insight.resolved ? "opacity-55 bg-gray-50" : "bg-white",
    )}>
      <CardContent className="p-0">
        {/* ── Header row ── */}
        <div className="flex items-start gap-3 px-5 pt-4 pb-3">
          {/* Priority dot */}
          <div className={cn("w-2 h-2 rounded-full shrink-0 mt-1.5", pCfg.dot)} />

          {/* Content */}
          <div className="flex-1 min-w-0 space-y-2">
            {/* Badges row */}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className={cn("text-[10px] gap-1 flex items-center", pCfg.color)}>
                {pCfg.icon} {pCfg.label}
              </Badge>
              <Badge variant="outline" className={cn("text-[10px] gap-1 flex items-center", cCfg.color)}>
                {cCfg.icon} {insight.category}
              </Badge>
              {/* Sandbox / client pill */}
              {isAdvisor && insight.clientName ? (
                <Link href={`/advisor/clients/${insight.clientId}`}
                  className="inline-flex items-center gap-1 text-[10px] text-gray-500 hover:text-[#1a3a6b] transition-colors group"
                >
                  <span className="w-4 h-4 rounded-full bg-[#1a3a6b]/10 text-[#1a3a6b] flex items-center justify-center text-[8px] font-bold shrink-0">
                    {insight.clientName.split(" ").map(n => n[0]).join("")}
                  </span>
                  {insight.clientName}
                  <ArrowUpRight className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              ) : (
                <Link href={`/sandbox/${insight.sandbox.id}`}
                  className="inline-flex items-center gap-1 text-[10px] text-gray-500 hover:text-[#1a3a6b] transition-colors group"
                >
                  <span className="text-gray-400">📦</span>
                  {insight.sandbox.name}
                  <ArrowUpRight className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              )}
              <span className="text-[10px] text-gray-400 ml-auto shrink-0">{insight.dateGenerated}</span>
            </div>

            {/* Summary */}
            <p className={cn("text-sm text-gray-700 leading-relaxed", insight.resolved && "line-through text-gray-400")}>
              {insight.summary}
            </p>

            {/* Impact & Confidence row */}
            {(insight.impactScore || insight.confidenceNote || insight.complianceNote) && (
              <div className="flex items-center gap-3 flex-wrap">
                {insight.impactScore && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1">
                        <Zap className="w-3 h-3 text-amber-500" />
                        <div className="flex gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className={cn(
                              "w-1.5 h-3 rounded-sm",
                              i < Math.ceil(insight.impactScore! / 2)
                                ? insight.impactScore! >= 8 ? "bg-red-400" : insight.impactScore! >= 5 ? "bg-amber-400" : "bg-emerald-400"
                                : "bg-gray-200"
                            )} />
                          ))}
                        </div>
                        <span className="text-[10px] text-gray-400 ml-0.5">{insight.impactScore}/10</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>Impact Score: {insight.impactScore}/10</TooltipContent>
                  </Tooltip>
                )}
                {insight.confidenceNote && (
                  <span className="text-[10px] text-gray-400 italic flex items-center gap-1">
                    <Shield className="w-2.5 h-2.5" /> {insight.confidenceNote}
                  </span>
                )}
                {insight.complianceNote && isAdvisor && (
                  <Badge variant="outline" className="text-[9px] border-purple-200 text-purple-600 bg-purple-50 gap-1">
                    <FileText className="w-2.5 h-2.5" /> {insight.complianceNote}
                  </Badge>
                )}
              </div>
            )}

            {/* Suggested action (expandable) */}
            <button onClick={() => setExpanded(p => !p)}
              className="flex items-center gap-1 text-xs text-[#1a3a6b] hover:underline"
            >
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              Suggested action
            </button>

            {expanded && (
              <div className="border border-[#1a3a6b]/15 bg-[#1a3a6b]/[0.03] rounded-xl px-4 py-3 mt-1">
                <p className="text-xs text-gray-600 leading-relaxed">{insight.suggestedAction}</p>
              </div>
            )}

            {/* Advisor note (client view) */}
            {!isAdvisor && insight.advisorNote && (
              <div className="border border-purple-100 bg-purple-50/60 rounded-xl px-4 py-2.5 flex items-start gap-2">
                <div className="w-5 h-5 rounded-full bg-[#1a3a6b] text-white flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5">SC</div>
                <div>
                  <p className="text-[10px] font-semibold text-[#1a3a6b]">Advisor note · {insight.advisorNote.date}</p>
                  <p className="text-xs text-gray-600 mt-0.5">{insight.advisorNote.text}</p>
                </div>
              </div>
            )}

            {/* Advisor annotation (advisor view) */}
            {isAdvisor && (
              <div>
                {annotating ? (
                  <div className="space-y-2 mt-1">
                    <Textarea
                      value={annotationDraft}
                      onChange={e => setAnnotationDraft(e.target.value)}
                      placeholder="Add your note for this insight…"
                      className="text-xs min-h-[60px] border-[#1a3a6b]/25 focus-visible:ring-[#1a3a6b]/30 resize-none"
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <Button size="xs" className="bg-[#1a3a6b] hover:bg-[#16325c] gap-1"
                        onClick={() => { onSaveAnnotation(insight.id, annotationDraft); setAnnotating(false); }}
                      >
                        <Check className="w-3 h-3" /> Save note
                      </Button>
                      <Button size="xs" variant="outline" className="gap-1"
                        onClick={() => { setAnnotationDraft(insight.advisorAnnotation ?? ""); setAnnotating(false); }}
                      >
                        <X className="w-3 h-3" /> Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setAnnotating(true)}
                    className={cn(
                      "flex items-start gap-2 w-full text-left mt-1 rounded-xl px-3 py-2 border transition-colors",
                      annotationDraft
                        ? "border-purple-100 bg-purple-50/60 hover:bg-purple-50"
                        : "border-dashed border-gray-200 hover:border-[#1a3a6b]/30 hover:bg-[#1a3a6b]/[0.02]"
                    )}
                  >
                    {annotationDraft ? (
                      <>
                        <Pencil className="w-3 h-3 text-purple-400 shrink-0 mt-0.5" />
                        <p className="text-xs text-gray-600 flex-1">{annotationDraft}</p>
                      </>
                    ) : (
                      <>
                        <Pencil className="w-3 h-3 text-gray-300 shrink-0 mt-0.5" />
                        <p className="text-xs text-gray-400">Add advisor annotation…</p>
                      </>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Action row ── */}
        <div className="flex items-center gap-2 px-5 pb-4 pt-1 border-t border-gray-100 mt-2 flex-wrap">
          {/* Mark resolved */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button onClick={() => onToggleResolved(insight.id)}
                className={cn(
                  "flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors",
                  insight.resolved
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    : "border-gray-200 text-gray-500 hover:border-emerald-200 hover:text-emerald-700 hover:bg-emerald-50"
                )}
              >
                {insight.resolved ? <RotateCcw className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                {insight.resolved ? "Unresolve" : "Mark resolved"}
              </button>
            </TooltipTrigger>
            <TooltipContent>{insight.resolved ? "Mark as unresolved" : "Mark this insight as resolved"}</TooltipContent>
          </Tooltip>

          {/* Open sandbox shortcut */}
          <Link href={`/sandbox/${insight.sandbox.id}`}
            className="ml-auto flex items-center gap-1 text-xs text-gray-400 hover:text-[#1a3a6b] transition-colors"
          >
            Open sandbox <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Stats bar ──────────────────────────────────────────────────────────────────

function StatsBar({ insights, isAdvisor }: { insights: Insight[]; isAdvisor: boolean }) {
  const total      = insights.length;
  const high       = insights.filter(i => i.priority === "high"   && !i.resolved).length;
  const unresolved = insights.filter(i => !i.resolved).length;
  const resolved   = insights.filter(i => i.resolved).length;
  const avgImpact  = insights.length > 0
    ? (insights.reduce((s, i) => s + (i.impactScore || 5), 0) / insights.length).toFixed(1)
    : "—";
  const uniqueSandboxes = new Set(insights.map(i => i.sandbox.id)).size;
  const uniqueClients   = new Set(insights.filter(i => i.clientName).map(i => i.clientName)).size;

  const baseStats = [
    { label: "Total insights",   value: total,       color: "text-[#1a3a6b]",    bg: "bg-[#1a3a6b]/5 border-[#1a3a6b]/15",  icon: <BarChart3 className="w-4 h-4 text-[#1a3a6b]/40" /> },
    { label: "High priority",    value: high,        color: "text-red-600",       bg: "bg-red-50 border-red-100",             icon: <AlertTriangle className="w-4 h-4 text-red-300" /> },
    { label: "Unresolved",       value: unresolved,  color: "text-amber-600",     bg: "bg-amber-50 border-amber-100",         icon: <Clock className="w-4 h-4 text-amber-300" /> },
    { label: "Resolved",         value: resolved,    color: "text-emerald-600",   bg: "bg-emerald-50 border-emerald-100",     icon: <CheckCircle2 className="w-4 h-4 text-emerald-300" /> },
    { label: "Avg impact",       value: avgImpact,   color: "text-purple-600",    bg: "bg-purple-50 border-purple-100",       icon: <Zap className="w-4 h-4 text-purple-300" /> },
  ];

  if (isAdvisor) {
    baseStats.push({
      label: "Clients affected",  value: uniqueClients,  color: "text-blue-600", bg: "bg-blue-50 border-blue-100", icon: <Eye className="w-4 h-4 text-blue-300" />,
    });
  } else {
    baseStats.push({
      label: "Sandboxes",         value: uniqueSandboxes, color: "text-teal-600", bg: "bg-teal-50 border-teal-100", icon: <Target className="w-4 h-4 text-teal-300" />,
    });
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {baseStats.map(s => (
        <div key={s.label} className={cn("border rounded-xl px-4 py-3 relative overflow-hidden", s.bg)}>
          <div className="absolute top-2 right-2 opacity-60">{s.icon}</div>
          <p className={cn("text-2xl font-bold", s.color)}>{s.value}</p>
          <p className="text-[10px] text-gray-500 mt-0.5 font-medium">{s.label}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Category Distribution Analytics ────────────────────────────────────────────

function CategoryAnalytics({ insights }: { insights: Insight[] }) {
  const unresolved = insights.filter(i => !i.resolved);
  const total = unresolved.length || 1;

  const distribution = ALL_CATEGORIES.map(cat => {
    const items = unresolved.filter(i => i.category === cat);
    const count = items.length;
    const highCount = items.filter(i => i.priority === "high").length;
    const avgImpact = items.length > 0
      ? items.reduce((s, i) => s + (i.impactScore || 5), 0) / items.length
      : 0;
    return { category: cat, count, highCount, avgImpact, pct: (count / total) * 100 };
  }).sort((a, b) => b.count - a.count);

  const maxCount = Math.max(...distribution.map(d => d.count), 1);

  const catColors: Record<Category, string> = {
    "Retirement Gap": "bg-[#1a3a6b]",
    "Crisis Vulnerability": "bg-red-500",
    "Goal Funding": "bg-emerald-500",
    "Opportunity": "bg-teal-500",
    "Review Trigger": "bg-purple-500",
  };

  return (
    <Card className="border bg-white">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <PieChart className="w-4 h-4 text-[#1a3a6b]" />
          <h3 className="text-sm font-semibold text-gray-800">Category Distribution</h3>
          <span className="text-[10px] text-gray-400 ml-auto">{unresolved.length} active insights</span>
        </div>

        <div className="space-y-3">
          {distribution.map(d => (
            <div key={d.category} className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-700">{d.category}</span>
                  {d.highCount > 0 && (
                    <Badge variant="outline" className="text-[9px] border-red-200 text-red-600 bg-red-50 px-1.5 py-0">
                      {d.highCount} high
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-gray-400">avg impact {d.avgImpact.toFixed(1)}</span>
                  <span className="text-xs font-bold text-gray-700 w-6 text-right">{d.count}</span>
                </div>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all duration-500", catColors[d.category])}
                  style={{ width: `${(d.count / maxCount) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Resolution rate */}
        <div className="mt-5 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-gray-500">Resolution rate</span>
            <span className="text-xs font-bold text-emerald-600">
              {insights.length > 0 ? Math.round((insights.filter(i => i.resolved).length / insights.length) * 100) : 0}%
            </span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${insights.length > 0 ? (insights.filter(i => i.resolved).length / insights.length) * 100 : 0}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Timeline View ──────────────────────────────────────────────────────────────

function TimelineView({ insights, isAdvisor }: { insights: Insight[]; isAdvisor: boolean }) {
  // Group by date
  const grouped = useMemo(() => {
    const groups: Record<string, Insight[]> = {};
    insights.forEach(ins => {
      const key = ins.dateGenerated;
      if (!groups[key]) groups[key] = [];
      groups[key].push(ins);
    });
    // Sort dates descending
    return Object.entries(groups)
      .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
      .slice(0, 10); // show last 10 date groups
  }, [insights]);

  if (grouped.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400 space-y-2">
        <Calendar className="w-8 h-8 mx-auto opacity-30" />
        <p className="text-sm font-medium">No timeline data</p>
        <p className="text-xs">Insights will appear here as they are generated.</p>
      </div>
    );
  }

  return (
    <div className="relative space-y-0">
      {/* Timeline line */}
      <div className="absolute left-[18px] top-2 bottom-2 w-px bg-gradient-to-b from-[#1a3a6b]/30 via-[#1a3a6b]/15 to-transparent" />

      {grouped.map(([date, items], idx) => {
        const highCount = items.filter(i => i.priority === "high" && !i.resolved).length;
        return (
          <div key={date} className="relative pl-10 pb-6">
            {/* Timeline dot */}
            <div className={cn(
              "absolute left-[14px] top-1 w-2.5 h-2.5 rounded-full border-2",
              highCount > 0
                ? "bg-red-500 border-red-200"
                : idx === 0
                  ? "bg-[#1a3a6b] border-[#1a3a6b]/30"
                  : "bg-gray-300 border-gray-200"
            )} />

            {/* Date header */}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold text-gray-700">{date}</span>
              <span className="text-[10px] text-gray-400">{items.length} insight{items.length !== 1 ? "s" : ""}</span>
              {highCount > 0 && (
                <Badge variant="outline" className="text-[9px] border-red-200 text-red-600 bg-red-50">
                  {highCount} high priority
                </Badge>
              )}
            </div>

            {/* Compact insight list */}
            <div className="space-y-1.5">
              {items.map(ins => {
                const pCfg = PRIORITY_CONFIG[ins.priority];
                const cCfg = CATEGORY_CONFIG[ins.category];
                return (
                  <div key={ins.id} className={cn(
                    "flex items-start gap-2 rounded-lg px-3 py-2 border transition-colors",
                    ins.resolved
                      ? "bg-gray-50/50 border-gray-100 opacity-60"
                      : ins.priority === "high"
                        ? "bg-red-50/40 border-red-100 hover:bg-red-50/70"
                        : "bg-white border-gray-100 hover:bg-gray-50"
                  )}>
                    <div className={cn("w-1.5 h-1.5 rounded-full shrink-0 mt-1.5", pCfg.dot)} />
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-xs text-gray-700 line-clamp-2", ins.resolved && "line-through text-gray-400")}>
                        {ins.summary}
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge variant="outline" className={cn("text-[9px] py-0 px-1.5", cCfg.color)}>
                          {ins.category}
                        </Badge>
                        {isAdvisor && ins.clientName && (
                          <span className="text-[9px] text-gray-400">{ins.clientName}</span>
                        )}
                        {ins.impactScore && ins.impactScore >= 7 && (
                          <span className="text-[9px] text-amber-500 flex items-center gap-0.5">
                            <Zap className="w-2.5 h-2.5" /> High impact
                          </span>
                        )}
                        <Link href={`/sandbox/${ins.sandbox.id}`}
                          className="text-[9px] text-gray-400 hover:text-[#1a3a6b] ml-auto flex items-center gap-0.5"
                        >
                          Open <ArrowUpRight className="w-2 h-2" />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Priority Heatmap ───────────────────────────────────────────────────────────

function PriorityHeatmap({ insights }: { insights: Insight[] }) {
  const unresolved = insights.filter(i => !i.resolved);

  const matrix: { category: Category; high: number; medium: number; low: number }[] = ALL_CATEGORIES.map(cat => ({
    category: cat,
    high: unresolved.filter(i => i.category === cat && i.priority === "high").length,
    medium: unresolved.filter(i => i.category === cat && i.priority === "medium").length,
    low: unresolved.filter(i => i.category === cat && i.priority === "low").length,
  }));

  const maxCell = Math.max(...matrix.flatMap(r => [r.high, r.medium, r.low]), 1);

  const getHeatColor = (val: number, priority: Priority) => {
    if (val === 0) return "bg-gray-50 text-gray-300";
    const intensity = val / maxCell;
    if (priority === "high") {
      return intensity > 0.6 ? "bg-red-500 text-white" : intensity > 0.3 ? "bg-red-200 text-red-800" : "bg-red-100 text-red-600";
    }
    if (priority === "medium") {
      return intensity > 0.6 ? "bg-amber-400 text-white" : intensity > 0.3 ? "bg-amber-200 text-amber-800" : "bg-amber-100 text-amber-600";
    }
    return intensity > 0.6 ? "bg-gray-400 text-white" : intensity > 0.3 ? "bg-gray-200 text-gray-700" : "bg-gray-100 text-gray-500";
  };

  return (
    <Card className="border bg-white">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-4 h-4 text-[#1a3a6b]" />
          <h3 className="text-sm font-semibold text-gray-800">Priority × Category Heatmap</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="text-left font-medium text-gray-500 pb-2 pr-3">Category</th>
                <th className="text-center font-medium text-red-500 pb-2 px-2">High</th>
                <th className="text-center font-medium text-amber-500 pb-2 px-2">Med</th>
                <th className="text-center font-medium text-gray-400 pb-2 px-2">Low</th>
                <th className="text-center font-medium text-gray-500 pb-2 pl-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {matrix.map(row => (
                <tr key={row.category}>
                  <td className="py-1.5 pr-3 font-medium text-gray-700 whitespace-nowrap">{row.category}</td>
                  {(["high", "medium", "low"] as Priority[]).map(p => (
                    <td key={p} className="py-1.5 px-2 text-center">
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center font-bold mx-auto", getHeatColor(row[p], p))}>
                        {row[p]}
                      </div>
                    </td>
                  ))}
                  <td className="py-1.5 pl-2 text-center font-bold text-gray-600">{row.high + row.medium + row.low}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Action Plan Summary (Advisor) ──────────────────────────────────────────────

function ActionPlanSummary({ insights }: { insights: Insight[] }) {
  const highPriority = insights.filter(i => i.priority === "high" && !i.resolved);
  const withActions = highPriority.filter(i => i.suggestedAction);

  // Group by category
  const categoryGroups = ALL_CATEGORIES.map(cat => ({
    category: cat,
    actions: withActions.filter(i => i.category === cat),
  })).filter(g => g.actions.length > 0);

  if (categoryGroups.length === 0) {
    return (
      <Card className="border bg-white">
        <CardContent className="p-5 text-center py-10">
          <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-600">No high-priority actions needed</p>
          <p className="text-xs text-gray-400 mt-1">All critical insights have been addressed.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border bg-white">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <ListChecks className="w-4 h-4 text-[#1a3a6b]" />
          <h3 className="text-sm font-semibold text-gray-800">Action Plan — High Priority</h3>
          <Badge variant="outline" className="text-[9px] border-red-200 text-red-600 bg-red-50 ml-auto">
            {withActions.length} action{withActions.length !== 1 ? "s" : ""} pending
          </Badge>
        </div>

        <div className="space-y-4">
          {categoryGroups.map(g => (
            <div key={g.category}>
              <div className="flex items-center gap-2 mb-2">
                {CATEGORY_CONFIG[g.category].icon}
                <span className="text-xs font-semibold text-gray-700">{g.category}</span>
                <span className="text-[10px] text-gray-400">({g.actions.length})</span>
              </div>
              <div className="space-y-1.5 pl-5 border-l-2 border-gray-100">
                {g.actions.slice(0, 3).map(ins => (
                  <div key={ins.id} className="flex items-start gap-2">
                    <ChevronRight className="w-3 h-3 text-gray-300 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-600 line-clamp-2">{ins.suggestedAction}</p>
                      {ins.clientName && (
                        <span className="text-[9px] text-gray-400 mt-0.5 block">for {ins.clientName}</span>
                      )}
                    </div>
                    <Link href={`/sandbox/${ins.sandbox.id}`}
                      className="text-[9px] text-[#1a3a6b] hover:underline shrink-0 flex items-center gap-0.5"
                    >
                      Open <ArrowUpRight className="w-2 h-2" />
                    </Link>
                  </div>
                ))}
                {g.actions.length > 3 && (
                  <p className="text-[10px] text-gray-400 italic pl-5">+{g.actions.length - 3} more actions</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Batch Actions Bar ──────────────────────────────────────────────────────────

function BatchActionsBar({
  selectedIds,
  onBatchResolve,
  onClearSelection,
  total,
}: {
  selectedIds: Set<string>;
  onBatchResolve: () => void;
  onClearSelection: () => void;
  total: number;
}) {
  if (selectedIds.size === 0) return null;

  return (
    <div className="sticky top-0 z-20 bg-[#1a3a6b] text-white rounded-xl px-4 py-3 flex items-center gap-3 shadow-lg animate-in slide-in-from-top-2">
      <CheckCircle2 className="w-4 h-4 shrink-0" />
      <span className="text-sm font-medium">{selectedIds.size} of {total} selected</span>
      <div className="flex items-center gap-2 ml-auto">
        <Button size="sm" variant="secondary" className="text-xs h-7 bg-white/15 hover:bg-white/25 text-white border-0"
          onClick={onBatchResolve}
        >
          <CheckCircle2 className="w-3 h-3 mr-1" /> Mark resolved
        </Button>
        <Button size="sm" variant="ghost" className="text-xs h-7 text-white/70 hover:text-white hover:bg-white/10"
          onClick={onClearSelection}
        >
          <X className="w-3 h-3 mr-1" /> Clear
        </Button>
      </div>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────────

const CATEGORY_MAP: Record<string, Category> = {
  retirement_gap: "Retirement Gap",
  crisis_vulnerability: "Crisis Vulnerability",
  goal_funding: "Goal Funding",
  opportunity: "Opportunity",
  review_trigger: "Review Trigger",
};

export default function InsightsFeedPage() {
  const [isAdvisor, setIsAdvisor] = useState(false);

  useEffect(() => {
    fetch("/api/auth/login").then(r => r.json()).then(d => {
      if (d?.data?.role === "advisor") setIsAdvisor(true);
    }).catch(() => {});
  }, []);

  const [insights, setInsights]              = useState<Insight[]>([]);
  const [search, setSearch]                  = useState("");
  const [priorityFilter, setPriorityFilter]  = useState<Priority | "all">("all");
  const [categoryFilter, setCategoryFilter]  = useState<Category | "all">("all");
  const [showResolved, setShowResolved]      = useState(false);
  const [loading, setLoading]                = useState(true);
  const [sandboxFilter, setSandboxFilter]    = useState<string>("all");
  const [sandboxes, setSandboxes]            = useState<{ id: string; name: string }[]>([]);
  const [selectedIds, setSelectedIds]        = useState<Set<string>>(new Set());
  const [activeView, setActiveView]          = useState<string>("feed");

  // Fetch sandboxes for the dropdown (client only)
  useEffect(() => {
    if (isAdvisor) return;
    (async () => {
      try {
        const res = await fetch("/api/sandboxes");
        if (res.ok) {
          const { data } = await res.json();
          setSandboxes((data || []).map((sb: Record<string, unknown>) => ({
            id: sb.id as string,
            name: sb.name as string,
          })));
        }
      } catch {}
    })();
  }, [isAdvisor]);

  const fetchInsights = useCallback(async () => {
    try {
      const scope = isAdvisor ? "advisor" : "client";
      const res = await fetch(`/api/insights?scope=${scope}`);
      if (res.ok) {
        const { data } = await res.json();
        const mapped: Insight[] = (data || []).map((ins: Record<string, unknown>) => ({
          id: ins.id as string,
          priority: ins.priority as Priority,
          category: CATEGORY_MAP[(ins.category as string) || "opportunity"] || "Opportunity",
          sandbox: { id: ins.sandboxId as string || "", name: `Sandbox ${(ins.sandboxId as string || "").slice(-6)}` },
          summary: ins.body as string || ins.title as string || "",
          suggestedAction: ins.suggestedAction as string || "",
          dateGenerated: new Date(ins.createdAt as string).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
          resolved: ins.status === "resolved",
          sentToAdvisor: ins.sentToAdvisor as boolean || false,
          advisorNote: ins.advisorNote ? { text: ins.advisorNote as string, date: "" } : undefined,
          clientName: ins.clientName as string || undefined,
          // Enhanced fields
          confidenceNote: ins.confidenceNote as string || undefined,
          impactScore: typeof ins.impactScore === "number" ? ins.impactScore : undefined,
          complianceNote: ins.complianceNote as string || undefined,
          benchmarkDelta: ins.benchmarkDelta as string || undefined,
        }));
        setInsights(mapped);
      } else {
        setInsights([]);
      }
    } catch {
      setInsights([]);
    } finally {
      setLoading(false);
    }
  }, [isAdvisor]);

  useEffect(() => { fetchInsights(); }, [fetchInsights]);

  // If client has exactly one sandbox, auto-select it
  useEffect(() => {
    if (!isAdvisor && sandboxes.length === 1) {
      setSandboxFilter(sandboxes[0].id);
    }
  }, [sandboxes, isAdvisor]);

  const filtered = useMemo(() => {
    return insights.filter(ins => {
      if (!showResolved && ins.resolved) return false;
      if (priorityFilter !== "all" && ins.priority !== priorityFilter) return false;
      if (categoryFilter !== "all" && ins.category !== categoryFilter) return false;
      if (sandboxFilter !== "all" && ins.sandbox.id !== sandboxFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (
          !ins.summary.toLowerCase().includes(q) &&
          !ins.category.toLowerCase().includes(q) &&
          !ins.sandbox.name.toLowerCase().includes(q) &&
          !(ins.clientName?.toLowerCase().includes(q))
        ) return false;
      }
      return true;
    });
  }, [insights, search, priorityFilter, categoryFilter, showResolved, sandboxFilter]);

  const highCount = insights.filter(i => i.priority === "high" && !i.resolved).length;

  const toggleResolved = async (id: string) => {
    const ins = insights.find(i => i.id === id);
    const newStatus = ins?.resolved ? "active" : "resolved";
    setInsights(p => p.map(i => i.id === id ? { ...i, resolved: !i.resolved } : i));
    try {
      await fetch(`/api/insights/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch { /* optimistic */ }
  };

  const saveAnnotation = async (id: string, text: string) => {
    setInsights(p => p.map(i => i.id === id ? { ...i, advisorAnnotation: text } : i));
    try {
      await fetch(`/api/insights/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ advisorNote: text }),
      });
    } catch { /* optimistic */ }
  };

  // ── Batch actions ──
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const batchResolve = async () => {
    const ids = Array.from(selectedIds);
    setInsights(p => p.map(i => ids.includes(i.id) ? { ...i, resolved: true } : i));
    setSelectedIds(new Set());
    // Fire and forget
    for (const id of ids) {
      fetch(`/api/insights/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "resolved" }),
      }).catch(() => {});
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f8fafc]">
        <Loader2 className="w-8 h-8 animate-spin text-[#1a3a6b]" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-[#f8fafc]">
        <div className="max-w-5xl mx-auto px-5 py-7 space-y-6">

          {/* Breadcrumb */}
          <Breadcrumb items={[
            { label: isAdvisor ? "Advisor Dashboard" : "Dashboard", href: isAdvisor ? "/advisor/dashboard" : "/client/dashboard" },
            { label: "Insights" },
          ]} />

          {/* Page header */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold text-[#1a3a6b]">
                {isAdvisor ? "Client Insights Hub" : "My Insights"}
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {isAdvisor
                  ? "AI-generated insights across all client sandboxes — analytics, timeline, and your annotation layer."
                  : "AI-generated insights across all your sandboxes with analytics and trend tracking."}
              </p>
            </div>
            {highCount > 0 && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-xl text-xs font-medium animate-pulse">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                {highCount} high-priority {highCount === 1 ? "insight needs" : "insights need"} attention
              </div>
            )}
          </div>

          {/* Stats bar */}
          <StatsBar insights={insights} isAdvisor={isAdvisor} />

          {/* ═══ Tabbed Interface ═══ */}
          <Tabs value={activeView} onValueChange={setActiveView}>
            <TabsList className="bg-white border border-gray-200 h-10 p-1 rounded-xl">
              <TabsTrigger value="feed" className="text-xs gap-1.5 data-[state=active]:bg-[#1a3a6b] data-[state=active]:text-white rounded-lg">
                <Sparkles className="w-3.5 h-3.5" /> Insight Feed
              </TabsTrigger>
              <TabsTrigger value="analytics" className="text-xs gap-1.5 data-[state=active]:bg-[#1a3a6b] data-[state=active]:text-white rounded-lg">
                <BarChart3 className="w-3.5 h-3.5" /> Analytics
              </TabsTrigger>
              <TabsTrigger value="timeline" className="text-xs gap-1.5 data-[state=active]:bg-[#1a3a6b] data-[state=active]:text-white rounded-lg">
                <Calendar className="w-3.5 h-3.5" /> Timeline
              </TabsTrigger>
              {isAdvisor && (
                <TabsTrigger value="actions" className="text-xs gap-1.5 data-[state=active]:bg-[#1a3a6b] data-[state=active]:text-white rounded-lg">
                  <ListChecks className="w-3.5 h-3.5" /> Action Plan
                </TabsTrigger>
              )}
            </TabsList>

            {/* ─── Tab: Insight Feed ─── */}
            <TabsContent value="feed" className="space-y-4 mt-4">
              {/* Batch actions bar */}
              {isAdvisor && (
                <BatchActionsBar
                  selectedIds={selectedIds}
                  onBatchResolve={batchResolve}
                  onClearSelection={() => setSelectedIds(new Set())}
                  total={filtered.length}
                />
              )}

              {/* Filters */}
              <div className="flex flex-wrap gap-3 items-center">
                {/* Sandbox selector (client only) */}
                {!isAdvisor && sandboxes.length > 0 && (
                  <Select value={sandboxFilter} onValueChange={setSandboxFilter}>
                    <SelectTrigger className="w-[220px] h-9 text-sm border-gray-200 bg-white">
                      <SelectValue placeholder="Select sandbox…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sandboxes</SelectItem>
                      {sandboxes.map(sb => (
                        <SelectItem key={sb.id} value={sb.id}>{sb.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {/* Search */}
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                  <Input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder={isAdvisor ? "Search insights or clients…" : "Search insights or sandboxes…"}
                    className="pl-8 h-9 text-sm border-gray-200"
                  />
                </div>

                {/* Priority filter */}
                <div className="flex items-center gap-1.5 border border-gray-200 rounded-xl px-3 py-1.5 bg-white flex-wrap">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  {(["all", "high", "medium", "low"] as const).map(p => (
                    <button key={p} onClick={() => setPriorityFilter(p)}
                      className={cn(
                        "text-xs px-2.5 py-1 rounded-lg transition-colors",
                        priorityFilter === p
                          ? "bg-[#1a3a6b] text-white font-medium"
                          : "text-gray-500 hover:bg-gray-100"
                      )}
                    >
                      {p === "all" ? "All" : PRIORITY_CONFIG[p].label}
                    </button>
                  ))}
                </div>

                {/* Category filter */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {(["all", ...ALL_CATEGORIES] as const).map(c => (
                    <button key={c} onClick={() => setCategoryFilter(c as Category | "all")}
                      className={cn(
                        "text-[11px] px-2.5 py-1.5 rounded-lg border transition-colors",
                        categoryFilter === c
                          ? "bg-[#1a3a6b] text-white border-[#1a3a6b]"
                          : "border-gray-200 text-gray-500 bg-white hover:border-[#1a3a6b]/40 hover:text-[#1a3a6b]"
                      )}
                    >
                      {c === "all" ? "All categories" : c}
                    </button>
                  ))}
                </div>

                {/* Show resolved toggle */}
                <button onClick={() => setShowResolved(p => !p)}
                  className={cn(
                    "flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors shrink-0",
                    showResolved
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-gray-200 text-gray-400 bg-white hover:border-gray-300"
                  )}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {showResolved ? "Hiding resolved" : "Show resolved"}
                </button>
              </div>

              {/* Results header */}
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400">
                  {filtered.length} insight{filtered.length !== 1 ? "s" : ""}
                  {(search || priorityFilter !== "all" || categoryFilter !== "all") && " matching filters"}
                </p>
                <div className="flex items-center gap-3">
                  {isAdvisor && filtered.length > 0 && (
                    <button
                      onClick={() => {
                        if (selectedIds.size === filtered.length) {
                          setSelectedIds(new Set());
                        } else {
                          setSelectedIds(new Set(filtered.map(i => i.id)));
                        }
                      }}
                      className="text-xs text-[#1a3a6b] hover:underline flex items-center gap-1"
                    >
                      {selectedIds.size === filtered.length ? "Deselect all" : "Select all"}
                    </button>
                  )}
                  {(search || priorityFilter !== "all" || categoryFilter !== "all") && (
                    <button onClick={() => { setSearch(""); setPriorityFilter("all"); setCategoryFilter("all"); }}
                      className="text-xs text-[#1a3a6b] hover:underline flex items-center gap-1"
                    >
                      <X className="w-3 h-3" /> Clear filters
                    </button>
                  )}
                </div>
              </div>

              <Separator />

              {/* Insight list */}
              {filtered.length === 0 ? (
                <div className="text-center py-16 text-gray-400 space-y-2">
                  <Lightbulb className="w-8 h-8 mx-auto opacity-30" />
                  {insights.length === 0 ? (
                    <>
                      <p className="text-sm font-medium">No insights yet</p>
                      <p className="text-xs">Run a simulation in one of your sandboxes to generate AI insights.</p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-medium">No insights match your filters</p>
                      <p className="text-xs">Try adjusting the priority or category filter, or clear your search.</p>
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Group: high priority unresolved first */}
                  {filtered.filter(i => i.priority === "high" && !i.resolved).length > 0 && (
                    <div className="space-y-3">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-red-500 flex items-center gap-1.5">
                        <AlertTriangle className="w-3 h-3" /> Needs attention
                      </p>
                      {filtered.filter(i => i.priority === "high" && !i.resolved).map(ins => (
                        <div key={ins.id} className="relative">
                          {isAdvisor && (
                            <button
                              onClick={() => toggleSelect(ins.id)}
                              className={cn(
                                "absolute left-0 top-4 w-5 h-5 rounded border-2 flex items-center justify-center z-10 transition-colors -translate-x-7",
                                selectedIds.has(ins.id)
                                  ? "border-[#1a3a6b] bg-[#1a3a6b] text-white"
                                  : "border-gray-300 bg-white hover:border-[#1a3a6b]/50"
                              )}
                            >
                              {selectedIds.has(ins.id) && <Check className="w-3 h-3" />}
                            </button>
                          )}
                          <InsightCard insight={ins} isAdvisor={isAdvisor}
                            onToggleResolved={toggleResolved} onSaveAnnotation={saveAnnotation}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Medium + low + resolved */}
                  {filtered.filter(i => !(i.priority === "high" && !i.resolved)).length > 0 && (
                    <div className="space-y-3">
                      {filtered.filter(i => i.priority === "high" && !i.resolved).length > 0 && (
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 pt-2">Other insights</p>
                      )}
                      {filtered.filter(i => !(i.priority === "high" && !i.resolved)).map(ins => (
                        <div key={ins.id} className="relative">
                          {isAdvisor && (
                            <button
                              onClick={() => toggleSelect(ins.id)}
                              className={cn(
                                "absolute left-0 top-4 w-5 h-5 rounded border-2 flex items-center justify-center z-10 transition-colors -translate-x-7",
                                selectedIds.has(ins.id)
                                  ? "border-[#1a3a6b] bg-[#1a3a6b] text-white"
                                  : "border-gray-300 bg-white hover:border-[#1a3a6b]/50"
                              )}
                            >
                              {selectedIds.has(ins.id) && <Check className="w-3 h-3" />}
                            </button>
                          )}
                          <InsightCard insight={ins} isAdvisor={isAdvisor}
                            onToggleResolved={toggleResolved} onSaveAnnotation={saveAnnotation}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            {/* ─── Tab: Analytics ─── */}
            <TabsContent value="analytics" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <CategoryAnalytics insights={insights} />
                <PriorityHeatmap insights={insights} />
              </div>

              {/* Trend summary cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Most common category */}
                {(() => {
                  const unresolvedInsights = insights.filter(i => !i.resolved);
                  const catCounts = ALL_CATEGORIES.map(c => ({
                    cat: c,
                    count: unresolvedInsights.filter(i => i.category === c).length,
                  })).sort((a, b) => b.count - a.count);
                  const top = catCounts[0];
                  return (
                    <Card className="border bg-white">
                      <CardContent className="p-4">
                        <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1">Top category</p>
                        <p className="text-lg font-bold text-gray-800">{top?.cat || "—"}</p>
                        <p className="text-xs text-gray-500 mt-1">{top?.count || 0} active insights in this category</p>
                      </CardContent>
                    </Card>
                  );
                })()}

                {/* Average resolution time estimate */}
                <Card className="border bg-white">
                  <CardContent className="p-4">
                    <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1">Resolution rate</p>
                    <p className="text-lg font-bold text-emerald-600">
                      {insights.length > 0 ? Math.round((insights.filter(i => i.resolved).length / insights.length) * 100) : 0}%
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {insights.filter(i => i.resolved).length} of {insights.length} insights resolved
                    </p>
                  </CardContent>
                </Card>

                {/* Highest impact */}
                {(() => {
                  const withImpact = insights.filter(i => i.impactScore && !i.resolved);
                  const highest = withImpact.sort((a, b) => (b.impactScore || 0) - (a.impactScore || 0))[0];
                  return (
                    <Card className="border bg-white">
                      <CardContent className="p-4">
                        <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1">Highest impact</p>
                        <p className="text-lg font-bold text-amber-600">{highest?.impactScore || "—"}/10</p>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{highest?.summary || "No scored insights yet"}</p>
                      </CardContent>
                    </Card>
                  );
                })()}
              </div>
            </TabsContent>

            {/* ─── Tab: Timeline ─── */}
            <TabsContent value="timeline" className="mt-4">
              <Card className="border bg-white">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-5">
                    <Calendar className="w-4 h-4 text-[#1a3a6b]" />
                    <h3 className="text-sm font-semibold text-gray-800">Insight Timeline</h3>
                    <span className="text-[10px] text-gray-400 ml-auto">Showing last 10 activity dates</span>
                  </div>
                  <TimelineView insights={insights} isAdvisor={isAdvisor} />
                </CardContent>
              </Card>
            </TabsContent>

            {/* ─── Tab: Action Plan (Advisor only) ─── */}
            {isAdvisor && (
              <TabsContent value="actions" className="space-y-4 mt-4">
                <ActionPlanSummary insights={insights} />

                {/* Quick stats for action plan */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Card className="border bg-white">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Shield className="w-4 h-4 text-purple-500" />
                        <h4 className="text-xs font-semibold text-gray-800">Compliance Flags</h4>
                      </div>
                      {(() => {
                        const withCompliance = insights.filter(i => i.complianceNote && !i.resolved);
                        if (withCompliance.length === 0) {
                          return <p className="text-xs text-gray-400">No compliance flags detected.</p>;
                        }
                        return (
                          <div className="space-y-2">
                            {withCompliance.slice(0, 4).map(ins => (
                              <div key={ins.id} className="flex items-start gap-2 text-xs">
                                <FileText className="w-3 h-3 text-purple-400 shrink-0 mt-0.5" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-gray-600 line-clamp-1">{ins.complianceNote}</p>
                                  {ins.clientName && <p className="text-[9px] text-gray-400">{ins.clientName}</p>}
                                </div>
                              </div>
                            ))}
                            {withCompliance.length > 4 && (
                              <p className="text-[10px] text-gray-400 italic">+{withCompliance.length - 4} more</p>
                            )}
                          </div>
                        );
                      })()}
                    </CardContent>
                  </Card>

                  <Card className="border bg-white">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <TrendingUp className="w-4 h-4 text-teal-500" />
                        <h4 className="text-xs font-semibold text-gray-800">Opportunity Pipeline</h4>
                      </div>
                      {(() => {
                        const opps = insights.filter(i => i.category === "Opportunity" && !i.resolved);
                        if (opps.length === 0) {
                          return <p className="text-xs text-gray-400">No open opportunities.</p>;
                        }
                        return (
                          <div className="space-y-2">
                            {opps.slice(0, 4).map(ins => (
                              <div key={ins.id} className="flex items-start gap-2 text-xs">
                                <Sparkles className="w-3 h-3 text-teal-400 shrink-0 mt-0.5" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-gray-600 line-clamp-1">{ins.summary}</p>
                                  {ins.clientName && <p className="text-[9px] text-gray-400">{ins.clientName}</p>}
                                </div>
                                <Link href={`/sandbox/${ins.sandbox.id}`}
                                  className="text-[9px] text-[#1a3a6b] hover:underline shrink-0"
                                >
                                  Open
                                </Link>
                              </div>
                            ))}
                            {opps.length > 4 && (
                              <p className="text-[10px] text-gray-400 italic">+{opps.length - 4} more opportunities</p>
                            )}
                          </div>
                        );
                      })()}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>
    </TooltipProvider>
  );
}
