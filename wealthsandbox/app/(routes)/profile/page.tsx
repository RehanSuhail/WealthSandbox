"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  User, DollarSign, Target, Shield, Bell, Download,
  Pencil, Check, X, RefreshCw, Link2, Link2Off,
  ChevronDown, ChevronUp, AlertTriangle, CheckCircle2,
  Info, Trash2, Briefcase, Users, FlaskConical, Lightbulb,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Breadcrumb } from "@/components/breadcrumb";

// ─── Types ─────────────────────────────────────────────────────────────────────

const RISK_LABELS  = ["Conservative", "Moderate-Low", "Moderate", "Moderate-High", "Aggressive"];
const RISK_DESCS   = [
  "Capital preservation focus. Heavy bond/cash allocation. Low volatility.",
  "Slight growth tilt. Majority bonds, modest equity exposure.",
  "Balanced growth and stability. 60/40 equity-bond split.",
  "Growth-oriented. Higher equity, accepts short-term drawdowns.",
  "Maximum growth. Primarily equities. High volatility accepted.",
];
const RISK_COLORS  = ["text-emerald-600", "text-teal-600", "text-blue-600", "text-amber-600", "text-red-600"];
const RISK_BG      = ["bg-emerald-50 border-emerald-200", "bg-teal-50 border-teal-200", "bg-blue-50 border-blue-200", "bg-amber-50 border-amber-200", "bg-red-50 border-red-200"];

const RISK_QUIZ = [
  {
    q: "How would you react if your portfolio dropped 25% in one year?",
    options: ["Sell everything immediately", "Sell some to reduce risk", "Hold and wait for recovery", "Buy more at lower prices"],
    scores: [0, 1, 3, 4],
  },
  {
    q: "What is your primary investment goal?",
    options: ["Preserve what I have", "Modest growth with stability", "Balanced growth and income", "Maximum long-term growth"],
    scores: [0, 1, 2, 4],
  },
  {
    q: "How many years until you need to access most of this money?",
    options: ["Less than 3 years", "3–7 years", "7–15 years", "15+ years"],
    scores: [0, 1, 2, 4],
  },
  {
    q: "Which statement best describes your investment experience?",
    options: ["None — completely new to investing", "Some — I have a savings account or fund", "Moderate — I've held stocks or ETFs", "Experienced — I actively manage a portfolio"],
    scores: [0, 1, 2, 4],
  },
  {
    q: "If a high-risk investment offered potentially 20% returns but could lose 30%, would you take it?",
    options: ["Definitely not", "Probably not", "Maybe", "Yes, for the upside"],
    scores: [0, 1, 2, 4],
  },
];

interface ProfileData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dob: string;
  state: string;
  familyStatus: string;
  dependents: number;
}

interface FinancialData {
  netWorth: number;
  annualIncome: number;
  monthlyExpenses: number;
  totalDebt: number;
  emergencyMonths: number;
}

interface NotifPrefs {
  insightAlerts: boolean;
  advisorMessages: boolean;
  weeklyDigest: boolean;
  goalMilestones: boolean;
  marketAlerts: boolean;
}

// ─── Inline-edit field ─────────────────────────────────────────────────────────

function EditField({
  label, value, type = "text", prefix, onSave,
}: {
  label: string;
  value: string | number;
  type?: string;
  prefix?: string;
  onSave: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState(String(value));

  const commit = () => { onSave(draft); setEditing(false); };
  const cancel = () => { setDraft(String(value)); setEditing(false); };

  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <Label className="text-sm text-gray-500 w-40 shrink-0">{label}</Label>
      {editing ? (
        <div className="flex items-center gap-2 flex-1">
          {prefix && <span className="text-sm text-gray-400 shrink-0">{prefix}</span>}
          <Input value={draft} type={type} onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") cancel(); }}
            className="h-8 text-sm flex-1"
            autoFocus
          />
          <button onClick={commit}  className="text-emerald-600 hover:text-emerald-700"><Check className="w-4 h-4" /></button>
          <button onClick={cancel}  className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
        </div>
      ) : (
        <button onClick={() => setEditing(true)}
          className="flex items-center gap-1.5 flex-1 text-left group"
        >
          <span className="text-sm font-medium text-gray-800 flex-1">
            {prefix}{typeof value === "number" ? value.toLocaleString() : value}
          </span>
          <Pencil className="w-3.5 h-3.5 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
        </button>
      )}
    </div>
  );
}

