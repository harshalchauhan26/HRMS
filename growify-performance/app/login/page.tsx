"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuthStore, type AuthRole } from "@/store/useAuthStore";
import { useAdminLogin, useGoogleLogin } from "@/hooks/queries/useAuth";
import { ApiError } from "@/lib/apiClient";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }) => void;
          renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

export default function LoginPage() {
  const router = useRouter();
  const setRole = useAuthStore((s) => s.setRole);
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const googleLogin = useGoogleLogin();
  const adminLogin = useAdminLogin();

  function goTo(role: AuthRole) {
    setRole(role);
    router.push(role.tier === "admin" ? "/departments" : `/teams/${role.teamId ?? ""}`);
  }

  useEffect(() => {
    if (!scriptReady || !GOOGLE_CLIENT_ID || !googleButtonRef.current || !window.google) return;
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (response) => {
        googleLogin.mutate(response.credential, {
          onSuccess: (data) => goTo(data.role),
          onError: (err) =>
            toast.error(err instanceof ApiError ? err.message : "Google sign-in failed."),
        });
      },
    });
    window.google.accounts.id.renderButton(googleButtonRef.current, {
      theme: "outline",
      size: "large",
      width: 296,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scriptReady]);

  function handleAdminLogin() {
    if (!email.trim() || !password) {
      toast.error("Enter your email and password.");
      return;
    }
    adminLogin.mutate(
      { email: email.trim(), password },
      {
        onSuccess: (data) => goTo(data.role),
        onError: (err) =>
          toast.error(err instanceof ApiError ? err.message : "Invalid email or password."),
      }
    );
  }

  return (
    <div className="grid min-h-screen place-items-center bg-[radial-gradient(1200px_600px_at_50%_-10%,var(--brand-soft)_0%,var(--canvas)_60%)] px-6 py-10">
      <div className="w-full max-w-sm rounded-2xl border border-hair bg-panel px-8 pt-8 pb-6 shadow-(--shadow-card)">
        <div className="mb-4 grid size-11 place-items-center rounded-xl bg-linear-to-br from-brand to-[#6D63E6] font-heading text-2xl font-bold text-white">
          H
        </div>
        <h1 className="font-heading text-xl font-semibold">HRMS</h1>
        <p className="mt-1 mb-6 text-[13.5px] text-muted-foreground">Sign in to your workspace</p>

        <Script
          src="https://accounts.google.com/gsi/client"
          strategy="afterInteractive"
          onLoad={() => setScriptReady(true)}
        />

        {GOOGLE_CLIENT_ID ? (
          <div ref={googleButtonRef} className="flex justify-center" />
        ) : (
          <p className="rounded-lg border border-dashed border-hair px-3 py-2.5 text-center text-[12px] text-muted-foreground">
            Google sign-in isn&apos;t configured yet.
          </p>
        )}

        <div className="my-5 flex items-center gap-3 text-[11px] text-faint">
          <div className="h-px flex-1 bg-hair" />
          OR
          <div className="h-px flex-1 bg-hair" />
        </div>

        <div className="mb-3">
          <label className="mb-1.5 block text-[11.5px] font-semibold text-ink-soft">Email</label>
          <Input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@hrms.com"
            onKeyDown={(e) => e.key === "Enter" && handleAdminLogin()}
          />
        </div>
        <div className="mb-4">
          <label className="mb-1.5 block text-[11.5px] font-semibold text-ink-soft">Password</label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            onKeyDown={(e) => e.key === "Enter" && handleAdminLogin()}
          />
        </div>
        <Button
          className="w-full justify-center"
          onClick={handleAdminLogin}
          disabled={adminLogin.isPending}
        >
          Sign in
        </Button>
        <p className="mt-3 text-center text-[11px] text-muted-foreground">
          Email + password sign-in is for the admin account. Everyone else uses Google.
        </p>
      </div>
    </div>
  );
}
