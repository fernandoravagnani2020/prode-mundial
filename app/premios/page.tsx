"use client";
import { useEffect, useState, useCallback } from "react";
import AuthGuard, { useSession } from "@/components/AuthGuard";
import Navigation from "@/components/Navigation";
import { Match } from "@/lib/types";
import { SPECIAL_FIELDS, SPECIAL_PRIZE, SPECIAL_DEADLINE, isSpecialOpen } from "@/lib/special";

interface Team { name: string; flag: string; }

function PremiosContent() {
  const session = useSession();
  const [teams, setTeams] = useState<Team[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const open = isSpecialOpen();

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      const [mRes, sRes] = await Promise.all([
        fetch(`/api/matches`),
        fetch(`/api/special?dni=${session.dni}`),
      ]);
      const mData = await mRes.json();
      const sData = await sRes.json();

      // Dedupe teams
      const map = new Map<string, string>();
      for (const m of (mData.matches ?? []) as Match[]) {
        if (m.team1 && m.team1 !== "Por definir") map.set(m.team1, m.team1_flag);
        if (m.team2 && m.team2 !== "Por definir") map.set(m.team2, m.team2_flag);
      }
      const list = [...map.entries()].map(([name, flag]) => ({ name, flag }))
        .sort((a, b) => a.name.localeCompare(b.name, "es"));
      setTeams(list);

      // Preload existing prediction
      if (sData.prediction) {
        const v: Record<string, string> = {};
        for (const f of SPECIAL_FIELDS) v[f.key] = sData.prediction[f.key] ?? "";
        setValues(v);
      }
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => { load(); }, [load]);

  const filledCount = SPECIAL_FIELDS.filter((f) => values[f.key]?.trim()).length;

  async function save() {
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/special", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dni: session?.dni, predictions: values }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Error al guardar"); return; }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError("Error de conexión");
    } finally {
      setSaving(false);
    }
  }

  const deadlineStr = SPECIAL_DEADLINE.toLocaleDateString("es-AR", {
    day: "numeric", month: "long", timeZone: "America/Argentina/Buenos_Aires",
  });

  return (
    <div className="min-h-screen bg-bg pb-savebar">
      <Navigation />

      <main className="max-w-lg mx-auto px-4 pt-4">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-3xl border border-[#f97316]/30 bg-gradient-to-br from-[#f97316]/20 via-[#1a1a1a] to-[#22c55e]/15 p-6 mb-5">
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-[#f97316]/20 blur-3xl" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-[#22c55e]/20 blur-3xl" />
          <div className="relative">
            <p className="text-[11px] font-bold text-[#f97316] uppercase tracking-widest mb-1">Concurso especial</p>
            <h1 className="text-2xl font-black text-white leading-tight">
              Participá por <span className="text-[#22c55e]">{SPECIAL_PRIZE}</span>
            </h1>
            <p className="text-gray-400 text-sm mt-2 leading-relaxed">
              {SPECIAL_PRIZE} para quien más aciertos tenga en estos 7 pronósticos.
              {open ? ` Cierra el ${deadlineStr}.` : " El concurso ya cerró."}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-8 h-8 border-2 border-[#22c55e]/30 border-t-[#22c55e] rounded-full animate-spin" />
            <p className="text-xs text-gray-700">Cargando...</p>
          </div>
        ) : (
          <>
            {!open && (
              <div className="bg-[#1a1a1a] border border-[#242424] rounded-xl px-4 py-3 mb-4 text-sm text-gray-400">
                🔒 El concurso cerró el {deadlineStr}. Podés ver tus pronósticos pero ya no se pueden modificar.
              </div>
            )}

            <div className="space-y-3">
              {SPECIAL_FIELDS.map((f) => (
                <div key={f.key} className="bg-card border border-[#242424] rounded-2xl p-4">
                  <label className="flex items-center gap-2 text-sm font-bold text-white mb-2.5">
                    <span className="text-lg">{f.icon}</span>
                    {f.label}
                  </label>

                  {f.type === "team" ? (
                    <select
                      value={values[f.key] ?? ""}
                      onChange={(e) => { setValues((v) => ({ ...v, [f.key]: e.target.value })); setSaved(false); }}
                      disabled={!open}
                      className="w-full bg-[#1a1a1a] border border-[#2e2e2e] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#22c55e] transition-colors disabled:opacity-60 appearance-none"
                    >
                      <option value="">— Elegí un equipo —</option>
                      {teams.map((t) => (
                        <option key={t.name} value={t.name}>{t.flag} {t.name}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={values[f.key] ?? ""}
                      onChange={(e) => { setValues((v) => ({ ...v, [f.key]: e.target.value })); setSaved(false); }}
                      disabled={!open}
                      placeholder={f.placeholder}
                      maxLength={80}
                      className="w-full bg-[#1a1a1a] border border-[#2e2e2e] rounded-xl px-4 py-3 text-white placeholder-gray-700 focus:outline-none focus:border-[#22c55e] transition-colors disabled:opacity-60"
                    />
                  )}
                </div>
              ))}
            </div>

            {error && (
              <div className="bg-red-950/50 border border-red-800/50 rounded-xl px-4 py-2.5 text-red-400 text-sm mt-4">
                {error}
              </div>
            )}
          </>
        )}
      </main>

      {/* Sticky save bar */}
      {!loading && open && (
        <div className="save-bar fixed left-0 right-0 z-40 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a] to-transparent pt-5 pb-2 px-4">
          <div className="max-w-lg mx-auto flex items-center gap-3">
            <span className="text-xs text-gray-600 whitespace-nowrap">
              <span className="text-[#22c55e] font-bold">{filledCount}</span>/{SPECIAL_FIELDS.length}
            </span>
            <button
              onClick={save}
              disabled={saving}
              className={`flex-1 py-3.5 rounded-xl font-bold transition-all active:scale-[0.98] ${
                saved ? "bg-[#22c55e] text-black" : "bg-[#22c55e] hover:bg-[#16a34a] text-black disabled:opacity-50"
              }`}
            >
              {saving ? "Guardando..." : saved ? "✓ Guardado" : "Guardar pronósticos"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PremiosPage() {
  return (
    <AuthGuard>
      <PremiosContent />
    </AuthGuard>
  );
}
