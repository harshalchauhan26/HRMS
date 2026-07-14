"use client";

import { useRouter } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Pill from "@/components/common/Pill";
import InitialsAvatar from "@/components/common/InitialsAvatar";
import type { ApiEmployee } from "@/types/api";

export default function EmployeesTable({ employees }: { employees: ApiEmployee[] }) {
  const router = useRouter();

  if (!employees.length) {
    return <p className="text-sm text-muted-foreground">No employees match.</p>;
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-hair bg-panel">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Designation</TableHead>
            <TableHead>Team</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {employees.map((e) => (
            <TableRow
              key={e.membershipId}
              className="cursor-pointer"
              onClick={() => router.push(`/employees/${e.membershipId}`)}
            >
              <TableCell>
                <div className="flex items-center gap-2.5">
                  <InitialsAvatar id={e.membershipId} name={e.name} size="sm" />
                  <div>
                    <div className="font-medium">{e.name}</div>
                    <div className="text-[11.5px] text-muted-foreground">{e.email}</div>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                {e.jobRoleName} · <span className="text-muted-foreground">{e.jobRoleLevel}</span>
              </TableCell>
              <TableCell>{e.teamName}</TableCell>
              <TableCell>
                {e.isLead ? <Pill tone="brand">Team Lead</Pill> : <Pill tone="neutral">Member</Pill>}
              </TableCell>
              <TableCell>
                {e.isActive ? <Pill tone="ok">Active</Pill> : <Pill tone="warn">Offboarded</Pill>}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
