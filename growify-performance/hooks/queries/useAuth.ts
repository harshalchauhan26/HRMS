import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";
import type { AuthRole } from "@/store/useAuthStore";

export function useMe() {
  return useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => api.get<{ role: AuthRole }>("/api/auth/me"),
    retry: false,
  });
}

export function useAdminLogin() {
  return useMutation({
    mutationFn: (body: { email: string; password: string }) =>
      api.post<{ role: AuthRole }>("/api/auth/login", body),
  });
}

export function useGoogleLogin() {
  return useMutation({
    mutationFn: (idToken: string) => api.post<{ role: AuthRole }>("/api/auth/google", { idToken }),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post("/api/auth/logout"),
    onSuccess: () => queryClient.clear(),
  });
}
