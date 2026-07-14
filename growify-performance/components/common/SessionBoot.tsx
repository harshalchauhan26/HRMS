"use client";

import { useEffect } from "react";
import { useMe } from "@/hooks/queries/useAuth";
import { useAuthStore } from "@/store/useAuthStore";

/** Checks for an existing session once on app load and hydrates useAuthStore from it — replaces
 * the old demo-role picker's "click a button to become someone." Renders nothing. */
export default function SessionBoot() {
  const { data, isLoading, isError } = useMe();
  const setRole = useAuthStore((s) => s.setRole);
  const setHydrated = useAuthStore((s) => s.setHydrated);

  useEffect(() => {
    if (isLoading) return;
    if (data?.role) {
      setRole(data.role);
    } else {
      setHydrated();
    }
  }, [isLoading, isError, data, setRole, setHydrated]);

  return null;
}
