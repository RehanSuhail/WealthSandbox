"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles, Users, Briefcase, ArrowRight, Loader2, Plus, LogIn, ChevronLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ExistingClient {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  onboardingComplete: boolean;
}

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [view, setView] = useState<"main" | "existing">("main");
  const [existingClients, setExistingClients] = useState<ExistingClient[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);

  const loginAsAdvisor = async () => {
    setLoading("advisor");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "advisor" }),
      });
      if (!res.ok) throw new Error("Login failed");
      document.cookie = `ws_dev_role=advisor;path=/;max-age=${60 * 60 * 24 * 30}`;
      document.cookie = `ws_client_id=;path=/;max-age=0`;
      router.push("/advisor/dashboard");
    } catch {
      setLoading(null);
    }
  };

  const loginAsClient = async (clientId: string) => {
    setLoading(clientId);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "client", clientId }),
      });
      if (!res.ok) throw new Error("Login failed");
      document.cookie = `ws_dev_role=client;path=/;max-age=${60 * 60 * 24 * 30}`;
      document.cookie = `ws_client_id=${clientId};path=/;max-age=${60 * 60 * 24 * 30}`;
      router.push("/client/dashboard");
    } catch {
      setLoading(null);
    }
  };

  const createNewClient = async () => {
    setLoading("create");
    try {
      // Create a temporary user placeholder and go straight to onboarding
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "client", clientId: "__new__" }),
      });
      if (!res.ok) throw new Error("Failed");
      document.cookie = `ws_dev_role=client;path=/;max-age=${60 * 60 * 24 * 30}`;
      document.cookie = `ws_client_id=;path=/;max-age=0`;
      router.push("/onboarding/client");
    } catch {
      setLoading(null);
    }
  };

  const showExistingClients = async () => {
    setView("existing");
    setLoadingClients(true);
    try {
      const res = await fetch("/api/users/clients");
      if (res.ok) {
        const { data } = await res.json();
        setExistingClients(data || []);
      }
    } catch {}
    setLoadingClients(false);
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 relative overflow-hidden flex items-center justify-center">
      {/* Background */}
      <div className="absolute inset-0 grid grid-cols-2 -space-x-52 opacity-30 pointer-events-none">
        <div className="blur-[120px] h-56 bg-gradient-to-br from-purple-500 to-indigo-400" />
        <div className="blur-[120px] h-32 bg-gradient-to-r from-cyan-400 to-purple-300" />
      </div>

      <div className="relative z-10 w-full max-w-md mx-auto px-6 space-y-8">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Sparkles className="w-7 h-7 text-purple-600" />
            <span className="text-2xl font-bold">WealthSandbox</span>
          </div>
          <p className="text-sm text-gray-500">
            {view === "main" ? "Select how to continue" : "Choose a client account"}
          </p>
        </div>

        {view === "main" && (
          <div className="space-y-4">
            {/* Advisor */}
            <button
              onClick={loginAsAdvisor}
              disabled={loading !== null}
              className={cn(
                "w-full text-left border-2 border-gray-200 rounded-2xl p-5 transition-all group",
                "hover:border-blue-400 hover:bg-blue-50/50",
                loading === "advisor" && "border-gray-300 bg-gray-50",
                loading !== null && loading !== "advisor" && "opacity-50"
              )}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-white shrink-0">
                  {loading === "advisor" ? <Loader2 className="w-5 h-5 animate-spin" /> : <Briefcase className="w-6 h-6" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-base font-semibold text-gray-900">Sarah Mitchell, CFP®</p>
                    <span className="text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">
                      advisor
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">sarah.mitchell@lplfinancial.dev</p>
                  <p className="text-xs text-gray-500 mt-1">View client roster, manage connections, clone sandboxes</p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gray-600 transition-colors shrink-0" />
              </div>
            </button>

            {/* Create new client */}
            <button
              onClick={createNewClient}
              disabled={loading !== null}
              className={cn(
                "w-full text-left border-2 border-gray-200 rounded-2xl p-5 transition-all group",
                "hover:border-emerald-400 hover:bg-emerald-50/50",
                loading === "create" && "border-gray-300 bg-gray-50",
                loading !== null && loading !== "create" && "opacity-50"
              )}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-500 flex items-center justify-center text-white shrink-0">
                  {loading === "create" ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-6 h-6" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-semibold text-gray-900">Create New Client</p>
                  <p className="text-xs text-gray-500 mt-1">Start fresh — enter your details through the onboarding flow</p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gray-600 transition-colors shrink-0" />
              </div>
            </button>

            {/* Login as existing client */}
            <button
              onClick={showExistingClients}
              disabled={loading !== null}
              className={cn(
                "w-full text-left border-2 border-gray-200 rounded-2xl p-5 transition-all group",
                "hover:border-purple-400 hover:bg-purple-50/50",
                loading !== null && "opacity-50"
              )}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-500 flex items-center justify-center text-white shrink-0">
                  <LogIn className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-semibold text-gray-900">Login as Existing Client</p>
                  <p className="text-xs text-gray-500 mt-1">Sign in to an already created client account</p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gray-600 transition-colors shrink-0" />
              </div>
            </button>
          </div>
        )}

        {view === "existing" && (
          <div className="space-y-4">
            <button
              onClick={() => setView("main")}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>

            {loadingClients ? (
              <div className="text-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-purple-500 mx-auto" />
              </div>
            ) : existingClients.length === 0 ? (
              <div className="text-center py-8 space-y-3">
                <Users className="w-10 h-10 text-gray-300 mx-auto" />
                <p className="text-sm text-gray-500">No client accounts found</p>
                <p className="text-xs text-gray-400">Create a new client account first</p>
                <button
                  onClick={() => { setView("main"); }}
                  className="text-sm text-purple-600 hover:underline"
                >
                  Go back
                </button>
              </div>
            ) : (
              existingClients.map((client) => (
                <button
                  key={client.id}
                  onClick={() => loginAsClient(client.id)}
                  disabled={loading !== null}
                  className={cn(
                    "w-full text-left border-2 border-gray-200 rounded-2xl p-5 transition-all group",
                    "hover:border-purple-400 hover:bg-purple-50/50",
                    loading === client.id && "border-gray-300 bg-gray-50",
                    loading !== null && loading !== client.id && "opacity-50"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-500 flex items-center justify-center text-white shrink-0 text-sm font-bold">
                      {loading === client.id ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        `${client.firstName?.[0] || ""}${client.lastName?.[0] || ""}`
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-base font-semibold text-gray-900">
                          {client.firstName} {client.lastName}
                        </p>
                        <span className="text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">
                          client
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{client.email}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gray-600 transition-colors shrink-0" />
                  </div>
                </button>
              ))
            )}
          </div>
        )}

        <p className="text-[10px] text-gray-400 text-center">
          Demo environment · No real financial data · LPL Financial Hackathon 2026
        </p>
      </div>
    </div>
  );
}
