"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Breadcrumb } from "@/components/breadcrumb";
import { Users, ExternalLink, Loader2, FlaskConical, Lightbulb, UserX } from "lucide-react";

interface Client {
  id: string;
  name: string;
  email: string;
  aum: number;
}

export default function AdvisorClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchClients = async () => {
    try {
      const res = await fetch("/api/advisor/clients");
      if (res.ok) {
        const { data } = await res.json();
        setClients(
          (data || []).map((c: Record<string, unknown>) => ({
            id: c.clientId || c.id,
            name: `${c.firstName || ""} ${c.lastName || ""}`.trim() || "Client",
            email: (c.email as string) || "",
            aum: Number(((c as Record<string, unknown>).profile as Record<string, unknown>)?.savings || 0),
          }))
        );
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { fetchClients(); }, []);

  const handleDisconnect = async (clientId: string) => {
    if (!confirm("Are you sure you want to disconnect this client?")) return;
    try {
      await fetch(`/api/advisor/clients/${clientId}`, { method: "DELETE" });
      setClients(prev => prev.filter(c => c.id !== clientId));
    } catch {}
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f8fafc]">
        <Loader2 className="w-8 h-8 animate-spin text-[#1a3a6b]" />
      </div>
    );
  }

  return (
    <div className="bg-[#f8fafc] min-h-screen">
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-8 space-y-6">
        <Breadcrumb items={[
          { label: "Dashboard", href: "/advisor/dashboard" },
          { label: "Clients" },
        ]} />

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#1a3a6b] text-white flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#1a3a6b]">Client Roster</h1>
            <p className="text-sm text-gray-400">{clients.length} connected client{clients.length !== 1 ? "s" : ""}</p>
          </div>
        </div>

        {clients.length === 0 ? (
          <Card>
            <CardContent className="px-4 py-8 text-center">
              <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No clients connected yet.</p>
              <p className="text-xs text-gray-400 mt-1">Clients will appear here once they send a connection request and you accept it.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {clients.map(client => (
              <Card key={client.id}>
                <CardContent className="p-0">
                  <div className="flex items-center gap-4 px-5 py-4">
                    {/* Avatar */}
                    <div className="w-11 h-11 rounded-full bg-[#1a3a6b]/10 text-[#1a3a6b] flex items-center justify-center text-sm font-semibold shrink-0">
                      {client.name.split(" ").map(n => n[0]).join("")}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <Link href={`/advisor/clients/${client.id}`} className="hover:underline">
                        <p className="text-sm font-medium text-gray-800 truncate">{client.name}</p>
                      </Link>
                      <p className="text-xs text-gray-400">{client.email}</p>
                    </div>

                    {/* Quick action buttons */}
                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      <Link href={`/advisor/clients/${client.id}?tab=sandboxes`}>
                        <Button variant="outline" size="sm" className="gap-1.5 text-xs border-[#1a3a6b]/20 text-[#1a3a6b]">
                          <FlaskConical className="w-3.5 h-3.5" /> Sandboxes
                        </Button>
                      </Link>
                      <Link href={`/advisor/clients/${client.id}?tab=insights`}>
                        <Button variant="outline" size="sm" className="gap-1.5 text-xs border-[#1a3a6b]/20 text-[#1a3a6b]">
                          <Lightbulb className="w-3.5 h-3.5" /> Insights
                        </Button>
                      </Link>
                      <Button variant="outline" size="sm"
                        className="gap-1.5 text-xs text-red-500 border-red-200 hover:bg-red-50"
                        onClick={() => handleDisconnect(client.id)}
                      >
                        <UserX className="w-3.5 h-3.5" /> Disconnect
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
