"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Session } from "@/lib/types";

export function useSession(): Session | null {
  const [session, setSession] = useState<Session | null>(null);
  useEffect(() => {
    const raw = localStorage.getItem("prode_session");
    if (raw) {
      try { setSession(JSON.parse(raw)); } catch { localStorage.removeItem("prode_session"); }
    }
  }, []);
  return session;
}

export default function AuthGuard({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const router = useRouter();
  const [session, setSession] = useState<Session | null | "loading">("loading");

  useEffect(() => {
    const raw = localStorage.getItem("prode_session");
    if (!raw) { router.replace("/"); return; }
    try {
      const s = JSON.parse(raw) as Session;
      if (adminOnly && !s.isAdmin) { router.replace("/fixtures"); return; }
      setSession(s);
    } catch {
      localStorage.removeItem("prode_session");
      router.replace("/");
    }
  }, [router, adminOnly]);

  if (session === "loading") {
    return (
      <div className="min-h-screen bg-pitch flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-400" />
      </div>
    );
  }
  if (!session) return null;
  return <>{children}</>;
}
