import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { cn } from "@/utils/cn";

interface BreadcrumbsProps {
  trail: { name: string; path: string }[];
  tone?: "dark" | "light";
  className?: string;
}

/** Small editorial breadcrumb trail (visual + matches BreadcrumbList JSON-LD). */
export default function Breadcrumbs({ trail, tone = "light", className }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className={cn(tone === "light" ? "text-ivory/70" : "text-charcoal-muted", className)}>
      <ol className="flex flex-wrap items-center gap-2 font-sans text-[11px] font-semibold uppercase tracking-widest2">
        {trail.map((crumb, i) => (
          <li key={crumb.path} className="flex items-center gap-2">
            {i > 0 && <ChevronRight className="h-3 w-3 opacity-60" aria-hidden="true" />}
            {i === trail.length - 1 ? (
              <span aria-current="page" className={tone === "light" ? "text-gold-soft" : "text-gold-deep"}>
                {crumb.name}
              </span>
            ) : (
              <Link to={crumb.path} className="link-underline transition hover:text-ivory">
                {crumb.name}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
