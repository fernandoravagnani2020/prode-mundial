"use client";
import { useState } from "react";
import { Match } from "@/lib/types";

interface Props {
  match: Match;
  prediction?: { predicted_score1: number; predicted_score2: number; points: number | null } | null;
  userDni: string;
  onSaved?: () => void;
}

export default function MatchCard({ match, prediction, userDni, onSaved }: Props) {
  const [s1, setS1] = useState(prediction?.predicted_score1 ?? "");
  const [s2, setS2] = useState(prediction?.predicted_score2 ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const matchDate = new Date(match.match_date);
  const now = new Date();
  const cutoff = new Date(matchDate.getTime() - 10 * 60 * 1000); // 10 min antes
  const locked = now >= cutoff; // cerrado: 10min antes o después
  const finished = match.status === "finished";
  const hasResult = match.score1 != null && match.score2 != null;
  const hasPrediction = prediction != null;

  async function save() {
    if (s1 === "" || s2 === "") return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/predictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dni: userDni, match_id: match.id, predicted_score1: Number(s1), predicted_score2: Number(s2) }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Error al guardar"); return; }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      onSaved?.();
    } catch {
      setError("Error de conexión");
    } finally {
      setSaving(false);
    }
  }

  const TZ = "America/Argentina/Buenos_Aires";
  const dateStr = matchDate.toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short", timeZone: TZ });
  const timeStr = matchDate.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", timeZone: TZ });
  const cutoffTimeStr = cutoff.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", timeZone: TZ });

  // Border color based on state
  const borderColor = finished && hasPrediction
    ? prediction!.points === 3 ? "border-[#22c55e]/50" : prediction!.points === 1 ? "border-[#f97316]/40" : "border-[#242424]"
    : hasPrediction && !locked ? "border-[#22c55e]/30" : "border-[#242424]";

  function PointsBadge({ pts }: { pts: number | null }) {
    if (pts == null) return null;
    if (pts === 3) return <span className="text-xs font-bold text-black bg-[#22c55e] px-2 py-0.5 rounded-full">+3 pts</span>;
    if (pts === 1) return <span className="text-xs font-bold text-black bg-[#f97316] px-2 py-0.5 rounded-full">+1 pt</span>;
    return <span className="text-xs font-semibold text-gray-600 bg-[#1a1a1a] border border-[#2e2e2e] px-2 py-0.5 rounded-full">0 pts</span>;
  }

  return (
    <div className={`bg-card border ${borderColor} rounded-2xl overflow-hidden transition-all`}>
      {/* Date row */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <span className="text-[11px] text-gray-600 font-medium">{dateStr} · {timeStr}</span>
        {match.status === "live" && (
          <span className="text-[10px] font-bold text-black bg-red-500 px-2 py-0.5 rounded-full animate-pulse">EN VIVO</span>
        )}
        {match.venue && <span className="text-[10px] text-gray-700 truncate max-w-[120px]">{match.venue}</span>}
      </div>

      {/* Teams + score */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center px-4 py-3 gap-2">
        {/* Team 1 */}
        <div className="flex flex-col items-center gap-1.5">
          <span className="text-3xl">{match.team1_flag}</span>
          <span className="text-xs font-bold text-white text-center leading-tight">{match.team1}</span>
        </div>

        {/* Center: score or VS */}
        <div className="flex flex-col items-center gap-1 min-w-[72px]">
          {hasResult ? (
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black text-white">{match.score1}</span>
              <span className="text-gray-600 font-bold">-</span>
              <span className="text-2xl font-black text-white">{match.score2}</span>
            </div>
          ) : (
            <span className="text-xs font-bold text-gray-700 bg-[#1a1a1a] border border-[#2e2e2e] px-3 py-1 rounded-full">VS</span>
          )}
          {finished && <span className="text-[10px] text-gray-700">Final</span>}
        </div>

        {/* Team 2 */}
        <div className="flex flex-col items-center gap-1.5">
          <span className="text-3xl">{match.team2_flag}</span>
          <span className="text-xs font-bold text-white text-center leading-tight">{match.team2}</span>
        </div>
      </div>

      {/* Prediction area */}
      <div className="border-t border-[#1a1a1a] px-4 py-3">
        {locked ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-600">Tu pronóstico</span>
              {!finished && (
                <span className="text-[10px] text-[#f97316] font-bold bg-[#f97316]/10 px-1.5 py-0.5 rounded-full">
                  🔒 Cerrado
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {hasPrediction ? (
                <>
                  <span className="text-sm font-bold text-gray-300">
                    {prediction!.predicted_score1} - {prediction!.predicted_score2}
                  </span>
                  {finished ? <PointsBadge pts={prediction!.points} /> : (
                    <span className="text-[10px] text-gray-600 italic">En curso...</span>
                  )}
                </>
              ) : (
                <span className="text-xs text-gray-700 italic">Sin pronóstico</span>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">Tu pronóstico</span>
              <span className="text-[10px] text-gray-700">Cierra {cutoffTimeStr} ARG</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number" min="0" max="30" value={s1}
                onChange={(e) => { setS1(e.target.value); setSaved(false); }}
                className="w-12 text-center bg-[#1a1a1a] border border-[#2e2e2e] rounded-lg py-2 text-white font-black text-lg focus:border-[#22c55e] focus:outline-none transition-colors"
                placeholder="0"
              />
              <span className="text-gray-700 font-bold">—</span>
              <input
                type="number" min="0" max="30" value={s2}
                onChange={(e) => { setS2(e.target.value); setSaved(false); }}
                className="w-12 text-center bg-[#1a1a1a] border border-[#2e2e2e] rounded-lg py-2 text-white font-black text-lg focus:border-[#22c55e] focus:outline-none transition-colors"
                placeholder="0"
              />
              <button
                onClick={save}
                disabled={saving || s1 === "" || s2 === ""}
                className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all active:scale-95 ${
                  saved
                    ? "bg-[#22c55e] text-black"
                    : "bg-[#1a1a1a] border border-[#2e2e2e] hover:border-[#22c55e]/50 hover:text-[#22c55e] disabled:opacity-30 text-gray-400"
                }`}
              >
                {saving ? "..." : saved ? "✓ Guardado" : hasPrediction ? "Actualizar" : "Guardar"}
              </button>
            </div>
          </div>
        )}
        {error && <p className="text-red-400 text-xs mt-1.5">{error}</p>}
      </div>
    </div>
  );
}
