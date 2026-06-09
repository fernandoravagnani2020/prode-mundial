"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

type Step = "dni" | "new" | "existing" | "first_login";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("dni");
  const [dni, setDni] = useState("");
  const [name, setName] = useState("");
  const [existingName, setExistingName] = useState(""); // for first_login
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const raw = localStorage.getItem("prode_session");
    if (raw) { try { JSON.parse(raw); router.replace("/fixtures"); } catch {} }
  }, [router]);

  // ── Step 1: submit DNI ────────────────────────────────────────────────────
  async function handleDni() {
    setError("");
    if (!dni.trim() || !/^\d{7,8}$/.test(dni.trim())) {
      setError("Ingresá un DNI válido (7 u 8 dígitos)");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dni: dni.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Error al ingresar"); return; }
      if (data.status === "new") { setStep("new"); return; }
      if (data.status === "first_login") { setExistingName(data.name); setStep("first_login"); return; }
      setStep("existing");
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  // ── Step 2: submit password (existing / first_login / new) ───────────────
  async function handleLogin() {
    setError("");
    if (step === "new") {
      if (!name.trim() || name.trim().length < 2) { setError("Ingresá tu nombre completo"); return; }
    }
    if (!password || password.length < 4) { setError("La contraseña debe tener al menos 4 caracteres"); return; }

    setLoading(true);
    try {
      const body: Record<string, string> = { dni: dni.trim(), password };
      if (step === "new") body.name = name.trim();

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Error al ingresar"); return; }
      localStorage.setItem("prode_session", JSON.stringify({ dni: data.dni, name: data.name, isAdmin: data.isAdmin }));
      router.replace("/fixtures");
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key !== "Enter") return;
    if (step === "dni") handleDni();
    else handleLogin();
  }

  const backToDni = () => { setStep("dni"); setPassword(""); setName(""); setError(""); };

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-between px-5 py-10">
      {/* Background */}
      <div className="absolute inset-0">
        <Image src="/bg-mobile.jpg" alt="" fill className="object-cover object-center md:hidden" priority />
        <Image src="/bg-web.jpg" alt="" fill className="object-cover object-center hidden md:block" priority />
        <div className="absolute inset-0 bg-black/50" />
      </div>

      {/* Logo / top */}
      <div className="relative z-10 w-full max-w-sm flex flex-col items-center pt-8">
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

          {/* ── STEP: DNI ── */}
          {step === "dni" && (
            <>
              <h2 className="text-lg font-bold text-white mb-0.5">Ingresar</h2>
              <p className="text-gray-400 text-sm mb-5">Ingresá tu DNI para continuar.</p>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-400 font-medium mb-1.5 block uppercase tracking-wider">DNI</label>
                  <input
                    type="number" value={dni}
                    onChange={(e) => { setDni(e.target.value); setError(""); }}
                    onKeyDown={handleKey}
                    placeholder="Ej: 12345678"
                    autoFocus
                    className="w-full bg-[#1a1a1a] border border-[#2e2e2e] rounded-xl px-4 py-3.5 text-white text-xl font-mono placeholder-gray-700 focus:outline-none focus:border-[#22c55e] transition-colors"
                  />
                </div>
                {error && <ErrorBox msg={error} />}
                <button onClick={handleDni} disabled={loading} className="w-full bg-[#22c55e] hover:bg-[#16a34a] active:scale-[0.98] disabled:opacity-50 text-black font-bold py-4 rounded-xl transition-all text-base">
                  {loading ? <Spinner /> : "Continuar →"}
                </button>
              </div>
            </>
          )}

          {/* ── STEP: EXISTING USER — enter password ── */}
          {step === "existing" && (
            <>
              <button onClick={backToDni} className="text-xs text-gray-500 hover:text-white mb-3 flex items-center gap-1">← Cambiar DNI</button>
              <h2 className="text-lg font-bold text-white mb-0.5">Bienvenido/a</h2>
              <p className="text-gray-400 text-sm mb-5">DNI <span className="text-white font-mono">{dni}</span> · Ingresá tu contraseña.</p>
              <div className="space-y-3">
                <PasswordField value={password} onChange={(v) => { setPassword(v); setError(""); }} onKey={handleKey} show={showPassword} onToggle={() => setShowPassword(!showPassword)} />
                {error && <ErrorBox msg={error} />}
                <button onClick={handleLogin} disabled={loading} className="w-full bg-[#22c55e] hover:bg-[#16a34a] active:scale-[0.98] disabled:opacity-50 text-black font-bold py-4 rounded-xl transition-all text-base">
                  {loading ? <Spinner /> : "Entrar"}
                </button>
              </div>
            </>
          )}

          {/* ── STEP: FIRST LOGIN — existing user, set password ── */}
          {step === "first_login" && (
            <>
              <button onClick={backToDni} className="text-xs text-gray-500 hover:text-white mb-3 flex items-center gap-1">← Cambiar DNI</button>
              <h2 className="text-lg font-bold text-white mb-0.5">Hola, {existingName}!</h2>
              <p className="text-gray-400 text-sm mb-5">Es tu primer acceso con contraseña. Elegí una para tu cuenta.</p>
              <div className="space-y-3">
                <PasswordField value={password} onChange={(v) => { setPassword(v); setError(""); }} onKey={handleKey} show={showPassword} onToggle={() => setShowPassword(!showPassword)} label="Nueva contraseña" />
                {error && <ErrorBox msg={error} />}
                <button onClick={handleLogin} disabled={loading} className="w-full bg-[#22c55e] hover:bg-[#16a34a] active:scale-[0.98] disabled:opacity-50 text-black font-bold py-4 rounded-xl transition-all text-base">
                  {loading ? <Spinner /> : "Guardar y entrar"}
                </button>
              </div>
            </>
          )}

          {/* ── STEP: NEW USER — register ── */}
          {step === "new" && (
            <>
              <button onClick={backToDni} className="text-xs text-gray-500 hover:text-white mb-3 flex items-center gap-1">← Cambiar DNI</button>
              <h2 className="text-lg font-bold text-white mb-0.5">¡Primera vez!</h2>
              <p className="text-gray-400 text-sm mb-5">Completá tus datos para registrarte.</p>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-400 font-medium mb-1.5 block uppercase tracking-wider">Nombre completo</label>
                  <input
                    type="text" value={name}
                    onChange={(e) => { setName(e.target.value); setError(""); }}
                    onKeyDown={handleKey}
                    placeholder="Ej: Juan García"
                    autoFocus
                    className="w-full bg-[#1a1a1a] border border-[#2e2e2e] rounded-xl px-4 py-3.5 text-white placeholder-gray-700 focus:outline-none focus:border-[#22c55e] transition-colors"
                  />
                </div>
                <PasswordField value={password} onChange={(v) => { setPassword(v); setError(""); }} onKey={handleKey} show={showPassword} onToggle={() => setShowPassword(!showPassword)} />
                {error && <ErrorBox msg={error} />}
                <button onClick={handleLogin} disabled={loading} className="w-full bg-[#22c55e] hover:bg-[#16a34a] active:scale-[0.98] disabled:opacity-50 text-black font-bold py-4 rounded-xl transition-all text-base">
                  {loading ? <Spinner /> : "Registrarme y entrar"}
                </button>
              </div>
            </>
          )}

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

// ── Shared sub-components ─────────────────────────────────────────────────────

function PasswordField({
  value, onChange, onKey, show, onToggle, label = "Contraseña",
}: {
  value: string; onChange: (v: string) => void; onKey: (e: React.KeyboardEvent) => void;
  show: boolean; onToggle: () => void; label?: string;
}) {
  return (
    <div>
      <label className="text-xs text-gray-400 font-medium mb-1.5 block uppercase tracking-wider">{label}</label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKey}
          placeholder="Mínimo 4 caracteres"
          autoFocus
          className="w-full bg-[#1a1a1a] border border-[#2e2e2e] rounded-xl px-4 py-3.5 text-white placeholder-gray-700 focus:outline-none focus:border-[#22c55e] transition-colors pr-12"
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 text-xs font-bold uppercase tracking-wide"
        >
          {show ? "Ocultar" : "Ver"}
        </button>
      </div>
    </div>
  );
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div className="bg-red-950/50 border border-red-800/50 rounded-xl px-4 py-2.5 text-red-400 text-sm">
      {msg}
    </div>
  );
}

function Spinner() {
  return (
    <span className="flex items-center justify-center gap-2">
      <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
      Ingresando...
    </span>
  );
}
