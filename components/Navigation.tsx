"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Session } from "@/lib/types";
import Image from "next/image";

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem("prode_session");
    if (raw) try { setSession(JSON.parse(raw)); } catch {}
  }, []);

  function logout() {
    localStorage.removeItem("prode_session");
    router.push("/");
  }

  const tabs = [
    { href: "/fixtures", label: "Fixture", icon: (active: boolean) => (
      <svg className={`w-5 h-5 ${active ? "text-[#22c55e]" : "text-gray-600"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    )},
    { href: "/leaderboard", label: "Posiciones", icon: (active: boolean) => (
      <svg className={`w-5 h-5 ${active ? "text-[#22c55e]" : "text-gray-600"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <polyline points="18 20 18 10"/><polyline points="12 20 12 4"/><polyline points="6 20 6 14"/>
      </svg>
    )},
    ...(session?.isAdmin ? [{
      href: "/admin", label: "Admin", icon: (active: boolean) => (
        <svg className={`w-5 h-5 ${active ? "text-[#f97316]" : "text-gray-600"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
        </svg>
      )
    }] : []),
  ];

  return (
    <>
      {/* Top bar */}
      <header className="bg-[#0a0a0a] border-b border-[#1a1a1a] px-4 py-3 flex items-center justify-between sticky top-0 z-50 pt-safe">
        <div className="flex items-center gap-2.5">
          <div className="relative w-8 h-8">
            <Image src="/logo.png" alt="Logo" fill className="object-contain" />
          </div>
          <div className="leading-tight">
            <p className="text-[11px] font-black text-white tracking-tight whitespace-nowrap">Prode Mundialista</p>
            <p className="text-[9px] text-[#f97316] font-bold tracking-widest uppercase whitespace-nowrap">N360</p>
          </div>
        </div>
        {session && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 max-w-[100px] truncate">{session.name}</span>
            <button
              onClick={logout}
              className="text-xs text-gray-600 hover:text-white border border-[#242424] hover:border-[#3a3a3a] px-2.5 py-1 rounded-lg transition-colors"
            >
              Salir
            </button>
          </div>
        )}
      </header>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#0a0a0a] border-t border-[#1a1a1a] pb-safe">
        <div className="flex">
          {tabs.map((tab) => {
            const active = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${active ? "" : "opacity-60"}`}
              >
                {tab.icon(active)}
                <span className={`text-[10px] font-semibold tracking-wide ${active ? "text-[#22c55e]" : "text-gray-600"} ${tab.href === "/admin" && active ? "text-[#f97316]" : ""}`}>
                  {tab.label.toUpperCase()}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
