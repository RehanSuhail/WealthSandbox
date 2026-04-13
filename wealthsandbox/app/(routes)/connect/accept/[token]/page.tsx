"use client";

import { useState, use } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  CheckCircle2, X, Shield, User, TrendingUp, Lightbulb,
  History, RefreshCw, HandshakeIcon, AlertTriangle, FlaskConical,
  Clock, Award, Lock, Eye, Pencil, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Mock token → connection data ──────────────────────────────────────────────

interface ConnectionRequest {
  token: string;
  clientName: string;
  clientInitials: string;
  clientEmail: string;
  clientAge: number;
  clientState: string;
  clientJoined: string;
  riskLabel: string;
  sandboxCount: number;
  sessionCount: number;
  insightCount: number;
  netWorthBand: string;
  goals: string[];
  sandboxPreviews: { name: string; type: string; lastModified: string; sessionCount: number }[];
  recentSessions: { date: string; sandbox: string; changes: string }[];
}

const MOCK_REQUESTS: Record<string, ConnectionRequest> = {
  "tok-demo-001": {
    token: "tok-demo-001",
    clientName: "Alex Morgan",
    clientInitials: "AM",
    clientEmail: "alex.morgan@email.com",
    clientAge: 35,
    clientState: "California",
    clientJoined: "Jan 2026",
    riskLabel: "Moderate",
    sandboxCount: 3,
    sessionCount: 22,
    insightCount: 6,
    netWorthBand: "$400K–$600K",
    goals: ["Retire at 65", "College fund by 2040", "Buy a home by 2030"],
    sandboxPreviews: [
      { name: "Retirement Plan 2048",  type: "Retirement",   lastModified: "2 days ago", sessionCount: 14 },
      { name: "College Fund — Priya",  type: "Education",    lastModified: "5 days ago", sessionCount: 5  },
      { name: "Emergency Reserve",     type: "General",      lastModified: "12 days ago",sessionCount: 3  },
    ],
    recentSessions: [
      { date: "Apr 6, 2026",  sandbox: "Retirement Plan 2048", changes: "Monthly: $2,200 · Retire: 65 · Risk: Moderate" },
      { date: "Apr 4, 2026",  sandbox: "Retirement Plan 2048", changes: "Monthly: $2,000 · Retire: 65 · Risk: Moderate" },
      { date: "Mar 28, 2026", sandbox: "College Fund — Priya", changes: "Monthly: $800 · Target: $200K · 2040" },
    ],
  },
};

const FALLBACK_REQUEST: ConnectionRequest = {
  token: "unknown",
  clientName: "Unknown Client",
  clientInitials: "UC",
  clientEmail: "",
  clientAge: 0,
  clientState: "",
  clientJoined: "",
  riskLabel: "",
  sandboxCount: 0,
  sessionCount: 0,
  insightCount: 0,
  netWorthBand: "",
  goals: [],
  sandboxPreviews: [],
  recentSessions: [],
};

const TYPE_COLORS: Record<string, string> = {
  Retirement: "border-blue-200 text-blue-700 bg-blue-50",
  Education:  "border-purple-200 text-purple-700 bg-purple-50",
  General:    "border-gray-200 text-gray-600 bg-gray-50",
  RealEstate: "border-amber-200 text-amber-700 bg-amber-50",
  Custom:     "border-teal-200 text-teal-700 bg-teal-50",
};

// ─── Permission row ─────────────────────────────────────────────────────────────

