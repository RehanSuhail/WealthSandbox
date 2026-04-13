"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle2, Clock, Shield,
  HandshakeIcon, Sparkles, Send,
  RefreshCw, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Breadcrumb } from "@/components/breadcrumb";

type Status = "loading" | "disconnected" | "pending" | "connected";

export default function ConnectPage() {
  const [status, setStatus] = useState<Status>("loading");
  const [advisorName, setAdvisorName] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        // Check if already connected
        const statusRes = await fetch("/api/connect/status");
        if (statusRes.ok) {
          const { data } = await statusRes.json();
          if (data?.connected) {
            setAdvisorName(data.advisorName || "Your Advisor");
            setStatus("connected");
            return;
          }
        }
        // Check pending request
        const reqRes = await fetch("/api/connect/request");
        if (reqRes.ok) {
          const { data } = await reqRes.json();
          if (data?.hasPendingRequest) {
            setStatus("pending");
            return;
          }
        }
        setStatus("disconnected");
      } catch {
        setStatus("disconnected");
      }
    })();
  }, []);

  const handleConnect = async () => {
    setSending(true);
    try {
      const res = await fetch("/api/connect/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        setStatus("pending");
      }
    } catch {
      // ignore
    } finally {
      setSending(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f8fafc]">
        <Loader2 className="w-8 h-8 animate-spin text-[#1a3a6b]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <div className="max-w-2xl mx-auto px-5 py-7 space-y-6">
        <Breadcrumb items={[
          { label: "Dashboard", href: "/client/dashboard" },
          { label: "My Advisor" },
        ]} />

        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1a3a6b] text-white flex items-center justify-center shrink-0">
              <HandshakeIcon className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#1a3a6b]">My Advisor</h1>
              <p className="text-sm text-gray-400">
                {status === "connected" && "You're connected with your advisor."}
                {status === "pending" && "Your connection request is pending."}
                {status === "disconnected" && "Connect with an LPL advisor to get personalized guidance."}
              </p>
            </div>
          </div>
        </div>

        <Card>
          <CardContent className="p-6">
            {/* ─── Connected ─── */}
            {status === "connected" && (
              <div className="flex flex-col items-center text-center space-y-6 py-6">
                <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center">
                  <HandshakeIcon className="w-9 h-9 text-emerald-500" />
                </div>
                <div className="space-y-1.5">
                  <h2 className="text-xl font-bold text-gray-900">Connected with {advisorName}!</h2>
                  <p className="text-sm text-gray-500 max-w-sm">
                    Your advisor can view and annotate your sandboxes. Head to your dashboard to start a shared session.
                  </p>
                </div>
                <div className="w-full border border-emerald-200 bg-emerald-50 rounded-2xl px-5 py-4 space-y-3 text-left">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#1a3a6b] flex items-center justify-center text-sm font-bold text-white shrink-0">
                      {advisorName?.split(" ").map(n => n[0]).join("") || "A"}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-800">{advisorName}</p>
                      <p className="text-xs text-gray-400">LPL Financial</p>
                    </div>
                    <Badge variant="outline" className="border-emerald-300 text-emerald-700 bg-emerald-100 text-[10px] flex items-center gap-1">
                      <CheckCircle2 className="w-2.5 h-2.5" /> Connected
                    </Badge>
                  </div>
                </div>
                <Link href="/client/dashboard">
                  <Button className="bg-[#1a3a6b] hover:bg-[#16325c] gap-2">
                    <Sparkles className="w-4 h-4" /> Go to Dashboard
                  </Button>
                </Link>
              </div>
            )}

            {/* ─── Pending ─── */}
            {status === "pending" && (
              <div className="flex flex-col items-center text-center space-y-6 py-6">
                <div className="w-20 h-20 rounded-full bg-amber-50 flex items-center justify-center">
                  <Clock className="w-9 h-9 text-amber-500" />
                </div>
                <div className="space-y-1.5">
                  <h2 className="text-xl font-bold text-gray-900">Request Pending</h2>
                  <p className="text-sm text-gray-500 max-w-sm">
                    Your connection request has been sent. You&apos;ll be connected once your advisor accepts.
                  </p>
                </div>
                <div className="w-full border border-amber-200 bg-amber-50 rounded-2xl px-5 py-4 text-left">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-amber-500 shrink-0" />
                    <p className="text-sm text-amber-800">Waiting for advisor to accept your request…</p>
                  </div>
                </div>
              </div>
            )}

            {/* ─── Disconnected ─── */}
            {status === "disconnected" && (
              <div className="flex flex-col items-center text-center space-y-6 py-6">
                <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center">
                  <HandshakeIcon className="w-9 h-9 text-gray-400" />
                </div>
                <div className="space-y-1.5">
                  <h2 className="text-xl font-bold text-gray-900">No Advisor Connected</h2>
                  <p className="text-sm text-gray-500 max-w-sm">
                    Send a connection request to get paired with an LPL financial advisor who can review your sandboxes and provide personalized insights.
                  </p>
                </div>

                {/* What your advisor can do */}
                <div className="w-full border border-gray-200 rounded-xl px-4 py-3 space-y-2 text-left">
                  <p className="text-xs font-semibold text-gray-700">What your advisor can do:</p>
                  {[
                    "View your sandbox projections and scenarios",
                    "Add annotations and notes on your insights",
                    "Duplicate and model alternative scenarios for you",
                  ].map(t => (
                    <div key={t} className="flex items-center gap-2 text-xs text-gray-600">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      {t}
                    </div>
                  ))}
                </div>

                <Button onClick={handleConnect} disabled={sending}
                  className="w-full bg-[#1a3a6b] hover:bg-[#16325c] gap-2 h-11 text-base"
                >
                  {sending
                    ? <><RefreshCw className="w-4 h-4 animate-spin" /> Sending request…</>
                    : <><Send className="w-4 h-4" /> Send Connection Request</>}
                </Button>

                <div className="flex items-center justify-center gap-4 text-[10px] text-gray-400">
                  <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> LPL verified</span>
                  <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Disconnect anytime</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
