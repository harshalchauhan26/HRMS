import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";
import type { ApiSwotReport, PeriodParam } from "@/types/api";

export function useSwotLatest(membershipId: string | null, period: PeriodParam) {
  return useQuery({
    queryKey: ["swot", membershipId, period],
    queryFn: () => api.get<ApiSwotReport | null>(`/api/memberships/${membershipId}/swot/latest?period=${period}`),
    enabled: !!membershipId,
  });
}

export function useGenerateSwot(membershipId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (period: PeriodParam) =>
      api.post<ApiSwotReport>(`/api/memberships/${membershipId}/swot/generate`, { period }),
    onSuccess: (_data, period) => {
      queryClient.invalidateQueries({ queryKey: ["swot", membershipId, period] });
    },
  });
}
