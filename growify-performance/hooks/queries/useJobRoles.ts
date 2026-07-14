import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";
import type { ApiJobRole, ApiQuestionWithScore } from "@/types/api";

export function useJobRoles() {
  return useQuery({
    queryKey: ["job-roles"],
    queryFn: () => api.get<ApiJobRole[]>("/api/job-roles"),
  });
}

export function useCreateJobRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; level: "Lead" | "Junior-Mid" | "Junior" }) =>
      api.post<ApiJobRole>("/api/job-roles", body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["job-roles"] }),
  });
}

export function useJobRoleQuestions(jobRoleId: string | null) {
  return useQuery({
    queryKey: ["job-roles", jobRoleId, "questions"],
    queryFn: () =>
      api.get<Pick<ApiQuestionWithScore, "id" | "headId" | "text">[]>(
        `/api/job-roles/${jobRoleId}/questions`
      ),
    enabled: !!jobRoleId,
  });
}

export function useAddSharedQuestion(jobRoleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { headId: string; text: string }) =>
      api.post(`/api/job-roles/${jobRoleId}/questions`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-roles", jobRoleId, "questions"] });
      queryClient.invalidateQueries({ queryKey: ["memberships"] });
      queryClient.invalidateQueries({ queryKey: ["teams"] });
    },
  });
}

export function useDeleteSharedQuestion(jobRoleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (questionId: string) => api.del(`/api/job-roles/${jobRoleId}/questions/${questionId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-roles", jobRoleId, "questions"] });
      queryClient.invalidateQueries({ queryKey: ["memberships"] });
      queryClient.invalidateQueries({ queryKey: ["teams"] });
    },
  });
}
