import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";
import type {
  ApiAuditEntry,
  ApiMembershipDetail,
  ApiMembershipHistoryPoint,
  PeriodParam,
  Quarter,
} from "@/types/api";

export function useMembershipDetail(membershipId: string | null, period: PeriodParam) {
  return useQuery({
    queryKey: ["memberships", membershipId, period],
    queryFn: () => api.get<ApiMembershipDetail>(`/api/memberships/${membershipId}?period=${period}`),
    enabled: !!membershipId,
  });
}

function invalidateMembership(
  queryClient: ReturnType<typeof useQueryClient>,
  membershipId: string
) {
  queryClient.invalidateQueries({ queryKey: ["memberships", membershipId] });
  queryClient.invalidateQueries({ queryKey: ["teams"] });
  queryClient.invalidateQueries({ queryKey: ["departments"] });
}

export function useSaveScores(membershipId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      period: Quarter;
      scores: { questionId: string; value: number | null; note?: string | null }[];
    }) => api.put<ApiMembershipDetail>(`/api/memberships/${membershipId}/scores`, body),
    onSuccess: () => invalidateMembership(queryClient, membershipId),
  });
}

export function useSaveTargets(membershipId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      period: Quarter;
      targets: { metric: string; target?: number | null; actual?: number | null }[];
    }) => api.put<ApiMembershipDetail>(`/api/memberships/${membershipId}/targets`, body),
    onSuccess: () => invalidateMembership(queryClient, membershipId),
  });
}

export function useSaveFitco(membershipId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { period: Quarter; fitco: { phase: number; value: number }[] }) =>
      api.put<ApiMembershipDetail>(`/api/memberships/${membershipId}/fitco`, body),
    onSuccess: () => invalidateMembership(queryClient, membershipId),
  });
}

export function useAddPersonalQuestion(membershipId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { headId: string; text: string }) =>
      api.post(`/api/memberships/${membershipId}/questions`, body),
    onSuccess: () => invalidateMembership(queryClient, membershipId),
  });
}

export function useUpdateMembership(membershipId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      name?: string;
      email?: string;
      jobRoleId?: string;
      teamId?: string;
      isLead?: boolean;
    }) => api.patch<ApiMembershipDetail>(`/api/memberships/${membershipId}`, body),
    onSuccess: () => {
      invalidateMembership(queryClient, membershipId);
      queryClient.invalidateQueries({ queryKey: ["memberships", membershipId, "audit"] });
    },
  });
}

export function useOffboardMembership(membershipId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post(`/api/memberships/${membershipId}/offboard`),
    onSuccess: () => {
      invalidateMembership(queryClient, membershipId);
      queryClient.invalidateQueries({ queryKey: ["memberships", membershipId, "audit"] });
    },
  });
}

/** Same endpoint as useOffboardMembership, but for callers (e.g. a team roster list) iterating
 * over many members where the target id isn't known until render time. */
export function useOffboardMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (membershipId: string) => api.post(`/api/memberships/${membershipId}/offboard`),
    onSuccess: (_data, membershipId) => {
      invalidateMembership(queryClient, membershipId);
      queryClient.invalidateQueries({ queryKey: ["memberships", membershipId, "audit"] });
    },
  });
}

export function useReactivateMembership(membershipId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post(`/api/memberships/${membershipId}/reactivate`),
    onSuccess: () => {
      invalidateMembership(queryClient, membershipId);
      queryClient.invalidateQueries({ queryKey: ["memberships", membershipId, "audit"] });
    },
  });
}

export function useMembershipAudit(membershipId: string | null) {
  return useQuery({
    queryKey: ["memberships", membershipId, "audit"],
    queryFn: () => api.get<ApiAuditEntry[]>(`/api/memberships/${membershipId}/audit`),
    enabled: !!membershipId,
  });
}

export function useMembershipHistory(membershipId: string | null) {
  return useQuery({
    queryKey: ["memberships", membershipId, "history"],
    queryFn: () => api.get<ApiMembershipHistoryPoint[]>(`/api/memberships/${membershipId}/history`),
    enabled: !!membershipId,
  });
}
