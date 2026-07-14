export type Quarter = "q1" | "q2" | "q3" | "q4";
export type PeriodParam = Quarter | "overall";

export interface ApiJobRole {
  id: string;
  name: string;
  level: "Lead" | "Junior-Mid" | "Junior";
  createdAt: string;
}

export interface ApiHead {
  id: string;
  name: string;
  orderIndex: number;
  createdAt: string;
}

export interface ApiDepartment {
  id: string;
  name: string;
  isActive: boolean;
  archivedAt: string | null;
  createdAt: string;
  teamCount: number;
  memberCount: number;
  avgBase: number | null;
}

export interface ApiTeamSummary {
  id: string;
  departmentId: string;
  name: string;
  leadMembershipId: string | null;
  isActive: boolean;
  archivedAt: string | null;
  createdAt: string;
  memberCount: number;
  avgBase: number | null;
  leadName: string | null;
}

export interface ApiEmployee {
  membershipId: string;
  isLead: boolean;
  isActive: boolean;
  offboardedAt: string | null;
  userId: string;
  name: string;
  email: string;
  teamId: string;
  teamName: string;
  jobRoleId: string;
  jobRoleName: string;
  jobRoleLevel: string;
}

export interface ApiAuditEntry {
  id: string;
  membershipId: string;
  actorName: string | null;
  action: string;
  summary: string;
  createdAt: string;
}

export interface ApiMembershipHistoryPoint {
  period: Quarter;
  overall: number | null;
  base: number | null;
  hasScores: boolean;
}

export interface ApiQuestionWithScore {
  id: string;
  headId: string;
  text: string;
  scope: "shared" | "personal";
  value: number | null;
  note: string | null;
}

export interface ApiHeadWithQuestions {
  id: string;
  name: string;
  orderIndex: number;
  average: number | null;
  questions: ApiQuestionWithScore[];
}

export interface ApiMembershipDetail {
  id: string;
  user: { id: string; name: string; email: string };
  team: { id: string; name: string; departmentId: string };
  jobRole: { id: string; name: string; level: string };
  isLead: boolean;
  isActive: boolean;
  offboardedAt: string | null;
  period: PeriodParam;
  targets: { metric: string; target: number | null; actual: number | null }[];
  fitco: { phase: number; value: number }[];
  heads: ApiHeadWithQuestions[];
  overall: number | null;
  hasScores: boolean;
}

export interface ApiTeamDetail {
  id: string;
  name: string;
  departmentId: string;
  isActive: boolean;
  lead: ApiMembershipDetail | null;
  members: ApiMembershipDetail[];
}

export interface ApiSwotPoint {
  text: string;
  evidence: string;
}

export interface ApiSwotEvidence {
  strengths: ApiSwotPoint[];
  weaknesses: ApiSwotPoint[];
  opportunities: ApiSwotPoint[];
  threats: ApiSwotPoint[];
}

export interface ApiSwotReport {
  id: string;
  membershipId: string;
  period: string;
  evidence: ApiSwotEvidence;
  summary: string | null;
  createdAt: string;
}

