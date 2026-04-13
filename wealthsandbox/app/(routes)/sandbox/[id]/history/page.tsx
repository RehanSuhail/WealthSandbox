import { Breadcrumb } from "@/components/breadcrumb";

interface SandboxHistoryPageProps {
  params: Promise<{ id: string }>;
}

export default async function SandboxHistoryPage({
  params,
}: SandboxHistoryPageProps) {
  const { id } = await params;

  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <Breadcrumb
        className="mb-6"
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Sandboxes", href: "/sandbox" },
          { label: id, href: `/sandbox/${id}` },
          { label: "History" },
        ]}
      />
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Session History</h1>
      <p className="text-gray-500">
        Session history list for sandbox{" "}
        <span className="font-mono text-purple-600">{id}</span>.
      </p>
    </main>
  );
}
