import { Header } from "@/components/header";

/**
 * Shared layout for all authenticated app routes.
 * Renders the persistent top header and adds top-padding so content
 * clears the fixed header (h-14 = 3.5rem).
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <div className="pt-14">{children}</div>
    </>
  );
}
