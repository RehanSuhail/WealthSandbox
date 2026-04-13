"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Breadcrumb } from "@/components/breadcrumb";
import { SandboxList } from "@/components/sandbox-list";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  Loader2,
  FlaskConical,
  Lightbulb,
  AlertTriangle,
  TrendingUp,
  Clock,
  UserX,
  StickyNote,
  Send,
  Mail,
  MapPin,
  Calendar,
  DollarSign,
  Shield,
  Heart,
  Target,
  User,
  Users,
  Briefcase,
  Baby,
  GraduationCap,
} from "lucide-react";

interface ProfileGoal {
  id: string;
  type: string;
  label: string;
  targetYear: number;
  targetAmount: number;
}

interface ClientProfile {
  name?: string;
  dob?: string;
  age?: number;
  familyStatus?: string;
  kidAges?: number[];
  state?: string;
  savings?: number;
  income?: number;
  expenses?: number;
  debt?: Record<string, { enabled?: boolean; amount?: number; payment?: number }>;
  goals?: ProfileGoal[];
  riskScore?: string;
  suggestedPortfolioType?: string;
}

interface ClientData {
  name: string;
  email: string;
  aum: number;
  profile: ClientProfile | null;
}

interface SharedSandbox {
  id: string;
  name: string;
}

interface Insight {
  id: string;
  title: string;
  body: string;
  priority: string;
  category: string;
  createdAt: string;
}

interface Note {
  id: string;
  advisorId: string;
  advisorName: string;
  text: string;
  createdAt: string;
}

interface ClientProfilePageProps {
  params: Promise<{ id: string }>;
}

