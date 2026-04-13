"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Check, Plus, Trash2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const STEPS = ["Personal", "Financial Snapshot", "Goals", "Risk Profile"];

const US_STATES = [
  "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut",
  "Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa",
  "Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan",
  "Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada",
  "New Hampshire","New Jersey","New Mexico","New York","North Carolina",
  "North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island",
  "South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont",
  "Virginia","Washington","West Virginia","Wisconsin","Wyoming",
];

const RISK_QUESTIONS = [
  {
    id: "q1",
    question: "If your portfolio dropped 30% in a single year, what would you do?",
    options: [
      { value: "sell",    label: "Sell everything — I can't afford to lose more" },
      { value: "hold",    label: "Hold and wait for recovery" },
      { value: "partial", label: "Sell some and rebalance" },
      { value: "buy",     label: "Buy more — it's a discount" },
    ],
  },
  {
    id: "q2",
    question: "How long can you keep your money invested without needing it?",
    options: [
      { value: "lt2",   label: "Less than 2 years" },
      { value: "2to5",  label: "2–5 years" },
      { value: "5to10", label: "5–10 years" },
      { value: "gt10",  label: "More than 10 years" },
    ],
  },
  {
    id: "q3",
    question: "Which best describes your investment experience?",
    options: [
      { value: "none",     label: "None — this is new to me" },
      { value: "basic",    label: "Basic — I have a 401k or index funds" },
      { value: "moderate", label: "Moderate — I actively manage some investments" },
      { value: "advanced", label: "Advanced — I trade regularly and research markets" },
    ],
  },
  {
    id: "q4",
    question: "Which portfolio would you be most comfortable with?",
    options: [
      { value: "stable",     label: "Low return, low risk — steady and predictable" },
      { value: "balanced",   label: "Moderate return, moderate risk — balanced growth" },
      { value: "growth",     label: "Higher return, higher risk — long-term growth" },
      { value: "aggressive", label: "Maximum return, maximum risk — I can handle big swings" },
    ],
  },
  {
    id: "q5",
    question: "What is your biggest financial fear?",
    options: [
      { value: "outlive", label: "Outliving my savings" },
      { value: "crash",   label: "A major market crash wiping out my gains" },
      { value: "goals",   label: "Not being able to afford my goals" },
      { value: "legacy",  label: "Leaving nothing for my family" },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function computeAge(dob: string): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age > 0 ? age : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 1 — Personal
// ─────────────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function StepPersonal({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  const age = computeAge(data.dob);

  const addKid  = () => onChange({ ...data, kidAges: [...(data.kidAges ?? []), ""] });
  const removeKid = (i: number) => {
    const ages = [...(data.kidAges ?? [])];
    ages.splice(i, 1);
    onChange({ ...data, kidAges: ages });
  };
  const updateKid = (i: number, val: string) => {
    const ages = [...(data.kidAges ?? [])];
    ages[i] = val;
    onChange({ ...data, kidAges: ages });
  };

  return (
    <div className="space-y-6">
      {/* Full name */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-[#1a3a6b]">Full Name</Label>
        <Input
          placeholder="Jane Doe"
          value={data.name ?? ""}
          onChange={(e) => onChange({ ...data, name: e.target.value })}
        />
      </div>

      {/* Email */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-[#1a3a6b]">Email Address</Label>
        <Input
          type="email"
          placeholder="jane.doe@example.com"
          value={data.email ?? ""}
          onChange={(e) => onChange({ ...data, email: e.target.value })}
        />
      </div>

      {/* Phone */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-[#1a3a6b]">Phone Number <span className="font-normal text-gray-400">(optional)</span></Label>
        <Input
          type="tel"
          placeholder="(555) 123-4567"
          value={data.phone ?? ""}
          onChange={(e) => onChange({ ...data, phone: e.target.value })}
        />
      </div>

      {/* Date of birth + computed age */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-[#1a3a6b]">Date of Birth</Label>
        <div className="flex items-center gap-3">
          <Input
            type="date"
            value={data.dob ?? ""}
            onChange={(e) => onChange({ ...data, dob: e.target.value })}
            className="max-w-xs"
          />
          {age !== null && (
            <span className="text-sm text-gray-500">
              Age: <strong className="text-gray-700">{age}</strong>
            </span>
          )}
        </div>
      </div>

      {/* Family status */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-[#1a3a6b]">Family Status</Label>
        <RadioGroup
          value={data.familyStatus ?? ""}
          onValueChange={(v) =>
            onChange({
              ...data,
              familyStatus: v,
              kidAges: v === "married_kids" ? (data.kidAges ?? [""]) : [],
            })
          }
          className="grid grid-cols-1 md:grid-cols-3 gap-3"
        >
          {[
            { value: "single",      label: "Single" },
            { value: "married",     label: "Married" },
            { value: "married_kids", label: "Married with Kids" },
          ].map(({ value, label }) => (
            <Label
              key={value}
              className={cn(
                "flex items-center gap-3 border rounded-lg p-4 cursor-pointer transition-colors",
                data.familyStatus === value
                  ? "border-[#1a3a6b] bg-[#1a3a6b]/5 text-[#1a3a6b]"
                  : "hover:border-[#1a3a6b]/40 text-gray-700"
              )}
            >
              <RadioGroupItem value={value} />
              {label}
            </Label>
          ))}
        </RadioGroup>
      </div>

      {/* Children's ages — shown only when married_kids */}
      {data.familyStatus === "married_kids" && (
        <div className="space-y-3 pl-1">
          <Label className="text-sm font-medium text-[#1a3a6b]">Children&apos;s Ages</Label>
          {(data.kidAges ?? []).map((kidAge: string, i: number) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                type="number"
                placeholder={`Child ${i + 1} age`}
                value={kidAge}
                min={0}
                max={25}
                onChange={(e) => updateKid(i, e.target.value)}
                className="max-w-[140px]"
              />
              <button
                type="button"
                onClick={() => removeKid(i)}
                className="text-gray-400 hover:text-red-500 transition-colors"
                aria-label="Remove child"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addKid}
            className="gap-1 text-[#1a3a6b] border-[#1a3a6b]/30"
          >
            <Plus className="w-3.5 h-3.5" /> Add Child
          </Button>
        </div>
      )}

      {/* State of residence */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-[#1a3a6b]">State of Residence</Label>
        <Select
          value={data.state ?? ""}
          onValueChange={(v) => onChange({ ...data, state: v })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select your state" />
          </SelectTrigger>
          <SelectContent>
            {US_STATES.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 2 — Financial Snapshot
// ─────────────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function StepFinancial({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  const toggleDebt = (key: string, checked: boolean) =>
    onChange({
      ...data,
      debt: { ...data.debt, [key]: { ...(data.debt?.[key] ?? {}), enabled: checked } },
    });
  const updateDebt = (key: string, field: string, val: string) =>
    onChange({
      ...data,
      debt: { ...data.debt, [key]: { ...(data.debt?.[key] ?? {}), [field]: val } },
    });

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-[#1a3a6b]">Total Investable Assets ($)</Label>
          <Input
            type="number"
            placeholder="e.g. 50,000"
            value={data.savings ?? ""}
            onChange={(e) => onChange({ ...data, savings: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-[#1a3a6b]">Monthly Take-home Income ($)</Label>
          <Input
            type="number"
            placeholder="e.g. 6,500"
            value={data.income ?? ""}
            onChange={(e) => onChange({ ...data, income: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-[#1a3a6b]">
          Monthly Expenses ($){" "}
          <span className="font-normal text-gray-400">(optional)</span>
        </Label>
        <Input
          type="number"
          placeholder="e.g. 4,000"
          value={data.expenses ?? ""}
          onChange={(e) => onChange({ ...data, expenses: e.target.value })}
        />
      </div>

      {/* Debt accordion */}
      <div className="space-y-3">
        <Label className="text-sm font-medium text-[#1a3a6b]">Outstanding Debt</Label>
        {([
          { key: "mortgage", label: "Mortgage" },
          { key: "student",  label: "Student Loan" },
          { key: "other",    label: "Other Debt" },
        ] as const).map(({ key, label }) => {
          const enabled = !!data.debt?.[key]?.enabled;
          return (
            <div key={key} className="border rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => toggleDebt(key, !enabled)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
                  enabled ? "bg-[#1a3a6b]/5" : "hover:bg-gray-50"
                )}
              >
                {/* custom checkbox */}
                <span
                  className={cn(
                    "w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                    enabled ? "border-[#1a3a6b] bg-[#1a3a6b]" : "border-gray-300"
                  )}
                >
                  {enabled && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                </span>
                <span className="text-sm font-medium text-gray-700">{label}</span>
              </button>

              {enabled && (
                <div className="grid md:grid-cols-2 gap-3 px-4 pb-4 pt-3 border-t border-[#1a3a6b]/10">
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-500">Total Amount ($)</Label>
                    <Input
                      type="number"
                      placeholder="e.g. 200,000"
                      value={data.debt?.[key]?.amount ?? ""}
                      onChange={(e) => updateDebt(key, "amount", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-500">Monthly Payment ($)</Label>
                    <Input
                      type="number"
                      placeholder="e.g. 1,500"
                      value={data.debt?.[key]?.payment ?? ""}
                      onChange={(e) => updateDebt(key, "payment", e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 3 — Goals
// ─────────────────────────────────────────────────────────────────────────────

function GoalTile({
  title,
  icon,
  selected,
  onToggle,
  children,
}: {
  title: string;
  icon: string;
  selected: boolean;
  onToggle: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "border rounded-xl transition-all",
        selected ? "border-[#1a3a6b] bg-[#1a3a6b]/5" : "hover:border-[#1a3a6b]/40"
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-4 text-left"
      >
        <span className="text-xl shrink-0">{icon}</span>
        <span className="text-sm font-medium text-gray-800 flex-1">{title}</span>
        <span
          className={cn(
            "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
            selected ? "border-[#1a3a6b] bg-[#1a3a6b]" : "border-gray-300"
          )}
        >
          {selected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
        </span>
      </button>

      {selected && children && (
        <div className="px-4 pb-4 pt-1 border-t border-[#1a3a6b]/10 space-y-3">
          {children}
        </div>
      )}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function StepGoals({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  const goals = data.goals ?? {};

  const toggle = (key: string) =>
    onChange({
      ...data,
      goals: { ...goals, [key]: { ...goals[key], selected: !goals[key]?.selected } },
    });
  const update = (key: string, field: string, val: string) =>
    onChange({
      ...data,
      goals: { ...goals, [key]: { ...goals[key], [field]: val } },
    });

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-400 mb-1">Select all that apply and fill in the details.</p>

      <GoalTile title="Retire at a target age" icon="🏖️" selected={!!goals.retire?.selected} onToggle={() => toggle("retire")}>
        <div className="space-y-1">
          <Label className="text-xs text-gray-500">Target Retirement Age</Label>
          <Input type="number" placeholder="e.g. 62" min={40} max={80}
            value={goals.retire?.age ?? ""} onChange={(e) => update("retire", "age", e.target.value)}
            className="max-w-[120px]" />
        </div>
      </GoalTile>

      <GoalTile title="Kids' college fund" icon="🎓" selected={!!goals.college?.selected} onToggle={() => toggle("college")}>
        <div className="grid md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-gray-500">Target Amount per child ($)</Label>
            <Input type="number" placeholder="e.g. 80,000"
              value={goals.college?.amount ?? ""} onChange={(e) => update("college", "amount", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-gray-500">Target Year</Label>
            <Input type="number" placeholder="e.g. 2035"
              value={goals.college?.year ?? ""} onChange={(e) => update("college", "year", e.target.value)} />
          </div>
        </div>
      </GoalTile>

      <GoalTile title="Buy a home" icon="🏡" selected={!!goals.home?.selected} onToggle={() => toggle("home")}>
        <div className="grid md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-gray-500">Down Payment Target ($)</Label>
            <Input type="number" placeholder="e.g. 100,000"
              value={goals.home?.downPayment ?? ""} onChange={(e) => update("home", "downPayment", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-gray-500">Target Year</Label>
            <Input type="number" placeholder="e.g. 2028"
              value={goals.home?.year ?? ""} onChange={(e) => update("home", "year", e.target.value)} />
          </div>
        </div>
      </GoalTile>

      <GoalTile title="Emergency buffer" icon="🛡️" selected={!!goals.emergency?.selected} onToggle={() => toggle("emergency")}>
        <div className="space-y-1">
          <Label className="text-xs text-gray-500">Target Months of Expenses</Label>
          <Input type="number" placeholder="e.g. 6" min={1} max={24}
            value={goals.emergency?.months ?? ""} onChange={(e) => update("emergency", "months", e.target.value)}
            className="max-w-[120px]" />
        </div>
      </GoalTile>

      <GoalTile title="Build generational wealth" icon="🌳" selected={!!goals.generational?.selected} onToggle={() => toggle("generational")} />

      <GoalTile title="Custom goal" icon="✏️" selected={!!goals.custom?.selected} onToggle={() => toggle("custom")}>
        <div className="grid md:grid-cols-2 gap-3">
          <div className="space-y-1 md:col-span-2">
            <Label className="text-xs text-gray-500">Describe your goal</Label>
            <Input placeholder="e.g. Start a business"
              value={goals.custom?.text ?? ""} onChange={(e) => update("custom", "text", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-gray-500">Target Amount ($)</Label>
            <Input type="number" placeholder="e.g. 50,000"
              value={goals.custom?.amount ?? ""} onChange={(e) => update("custom", "amount", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-gray-500">Target Year</Label>
            <Input type="number" placeholder="e.g. 2030"
              value={goals.custom?.year ?? ""} onChange={(e) => update("custom", "year", e.target.value)} />
          </div>
        </div>
      </GoalTile>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 4 — Risk Profile
// ─────────────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function StepRisk({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  const answers = data.riskAnswers ?? {};

  return (
    <div className="space-y-8">
      {RISK_QUESTIONS.map((q, idx) => (
        <div key={q.id} className="space-y-3">
          <p className="text-sm font-semibold text-[#1a3a6b]">
            {idx + 1}. {q.question}
          </p>
          <RadioGroup
            value={answers[q.id] ?? ""}
            onValueChange={(v) =>
              onChange({ ...data, riskAnswers: { ...answers, [q.id]: v } })
            }
            className="space-y-2"
          >
            {q.options.map((opt) => (
              <Label
                key={opt.value}
                className={cn(
                  "flex items-center gap-3 border rounded-lg px-4 py-3 cursor-pointer transition-colors",
                  answers[q.id] === opt.value
                    ? "border-[#1a3a6b] bg-[#1a3a6b]/5 text-[#1a3a6b]"
                    : "hover:border-[#1a3a6b]/40 text-gray-700"
                )}
              >
                <RadioGroupItem value={opt.value} />
                <span className="text-sm">{opt.label}</span>
              </Label>
            ))}
          </RadioGroup>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main — wizard shell
// ─────────────────────────────────────────────────────────────────────────────

export default function ClientOnboardingForm() {
  const router = useRouter();
  const [step, setStep]         = useState(0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [formData, setFormData] = useState<any>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLast = step === STEPS.length - 1;

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      // Sync user first
      await fetch("/api/auth/sync");

      // Build profile payload from form data
      const age = computeAge(formData.dob);
      const goals: { id: string; type: string; label: string; targetYear: number; targetAmount: number }[] = [];
      const g = formData.goals || {};
      if (g.retire?.selected) {
        goals.push({ id: "goal_retire", type: "retire", label: `Retire at ${g.retire.age || 65}`, targetYear: new Date().getFullYear() + ((Number(g.retire.age) || 65) - (age || 35)), targetAmount: 2000000 });
      }
      if (g.college?.selected) {
        goals.push({ id: "goal_college", type: "college", label: "College fund", targetYear: Number(g.college.year) || 2036, targetAmount: Number(g.college.amount) || 200000 });
      }
      if (g.home?.selected) {
        goals.push({ id: "goal_home", type: "home", label: "Buy a home", targetYear: Number(g.home.year) || 2030, targetAmount: Number(g.home.downPayment) || 100000 });
      }
      if (g.emergency?.selected) {
        goals.push({ id: "goal_emergency", type: "emergency", label: "Emergency buffer", targetYear: new Date().getFullYear() + 1, targetAmount: (Number(formData.expenses) || 4000) * (Number(g.emergency.months) || 6) });
      }
      if (g.custom?.selected && g.custom.text) {
        goals.push({ id: "goal_custom", type: "custom", label: g.custom.text, targetYear: Number(g.custom.year) || 2030, targetAmount: Number(g.custom.amount) || 50000 });
      }

      const payload = {
        profile: {
          name: formData.name || "",
          email: formData.email || "",
          phone: formData.phone || "",
          dob: formData.dob || "",
          age: age || 35,
          familyStatus: formData.familyStatus || "single",
          kidAges: (formData.kidAges || []).map(Number).filter(Boolean),
          state: formData.state || "",
          savings: Number(formData.savings) || 0,
          income: Number(formData.income) || 0,
          expenses: Number(formData.expenses) || 0,
          debt: {
            mortgage: formData.debt?.mortgage?.enabled ? { enabled: true, amount: Number(formData.debt.mortgage.amount) || 0, payment: Number(formData.debt.mortgage.payment) || 0 } : undefined,
            student: formData.debt?.student?.enabled ? { enabled: true, amount: Number(formData.debt.student.amount) || 0, payment: Number(formData.debt.student.payment) || 0 } : undefined,
            other: formData.debt?.other?.enabled ? { enabled: true, amount: Number(formData.debt.other.amount) || 0, payment: Number(formData.debt.other.payment) || 0 } : undefined,
          },
          goals,
          riskAnswers: formData.riskAnswers || {},
        },
      };

      const res = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Onboarding failed");
      }

      const result = await res.json();
      const userId = result.data?.userId;

      // Set client cookie so subsequent requests authenticate this user
      if (userId) {
        document.cookie = `ws_client_id=${userId};path=/;max-age=${60 * 60 * 24 * 30}`;
        document.cookie = `ws_dev_role=client;path=/;max-age=${60 * 60 * 24 * 30}`;
      }

      // Go to dashboard after onboarding
      router.push("/client/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const stepContent = [
    <StepPersonal  key={0} data={formData} onChange={setFormData} />,
    <StepFinancial key={1} data={formData} onChange={setFormData} />,
    <StepGoals     key={2} data={formData} onChange={setFormData} />,
    <StepRisk      key={3} data={formData} onChange={setFormData} />,
  ];

  return (
    <div className="bg-[#f8fafc] min-h-screen">
<div className="p-4 md:p-8 max-w-2xl mx-auto space-y-6 pb-16">

        {/* Page title */}
        <div>
          <h1 className="text-2xl font-semibold text-[#1a3a6b]">Client Onboarding</h1>
          <p className="text-sm text-gray-500 mt-1">
            Tell us about yourself so we can personalize your experience.
          </p>
        </div>

        {/* ── Progress stepper ── */}
        <div className="flex items-center">
          {STEPS.map((label, i) => (
            <React.Fragment key={label}>
              {/* Circle + label */}
              <div className="flex flex-col items-center gap-1.5 shrink-0">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all",
                    i < step
                      ? "bg-[#1a3a6b] text-white"
                      : i === step
                      ? "bg-[#1a3a6b] text-white ring-4 ring-[#1a3a6b]/20"
                      : "bg-gray-200 text-gray-400"
                  )}
                >
                  {i < step ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : i + 1}
                </div>
                <span
                  className={cn(
                    "text-[11px] font-medium hidden sm:block whitespace-nowrap",
                    i === step ? "text-[#1a3a6b]" : "text-gray-400"
                  )}
                >
                  {label}
                </span>
              </div>

              {/* Connector */}
              {i < STEPS.length - 1 && (
                <div className="flex-1 h-0.5 mx-2 rounded-full bg-gray-200 overflow-hidden mb-4 sm:mb-0">
                  <div
                    className="h-full bg-[#1a3a6b] transition-all duration-300"
                    style={{ width: i < step ? "100%" : "0%" }}
                  />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* ── Step card ── */}
        <Card>
          <CardContent className="p-6 md:p-8 space-y-6">
            <h2 className="text-lg font-semibold text-[#1a3a6b]">{STEPS[step]}</h2>
            {stepContent[step]}
          </CardContent>
        </Card>

        {/* ── Navigation ── */}
        <div className="flex items-center gap-3">
          {step > 0 && (
            <Button
              type="button"
              variant="outline"
              className="flex-1 border-[#1a3a6b]/30 text-[#1a3a6b] hover:bg-[#1a3a6b]/5"
              onClick={() => setStep((s) => s - 1)}
              disabled={submitting}
            >
              Back
            </Button>
          )}
          <Button
            type="button"
            className="flex-1 bg-[#1a3a6b] hover:bg-[#16325c]"
            disabled={submitting}
            onClick={() => {
              if (!isLast) setStep((s) => s + 1);
              else handleSubmit();
            }}
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Setting up your profile…
              </>
            ) : isLast ? (
              "Complete Setup"
            ) : (
              "Continue"
            )}
          </Button>
        </div>

        {error && (
          <p className="text-center text-sm text-red-500">{error}</p>
        )}

        <p className="text-center text-xs text-gray-400">
          Step {step + 1} of {STEPS.length}
        </p>
      </div>
    </div>
  );
}