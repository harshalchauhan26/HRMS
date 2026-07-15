import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";
import type { ApiHead } from "@/types/api";

export function useHeads() {
  return useQuery({
    queryKey: ["heads"],
    queryFn: () => api.get<ApiHead[]>("/api/heads"),
  });
}

export function useCreateHead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => api.post<ApiHead>("/api/heads", { name }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["heads"] }),
  });
}

export function useRenameHead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      api.patch<ApiHead>(`/api/heads/${id}`, { name }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["heads"] }),
  });
}

/** Deletes a category — cascades to every question under it (shared + personal) and any scores
 * against them. */
export function useDeleteHead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del(`/api/heads/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["heads"] });
      queryClient.invalidateQueries({ queryKey: ["memberships"] });
      queryClient.invalidateQueries({ queryKey: ["teams"] });
    },
  });
}
