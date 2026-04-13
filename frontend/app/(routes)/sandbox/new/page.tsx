"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, Loader2, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Goal type for the wizard ─────────────────────────────────────────────────

interface WizardGoal {
  id: string;
  type: string;
  label: string;
  targetYear: number;
  targetAmount: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STEPS = ["Portfolio Type", "Starting Values", "Goals", "Name It"];

const PORTFOLIO_TYPES = [
  {
    id: "retirement",
    icon: "🏖️",
    name: "Retirement Portfolio",
    description: "Long-term growth toward a comfortable retirement. Optimized for tax-advantaged compounding.",
    defaultRisk: 2,
    defaultHorizon: 25,
  },
  {
    id: "equity",
    icon: "📈",
    name: "Equity Growth Portfolio",
    description: "Maximise wealth through diversified equities. Higher volatility, higher long-term upside.",
    defaultRisk: 3,
    defaultHorizon: 15,
  },
  {
    id: "realestate",
    icon: "🏡",
    name: "Real Estate Portfolio",
    description: "Model property purchases, rental income, and mortgage scenarios alongside your investments.",
    defaultRisk: 2,
    defaultHorizon: 20,
  },
  {
    id: "college",
    icon: "🎓",
    name: "College Savings Portfolio",
    description: "Target-date saving for education costs. Tracks tuition inflation and 529 contribution limits.",
    defaultRisk: 1,
    defaultHorizon: 10,
  },
  {
    id: "emergency",
    icon: "🛡️",
    name: "Emergency / Liquidity Portfolio",
    description: "Low-risk, highly liquid buffer fund. Designed to cover 3–12 months of expenses.",
    defaultRisk: 0,
    defaultHorizon: 3,
  },
] as const;

type PortfolioId = (typeof PORTFOLIO_TYPES)[number]["id"];

// ─── Step 1 — Portfolio type selector ────────────────────────────────────────

function StepType({
  selected, onSelect,
}: { selected: PortfolioId | null; onSelect: (id: PortfolioId) => void }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {PORTFOLIO_TYPES.map((pt) => (
        <button
          key={pt.id}
          type="button"
          onClick={() => onSelect(pt.id)}
          className={cn(
            "text-left border rounded-xl p-4 transition-all space-y-1.5 hover:border-[#1a3a6b]/50",
            selected === pt.id
              ? "border-[#1a3a6b] bg-[#1a3a6b]/5 ring-1 ring-[#1a3a6b]/20"
              : "border-gray-200 bg-white"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xl">{pt.icon}</span>
            {selected === pt.id && (
              <span className="w-5 h-5 rounded-full bg-[#1a3a6b] flex items-center justify-center">
                <Check className="w-3 h-3 text-white" strokeWidth={3} />
              </span>
            )}
          </div>
          <p className="text-sm font-semibold text-gray-800">{pt.name}</p>
          <p className="text-xs text-gray-500 leading-snug">{pt.description}</p>
        </button>
      ))}
    </div>
  );
}

// ─── Step 2 — Configure starting values (portfolio-specific inputs) ──────────

// Slider defs per portfolio type (mirror of sandbox page)
interface InputDef {
  key: string; label: string; min: number; max: number; step: number;
  fmt: (v: number) => string; defaultVal: number;
}

const RETIREMENT_INPUTS: InputDef[] = [
  { key: "currentSavings",       label: "Current Savings ($)",           min: 0, max: 2_000_000, step: 5000,  fmt: v => `$${(v/1000).toFixed(0)}K`, defaultVal: 50000 },
  { key: "monthlyContribution",  label: "Monthly Contribution ($)",      min: 0, max: 15_000,    step: 100,   fmt: v => `$${v.toLocaleString()}`,   defaultVal: 1000 },
  { key: "retirementAge",        label: "Retirement Age",                min: 50, max: 75,        step: 1,     fmt: v => `${v}`,                     defaultVal: 65 },
  { key: "lifeExpectancy",       label: "Life Expectancy",               min: 70, max: 100,       step: 1,     fmt: v => `${v}`,                     defaultVal: 90 },
  { key: "expectedReturnMean",   label: "Expected Return (%)",           min: 2, max: 15,         step: 0.5,   fmt: v => `${v}%`,                    defaultVal: 7 },
  { key: "expectedReturnStd",    label: "Volatility (%)",                min: 5, max: 25,         step: 1,     fmt: v => `${v}%`,                    defaultVal: 15 },
  { key: "inflation",            label: "Inflation Rate (%)",            min: 1, max: 6,          step: 0.5,   fmt: v => `${v}%`,                    defaultVal: 3 },
  { key: "employerMatchPct",     label: "Employer Match (%)",            min: 0, max: 100,        step: 1,     fmt: v => `${v}%`,                    defaultVal: 0 },
  { key: "expectedMonthlyIncome",label: "Monthly Income at Retirement ($)", min: 2000, max: 20000, step: 500,  fmt: v => `$${v.toLocaleString()}`,   defaultVal: 5000 },
  { key: "socialSecurityAge",    label: "Social Security Start Age",     min: 62, max: 70,        step: 1,     fmt: v => `${v}`,                     defaultVal: 67 },
  { key: "socialSecurityMonthly",label: "SS Monthly Amount ($)",         min: 0, max: 4000,       step: 100,   fmt: v => `$${v.toLocaleString()}`,   defaultVal: 2000 },
];

const EQUITY_INPUTS: InputDef[] = [
  { key: "lumpSum",              label: "Initial Lump Sum ($)",          min: 0, max: 1_000_000, step: 5000,  fmt: v => `$${(v/1000).toFixed(0)}K`, defaultVal: 50000 },
  { key: "monthlyDca",           label: "Monthly DCA ($)",               min: 0, max: 10_000,    step: 100,   fmt: v => `$${v.toLocaleString()}`,   defaultVal: 1000 },
  { key: "timeHorizonYears",     label: "Time Horizon (years)",          min: 1, max: 40,        step: 1,     fmt: v => `${v} yr`,                  defaultVal: 20 },
  { key: "expectedReturnMean",   label: "Expected Return (%)",           min: 2, max: 15,        step: 0.5,   fmt: v => `${v}%`,                    defaultVal: 9 },
  { key: "volatility",           label: "Volatility (%)",                min: 5, max: 25,        step: 1,     fmt: v => `${v}%`,                    defaultVal: 15 },
  { key: "expenseRatio",         label: "Expense Ratio (%)",             min: 0.03, max: 1.5,    step: 0.01,  fmt: v => `${v.toFixed(2)}%`,         defaultVal: 0.20 },
];

const REALESTATE_INPUTS: InputDef[] = [
  { key: "purchasePrice",        label: "Purchase Price ($)",            min: 50000, max: 2_000_000, step: 10000, fmt: v => `$${(v/1000).toFixed(0)}K`, defaultVal: 400000 },
  { key: "downPaymentPct",       label: "Down Payment (%)",              min: 3.5, max: 50,      step: 0.5,   fmt: v => `${v}%`,                    defaultVal: 20 },
  { key: "interestRate",         label: "Interest Rate (%)",             min: 3, max: 10,        step: 0.125, fmt: v => `${v.toFixed(3)}%`,         defaultVal: 6.5 },
  { key: "monthlyRent",          label: "Monthly Rent ($)",              min: 0, max: 10_000,    step: 100,   fmt: v => `$${v.toLocaleString()}`,   defaultVal: 2400 },
  { key: "annualAppreciation",   label: "Annual Appreciation (%)",       min: 0, max: 10,        step: 0.5,   fmt: v => `${v}%`,                    defaultVal: 4 },
  { key: "vacancyRate",          label: "Vacancy Rate (%)",              min: 0, max: 20,        step: 1,     fmt: v => `${v}%`,                    defaultVal: 8 },
  { key: "annualExpenses",       label: "Annual Expenses ($)",           min: 0, max: 20000,     step: 500,   fmt: v => `$${v.toLocaleString()}`,   defaultVal: 6000 },
  { key: "holdPeriodYears",      label: "Hold Period (years)",           min: 1, max: 30,        step: 1,     fmt: v => `${v} yr`,                  defaultVal: 10 },
];

const COLLEGE_INPUTS: InputDef[] = [
  { key: "childAge",             label: "Child's Current Age",           min: 0, max: 18,        step: 1,     fmt: v => `${v}`,                     defaultVal: 5 },
  { key: "collegeStartAge",      label: "College Start Age",             min: 16, max: 20,       step: 1,     fmt: v => `${v}`,                     defaultVal: 18 },
  { key: "targetCost",           label: "Target College Cost ($)",       min: 20000, max: 500000, step: 5000, fmt: v => `$${(v/1000).toFixed(0)}K`, defaultVal: 120000 },
  { key: "currentBalance",       label: "Current 529 Balance ($)",       min: 0, max: 200000,    step: 1000,  fmt: v => `$${(v/1000).toFixed(0)}K`, defaultVal: 0 },
  { key: "monthlyContribution",  label: "Monthly Contribution ($)",      min: 0, max: 5000,      step: 50,    fmt: v => `$${v.toLocaleString()}`,   defaultVal: 500 },
  { key: "expectedReturnMean",   label: "Expected Return (%)",           min: 2, max: 10,        step: 0.5,   fmt: v => `${v}%`,                    defaultVal: 7 },
  { key: "volatility",           label: "Volatility (%)",                min: 4, max: 15,        step: 1,     fmt: v => `${v}%`,                    defaultVal: 12 },
];

const EMERGENCY_INPUTS: InputDef[] = [
  { key: "monthlyExpenses",      label: "Monthly Expenses ($)",          min: 1000, max: 20000,  step: 500,   fmt: v => `$${v.toLocaleString()}`,   defaultVal: 4000 },
  { key: "targetMonths",         label: "Target Buffer (months)",        min: 1, max: 24,        step: 1,     fmt: v => `${v} mo`,                  defaultVal: 6 },
  { key: "currentLiquid",        label: "Current Savings ($)",           min: 0, max: 100000,    step: 1000,  fmt: v => `$${(v/1000).toFixed(0)}K`, defaultVal: 5000 },
  { key: "monthlyAddition",      label: "Monthly Addition ($)",          min: 0, max: 5000,      step: 50,    fmt: v => `$${v.toLocaleString()}`,   defaultVal: 500 },
  { key: "hyRate",               label: "HYSA Yield (%)",                min: 0, max: 8,         step: 0.25,  fmt: v => `${v}%`,                    defaultVal: 4.5 },
  { key: "inflation",            label: "Inflation Rate (%)",            min: 1, max: 6,         step: 0.5,   fmt: v => `${v}%`,                    defaultVal: 3 },
];

const INPUTS_BY_TYPE: Record<string, InputDef[]> = {
  retirement: RETIREMENT_INPUTS,
  equity: EQUITY_INPUTS,
  realestate: REALESTATE_INPUTS,
  college: COLLEGE_INPUTS,
  emergency: EMERGENCY_INPUTS,
};

function StepConfigure({
  sliderValues, onChange, portfolioType,
}: { sliderValues: Record<string, number>; onChange: (vals: Record<string, number>) => void; portfolioType: PortfolioId | null }) {
  const inputs = INPUTS_BY_TYPE[portfolioType || "retirement"] || RETIREMENT_INPUTS;

  return (
    <div className="space-y-5">
      <p className="text-xs text-gray-400 bg-gray-50 rounded-lg p-3 border border-gray-100">
        💡 Set your starting values below. These will be the initial parameters for your simulation. You can adjust them anytime in the sandbox.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {inputs.map(({ key, label, min, max, step }) => (
          <div key={key} className="space-y-1.5">
            <Label className="text-sm font-medium text-[#1a3a6b]">{label}</Label>
            <Input
              type="number"
              min={min}
              max={max}
              step={step}
              value={sliderValues[key] ?? ""}
              placeholder={`${min} — ${max}`}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                if (!isNaN(val)) {
                  onChange({ ...sliderValues, [key]: Math.min(max, Math.max(min, val)) });
                } else if (e.target.value === "") {
                  const newVals = { ...sliderValues };
                  delete newVals[key];
                  onChange(newVals);
                }
              }}
              className="h-9"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Step 3 — Goals ───────────────────────────────────────────────────────────

const GOAL_ICONS: Record<string, string> = {
  retire: "🏖️", college: "🎓", home: "🏡", emergency: "🛡️",
  generational: "🌳", custom: "✏️", equity: "📈",
};

function StepGoals({
  goals, onChange,
}: { goals: WizardGoal[]; onChange: (g: WizardGoal[]) => void }) {
  const [showAdd, setShowAdd] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newYear, setNewYear] = useState("");

  const removeGoal = (id: string) => onChange(goals.filter((g) => g.id !== id));

  const addGoal = () => {
    if (!newLabel.trim()) return;
    onChange([
      ...goals,
      {
        id: `goal_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        type: "custom",
        label: newLabel.trim(),
        targetYear: parseInt(newYear) || new Date().getFullYear() + 5,
        targetAmount: parseInt(newAmount) || 50000,
      },
    ]);
    setNewLabel("");
    setNewAmount("");
    setNewYear("");
    setShowAdd(false);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        We&apos;ve pre-filled goals from your profile. Add, edit, or remove any before creating.
      </p>

      {goals.length === 0 && !showAdd && (
        <div className="text-center py-8 text-gray-400 text-sm border border-dashed rounded-xl">
          No goals yet. Add one below to track in this sandbox.
        </div>
      )}

      {/* Goal cards */}
      <div className="space-y-2">
        {goals.map((g) => (
          <div
            key={g.id}
            className="flex items-center gap-3 border border-gray-200 rounded-xl p-3 bg-white group hover:border-[#1a3a6b]/30 transition-colors"
          >
            <span className="text-xl shrink-0">{GOAL_ICONS[g.type] || "🎯"}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{g.label}</p>
              <p className="text-xs text-gray-400">
                ${g.targetAmount.toLocaleString()} · Target {g.targetYear}
              </p>
            </div>
            <button
              type="button"
              onClick={() => removeGoal(g.id)}
              className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
              title="Remove goal"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Add goal form */}
      {showAdd ? (
        <div className="border border-[#1a3a6b]/20 rounded-xl p-4 bg-[#1a3a6b]/[0.02] space-y-3">
          <p className="text-sm font-medium text-[#1a3a6b]">New Goal</p>
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-500">Goal Description</Label>
            <Input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="e.g. Start a business"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-500">Target Amount ($)</Label>
              <Input
                type="number"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                placeholder="e.g. 50,000"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-500">Target Year</Label>
              <Input
                type="number"
                value={newYear}
                onChange={(e) => setNewYear(e.target.value)}
                placeholder={`e.g. ${new Date().getFullYear() + 5}`}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              className="bg-[#1a3a6b] hover:bg-[#16325c]"
              disabled={!newLabel.trim()}
              onClick={addGoal}
            >
              Add
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => { setShowAdd(false); setNewLabel(""); setNewAmount(""); setNewYear(""); }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="w-full border-dashed border-[#1a3a6b]/30 text-[#1a3a6b] hover:bg-[#1a3a6b]/5"
          onClick={() => setShowAdd(true)}
        >
          <Plus className="w-4 h-4 mr-2" /> Add a Goal
        </Button>
      )}
    </div>
  );
}

// ─── Step 4 — Name it ─────────────────────────────────────────────────────────

function StepName({
  name, onChange,
}: { name: string; onChange: (n: string) => void }) {
  return (
    <div className="max-w-md space-y-4">
      <p className="text-sm text-gray-500">
        Give your sandbox a memorable name. You can always rename it later.
      </p>
      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-[#1a3a6b]">Sandbox Name</Label>
        <Input
          value={name}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g. Retirement Plan — April 2026"
          className="text-base"
        />
      </div>
      <p className="text-xs text-gray-400">
        Auto-generated from your portfolio type and today&apos;s date.
        Feel free to customise it.
      </p>
    </div>
  );
}

// ─── Wizard shell ─────────────────────────────────────────────────────────────

export default function NewSandboxPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [selectedType, setSelectedType] = useState<PortfolioId | null>(null);

  const pt = PORTFOLIO_TYPES.find((p) => p.id === selectedType);

  // Portfolio-specific slider values (keyed by slider key)
  const [sliderValues, setSliderValues] = useState<Record<string, number>>({});

  const [goals, setGoals] = useState<WizardGoal[]>([]);
  const [profileGoalsLoaded, setProfileGoalsLoaded] = useState(false);

  // Fetch user profile goals on mount
  const fetchProfileGoals = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/sync");
      if (!res.ok) return;
      const { user } = await res.json();
      const profileGoals: WizardGoal[] = (user?.profile?.goals || []).map((g: any) => ({
        id: g.id || `goal_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        type: g.type || "custom",
        label: g.label || g.type || "Goal",
        targetYear: g.targetYear || new Date().getFullYear() + 5,
        targetAmount: g.targetAmount || 50000,
      }));
      setGoals(profileGoals);
      setProfileGoalsLoaded(true);
    } catch {
      setProfileGoalsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!profileGoalsLoaded) fetchProfileGoals();
  }, [profileGoalsLoaded, fetchProfileGoals]);

  const monthStr = new Date().toLocaleString("en-US", { month: "long", year: "numeric" });
  const [sandboxName, setSandboxName] = useState(
    `New Sandbox — ${monthStr}`
  );

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // When a type is selected, update defaults + auto-name
  function handleTypeSelect(id: PortfolioId) {
    const p = PORTFOLIO_TYPES.find((x) => x.id === id)!;
    setSelectedType(id);
    setSandboxName(`${p.name} — ${monthStr}`);
    // Pre-fill portfolio-specific defaults
    const inputs = INPUTS_BY_TYPE[id] || RETIREMENT_INPUTS;
    const defaults: Record<string, number> = {};
    for (const inp of inputs) {
      defaults[inp.key] = inp.defaultVal;
    }
    setSliderValues(defaults);
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      // Sync auth first
      await fetch("/api/auth/sync");

      const res = await fetch("/api/sandboxes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: sandboxName.trim(),
          portfolioType: selectedType,
          sliderState: { ...sliderValues },
          goals: goals.map((g) => ({
            id: g.id,
            type: g.type,
            label: g.label,
            targetYear: g.targetYear,
            targetAmount: g.targetAmount,
          })),
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to create sandbox");
      }

      const { data } = await res.json();
      const newId = data?.sandbox?.id || data?.id;
      router.push(`/sandbox/${newId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  }

  const canAdvance =
    step === 0 ? !!selectedType :
    step === 1 ? true :
    step === 2 ? true :
    sandboxName.trim().length > 0;

  const isLast = step === STEPS.length - 1;

  return (
    <div className="bg-[#f8fafc] min-h-screen">
      <div className="max-w-3xl mx-auto px-4 md:px-8 py-8 pb-16 space-y-6">

        {/* Page heading */}
        <div>
          <h1 className="text-2xl font-semibold text-[#1a3a6b]">New Sandbox</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Build a financial scenario from scratch in three steps.
          </p>
        </div>

        {/* ── Stepper ── */}
        <div className="flex items-center">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center flex-1 last:flex-none">
              {/* Circle */}
              <div className="flex flex-col items-center gap-1.5 shrink-0">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all",
                  i < step ? "bg-[#1a3a6b] text-white"
                  : i === step ? "bg-[#1a3a6b] text-white ring-4 ring-[#1a3a6b]/20"
                  : "bg-gray-200 text-gray-400"
                )}>
                  {i < step ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : i + 1}
                </div>
                <span className={cn(
                  "text-[11px] font-medium hidden sm:block whitespace-nowrap",
                  i === step ? "text-[#1a3a6b]" : "text-gray-400"
                )}>
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
            </div>
          ))}
        </div>

        {/* ── Step card ── */}
        <Card>
          <CardContent className="p-6 md:p-8 space-y-6">
            <h2 className="text-lg font-semibold text-[#1a3a6b]">{STEPS[step]}</h2>

            {step === 0 && (
              <StepType selected={selectedType} onSelect={handleTypeSelect} />
            )}
            {step === 1 && (
              <StepConfigure
                sliderValues={sliderValues}
                onChange={setSliderValues}
                portfolioType={selectedType}
              />
            )}
            {step === 2 && (
              <StepGoals goals={goals} onChange={setGoals} />
            )}
            {step === 3 && (
              <StepName name={sandboxName} onChange={setSandboxName} />
            )}
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
            >
              Back
            </Button>
          )}
          <Button
            type="button"
            disabled={!canAdvance || submitting}
            className="flex-1 bg-[#1a3a6b] hover:bg-[#16325c] disabled:opacity-40"
            onClick={() => {
              if (!isLast) setStep((s) => s + 1);
              else handleSubmit();
            }}
          >
            {submitting ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating…</>
            ) : isLast ? "Create Sandbox" : "Continue"}
          </Button>
        </div>

        {error && <p className="text-center text-sm text-red-500">{error}</p>}

        <p className="text-center text-xs text-gray-400">
          Step {step + 1} of {STEPS.length}
        </p>
      </div>
    </div>
  );
}
