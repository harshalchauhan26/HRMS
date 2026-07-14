import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";
import type { ApiDepartment, ApiEmployee, ApiTeamSummary, PeriodParam } from "@/types/api";

export function useDepartments(period: PeriodParam, includeInactive = false) {
  return useQuery({
    queryKey: ["departments", period, includeInactive],
    queryFn: () =>
      api.get<ApiDepartment[]>(`/api/departments?period=${period}&includeInactive=${includeInactive}`),
  });
}

export function useCreateDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => api.post<ApiDepartment>("/api/departments", { name }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["departments"] }),
  });
}

export function useRenameDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      api.patch<ApiDepartment>(`/api/departments/${id}`, { name }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["departments"] }),
  });
}

/** Archives the department (and cascades: archives its teams, offboards their active members) —
 * not a hard delete. See growify-api/src/routes/departments.ts DELETE /:id. */
export function useDeleteDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.del<{ archivedTeams: number; offboardedCount: number }>(`/api/departments/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["departments"] }),
  });
}

export function useRestoreDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<ApiDepartment>(`/api/departments/${id}/restore`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["departments"] }),
  });
}

export function useDepartmentTeams(
  departmentId: string,
  period: PeriodParam,
  enabled = true,
  includeInactive = false
) {
  return useQuery({
    queryKey: ["departments", departmentId, "teams", period, includeInactive],
    queryFn: () =>
      api.get<ApiTeamSummary[]>(
        `/api/departments/${departmentId}/teams?period=${period}&includeInactive=${includeInactive}`
      ),
    enabled: !!departmentId && enabled,
  });
}

export function useDepartmentEmployees(departmentId: string, includeInactive = false) {
  return useQuery({
    queryKey: ["departments", departmentId, "employees", includeInactive],
    queryFn: () =>
      api.get<ApiEmployee[]>(
        `/api/departments/${departmentId}/employees?includeInactive=${includeInactive}`
      ),
    enabled: !!departmentId,
  });
}
