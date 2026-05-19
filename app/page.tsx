"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const [dni, setDni] = useState("");
  const [name, setName] = useState("");
  const [needsName, setNeedsName] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const raw = localStorage.getItem("prode_session");
    if (raw) { try { JSON.parse(raw); router.replace("/fixtures"); } catch {} }
  }, [router]);

  async function handleLogin() {
    setError("");
    if (!dni.trim() || !/^\d{7,8}$/.test(dni.trim())) {
      setError("Ingresá un DNI válido (7 u 8 dígitos)");
      return;
    }
    if (needsName && (!name.trim() || name.trim().length < 2)) {
      setError("Ingresá tu nombre completo");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dni: dni.trim(), name: needsName ? name.trim() : undefined }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Error al ingresar"); return; }
      if (data.needsName) { setNeedsName(true); return; }
      localStorage.setItem("prode_session", JSON.stringify({ dni: data.dni, name: data.name, isAdmin: data.isAdmin }));
      router.replace("/fixtures");
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-between px-5 py-10">
      {/* Background */}
      <div className="absolute inset-0">
        <Image src="/bg-mobile.jpg" alt="" fill className="object-cover object-center md:hidden" priority />
        <Image src="/bg-web.jpg" alt="" fill className="object-cover object-center hidden md:block" priority />
        <div className="absolute inset-0 bg-black/50" />
      </div>
      {/* Top section */}
      <div className="relative z-10 w-full max-w-sm flex flex-col items-center pt-8">
        {/* Logo */}
        <div className="relative w-28 h-28 mb-6">
          <Image src="/logo.png" alt="Logo" fill className="object-contain" />
        </div>
        <h1 className="text-3xl font-black text-white tracking-tight">Prode Mundialista</h1>
        <p className="text-[#f97316] font-bold text-sm mt-1 tracking-wide uppercase">N360 · Negro Padel</p>
        <p className="text-gray-500 text-xs mt-1">Copa del Mundo 2026</p>
      </div>

      {/* Card */}
      <div className="relative z-10 w-full max-w-sm flex-1 flex flex-col justify-center py-8">
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-white mb-0.5">
            {needsName ? "¡Bienvenido/a!" : "Ingresar"}
          </h2>
          <p className="text-gray-500 text-sm mb-5">
            {needsName
              ? "Primera vez. Ingresá tu nombre para la tabla de posiciones."
              : "Ingresá tu DNI para acceder."}
          </p>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-500 font-medium mb-1.5 block uppercase tracking-wider">DNI</label>
              <input
                type="number"
                value={dni}
                onChange={(e) => { setDni(e.target.value); setError(""); }}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                placeholder="Ej: 12345678"
                disabled={needsName}
                className="w-full bg-[#1a1a1a] border border-[#2e2e2e] rounded-xl px-4 py-3.5 text-white text-xl font-mono placeholder-gray-700 focus:outline-none focus:border-[#22c55e] transition-colors disabled:opacity-50"
              />
            </div>

            {needsName && (
              <div>
                <label className="text-xs text-gray-500 font-medium mb-1.5 block uppercase tracking-wider">Nombre completo</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setError(""); }}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  placeholder="Ej: Juan García"
                  autoFocus
                  className="w-full bg-[#1a1a1a] border border-[#2e2e2e] rounded-xl px-4 py-3.5 text-white placeholder-gray-700 focus:outline-none focus:border-[#22c55e] transition-colors"
                />
              </div>
            )}

            {error && (
              <div className="bg-red-950/50 border border-red-800/50 rounded-xl px-4 py-2.5 text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full bg-[#22c55e] hover:bg-[#16a34a] active:scale-[0.98] disabled:opacity-50 text-black font-bold py-4 rounded-xl transition-all text-base mt-1"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  Ingresando...
                </span>
              ) : needsName ? "Registrarme y entrar" : "Entrar"}
            </button>
          </div>
        </div>
      </div>

      {/* Puntos info */}
      <div className="relative z-10 w-full max-w-sm">
        <div className="grid grid-cols-3 gap-2">
          {[
            { pts: "3", label: "Marcador exacto", color: "text-[#22c55e]", bg: "bg-[#22c55e]/10 border-[#22c55e]/20" },
            { pts: "1", label: "Resultado correcto", color: "text-[#f97316]", bg: "bg-[#f97316]/10 border-[#f97316]/20" },
            { pts: "0", label: "Sin acierto", color: "text-gray-500", bg: "bg-[#1a1a1a] border-[#242424]" },
          ].map(({ pts, label, color, bg }) => (
            <div key={pts} className={`${bg} border rounded-xl p-3 text-center`}>
              <p className={`text-2xl font-black ${color}`}>{pts}</p>
              <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
