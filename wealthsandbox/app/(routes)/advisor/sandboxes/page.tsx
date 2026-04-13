import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SandboxList } from "@/components/sandbox-list";

export default function AdvisorSandboxesPage() {
  return (
    <div className="bg-[#f8fafc] min-h-screen">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-[#1a3a6b]">My Sandboxes</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Sandboxes you&apos;ve created for your own analysis
            </p>
          </div>
          <Button asChild className="bg-[#1a3a6b] hover:bg-[#16325c] gap-1.5">
            <Link href="/sandbox/new">
              <Plus className="w-4 h-4" /> New Sandbox
            </Link>
          </Button>
        </div>
        <SandboxList mode="client" />
      </div>
    </div>
  );
}
