import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";
import type { ApiDemoRoles } from "@/types/api";

export function useDemoRoles() {
  return useQuery({
    queryKey: ["demo-roles"],
    queryFn: () => api.get<ApiDemoRoles>("/api/demo-roles"),
  });
}
