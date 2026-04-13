import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  label: string;
  /** Omit href on the last (current) item */
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

/**
 * Reusable breadcrumb.
 *
 * Usage:
 *   <Breadcrumb
 *     items={[
 *       { label: "Dashboard", href: "/dashboard" },
 *       { label: "Sandboxes", href: "/sandbox" },
 *       { label: "My Portfolio", href: "/sandbox/abc" },
 *       { label: "Insights" },          // ← current page, no href
 *     ]}
 *   />
 */
export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className={cn("flex items-center gap-1 text-sm", className)}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <span key={`${item.label}-${index}`} className="flex items-center gap-1">
            {/* Separator (skip before first item) */}
            {index > 0 && (
              <ChevronRight className="w-3.5 h-3.5 shrink-0 text-gray-400" aria-hidden />
            )}

            {/* Linked crumb */}
            {!isLast && item.href ? (
              <Link
                href={item.href}
                className="text-gray-500 hover:text-gray-900 transition-colors hover:underline underline-offset-2"
              >
                {item.label}
              </Link>
            ) : (
              /* Current page (last item) or non-linked intermediate crumb */
              <span
                className={cn(
                  isLast
                    ? "font-medium text-gray-900"
                    : "text-gray-500"
                )}
                aria-current={isLast ? "page" : undefined}
              >
                {item.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
