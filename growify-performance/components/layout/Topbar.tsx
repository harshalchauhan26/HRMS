"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Settings2 } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { initials } from "@/lib/format";

export interface Crumb {
  label: string;
  href?: string;
}

export default function Topbar({ breadcrumbs }: { breadcrumbs: Crumb[] }) {
  const router = useRouter();
  const role = useAuthStore((s) => s.role);
  const logout = useAuthStore((s) => s.logout);

  if (!role) return null;

  const displayName = role.name;
  const homeHref = role.tier === "admin" ? "/departments" : `/teams/${role.teamId ?? ""}`;

  return (
    <header className="sticky top-0 z-40 flex items-center gap-4 border-b border-hair bg-panel/90 px-6 py-3 backdrop-blur supports-backdrop-filter:bg-panel/75">
      <Link
        href={homeHref}
        className="grid size-8 shrink-0 place-items-center rounded-lg bg-linear-to-br from-brand to-[#6D63E6] font-heading text-base font-bold text-white"
      >
        G
      </Link>

      <nav className="flex flex-1 flex-wrap items-center gap-1.5 text-[13px] text-muted-foreground">
        {breadcrumbs.map((crumb, i) => (
          <span key={`${crumb.label}-${i}`} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-faint">/</span>}
            {crumb.href ? (
              <Link href={crumb.href} className="transition-colors hover:text-brand-ink">
                {crumb.label}
              </Link>
            ) : (
              <b className="font-semibold text-ink">{crumb.label}</b>
            )}
          </span>
        ))}
      </nav>

      {role.tier === "admin" && (
        <Link
          href="/settings"
          className="flex items-center gap-1.5 rounded-lg border border-hair px-2.5 py-1.5 text-[11.5px] font-medium text-faint transition-colors hover:border-brand hover:text-brand-ink"
        >
          <Settings2 className="size-3.5" /> Question sets
        </Link>
      )}

      <div className="flex items-center gap-2 rounded-full bg-brand-soft py-1 pr-2.5 pl-1 text-xs font-semibold text-brand-ink">
        <span className="grid size-5 place-items-center rounded-full bg-brand text-[10px] text-white">
          {role.tier === "admin" ? "A" : initials(displayName)}
        </span>
        {displayName} · {role.tier}
      </div>

      <button
        onClick={() => {
          logout();
          router.push("/login");
        }}
        className="rounded-lg border border-hair px-2.5 py-1.5 text-[11.5px] font-medium text-faint transition-colors hover:border-brand hover:text-brand-ink"
      >
        Switch
      </button>
    </header>
  );
}
