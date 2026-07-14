import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";
import type { ApiTeamDetail, PeriodParam } from "@/types/api";

export function useTeamDetail(teamId: string, period: PeriodParam) {
  return useQuery({
    queryKey: ["teams", teamId, period],
    queryFn: () => api.get<ApiTeamDetail>(`/api/teams/${teamId}?period=${period}`),
    enabled: !!teamId,
  });
}

export function useCreateTeam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { departmentId: string; name: string }) =>
      api.post("/api/teams", body),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["departments", variables.departmentId, "teams"] });
      queryClient.invalidateQueries({ queryKey: ["departments"] });
    },
  });
}

export function useRenameTeam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ teamId, name }: { teamId: string; name: string }) =>
      api.patch(`/api/teams/${teamId}`, { name }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["teams", variables.teamId] });
      queryClient.invalidateQueries({ queryKey: ["departments"] });
    },
  });
}

/** Archives the team (and offboards its active members) — not a hard delete. See
 * growify-api/src/routes/teams.ts DELETE /:id. */
export function useDeleteTeam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (teamId: string) => api.del<{ offboardedCount: number }>(`/api/teams/${teamId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["departments"] }),
  });
}

export function useRestoreTeam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (teamId: string) => api.post(`/api/teams/${teamId}/restore`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["departments"] }),
  });
}

export function useSetTeamTargets(teamId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { period: "q1" | "q2" | "q3" | "q4"; metric: string; target: number | null }) =>
      api.put<{ updated: number }>(`/api/teams/${teamId}/targets`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams", teamId] });
      queryClient.invalidateQueries({ queryKey: ["memberships"] });
    },
  });
}

export function useAddMember(teamId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; email: string; jobRoleId: string; isLead: boolean }) =>
      api.post(`/api/teams/${teamId}/members`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams", teamId] });
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      queryClient.invalidateQueries({ queryKey: ["demo-roles"] });
    },
  });
}

/** Same endpoint as useAddMember, but for callers (e.g. a department-level "Add employee"
 * form) that don't know the target team until the user picks one in the form itself. */
export function useAddMemberToTeam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      teamId,
      ...body
    }: {
      teamId: string;
      name: string;
      email: string;
      jobRoleId: string;
      isLead: boolean;
    }) => api.post(`/api/teams/${teamId}/members`, body),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["teams", variables.teamId] });
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      queryClient.invalidateQueries({ queryKey: ["demo-roles"] });
    },
  });
}
