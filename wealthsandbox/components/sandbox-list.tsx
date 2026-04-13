"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  LayoutGrid,
  List,
  Search,
  ExternalLink,
  Eye,
  Copy,
  Trash2,
  Share2,
  FlaskConical,
  Clock,
  BookOpen,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type PortfolioType = "Retirement" | "Real Estate" | "Education" | "General" | "Custom";
type RiskLevel = "Conservative" | "Moderate" | "Aggressive";
type SandboxOrigin = "client" | "shared";

export interface SandboxItem {
  id: string;
  name: string;
  type: PortfolioType;
  riskLevel: RiskLevel;
  lastModified: string;
  lastModifiedTs: number;
  createdAt: string;
  projectedWealth: number;
  projectedAge: number;
  sessionCount: number;
  sharedWithAdvisor: boolean;
  origin?: SandboxOrigin; // advisor mode only
}

export interface SandboxListProps {
  mode: "client" | "advisor";
  clientId?: string;   // advisor mode: used to build clone URL
  clientName?: string; // advisor mode: display only
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const CLIENT_SANDBOXES: SandboxItem[] = [
  {
    id: "sb-001",
    name: "Retirement Plan 2048",
    type: "Retirement",
    riskLevel: "Moderate",
    lastModified: "2 days ago",
    lastModifiedTs: Date.now() - 2 * 86_400_000,
    createdAt: "Jan 15, 2026",
    projectedWealth: 1_940_000,
    projectedAge: 65,
    sessionCount: 8,
    sharedWithAdvisor: true,
    origin: "client",
  },
  {
    id: "sb-002",
    name: "Home Purchase Scenario",
    type: "Real Estate",
    riskLevel: "Conservative",
    lastModified: "5 days ago",
    lastModifiedTs: Date.now() - 5 * 86_400_000,
    createdAt: "Feb 3, 2026",
    projectedWealth: 620_000,
    projectedAge: 55,
    sessionCount: 3,
    sharedWithAdvisor: false,
    origin: "client",
  },
  {
    id: "sb-003",
    name: "Kids' College Fund",
    type: "Education",
    riskLevel: "Moderate",
    lastModified: "1 week ago",
    lastModifiedTs: Date.now() - 7 * 86_400_000,
    createdAt: "Feb 20, 2026",
    projectedWealth: 310_000,
    projectedAge: 45,
    sessionCount: 2,
    sharedWithAdvisor: false,
    origin: "client",
  },
  {
    id: "sb-004",
    name: "Emergency Buffer Plan",
    type: "General",
    riskLevel: "Conservative",
    lastModified: "2 weeks ago",
    lastModifiedTs: Date.now() - 14 * 86_400_000,
    createdAt: "Mar 1, 2026",
    projectedWealth: 180_000,
    projectedAge: 50,
    sessionCount: 1,
    sharedWithAdvisor: false,
    origin: "client",
  },
  {
    id: "sb-005",
    name: "Aggressive Growth Portfolio",
    type: "General",
    riskLevel: "Aggressive",
    lastModified: "3 weeks ago",
    lastModifiedTs: Date.now() - 21 * 86_400_000,
    createdAt: "Mar 10, 2026",
    projectedWealth: 2_800_000,
    projectedAge: 70,
    sessionCount: 5,
    sharedWithAdvisor: true,
    origin: "shared",
  },
  {
    id: "sb-006",
    name: "Side Business Wealth Plan",
    type: "Custom",
    riskLevel: "Aggressive",
    lastModified: "1 month ago",
    lastModifiedTs: Date.now() - 30 * 86_400_000,
    createdAt: "Mar 15, 2026",
    projectedWealth: 1_100_000,
    projectedAge: 60,
    sessionCount: 4,
    sharedWithAdvisor: false,
    origin: "client",
  },
];

// Advisor sees only sandboxes that are accessible (shared or client-created)
const ADVISOR_VIEW_SANDBOXES: SandboxItem[] = [
  { ...CLIENT_SANDBOXES[0], origin: "shared" },
  { ...CLIENT_SANDBOXES[1], origin: "client" },
  { ...CLIENT_SANDBOXES[2], origin: "client" },
  { ...CLIENT_SANDBOXES[4], origin: "shared" },
];

// ─── Badge colour maps ────────────────────────────────────────────────────────

const TYPE_COLORS: Record<PortfolioType, string> = {
  Retirement:   "border-blue-200   text-blue-700   bg-blue-50",
  "Real Estate":"border-amber-200  text-amber-700  bg-amber-50",
  Education:    "border-purple-200 text-purple-700 bg-purple-50",
  General:      "border-gray-200   text-gray-600   bg-gray-50",
  Custom:       "border-teal-200   text-teal-700   bg-teal-50",
};

const RISK_COLORS: Record<RiskLevel, string> = {
  Conservative: "border-emerald-200 text-emerald-700 bg-emerald-50",
  Moderate:     "border-amber-200   text-amber-700   bg-amber-50",
  Aggressive:   "border-red-200     text-red-700     bg-red-50",
};

// ─── Delete confirmation dialog ───────────────────────────────────────────────

function DeleteDialog({ name, onConfirm, removeOnly }: { name: string; onConfirm: () => void; removeOnly?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="icon-sm"
          className="text-red-500 hover:text-red-600 hover:border-red-300"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{removeOnly ? "Remove Sandbox" : "Delete Sandbox"}</DialogTitle>
          <DialogDescription>
            {removeOnly
              ? <>Remove <strong>&ldquo;{name}&rdquo;</strong> from your view? The client&apos;s original sandbox will not be affected.</>
              : <>Are you sure you want to permanently delete <strong>&ldquo;{name}&rdquo;</strong>? This cannot be undone.</>
            }
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            className="bg-red-600 hover:bg-red-700 text-white"
            onClick={() => { onConfirm(); setOpen(false); }}
          >
            {removeOnly ? "Remove" : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function SandboxList({ mode, clientId, clientName }: SandboxListProps) {
  const [items, setItems]         = useState<SandboxItem[]>([]);
  const [view, setView]           = useState<"list" | "grid">("list");
  const [search, setSearch]       = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterRisk, setFilterRisk] = useState("all");
  const [sortBy, setSortBy]       = useState("lastModified");

  useEffect(() => {
    (async () => {
      try {
        const url = clientId ? `/api/sandboxes?clientId=${clientId}` : "/api/sandboxes";
        const res = await fetch(url);
        if (!res.ok) return;
        const { data } = await res.json();
        if (data?.length) {
          setItems(data.map((sb: any) => ({
            id: sb.id,
            name: sb.name,
            type: sb.portfolioType === "retirement" ? "Retirement" : sb.portfolioType === "realestate" ? "Real Estate" : sb.portfolioType === "college" ? "Education" : sb.portfolioType === "equity" ? "General" : "Custom",
            riskLevel: "Moderate" as RiskLevel,
            lastModified: new Date(sb.updatedAt).toLocaleDateString(),
            lastModifiedTs: new Date(sb.updatedAt).getTime(),
            createdAt: new Date(sb.createdAt).toLocaleDateString(),
            projectedWealth: sb.latestSession?.chartP50?.[Math.floor((sb.latestSession?.chartP50?.length || 0) * 0.6)] || 0,
            projectedAge: 65,
            sessionCount: sb.sessionCount || 0,
            sharedWithAdvisor: sb.sharedWithAdvisor || false,
            origin: "client" as SandboxOrigin,
          })));
        }
      } catch {}
    })();
  }, [clientId]);

  const filtered = useMemo(() => {
    let result = [...items];

    if (search)
      result = result.filter((s) =>
        s.name.toLowerCase().includes(search.toLowerCase())
      );
    if (filterType !== "all") result = result.filter((s) => s.type === filterType);
    if (filterRisk !== "all") result = result.filter((s) => s.riskLevel === filterRisk);

    result.sort((a, b) => {
      if (sortBy === "name")            return a.name.localeCompare(b.name);
      if (sortBy === "projectedWealth") return b.projectedWealth - a.projectedWealth;
      return b.lastModifiedTs - a.lastModifiedTs;
    });

    return result;
  }, [items, search, filterType, filterRisk, sortBy]);

  const handleDelete = async (id: string) => {
    setItems((p) => p.filter((s) => s.id !== id));
    try {
      if (mode === "advisor") {
        // Advisor: just unshare (remove from advisor view), don't delete
        await fetch(`/api/sandboxes/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sharedWithAdvisor: false }),
        });
      } else {
        await fetch(`/api/sandboxes/${id}`, { method: "DELETE" });
      }
    } catch {}
  };
  const handleDuplicate = async (item: SandboxItem) => {
    try {
      const res = await fetch(`/api/sandboxes/${item.id}/duplicate`, { method: "POST" });
      if (res.ok) {
        const { data } = await res.json();
        // Navigate to the cloned sandbox
        window.location.href = `/sandbox/${data.id}`;
      }
    } catch {}
  };

  // Builds the clone URL for advisor mode
  const cloneHref = (sbId: string) =>
    clientId
      ? `/advisor/clients/${clientId}/clone?sandbox=${sbId}`
      : `/sandbox/${sbId}`;

  // ── Per-row action buttons ────────────────────────────────────────────────

  function RowActions({ sb }: { sb: SandboxItem }) {
    return (
      <div className="flex items-center gap-1 shrink-0">
        {mode === "client" && (
          <>
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
          </>
        )}

        {mode === "client" && (
          <>
            {!sb.sharedWithAdvisor && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon-sm" onClick={async () => {
                    try {
                      await fetch(`/api/sandboxes/${sb.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sharedWithAdvisor: true }) });
                      setItems(p => p.map(s => s.id === sb.id ? { ...s, sharedWithAdvisor: true } : s));
                    } catch {}
                  }}>
                    <Share2 className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Share Session</TooltipContent>
              </Tooltip>
            )}

            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <DeleteDialog name={sb.name} onConfirm={() => handleDelete(sb.id)} />
                </span>
              </TooltipTrigger>
              <TooltipContent>Delete</TooltipContent>
            </Tooltip>
          </>
        )}

        {mode === "advisor" && (
          <>
            <Button
              size="xs"
              className="bg-[#1a3a6b] hover:bg-[#16325c] gap-1"
              asChild
            >
              <Link href={cloneHref(sb.id)}>
                <Copy className="w-3 h-3" /> Clone
              </Link>
            </Button>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <DeleteDialog name={sb.name} onConfirm={() => handleDelete(sb.id)} removeOnly />
                </span>
              </TooltipTrigger>
              <TooltipContent>Remove from view</TooltipContent>
            </Tooltip>
          </>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <TooltipProvider>
      <div className="space-y-4">

        {/* ── Controls bar ── */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <Input
              placeholder="Search sandboxes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-8 text-sm"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Type filter */}
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="h-8 text-xs w-[130px]">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Retirement">Retirement</SelectItem>
                <SelectItem value="Real Estate">Real Estate</SelectItem>
                <SelectItem value="Education">Education</SelectItem>
                <SelectItem value="General">General</SelectItem>
                <SelectItem value="Custom">Custom</SelectItem>
              </SelectContent>
            </Select>

            {/* Risk filter */}
            <Select value={filterRisk} onValueChange={setFilterRisk}>
              <SelectTrigger className="h-8 text-xs w-[130px]">
                <SelectValue placeholder="All Risk" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Risk Levels</SelectItem>
                <SelectItem value="Conservative">Conservative</SelectItem>
                <SelectItem value="Moderate">Moderate</SelectItem>
                <SelectItem value="Aggressive">Aggressive</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="h-8 text-xs w-[155px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lastModified">Last Modified</SelectItem>
                <SelectItem value="name">Name (A–Z)</SelectItem>
                <SelectItem value="projectedWealth">Projected Wealth</SelectItem>
              </SelectContent>
            </Select>

            {/* List / Grid toggle */}
            <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setView("list")}
                className={cn(
                  "p-1.5 transition-colors",
                  view === "list"
                    ? "bg-[#1a3a6b] text-white"
                    : "text-gray-400 hover:bg-gray-50"
                )}
                aria-label="List view"
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setView("grid")}
                className={cn(
                  "p-1.5 transition-colors",
                  view === "grid"
                    ? "bg-[#1a3a6b] text-white"
                    : "text-gray-400 hover:bg-gray-50"
                )}
                aria-label="Grid view"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Results count */}
        <p className="text-xs text-gray-400">
          {filtered.length} sandbox{filtered.length !== 1 ? "es" : ""}
          {search && ` matching "${search}"`}
          {mode === "advisor" && clientName && ` for ${clientName}`}
        </p>

        {/* Empty state */}
        {filtered.length === 0 && (
          <div className="text-center py-16 border border-dashed border-gray-200 rounded-xl bg-white">
            <FlaskConical className="w-8 h-8 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-500">No sandboxes found</p>
            <p className="text-xs text-gray-400 mt-1">
              Try adjusting your filters or search term
            </p>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            LIST VIEW
        ══════════════════════════════════════════════════════════ */}
        {view === "list" && filtered.length > 0 && (
          <Card>
            <CardContent className="p-0">
              {filtered.map((sb, i) => (
                <div key={sb.id}>
                  {i > 0 && <Separator />}
                  <div className="flex items-center gap-4 px-4 py-3.5 hover:bg-gray-50/80 transition-colors">

                    {/* Icon */}
                    <div className="w-9 h-9 rounded-lg bg-[#1a3a6b]/5 flex items-center justify-center shrink-0">
                      <FlaskConical className="w-4 h-4 text-[#1a3a6b]/60" />
                    </div>

                    {/* Main info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-gray-800 truncate">{sb.name}</p>
                        <Badge variant="outline" className={cn("text-[10px] shrink-0", TYPE_COLORS[sb.type])}>
                          {sb.type}
                        </Badge>
                        <Badge variant="outline" className={cn("text-[10px] shrink-0", RISK_COLORS[sb.riskLevel])}>
                          {sb.riskLevel}
                        </Badge>
                        {/* Advisor-mode origin badge */}
                        {mode === "advisor" && sb.origin && (
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] shrink-0",
                              sb.origin === "shared"
                                ? "border-[#1a3a6b]/30 text-[#1a3a6b] bg-[#1a3a6b]/5"
                                : "border-gray-200 text-gray-500 bg-gray-50"
                            )}
                          >
                            {sb.origin === "shared" ? "Shared session" : "Created by client"}
                          </Badge>
                        )}
                        {/* Client mode: already-shared indicator */}
                        {mode === "client" && sb.sharedWithAdvisor && (
                          <Badge variant="outline" className="text-[10px] shrink-0 border-[#1a3a6b]/30 text-[#1a3a6b] bg-[#1a3a6b]/5">
                            Shared with advisor
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-0.5 flex-wrap">
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {sb.lastModified}
                        </span>
                        <span className="text-xs font-semibold text-[#1a3a6b]">
                          Projected: ${(sb.projectedWealth / 1_000_000).toFixed(1)}M at {sb.projectedAge}
                        </span>
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <BookOpen className="w-3 h-3" />
                          {sb.sessionCount} session{sb.sessionCount !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>

                    <RowActions sb={sb} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* ══════════════════════════════════════════════════════════
            GRID VIEW
        ══════════════════════════════════════════════════════════ */}
        {view === "grid" && filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((sb) => (
              <Card key={sb.id} className="flex flex-col hover:shadow-md transition-shadow">
                <CardContent className="flex-1 p-5 space-y-3">

                  {/* Top row: icon + type/risk badges */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="w-9 h-9 rounded-lg bg-[#1a3a6b]/5 flex items-center justify-center shrink-0">
                      <FlaskConical className="w-4 h-4 text-[#1a3a6b]/60" />
                    </div>
                    <div className="flex items-center gap-1 flex-wrap justify-end">
                      <Badge variant="outline" className={cn("text-[10px]", TYPE_COLORS[sb.type])}>
                        {sb.type}
                      </Badge>
                      <Badge variant="outline" className={cn("text-[10px]", RISK_COLORS[sb.riskLevel])}>
                        {sb.riskLevel}
                      </Badge>
                    </div>
                  </div>

                  {/* Name */}
                  <p className="text-sm font-semibold text-gray-800 leading-snug">{sb.name}</p>

                  {/* Origin / shared badges */}
                  {mode === "advisor" && sb.origin && (
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px]",
                        sb.origin === "shared"
                          ? "border-[#1a3a6b]/30 text-[#1a3a6b] bg-[#1a3a6b]/5"
                          : "border-gray-200 text-gray-500 bg-gray-50"
                      )}
                    >
                      {sb.origin === "shared" ? "Shared session" : "Created by client"}
                    </Badge>
                  )}
                  {mode === "client" && sb.sharedWithAdvisor && (
                    <Badge variant="outline" className="text-[10px] border-[#1a3a6b]/30 text-[#1a3a6b] bg-[#1a3a6b]/5">
                      Shared with advisor
                    </Badge>
                  )}

                  <Separator />

                  {/* Metrics */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">Projected</span>
                      <span className="text-xs font-semibold text-[#1a3a6b]">
                        ${(sb.projectedWealth / 1_000_000).toFixed(1)}M at {sb.projectedAge}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <BookOpen className="w-3 h-3" /> Sessions
                      </span>
                      <span className="text-xs text-gray-600">{sb.sessionCount}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Modified
                      </span>
                      <span className="text-xs text-gray-600">{sb.lastModified}</span>
                    </div>
                  </div>
                </CardContent>

                {/* Card footer actions */}
                <CardFooter className="flex items-center justify-between gap-2 px-5">
                  {mode === "advisor" ? (
                    <>
                      <Button
                        size="sm"
                        className="flex-1 bg-[#1a3a6b] hover:bg-[#16325c] gap-1"
                        asChild
                      >
                        <Link href={cloneHref(sb.id)}>
                          <Copy className="w-3.5 h-3.5" /> Clone
                        </Link>
                      </Button>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>
                            <DeleteDialog name={sb.name} onConfirm={() => handleDelete(sb.id)} removeOnly />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>Remove from view</TooltipContent>
                      </Tooltip>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="flex-1 gap-1 text-[#1a3a6b] border-[#1a3a6b]/30"
                      >
                        <Link href={`/sandbox/${sb.id}`}>
                          <ExternalLink className="w-3.5 h-3.5" /> Open
                        </Link>
                      </Button>
                      <div className="flex items-center gap-1">
                        {!sb.sharedWithAdvisor && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="outline" size="icon-sm" onClick={async () => {
                                try {
                                  await fetch(`/api/sandboxes/${sb.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sharedWithAdvisor: true }) });
                                  setItems(p => p.map(s => s.id === sb.id ? { ...s, sharedWithAdvisor: true } : s));
                                } catch {}
                              }}>
                                <Share2 className="w-3.5 h-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Share Session</TooltipContent>
                          </Tooltip>
                        )}
                        <DeleteDialog name={sb.name} onConfirm={() => handleDelete(sb.id)} />
                      </div>
                    </>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