function PermissionRow({ id, label, description, checked, locked, onChange }: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  locked?: boolean;
  onChange?: (v: boolean) => void;
}) {
  return (
    <div className={cn(
      "flex items-start gap-3 p-3 rounded-xl border transition-colors",
      locked ? "border-gray-100 bg-gray-50/50" : checked ? "border-[#1a3a6b]/20 bg-[#1a3a6b]/[0.02]" : "border-gray-200 bg-white"
    )}>
      <Checkbox id={id} checked={checked} disabled={locked}
        onCheckedChange={v => onChange?.(Boolean(v))}
        className="mt-0.5 shrink-0 border-[#1a3a6b]/30 data-[state=checked]:bg-[#1a3a6b] data-[state=checked]:border-[#1a3a6b]"
      />
      <div className="flex-1 min-w-0">
        <Label htmlFor={id} className={cn("text-sm font-medium cursor-pointer flex items-center gap-1.5", locked && "cursor-default text-gray-400")}>
          {label}
          {locked && <Lock className="w-3 h-3 text-gray-300" />}
        </Label>
        <p className={cn("text-xs mt-0.5", locked ? "text-gray-400" : "text-gray-500")}>{description}</p>
      </div>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────────

export default function AdvisorAcceptPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const request = MOCK_REQUESTS[token] ?? FALLBACK_REQUEST;
  const isValid = token in MOCK_REQUESTS;

  // Permissions state
  const [perms, setPerms] = useState({
    viewSandboxes:     true,
    addAnnotations:    true,
    viewInsightHistory:true,
    modifySandboxes:   false,
    startSharedSession:false,
  });

  const togglePerm = (key: keyof typeof perms) =>
    setPerms(p => ({ ...p, [key]: !p[key] }));

  const [step, setStep] = useState<"review" | "accepting" | "accepted" | "declined">("review");

  const handleAccept = () => {
    setStep("accepting");
    setTimeout(() => setStep("accepted"), 1800);
  };

  // ── Invalid token ──
  if (!isValid) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6">
        <Card className="max-w-sm w-full">
          <CardContent className="p-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7 text-red-500" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Invalid or expired link</h2>
            <p className="text-sm text-gray-500">This connection request link has expired or is invalid. Please ask the client to send a new request.</p>
            <Link href="/advisor/dashboard">
              <Button className="w-full bg-[#1a3a6b] hover:bg-[#16325c]">Back to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Declined ──
  if (step === "declined") {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6">
        <Card className="max-w-sm w-full">
          <CardContent className="p-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto">
              <X className="w-7 h-7 text-gray-400" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Request declined</h2>
            <p className="text-sm text-gray-500">{request.clientName} won&apos;t be connected to your account. They will be notified.</p>
            <Link href="/advisor/dashboard">
              <Button variant="outline" className="w-full border-[#1a3a6b]/25 text-[#1a3a6b]">Back to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Accepted ──
  if (step === "accepted") {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6">
        <div className="max-w-lg w-full space-y-5">
          <Card>
            <CardContent className="p-8 text-center space-y-5">
              <div className="relative mx-auto w-fit">
                <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center">
                  <HandshakeIcon className="w-9 h-9 text-emerald-500" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-white" />
                </div>
              </div>
              <div className="space-y-1.5">
                <h2 className="text-xl font-bold text-gray-900">Connected with {request.clientName}!</h2>
                <p className="text-sm text-gray-500 max-w-sm mx-auto">
                  You can now view their sandboxes, add annotations, and start shared planning sessions.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3 text-sm">
                {([
                  { icon: <Eye className="w-4 h-4" />,      label: "View sandboxes",     active: perms.viewSandboxes },
                  { icon: <Pencil className="w-4 h-4" />,   label: "Add annotations",    active: perms.addAnnotations },
                  { icon: <Sparkles className="w-4 h-4" />, label: "Shared sessions",    active: perms.startSharedSession },
                ] as { icon: React.ReactNode; label: string; active: boolean }[]).map(f => (
                  <div key={f.label} className={cn(
                    "border rounded-xl p-2.5 text-center space-y-1",
                    f.active ? "border-emerald-200 bg-emerald-50" : "border-gray-200 bg-gray-50 opacity-50"
                  )}>
                    <div className={cn("w-7 h-7 rounded-full flex items-center justify-center mx-auto", f.active ? "bg-emerald-100 text-emerald-600" : "bg-gray-200 text-gray-400")}>
                      {f.icon}
                    </div>
                    <p className={cn("text-[10px] font-medium leading-tight", f.active ? "text-emerald-700" : "text-gray-400")}>{f.label}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <Link href={`/advisor/clients/c-new`} className="flex-1">
                  <Button className="w-full bg-[#1a3a6b] hover:bg-[#16325c] gap-2">
                    <User className="w-4 h-4" /> View {request.clientName.split(" ")[0]}&apos;s profile
                  </Button>
                </Link>
                <Link href="/advisor/dashboard">
                  <Button variant="outline" className="gap-2 border-[#1a3a6b]/25 text-[#1a3a6b]">
                    Dashboard
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ── Review step ──
  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <div className="max-w-2xl mx-auto px-5 py-7 space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#1a3a6b] text-white flex items-center justify-center shrink-0">
            <HandshakeIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#1a3a6b]">New Connection Request</h1>
            <p className="text-sm text-gray-400">Review {request.clientName}&apos;s profile before accepting</p>
          </div>
          <div className="ml-auto">
            <Badge variant="outline" className="border-amber-200 text-amber-700 bg-amber-50 gap-1 flex items-center">
              <Clock className="w-3 h-3" /> Awaiting your response
            </Badge>
          </div>
        </div>

        {/* Client profile snapshot */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-[#1a3a6b] text-base flex items-center gap-2">
              <User className="w-4 h-4" /> Client Profile Snapshot
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Avatar + meta */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#1a3a6b] text-white flex items-center justify-center text-xl font-bold shrink-0">
                {request.clientInitials}
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-gray-900">{request.clientName}</h3>
                <p className="text-xs text-gray-400">
                  {request.clientAge} yrs · {request.clientState} · Joined {request.clientJoined}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{request.clientEmail}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-gray-400">Risk profile</p>
                <Badge variant="outline" className="border-blue-200 text-blue-700 bg-blue-50 mt-0.5">{request.riskLabel}</Badge>
              </div>
            </div>

            <Separator />

            {/* Stats */}
            <div className="grid grid-cols-4 gap-3 text-center">
              {([
                { label: "Net Worth",  value: request.netWorthBand,        sub: "estimated band" },
                { label: "Sandboxes", value: String(request.sandboxCount), sub: "created" },
                { label: "Sessions",  value: String(request.sessionCount), sub: "total" },
                { label: "Insights",  value: String(request.insightCount), sub: "generated" },
              ] as { label: string; value: string; sub: string }[]).map(s => (
                <div key={s.label} className="bg-[#1a3a6b]/5 rounded-xl py-2.5">
                  <p className="text-base font-bold text-[#1a3a6b]">{s.value}</p>
                  <p className="text-[10px] font-medium text-gray-500">{s.label}</p>
                  <p className="text-[9px] text-gray-400">{s.sub}</p>
                </div>
              ))}
            </div>

            {/* Goals */}
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-[#1a3a6b]" /> Financial Goals
              </p>
              <div className="flex flex-wrap gap-1.5">
                {request.goals.map(g => (
                  <Badge key={g} variant="outline" className="text-[10px] border-[#1a3a6b]/20 text-[#1a3a6b] bg-[#1a3a6b]/5">
                    {g}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sandbox previews */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-[#1a3a6b] text-base flex items-center gap-2">
              <FlaskConical className="w-4 h-4" /> Sandboxes
              <span className="text-xs font-normal text-gray-400 ml-1">(read-only preview — full access after connecting)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {request.sandboxPreviews.map(sb => (
              <div key={sb.name} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50/60">
                <div className="w-8 h-8 rounded-lg bg-[#1a3a6b]/10 text-[#1a3a6b] flex items-center justify-center shrink-0">
                  <FlaskConical className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{sb.name}</p>
                  <p className="text-[10px] text-gray-400">{sb.sessionCount} sessions · Modified {sb.lastModified}</p>
                </div>
                <Badge variant="outline" className={cn("text-[10px] shrink-0", TYPE_COLORS[sb.type] ?? "border-gray-200 text-gray-500 bg-gray-50")}>
                  {sb.type}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Session history preview */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-[#1a3a6b] text-base flex items-center gap-2">
              <History className="w-4 h-4" /> Recent Session Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0 divide-y divide-gray-100">
            {request.recentSessions.map((s, i) => (
              <div key={i} className="flex items-start gap-3 py-3">
                <div className="w-2 h-2 rounded-full bg-[#1a3a6b]/30 shrink-0 mt-1.5" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-xs font-medium text-gray-700">{s.sandbox}</p>
                    <span className="text-[10px] text-gray-400">{s.date}</span>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-0.5">{s.changes}</p>
                </div>
              </div>
            ))}
            <p className="text-[10px] text-gray-400 pt-3 pb-1 flex items-center gap-1">
              <Lock className="w-3 h-3" /> Full session history unlocks after you accept.
            </p>
          </CardContent>
        </Card>

        {/* Permissions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-[#1a3a6b] text-base flex items-center gap-2">
              <Shield className="w-4 h-4" /> Your Permissions
              <span className="text-xs font-normal text-gray-400 ml-1">— you can change these anytime</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <PermissionRow id="viewSandboxes"      label="View client sandboxes"         description="See projections, scenarios, and all sandbox configurations."  checked={perms.viewSandboxes}      locked />
            <PermissionRow id="addAnnotations"     label="Add annotations on insights"   description="Leave notes on AI insights visible to the client."             checked={perms.addAnnotations}     locked />
            <PermissionRow id="viewInsightHistory" label="View full insight history"     description="Access all AI-generated insights across sessions."             checked={perms.viewInsightHistory}  locked />
            <PermissionRow id="modifySandboxes"    label="Modify sandbox settings"       description="Change sliders and plan parameters in shared sessions only."  checked={perms.modifySandboxes}    onChange={() => togglePerm("modifySandboxes")} />
            <PermissionRow id="startSharedSession" label="Initiate shared sessions"      description="Start a live co-planning session with the client."            checked={perms.startSharedSession} onChange={() => togglePerm("startSharedSession")} />

            <div className="flex items-start gap-2 pt-2 text-[10px] text-gray-400">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <p>View, annotate, and history access are always granted by default. Modification and session initiation require explicit client approval per session.</p>
            </div>
          </CardContent>
        </Card>

        {/* Action buttons */}
        <div className="flex gap-3 flex-wrap">
          <Button onClick={handleAccept} disabled={step === "accepting"}
            className="flex-1 bg-[#1a3a6b] hover:bg-[#16325c] gap-2 h-11 text-base"
          >
            {step === "accepting"
              ? <><RefreshCw className="w-4 h-4 animate-spin" /> Accepting…</>
              : <><CheckCircle2 className="w-4 h-4" /> Accept and view full history</>}
          </Button>
          <Button variant="outline" onClick={() => setStep("declined")} disabled={step === "accepting"}
            className="gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
          >
            <X className="w-4 h-4" /> Decline
          </Button>
        </div>

        <p className="text-[10px] text-gray-400 text-center">
          Accepting connects {request.clientName} to your advisor account. You can disconnect from their profile at any time.
        </p>

      </div>
    </div>
  );
}

// Tiny Info icon used inline in permissions note
function Info(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}
