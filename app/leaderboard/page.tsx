"use client";
import { useEffect, useState } from "react";
import AuthGuard, { useSession } from "@/components/AuthGuard";
import Navigation from "@/components/Navigation";
import { LeaderboardEntry } from "@/lib/types";
import { PRODE_PRIZE_1, PRODE_PRIZE_2 } from "@/lib/special";

function LeaderboardContent() {
  const session = useSession();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/leaderboard")
      .then((r) => r.json())
      .then((d) => setEntries(d.leaderboard ?? []))
      .finally(() => setLoading(false));
  }, []);

  const myEntry = entries.find((e) => e.dni === session?.dni);

  const podium = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <div className="min-h-screen bg-bg pb-24">
      <Navigation />

      <main className="max-w-lg mx-auto px-4 pt-3">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-xl font-black text-white">Tabla de Posiciones</h1>
          <p className="text-xs text-gray-600 mt-0.5">Mundial 2026 · N360</p>
        </div>

        {/* Premios del prode */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-3 flex items-center gap-2.5">
            <span className="text-2xl">🥇</span>
            <div className="min-w-0">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide font-bold leading-none">1° Puesto</p>
              <p className="text-base font-black text-yellow-400 leading-tight mt-0.5">{PRODE_PRIZE_1}</p>
            </div>
          </div>
          <div className="rounded-2xl border border-[#242424] bg-[#1a1a1a] p-3 flex items-center gap-2.5">
            <span className="text-2xl">🥈</span>
            <div className="min-w-0">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide font-bold leading-none">2° Puesto</p>
              <p className="text-base font-black text-gray-200 leading-tight mt-0.5">{PRODE_PRIZE_2}</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#22c55e]/30 border-t-[#22c55e] rounded-full animate-spin" />
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-3">🏆</p>
            <p className="text-gray-600 text-sm">Nadie pronosticó aún</p>
          </div>
        ) : (
          <>
            {/* Mi posición sticky */}
            {myEntry && myEntry.rank > 3 && (
              <div className="bg-[#22c55e]/10 border border-[#22c55e]/25 rounded-2xl p-3 mb-4 flex items-center gap-3">
                <span className="text-lg font-black text-[#22c55e] w-7 text-center">#{myEntry.rank}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold text-sm truncate">{myEntry.name} <span className="text-[#22c55e] text-xs">(vos)</span></p>
                  <p className="text-xs text-gray-600">{myEntry.total_predictions} pronósticos</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-black text-[#22c55e]">{myEntry.points}</p>
                  <p className="text-[10px] text-gray-600">pts</p>
                </div>
              </div>
            )}

            {/* Podio top 3 */}
            {podium.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[podium[1], podium[0], podium[2]].map((e, visualIdx) => {
                  if (!e) return <div key={visualIdx} />;
                  const isFirst = e.rank === 1;
                  const isMe = e.dni === session?.dni;
                  const medal = ["🥈","🥇","🥉"][visualIdx];
                  return (
                    <div
                      key={e.dni}
                      className={`flex flex-col items-center p-3 rounded-2xl border text-center transition-all ${
                        isFirst
                          ? "bg-yellow-500/10 border-yellow-500/30 order-2"
                          : "bg-[#1a1a1a] border-[#242424]"
                      } ${isMe ? "ring-1 ring-[#22c55e]/50" : ""}`}
                    >
                      <span className="text-2xl mb-1">{medal}</span>
                      <p className={`text-[11px] font-bold truncate w-full ${isMe ? "text-[#22c55e]" : "text-white"}`}>{e.name}</p>
                      <p className={`text-xl font-black mt-1 ${isFirst ? "text-yellow-400" : "text-white"}`}>{e.points}</p>
                      <p className="text-[10px] text-gray-600">pts</p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Resto de la tabla */}
            {rest.length > 0 && (
              <div className="bg-card border border-[#242424] rounded-2xl overflow-hidden">
                {/* Header */}
                <div className="grid grid-cols-[32px_1fr_28px_28px_28px_44px] gap-1 px-3 py-2 border-b border-[#1a1a1a]">
                  {["#","Jugador","✅","🟡","❌","Pts"].map((h, i) => (
                    <span key={i} className={`text-[10px] text-gray-700 font-bold uppercase ${i > 1 ? "text-center" : ""} ${i === 5 ? "text-right" : ""}`}>{h}</span>
                  ))}
                </div>
                {rest.map((entry, i) => {
                  const isMe = entry.dni === session?.dni;
                  return (
                    <div
                      key={entry.dni}
                      className={`grid grid-cols-[32px_1fr_28px_28px_28px_44px] gap-1 px-3 py-3 border-b border-[#111111] last:border-0 items-center ${
                        isMe ? "bg-[#22c55e]/5" : i % 2 === 0 ? "" : "bg-[#0d0d0d]"
                      }`}
                    >
                      <span className="text-xs text-gray-600 font-bold">{entry.rank}</span>
                      <div className="min-w-0">
                        <p className={`text-xs font-bold truncate ${isMe ? "text-[#22c55e]" : "text-white"}`}>
                          {entry.name}{isMe && <span className="text-[#22c55e]/60 ml-1 text-[10px]">(vos)</span>}
                        </p>
                        <p className="text-[10px] text-gray-700">{entry.total_predictions} prono.</p>
                      </div>
                      <span className="text-center text-xs text-[#22c55e] font-bold">{entry.exact}</span>
                      <span className="text-center text-xs text-[#f97316] font-bold">{entry.partial}</span>
                      <span className="text-center text-xs text-gray-600 font-bold">{entry.wrong}</span>
                      <span className={`text-right text-sm font-black ${isMe ? "text-[#22c55e]" : "text-white"}`}>{entry.points}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Leyenda */}
            <div className="flex gap-4 justify-center mt-4 text-[11px] text-gray-700">
              <span>✅ Exacto +3</span>
              <span>🟡 Resultado +1</span>
              <span>❌ Fallo 0</span>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default function LeaderboardPage() {
  return (
    <AuthGuard>
      <LeaderboardContent />
    </AuthGuard>
  );
}
