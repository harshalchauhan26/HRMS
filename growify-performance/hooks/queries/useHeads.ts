import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";
import type { ApiHead } from "@/types/api";

export function useHeads() {
  return useQuery({
    queryKey: ["heads"],
    queryFn: () => api.get<ApiHead[]>("/api/heads"),
  });
}