// ─── Toggle row ────────────────────────────────────────────────────────────────

function ToggleRow({ label, description, value, onChange }: {
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <div>
        <p className="text-sm font-medium text-gray-800">{label}</p>
        <p className="text-xs text-gray-400 mt-0.5">{description}</p>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={cn(
          "relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors duration-200",
          value ? "bg-[#1a3a6b]" : "bg-gray-200"
        )}
        role="switch" aria-checked={value}
      >
        <span className={cn(
          "pointer-events-none absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200",
          value ? "translate-x-4" : "translate-x-0"
        )} />
      </button>
    </div>
  );
}

// ─── Section wrapper ───────────────────────────────────────────────────────────

function Section({ icon, title, children, defaultOpen = true }: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card>
      <button onClick={() => setOpen(p => !p)} className="w-full text-left">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2.5 text-[#1a3a6b] text-base">
            {icon}
            {title}
            <span className="ml-auto text-gray-300">
              {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </span>
          </CardTitle>
        </CardHeader>
      </button>
      {open && (
        <CardContent className="pt-0">
          <Separator className="mb-4" />
          {children}
        </CardContent>
      )}
    </Card>
  );
}

// ─── Risk Re-quiz ──────────────────────────────────────────────────────────────

function RiskReQuiz({ onComplete, onCancel }: {
  onComplete: (level: number) => void;
  onCancel: () => void;
}) {
  const [step, setStep]       = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);

  const pick = (score: number) => {
    const next = [...answers, score];
    if (step < RISK_QUIZ.length - 1) {
      setAnswers(next);
      setStep(s => s + 1);
    } else {
      const total = next.reduce((a, b) => a + b, 0);
      const max   = RISK_QUIZ.length * 4;
      const level = Math.min(4, Math.round((total / max) * 4));
      onComplete(level);
    }
  };

  const q = RISK_QUIZ[step];

  return (
    <div className="space-y-5">
      {/* Progress bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-[#1a3a6b] rounded-full transition-all" style={{ width: `${((step) / RISK_QUIZ.length) * 100}%` }} />
        </div>
        <span className="text-xs text-gray-400 shrink-0">{step + 1} / {RISK_QUIZ.length}</span>
      </div>

      <p className="text-sm font-semibold text-gray-800 leading-snug">{q.q}</p>

      <div className="space-y-2">
        {q.options.map((opt, i) => (
          <button key={opt} onClick={() => pick(q.scores[i])}
            className="w-full text-left text-sm border rounded-xl px-4 py-3 transition-all hover:border-[#1a3a6b] hover:bg-[#1a3a6b]/5 text-gray-700 border-gray-200"
          >
            {opt}
          </button>
        ))}
      </div>

      <Button variant="outline" size="sm" onClick={onCancel} className="text-gray-400 gap-1">
        <X className="w-3.5 h-3.5" /> Cancel
      </Button>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────────

interface AdvisorData {
  firmName: string;
  licenseNumber: string;
  specialization: string;
  yearsExperience: number;
  crdNumber: string;
}

export default function ProfilePage() {
  // ── Role detection ──
  const [role, setRole] = useState<"client" | "advisor">("client");

  useEffect(() => {
    const c = document.cookie.split("; ").find(r => r.startsWith("ws_dev_role="));
    if (c?.split("=")[1] === "advisor") setRole("advisor");
  }, []);

  // ── Profile data ──
  const [profile, setProfile] = useState<ProfileData>({
    firstName:    "",
    lastName:     "",
    email:        "",
    phone:        "",
    dob:          "",
    state:        "",
    familyStatus: "",
    dependents:   0,
  });

  // ── Advisor-specific data ──
  const [advisorData, setAdvisorData] = useState<AdvisorData>({
    firmName: "",
    licenseNumber: "",
    specialization: "",
    yearsExperience: 0,
    crdNumber: "",
  });

  // Fetch profile from API on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth/sync");
        if (!res.ok) return;
        const { data } = await res.json();
        if (data) {
          // Top-level user fields
          setProfile(p => ({
            ...p,
            firstName: data.firstName || p.firstName,
            lastName: data.lastName || p.lastName,
            email: data.email || p.email,
            phone: data.phone || p.phone,
            dob: data.dob || data.profile?.dob || p.dob,
            state: data.state || data.profile?.state || p.state,
            familyStatus: data.familyStatus || data.profile?.familyStatus || p.familyStatus,
            dependents: data.dependents ?? data.profile?.kidAges?.length ?? p.dependents,
          }));
          // Financial data (saved by onboarding or profile edits)
          if (data.financial) setFinancial(f => ({ ...f, ...data.financial }));
          // Advisor-specific data
          if (data.advisorData) setAdvisorData(d => ({ ...d, ...data.advisorData }));
        }
      } catch {}
    })();
  }, []);

  const syncProfile = useCallback(async (patch: Record<string, unknown>) => {
    try {
      await fetch("/api/auth/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
    } catch {}
  }, []);

  const updateProfile = (key: keyof ProfileData, v: string) => {
    const val = key === "dependents" ? Number(v) : v;
    setProfile(p => ({ ...p, [key]: val }));
    syncProfile({ [key]: val });
  };

  // ── Financial baseline ──
  const [financial, setFinancial] = useState<FinancialData>({
    netWorth:       0,
    annualIncome:   0,
    monthlyExpenses: 0,
    totalDebt:      0,
    emergencyMonths: 0,
  });

  const updateFinancial = (key: keyof FinancialData, v: string) => {
    const val = Number(v.replace(/[^0-9.]/g, ""));
    setFinancial(p => ({ ...p, [key]: val }));
    syncProfile({ financial: { [key]: val } });
  };

  const updateAdvisorData = (key: keyof AdvisorData, v: string) => {
    const val = key === "yearsExperience" ? Number(v) : v;
    setAdvisorData(p => ({ ...p, [key]: val }));
    syncProfile({ advisorData: { [key]: val } });
  };

  // ── Risk tolerance ──
  const [riskLevel, setRiskLevel]   = useState(2);
  const [quizzing, setQuizzing]     = useState(false);
  const [quizResult, setQuizResult] = useState<number | null>(null);

  const applyQuizResult = () => { if (quizResult !== null) { setRiskLevel(quizResult); setQuizResult(null); } };

  // ── Advisor ──
  const [advisorConnected, setAdvisorConnected] = useState(false);
  const [advisor, setAdvisor] = useState<{ name: string; firm: string; initials: string; connectedDate: string; lastViewed: string } | null>(null);

  // Fetch advisor connection status
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/connect/status");
        if (res.ok) {
          const { data } = await res.json();
          if (data?.connected && data?.advisorName) {
            const initials = data.advisorName.split(" ").map((w: string) => w[0]).join("").toUpperCase();
            setAdvisor({
              name: data.advisorName,
              firm: "LPL Financial",
              initials,
              connectedDate: new Date(data.connectedAt || Date.now()).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
              lastViewed: "Recently",
            });
            setAdvisorConnected(true);
          }
        }
      } catch {}
    })();
  }, []);

  // ── Advisor client stats ──
  const [clientStats, setClientStats] = useState<{ total: number; sandboxes: number; pendingInsights: number }>({ total: 0, sandboxes: 0, pendingInsights: 0 });

  useEffect(() => {
    if (role !== "advisor") return;
    (async () => {
      try {
        const res = await fetch("/api/advisor/clients");
        if (!res.ok) return;
        const { data } = await res.json();
        const clients = data || [];
        setClientStats({
          total: clients.length,
          sandboxes: clients.reduce((s: number, c: Record<string, unknown>) => s + (Number(c.sandboxCount) || 0), 0),
          pendingInsights: clients.reduce((s: number, c: Record<string, unknown>) => s + (Number(c.pendingInsightsCount) || 0), 0),
        });
      } catch {}
    })();
  }, [role]);

  // ── Notifications ──
  const [notifs, setNotifs] = useState<NotifPrefs>({
    insightAlerts:    true,
    advisorMessages:  true,
    weeklyDigest:     true,
    goalMilestones:   true,
    marketAlerts:     false,
  });

  const toggleNotif = (key: keyof NotifPrefs) =>
    setNotifs(p => ({ ...p, [key]: !p[key] }));

  // ── Export ──
  const [exporting, setExporting] = useState(false);
  const handleExport = () => {
    setExporting(true);
    setTimeout(() => {
      const payload = {
        exportedAt:  new Date().toISOString(),
        profile,
        financial,
        riskTolerance: { level: riskLevel, label: RISK_LABELS[riskLevel] },
        advisor: advisorConnected ? advisor : null,
        notificationPreferences: notifs,
        sandboxes: [
          { id: "sb-1", name: "Retirement Plan 2048",  sessionCount: 14 },
          { id: "sb-2", name: "College Fund — Priya",  sessionCount: 5  },
          { id: "sb-3", name: "Emergency Reserve",     sessionCount: 3  },
        ],
        insights: { total: 6, resolved: 1, sentToAdvisor: 2 },
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `wealthsandbox-data-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setExporting(false);
    }, 1200);
  };

  const initials = `${profile.firstName[0] ?? ""}${profile.lastName[0] ?? ""}`.toUpperCase();
  const age      = profile.dob
    ? new Date().getFullYear() - new Date(profile.dob).getFullYear()
    : null;

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-[#f8fafc]">
        <div className="max-w-3xl mx-auto px-5 py-7 space-y-6">

          {/* Breadcrumb */}
          <Breadcrumb items={[
            { label: "Dashboard", href: role === "advisor" ? "/advisor/dashboard" : "/client/dashboard" },
            { label: "Profile" },
          ]} />

          {/* Hero */}
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-[#1a3a6b] text-white flex items-center justify-center text-2xl font-bold shrink-0 shadow-md shadow-[#1a3a6b]/20">
              {initials}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#1a3a6b]">
                {profile.firstName} {profile.lastName}
              </h1>
              <p className="text-sm text-gray-400 mt-0.5">
                {role === "advisor"
                  ? [advisorData.firmName, advisorData.specialization].filter(Boolean).join(" · ") || "Financial Advisor"
                  : <>{age && `${age} yrs · `}{profile.state} · {profile.familyStatus}</>
                }
              </p>
            </div>
          </div>

          {/* 1 · Personal info */}
          <Section icon={<User className="w-4 h-4" />} title="Personal Information">
            <div className="divide-y divide-gray-100">
              <EditField label="First name"      value={profile.firstName}    onSave={v => updateProfile("firstName", v)} />
              <EditField label="Last name"       value={profile.lastName}     onSave={v => updateProfile("lastName", v)} />
              <EditField label="Email"           value={profile.email}        onSave={v => updateProfile("email", v)}     type="email" />
              <EditField label="Phone"           value={profile.phone}        onSave={v => updateProfile("phone", v)}     type="tel" />
              {role === "client" && (
                <>
                  <EditField label="Date of birth"   value={profile.dob}          onSave={v => updateProfile("dob", v)}       type="date" />
                  <EditField label="State"           value={profile.state}        onSave={v => updateProfile("state", v)} />
                  <EditField label="Family status"   value={profile.familyStatus} onSave={v => updateProfile("familyStatus", v)} />
                  <EditField label="Dependents"      value={profile.dependents}   onSave={v => updateProfile("dependents", v)} type="number" />
                </>
              )}
            </div>
            <p className="text-[10px] text-gray-400 mt-3 flex items-center gap-1">
              <Info className="w-3 h-3" />
              {role === "advisor"
                ? "Contact information is visible to connected clients."
                : "Personal data feeds sandbox baselines. Changing it will update projections on next open."}
            </p>
          </Section>

          {/* 2a · Advisor Professional Info (advisor only) */}
          {role === "advisor" && (
            <Section icon={<Briefcase className="w-4 h-4" />} title="Professional Information">
              <div className="divide-y divide-gray-100">
                <EditField label="Firm name"          value={advisorData.firmName}        onSave={v => updateAdvisorData("firmName", v)} />
                <EditField label="License number"     value={advisorData.licenseNumber}   onSave={v => updateAdvisorData("licenseNumber", v)} />
                <EditField label="CRD number"         value={advisorData.crdNumber}       onSave={v => updateAdvisorData("crdNumber", v)} />
                <EditField label="Specialization"     value={advisorData.specialization}  onSave={v => updateAdvisorData("specialization", v)} />
                <EditField label="Years of experience" value={advisorData.yearsExperience} onSave={v => updateAdvisorData("yearsExperience", v)} type="number" />
              </div>
              <p className="text-[10px] text-gray-400 mt-3 flex items-center gap-1">
                <Info className="w-3 h-3" />
                Professional details are visible to connected clients.
              </p>
            </Section>
          )}

          {/* 2b · Financial baseline (client only) */}
          {role === "client" && (
          <Section icon={<DollarSign className="w-4 h-4" />} title="Financial Baseline">
            <div className="divide-y divide-gray-100">
              <EditField label="Net worth"          value={financial.netWorth}        onSave={v => updateFinancial("netWorth", v)}        prefix="$" />
              <EditField label="Annual income"      value={financial.annualIncome}    onSave={v => updateFinancial("annualIncome", v)}    prefix="$" />
              <EditField label="Monthly expenses"   value={financial.monthlyExpenses} onSave={v => updateFinancial("monthlyExpenses", v)} prefix="$" />
              <EditField label="Total debt"         value={financial.totalDebt}       onSave={v => updateFinancial("totalDebt", v)}       prefix="$" />
              <EditField label="Emergency fund"     value={`${financial.emergencyMonths} months`} onSave={v => updateFinancial("emergencyMonths", v)} />
            </div>
            <p className="text-[10px] text-gray-400 mt-3 flex items-center gap-1">
              <Info className="w-3 h-3" />
              These values serve as default starting points across all new and existing sandboxes.
            </p>
          </Section>
          )}

          {/* 3 · Risk tolerance (client only) */}
          {role === "client" && (
          <Section icon={<Target className="w-4 h-4" />} title="Risk Tolerance">
            {quizzing ? (
              <RiskReQuiz
                onComplete={result => { setQuizResult(result); setQuizzing(false); }}
                onCancel={() => setQuizzing(false)}
              />
            ) : (
              <div className="space-y-4">
                {/* Quiz result banner */}
                {quizResult !== null && (
                  <div className="border border-emerald-200 bg-emerald-50 rounded-xl px-4 py-3 flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-emerald-800">Quiz result: {RISK_LABELS[quizResult]}</p>
                      <p className="text-xs text-emerald-700 mt-0.5">Your answers suggest a <strong>{RISK_LABELS[quizResult]}</strong> profile. Apply to update your baseline?</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button size="xs" className="bg-emerald-600 hover:bg-emerald-700 gap-1" onClick={applyQuizResult}>
                        <Check className="w-3 h-3" /> Apply
                      </Button>
                      <Button size="xs" variant="outline" className="gap-1" onClick={() => setQuizResult(null)}>
                        <X className="w-3 h-3" /> Dismiss
                      </Button>
                    </div>
                  </div>
                )}

                {/* Current level */}
                <div className={cn("border rounded-xl px-4 py-3", RISK_BG[riskLevel])}>
                  <div className="flex items-center justify-between">
                    <span className={cn("text-base font-bold", RISK_COLORS[riskLevel])}>{RISK_LABELS[riskLevel]}</span>
                    <span className="text-xs text-gray-400">Level {riskLevel + 1} of 5</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">{RISK_DESCS[riskLevel]}</p>
                </div>

                {/* Slider */}
                <div className="space-y-2 px-1">
                  <Slider min={0} max={4} step={1} value={[riskLevel]} onValueChange={([v]) => setRiskLevel(v)} />
                  <div className="flex justify-between text-[10px] text-gray-400">
                    <span>Conservative</span><span>Aggressive</span>
                  </div>
                </div>

                {/* Level tiles */}
                <div className="grid grid-cols-5 gap-1.5">
                  {RISK_LABELS.map((lbl, i) => (
                    <button key={lbl} onClick={() => setRiskLevel(i)}
                      className={cn(
                        "text-[10px] text-center py-1.5 rounded-lg border transition-all",
                        riskLevel === i
                          ? `${RISK_BG[i]} font-semibold`
                          : "border-gray-200 text-gray-400 hover:border-gray-300"
                      )}
                    >
                      {lbl.split("-")[0]}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <Button variant="outline" className="gap-2 border-[#1a3a6b]/25 text-[#1a3a6b] hover:bg-[#1a3a6b]/5" onClick={() => setQuizzing(true)}>
                    <RefreshCw className="w-3.5 h-3.5" /> Re-take risk quiz
                  </Button>
                  <p className="text-xs text-gray-400">Last assessed: Jan 15, 2026</p>
                </div>
              </div>
            )}
          </Section>
          )}

          {/* 4 · Connected advisor (client only) */}
          {role === "client" && (
          <Section icon={<Link2 className="w-4 h-4" />} title="Connected Advisor">
            {advisorConnected ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#1a3a6b] text-white flex items-center justify-center text-sm font-bold shrink-0">
                    {advisor?.initials}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-800">{advisor?.name}</p>
                    <p className="text-xs text-gray-400">{advisor?.firm}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">Connected {advisor?.connectedDate} · Last viewed {advisor?.lastViewed}</p>
                  </div>
                  <Badge variant="outline" className="border-emerald-200 text-emerald-700 bg-emerald-50 text-[10px] shrink-0">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Active
                  </Badge>
                </div>
                <Separator />
                <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-amber-800">Disconnecting will revoke sandbox access</p>
                    <p className="text-xs text-amber-700 mt-0.5">Your advisor will lose the ability to view or annotate your sandboxes and insights. Your data is never deleted.</p>
                  </div>
                </div>
                <Button variant="outline" className="gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                  onClick={async () => {
                    if (!confirm("Are you sure you want to disconnect from your advisor?")) return;
                    try {
                      const res = await fetch("/api/connect/disconnect", { method: "POST" });
                      if (res.ok) {
                        setAdvisorConnected(false);
                      }
                    } catch {}
                  }}
                >
                  <Link2Off className="w-3.5 h-3.5" /> Disconnect advisor
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-500">No advisor connected. Connect one to share your sandboxes and receive professional annotations.</p>
                <Button className="bg-[#1a3a6b] hover:bg-[#16325c] gap-2">
                  <Link2 className="w-3.5 h-3.5" /> Connect an advisor
                </Button>
              </div>
            )}
          </Section>
          )}

          {/* 5 · Client Overview (advisor only) */}
          {role === "advisor" && (
          <Section icon={<Users className="w-4 h-4" />} title="Client Overview">
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[
                { label: "Connected Clients", value: clientStats.total, icon: <Users className="w-4 h-4 text-[#1a3a6b]" />, bg: "bg-[#1a3a6b]/5 border-[#1a3a6b]/15" },
                { label: "Total Sandboxes",    value: clientStats.sandboxes, icon: <FlaskConical className="w-4 h-4 text-purple-600" />, bg: "bg-purple-50 border-purple-100" },
                { label: "Pending Insights",   value: clientStats.pendingInsights, icon: <Lightbulb className="w-4 h-4 text-amber-600" />, bg: "bg-amber-50 border-amber-100" },
              ].map(s => (
                <div key={s.label} className={cn("border rounded-xl px-4 py-3 text-center", s.bg)}>
                  <div className="flex justify-center mb-1.5">{s.icon}</div>
                  <p className="text-xl font-bold text-gray-900">{s.value}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-gray-400 flex items-center gap-1">
              <Info className="w-3 h-3" />
              Stats are based on your currently connected clients and their shared data.
            </p>
          </Section>
          )}

          {/* 8 · Delete Profile */}
          <Card className="border-red-200">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-red-500" />
                <p className="text-sm font-semibold text-red-600">Danger Zone</p>
              </div>
              <p className="text-xs text-gray-500">Permanently delete your account and all associated data (sandboxes, sessions, insights). This action cannot be undone.</p>
              <Button
                variant="outline"
                className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 gap-2"
                onClick={async () => {
                  if (!confirm("Are you sure you want to delete your profile? This cannot be undone.")) return;
                  try {
                    const res = await fetch("/api/auth/sync", { method: "DELETE" });
                    if (res.ok) {
                      document.cookie = "ws_dev_role=;path=/;max-age=0";
                      document.cookie = "ws_client_id=;path=/;max-age=0";
                      window.location.href = "/login";
                    }
                  } catch {}
                }}
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete My Profile
              </Button>
            </CardContent>
          </Card>

        </div>
      </div>
    </TooltipProvider>
  );
}