export default function ClientProfilePage({ params }: ClientProfilePageProps) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [client, setClient] = useState<ClientData | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const initialTab = searchParams.get("tab") || "profile";
  const [tab, setTab] = useState(initialTab);

  // Notes state
  const [sharedSandboxes, setSharedSandboxes] = useState<SharedSandbox[]>([]);
  const [selectedSandboxId, setSelectedSandboxId] = useState<string>("");
  const [noteText, setNoteText] = useState("");
  const [sendingNote, setSendingNote] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        // Fetch client info from per-client API (includes full profile)
        const cRes = await fetch(`/api/advisor/clients/${id}`);
        if (cRes.ok) {
          const { data } = await cRes.json();
          const cl = data?.client;
          if (cl) {
            setClient({
              name:
                `${cl.firstName || ""} ${cl.lastName || ""}`.trim() ||
                "Client",
              email: cl.email || "",
              aum: Number(cl.profile?.savings || 0),
              profile: cl.profile || null,
            });
          }
        }
        // Fetch insights for this client — only latest per shared sandbox
        const sRes = await fetch(`/api/sandboxes?userId=${id}`);
        if (sRes.ok) {
          const { data: sbData } = await sRes.json();
          const shared = (sbData || []).filter(
            (s: Record<string, unknown>) => s.sharedWithAdvisor
          );
          setSharedSandboxes(
            shared.map((s: Record<string, unknown>) => ({
              id: s.id as string,
              name: s.name as string,
            }))
          );

          // Fetch insights per shared sandbox and keep only the latest batch
          const allLatest: Insight[] = [];
          for (const sb of shared) {
            try {
              const iRes2 = await fetch(`/api/sandboxes/${sb.id}/insights?scope=client`);
              if (iRes2.ok) {
                const { data: sbInsights } = await iRes2.json();
                if (sbInsights?.length) {
                  // Sort by createdAt desc, take the latest 5 per sandbox
                  const sorted = [...sbInsights].sort((a: Insight, b: Insight) =>
                    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                  );
                  allLatest.push(...sorted.slice(0, 5));
                }
              }
            } catch {}
          }
          // Sort combined list by date desc
          allLatest.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setInsights(allLatest);
        }
      } catch {
        /* ignore */
      }
      setLoading(false);
    })();
  }, [id]);

  // Load notes when sandbox is selected
  useEffect(() => {
    if (!selectedSandboxId) {
      setNotes([]);
      return;
    }
    (async () => {
      setLoadingNotes(true);
      try {
        const res = await fetch(
          `/api/sandboxes/${selectedSandboxId}/notes`
        );
        if (res.ok) {
          const { data } = await res.json();
          setNotes(data || []);
        }
      } catch {}
      setLoadingNotes(false);
    })();
  }, [selectedSandboxId]);

  const handleSendNote = async () => {
    if (!noteText.trim() || !selectedSandboxId) return;
    setSendingNote(true);
    try {
      const res = await fetch(
        `/api/sandboxes/${selectedSandboxId}/notes`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: noteText.trim() }),
        }
      );
      if (res.ok) {
        const { data } = await res.json();
        setNotes((prev) => [...prev, data]);
        setNoteText("");
      }
    } catch {}
    setSendingNote(false);
  };

  const handleDisconnect = async () => {
    if (!confirm("Disconnect from this client? This cannot be undone.")) return;
    setDisconnecting(true);
    try {
      await fetch("/api/connect/accept", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: id }),
      });
      router.push("/advisor/clients");
    } catch {}
    setDisconnecting(false);
  };

  const priorityIcon = (p: string) => {
    if (p === "high")
      return <AlertTriangle className="w-3 h-3 text-red-500" />;
    if (p === "medium") return <Clock className="w-3 h-3 text-amber-500" />;
    return <Lightbulb className="w-3 h-3 text-gray-400" />;
  };

  const priorityColor = (p: string) => {
    if (p === "high") return "border-red-200 text-red-700 bg-red-50";
    if (p === "medium") return "border-amber-200 text-amber-700 bg-amber-50";
    return "border-gray-200 text-gray-500 bg-gray-50";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f8fafc]">
        <Loader2 className="w-8 h-8 animate-spin text-[#1a3a6b]" />
      </div>
    );
  }

  const name = client?.name || `Client ${id}`;
  const profile = client?.profile ?? null;

  return (
    <div className="bg-[#f8fafc] min-h-screen">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-6">
        <Breadcrumb
          items={[
            { label: "Dashboard", href: "/advisor/dashboard" },
            { label: "Clients", href: "/advisor/clients" },
            { label: name },
          ]}
        />

        {/* Client header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-[#1a3a6b] text-white flex items-center justify-center text-lg font-semibold shrink-0">
              {name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-[#1a3a6b]">{name}</h1>
              {client?.email && (
                <p className="text-sm text-gray-400 mt-0.5">{client.email}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {client && client.aum > 0 && (
              <div className="text-center bg-white border border-gray-200 rounded-xl px-4 py-2 shadow-sm">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">
                  AUM
                </p>
                <p className="text-base font-bold text-gray-900">
                  ${(client.aum / 1_000).toFixed(0)}K
                </p>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              className="text-red-600 border-red-200 hover:bg-red-50 gap-1"
              onClick={handleDisconnect}
              disabled={disconnecting}
            >
              {disconnecting ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <UserX className="w-3.5 h-3.5" />
              )}
              Disconnect
            </Button>
          </div>
        </div>

        <Separator />

        {/* Tabs */}
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="bg-white border">
            <TabsTrigger value="profile" className="gap-1.5">
              <User className="w-3.5 h-3.5" /> Profile
            </TabsTrigger>
            <TabsTrigger value="sandboxes" className="gap-1.5">
              <FlaskConical className="w-3.5 h-3.5" /> Sandboxes
            </TabsTrigger>
            <TabsTrigger value="insights" className="gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" /> Insights
              {insights.length > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-1 text-[10px] h-4 px-1.5"
                >
                  {insights.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="notes" className="gap-1.5">
              <StickyNote className="w-3.5 h-3.5" /> Notes
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="mt-6 space-y-6">
            {profile ? (
              <>
                {/* Personal Info */}
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Personal Information</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {client?.email && (
                      <ProfileField icon={<Mail className="w-4 h-4 text-[#1a3a6b]" />} label="Email" value={client.email} />
                    )}
                    {profile.age != null && (
                      <ProfileField icon={<Calendar className="w-4 h-4 text-[#1a3a6b]" />} label="Age" value={`${profile.age}`} />
                    )}
                    {profile.dob && (
                      <ProfileField icon={<Calendar className="w-4 h-4 text-[#1a3a6b]" />} label="Date of Birth" value={new Date(profile.dob).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} />
                    )}
                    {profile.state && (
                      <ProfileField icon={<MapPin className="w-4 h-4 text-[#1a3a6b]" />} label="State" value={profile.state} />
                    )}
                    {profile.familyStatus && (
                      <ProfileField icon={<Heart className="w-4 h-4 text-[#1a3a6b]" />} label="Family Status" value={profile.familyStatus === "married_kids" ? "Married with Kids" : profile.familyStatus === "married" ? "Married" : "Single"} />
                    )}
                    {profile.kidAges && profile.kidAges.length > 0 && (
                      <ProfileField icon={<Baby className="w-4 h-4 text-[#1a3a6b]" />} label="Dependents" value={`${profile.kidAges.length} (ages ${profile.kidAges.join(", ")})`} />
                    )}
                  </div>
                </div>

                {/* Financial Snapshot */}
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Financial Snapshot</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {profile.income != null && profile.income > 0 && (
                      <ProfileField icon={<Briefcase className="w-4 h-4 text-[#1a3a6b]" />} label="Annual Income" value={`$${(profile.income * 12).toLocaleString()}`} />
                    )}
                    {profile.savings != null && profile.savings > 0 && (
                      <ProfileField icon={<DollarSign className="w-4 h-4 text-[#1a3a6b]" />} label="Savings" value={`$${profile.savings.toLocaleString()}`} />
                    )}
                    {profile.expenses != null && profile.expenses > 0 && (
                      <ProfileField icon={<DollarSign className="w-4 h-4 text-[#1a3a6b]" />} label="Monthly Expenses" value={`$${profile.expenses.toLocaleString()}`} />
                    )}
                    {profile.debt && Object.values(profile.debt).some(d => d?.enabled && (d.amount || 0) > 0) && (
                      <ProfileField icon={<DollarSign className="w-4 h-4 text-[#1a3a6b]" />} label="Total Debt" value={`$${Object.values(profile.debt).reduce((sum, d) => sum + (d?.enabled ? (d?.amount || 0) : 0), 0).toLocaleString()}`} />
                    )}
                  </div>
                </div>

                {/* Risk & Strategy */}
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Risk &amp; Strategy</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {profile.riskScore && (
                      <ProfileField icon={<Shield className="w-4 h-4 text-[#1a3a6b]" />} label="Risk Tolerance" value={profile.riskScore.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())} />
                    )}
                    {profile.suggestedPortfolioType && (
                      <ProfileField icon={<Target className="w-4 h-4 text-[#1a3a6b]" />} label="Suggested Portfolio" value={profile.suggestedPortfolioType.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())} />
                    )}
                  </div>
                </div>

                {/* Goals */}
                {profile.goals && profile.goals.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Financial Goals</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {profile.goals.map((g) => (
                        <Card key={g.id}>
                          <CardContent className="flex items-center gap-3 py-3 px-4">
                            <GraduationCap className="w-4 h-4 text-[#1a3a6b]" />
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] text-gray-400 uppercase tracking-wider">{g.type}</p>
                              <p className="text-sm font-medium text-gray-800 truncate">{g.label}</p>
                              <p className="text-xs text-gray-400">${g.targetAmount.toLocaleString()} · Target {g.targetYear}</p>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <User className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">
                    No profile data available yet. The client hasn&apos;t completed onboarding.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Sandboxes Tab */}
          <TabsContent value="sandboxes" className="mt-6">
            <SandboxList mode="advisor" clientId={id} clientName={name} />
          </TabsContent>

          {/* Insights Tab */}
          <TabsContent value="insights" className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-500">
                Insights for <strong>{name}</strong>
              </p>
              <Badge variant="outline" className="text-[10px]">
                {insights.length} insight{insights.length !== 1 ? "s" : ""}
              </Badge>
            </div>
            {insights.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <Lightbulb className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">
                    No insights generated yet for this client.
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Insights appear after sandbox simulations are run.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {insights.map((ins) => (
                  <Card key={ins.id}>
                    <CardContent className="px-5 py-4">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">{priorityIcon(ins.priority)}</div>
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px] gap-1",
                                priorityColor(ins.priority)
                              )}
                            >
                              {ins.priority}
                            </Badge>
                            <Badge
                              variant="outline"
                              className="text-[10px] text-gray-500"
                            >
                              {ins.category}
                            </Badge>
                            <span className="text-[10px] text-gray-400 ml-auto">
                              {new Date(ins.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700">
                            {ins.body || ins.title}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Notes Tab */}
          <TabsContent value="notes" className="mt-6 space-y-4">
            {/* Sandbox selector */}
            <Card>
              <CardContent className="py-4 space-y-3">
                <label className="text-sm font-medium text-gray-700">
                  Select a shared sandbox to view / add notes:
                </label>
                {sharedSandboxes.length === 0 ? (
                  <p className="text-xs text-gray-400">
                    No shared sandboxes yet. The client must share a sandbox
                    first.
                  </p>
                ) : (
                  <Select
                    value={selectedSandboxId}
                    onValueChange={setSelectedSandboxId}
                  >
                    <SelectTrigger className="w-full max-w-md">
                      <SelectValue placeholder="Choose sandbox…" />
                    </SelectTrigger>
                    <SelectContent>
                      {sharedSandboxes.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </CardContent>
            </Card>

            {selectedSandboxId && (
              <>
                {/* Write a note */}
                <Card>
                  <CardContent className="py-4 space-y-3">
                    <label className="text-sm font-medium text-gray-700">
                      Write a note
                    </label>
                    <Textarea
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      placeholder="Type your note for the client…"
                      rows={3}
                      className="resize-none"
                    />
                    <Button
                      size="sm"
                      className="bg-[#1a3a6b] hover:bg-[#16325c] gap-1"
                      onClick={handleSendNote}
                      disabled={sendingNote || !noteText.trim()}
                    >
                      {sendingNote ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Send className="w-3 h-3" />
                      )}
                      Send Note
                    </Button>
                  </CardContent>
                </Card>

                {/* Notes history */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">
                    Note History
                  </h3>
                  {loadingNotes ? (
                    <div className="flex justify-center py-6">
                      <Loader2 className="w-5 h-5 animate-spin text-[#1a3a6b]" />
                    </div>
                  ) : notes.length === 0 ? (
                    <Card>
                      <CardContent className="py-6 text-center">
                        <StickyNote className="w-6 h-6 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-400">
                          No notes yet for this sandbox.
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-2">
                      {notes.map((n) => (
                        <Card key={n.id}>
                          <CardContent className="px-4 py-3">
                            <div className="flex items-start justify-between gap-3">
                              <p className="text-sm text-gray-700 flex-1">
                                {n.text}
                              </p>
                              <span className="text-[10px] text-gray-400 shrink-0">
                                {new Date(n.createdAt).toLocaleDateString()}{" "}
                                {new Date(n.createdAt).toLocaleTimeString(
                                  [],
                                  { hour: "2-digit", minute: "2-digit" }
                                )}
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

/* Helper component for profile fields */
function ProfileField({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 py-3 px-4">
        {icon}
        <div>
          <p className="text-[10px] text-gray-400 uppercase tracking-wider">
            {label}
          </p>
          <p className="text-sm font-medium text-gray-800">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
