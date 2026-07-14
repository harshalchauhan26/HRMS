"use client";

import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import InitialsAvatar from "@/components/common/InitialsAvatar";
import { useAuthStore } from "@/store/useAuthStore";
import { useDemoRoles } from "@/hooks/queries/useDemoRoles";

export default function LoginPage() {
  const router = useRouter();
  const setRole = useAuthStore((s) => s.setRole);
  const { data, isLoading } = useDemoRoles();

  function chooseAdmin(name: string) {
    setRole({ tier: "admin", name });
    router.push("/departments");
  }

  function chooseLead(membershipId: string, teamId: string, name: string) {
    setRole({ tier: "lead", name, membershipId, teamId });
    router.push(`/teams/${teamId}`);
  }

  function chooseMember(membershipId: string, teamId: string, name: string) {
    setRole({ tier: "member", name, membershipId, teamId });
    router.push(`/teams/${teamId}`);
  }

  return (
    <div className="grid min-h-screen place-items-center bg-[radial-gradient(1200px_600px_at_50%_-10%,var(--brand-soft)_0%,var(--canvas)_60%)] px-6 py-10">
      <div className="w-full max-w-sm rounded-2xl border border-hair bg-panel px-8 pt-8 pb-6 shadow-(--shadow-card)">
        <div className="mb-4 grid size-11 place-items-center rounded-xl bg-linear-to-br from-brand to-[#6D63E6] font-heading text-2xl font-bold text-white">
          G
        </div>
        <h1 className="font-heading text-xl font-semibold">Growify Performance</h1>
        <p className="mt-1 mb-6 text-[13.5px] text-muted-foreground">Sign in to your workspace</p>

        <div className="mb-3">
          <label className="mb-1.5 block text-[11.5px] font-semibold text-ink-soft">Work email</label>
          <Input readOnly value="you@growify.digital" className="bg-canvas" />
        </div>
        <div className="mb-3">
          <label className="mb-1.5 block text-[11.5px] font-semibold text-ink-soft">Password</label>
          <Input readOnly type="password" value="password123" className="bg-canvas" />
        </div>
        <Button
          className="mt-1.5 w-full justify-center"
          onClick={() =>
            toast.info("Prototype — pick a demo role below to explore each access tier")
          }
        >
          Sign in
        </Button>

        <div className="mt-5 border-t border-hair pt-4">
          <div className="mb-2.5 text-[11px] font-semibold tracking-wide text-faint uppercase">
            Explore as (demo access tiers)
          </div>

          {isLoading && <p className="text-xs text-muted-foreground">Loading roles…</p>}

          <div className="space-y-2">
            {data?.admin && (
              <RoleOption
                id={data.admin.id}
                label={`${data.admin.name} (Admin)`}
                description="Full read/write · all departments"
                color="var(--brand)"
                letter="A"
                onClick={() => chooseAdmin(data.admin!.name)}
              />
            )}

            {data?.leads.map((lead) => (
              <RoleOption
                key={lead.membershipId}
                id={lead.membershipId}
                label={`${lead.name} (Team Lead)`}
                description={`${lead.teamName} · can score & set targets`}
                onClick={() => chooseLead(lead.membershipId, lead.teamId, lead.name)}
              />
            ))}

            {data?.members.map((member) => (
              <RoleOption
                key={member.membershipId}
                id={member.membershipId}
                label={`${member.name} (Member)`}
                description={`${member.teamName} · own scorecard, read-only`}
                onClick={() => chooseMember(member.membershipId, member.teamId, member.name)}
              />
            ))}

            {data && !data.admin && (
              <p className="text-xs text-muted-foreground">
                No admin user is seeded yet — run the API seed script.
              </p>
            )}
            {data?.admin && !data.leads.length && !data.members.length && (
              <p className="text-xs text-muted-foreground">
                No teams yet. Log in as Admin, create a department and a team, then come back here to
                demo the Lead / Member views.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function RoleOption({
  id,
  label,
  description,
  onClick,
  color,
  letter,
}: {
  id: string;
  label: string;
  description: string;
  onClick: () => void;
  color?: string;
  letter?: string;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-lg border border-hair px-3 py-2.5 text-left transition-colors hover:border-brand hover:bg-brand-soft"
    >
      <InitialsAvatar id={id} name={label} size="sm" color={color} label={letter} />
      <span>
        <div className="text-[13px] font-semibold">{label}</div>
        <div className="text-[11.5px] text-muted-foreground">{description}</div>
      </span>
      <ChevronRight className="ml-auto size-4 text-faint" />
    </button>
  );
}
