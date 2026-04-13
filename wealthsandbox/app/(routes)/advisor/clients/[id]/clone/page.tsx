"use client";

import React, { use, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Breadcrumb } from "@/components/breadcrumb";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, AlertTriangle, FlaskConical } from "lucide-react";

interface CloneClientSandboxPageProps {
  params: Promise<{ id: string }>;
}

export default function CloneClientSandboxPage({
  params,
}: CloneClientSandboxPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const sandboxId = searchParams.get("sandbox");

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [newSandboxId, setNewSandboxId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const clonedRef = React.useRef(false);

  useEffect(() => {
    if (!sandboxId) {
      setStatus("error");
      setErrorMsg("No sandbox ID provided.");
      return;
    }
    if (clonedRef.current) return;
    clonedRef.current = true;

    (async () => {
      try {
        const res = await fetch(`/api/sandboxes/${sandboxId}/duplicate`, { method: "POST" });
        if (!res.ok) {
          setStatus("error");
          setErrorMsg("Failed to clone sandbox. It may not exist or you may not have access.");
          return;
        }
        const { data } = await res.json();
        setNewSandboxId(data.id);
        setStatus("success");
      } catch {
        setStatus("error");
        setErrorMsg("Network error while cloning sandbox.");
      }
    })();
  }, [sandboxId]);

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <div className="max-w-2xl mx-auto px-4 md:px-8 py-8 space-y-6">
        <Breadcrumb
          items={[
            { label: "Dashboard", href: "/advisor/dashboard" },
            { label: "Clients", href: "/advisor/clients" },
            { label: `Client ${id.slice(0, 8)}…`, href: `/advisor/clients/${id}` },
            { label: "Clone Sandbox" },
          ]}
        />

        <Card>
          <CardContent className="py-12 text-center space-y-4">
            {status === "loading" && (
              <>
                <Loader2 className="w-10 h-10 animate-spin text-[#1a3a6b] mx-auto" />
                <p className="text-sm font-medium text-gray-600">Cloning sandbox…</p>
                <p className="text-xs text-gray-400">Creating a copy with all session data and insights.</p>
              </>
            )}

            {status === "success" && (
              <>
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <p className="text-sm font-semibold text-gray-800">Sandbox cloned successfully!</p>
                <p className="text-xs text-gray-400">The clone has been created in your workspace.</p>
                <div className="flex items-center justify-center gap-3 pt-2">
                  <Button
                    className="bg-[#1a3a6b] hover:bg-[#16325c] gap-2"
                    onClick={() => router.push(`/sandbox/${newSandboxId}`)}
                  >
                    <FlaskConical className="w-3.5 h-3.5" /> Open Cloned Sandbox
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => router.push(`/advisor/clients/${id}?tab=sandboxes`)}
                  >
                    Back to Client
                  </Button>
                </div>
              </>
            )}

            {status === "error" && (
              <>
                <AlertTriangle className="w-10 h-10 text-red-400 mx-auto" />
                <p className="text-sm font-semibold text-gray-800">Clone failed</p>
                <p className="text-xs text-gray-400">{errorMsg}</p>
                <Button
                  variant="outline"
                  onClick={() => router.push(`/advisor/clients/${id}?tab=sandboxes`)}
                  className="mt-2"
                >
                  Back to Client
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
