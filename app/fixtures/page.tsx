"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import AuthGuard, { useSession } from "@/components/AuthGuard";
import Navigation from "@/components/Navigation";
import MatchCard from "@/components/MatchCard";
import { Match } from "@/lib/types";
import { SPECIAL_PRIZE, SPECIAL_DEADLINE, isSpecialOpen } from "@/lib/special";

type PredMap = Record<number, { predicted_score1: number; predicted_score2: number; predicted_advancer: string | null; points: number | null }>;

const TZ = "America/Argentina/Buenos_Aires";

function dayKey(dateStr: string) {
  // Returns YYYY-MM-DD in Buenos Aires timezone
  return new Date(dateStr).toLocaleDateString("sv-SE", { timeZone: TZ }); // "sv-SE" gives ISO format
}

function formatDayHeader(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" });
}

function dayStatus(iso: string): "past" | "today" | "upcoming" {
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: TZ });
  if (iso < today) return "past";
  if (iso === today) return "today";
  return "upcoming";
}

function groupByDay(list: Match[]) {
  const map = new Map<string, Match[]>();
  for (const m of list) {
    const key = dayKey(m.match_date);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(m);
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
}

const deadlineShort = SPECIAL_DEADLINE.toLocaleDateString("es-AR", { day: "numeric", month: "short", timeZone: TZ });

function FixturesContent() {
  const session = useSession();
  const [matches, setMatches] = useState<Match[]>([]);
  const [predictions, setPredictions] = useState<PredMap>({});
  const [loading, setLoading] = useState(true);
  const [showPlayed, setShowPlayed] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!session) return;
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`/api/matches?dni=${session.dni}`, { cache: "no-store" });
      const data = await res.json();
      setMatches(data.matches ?? []);
      setPredictions(data.predictions ?? {});
    } finally {
      if (!silent) setLoading(false);
    }
  }, [session]);

  useEffect(() => { load(); }, [load]);

  // Refresco silencioso tras guardar un pronóstico (no resetea el scroll)
  const refreshSilent = useCallback(() => { load(true); }, [load]);

  // Separar partidos jugados (ya empezaron o terminaron) de los próximos
  const now = Date.now();
  const isPlayed = (m: Match) => m.status === "finished" || new Date(m.match_date).getTime() <= now;
  const playedMatches = matches.filter(isPlayed);
  const upcomingMatches = matches.filter((m) => !isPlayed(m));

  const playedGrouped = groupByDay(playedMatches);
  const upcomingGrouped = groupByDay(upcomingMatches);

  // Progress stats
  const totalPredictable = matches.filter(m => m.team1 !== "Por definir" && m.status !== "finished").length;
  const predicted = matches.filter(m => predictions[m.id] && m.team1 !== "Por definir").length;

  const firstUpcomingKey = upcomingGrouped[0]?.[0] ?? null;

  return (
    <div className="min-h-screen bg-bg pb-24">
      <Navigation />

      <main className="max-w-lg mx-auto px-4 pt-3">

        {/* Banner concurso $250.000 */}
        {isSpecialOpen() && (
          <Link href="/premios" className="block mb-4 group">
            <div className="relative overflow-hidden rounded-2xl border border-[#f97316]/30 bg-gradient-to-r from-[#f97316]/20 via-[#1a1a1a] to-[#22c55e]/15 p-4 active:scale-[0.99] transition-transform">
              <div className="absolute -top-8 -right-6 w-28 h-28 rounded-full bg-[#f97316]/25 blur-2xl" />
              <div className="relative flex items-center gap-3">
                <div className="text-3xl">🏆</div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-[#f97316] uppercase tracking-widest">Concurso especial</p>
                  <p className="text-base font-black text-white leading-tight">
                    Participá por <span className="text-[#22c55e]">{SPECIAL_PRIZE}</span>
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5">Pronosticá campeón, goleadores y más · hasta el {deadlineShort}</p>
                </div>
                <div className="text-[#22c55e] text-xl font-black">→</div>
              </div>
            </div>
          </Link>
        )}

        {/* Progress bar */}
        {!loading && totalPredictable > 0 && (
          <div className="mb-4 px-1">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs text-gray-600">
                Hola, <span className="text-white font-semibold">{session?.name}</span>
              </p>
              <p className="text-xs text-gray-600">
                <span className="text-[#22c55e] font-bold">{predicted}</span>
                <span className="text-gray-700">/{totalPredictable} pronósticos</span>
              </p>
            </div>
            <div className="h-1 bg-[#1a1a1a] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#22c55e] rounded-full transition-all"
                style={{ width: `${Math.round((predicted / totalPredictable) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-8 h-8 border-2 border-[#22c55e]/30 border-t-[#22c55e] rounded-full animate-spin" />
            <p className="text-xs text-gray-700">Cargando partidos...</p>
          </div>
        ) : matches.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">⚽</p>
            <p className="text-gray-600 text-sm">No hay partidos disponibles aún</p>
          </div>
        ) : (
          <div className="space-y-6">

            {/* Partidos jugados — comprimidos arriba, desplegables */}
            {playedMatches.length > 0 && (
              <div>
                <button
                  onClick={() => setShowPlayed((v) => !v)}
                  className="w-full flex items-center justify-between gap-2 bg-[#141414] border border-[#242424] rounded-2xl px-4 py-3 active:scale-[0.99] transition-transform"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">✅</span>
                    <div className="text-left">
                      <p className="text-sm font-bold text-white">Partidos jugados</p>
                      <p className="text-[11px] text-gray-500">{playedMatches.length} partidos · mirá tus pronósticos</p>
                    </div>
                  </div>
                  <span className={`text-gray-500 text-lg transition-transform ${showPlayed ? "rotate-180" : ""}`}>⌄</span>
                </button>

                {showPlayed && (
                  <div className="space-y-6 mt-4">
                    {playedGrouped.map(([dayIso, dayMatches]) => (
                      <section key={dayIso}>
                        <div className="flex items-center gap-2 mb-2.5 px-1">
                          <span className="text-sm font-black text-gray-400 capitalize">{formatDayHeader(dayIso)}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#1a1a1a] text-gray-600 border border-[#242424] uppercase tracking-wide">Jugado</span>
                          <div className="flex-1 h-px bg-[#1e1e1e]" />
                          <span className="text-[10px] text-gray-700">{dayMatches.length} {dayMatches.length === 1 ? "partido" : "partidos"}</span>
                        </div>
                        <div className="space-y-3">
                          {dayMatches.map((m) => (
                            <MatchCard
                              key={m.id}
                              match={m}
                              prediction={predictions[m.id] ?? null}
                              userDni={session?.dni ?? ""}
                              onSaved={refreshSilent}
                            />
                          ))}
                        </div>
                      </section>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Próximos partidos */}
            {upcomingGrouped.map(([dayIso, dayMatches]) => {
              const status = dayStatus(dayIso);
              const isFirstUpcoming = dayIso === firstUpcomingKey;
              return (
                <section key={dayIso} id={isFirstUpcoming ? "proxima" : undefined}>
                  <div className="flex items-center gap-2 mb-2.5 px-1">
                    <span className="text-sm font-black text-white capitalize">{formatDayHeader(dayIso)}</span>
                    {status === "today" && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#f97316]/20 text-[#f97316] uppercase tracking-wide">Hoy</span>
                    )}
                    {status === "upcoming" && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#22c55e]/15 text-[#22c55e] uppercase tracking-wide">Próxima</span>
                    )}
                    <div className="flex-1 h-px bg-[#1e1e1e]" />
                    <span className="text-[10px] text-gray-700">{dayMatches.length} {dayMatches.length === 1 ? "partido" : "partidos"}</span>
                  </div>
                  <div className="space-y-3">
                    {dayMatches.map((m) => (
                      <MatchCard
                        key={m.id}
                        match={m}
                        prediction={predictions[m.id] ?? null}
                        userDni={session?.dni ?? ""}
                        onSaved={refreshSilent}
                      />
                    ))}
                  </div>
                </section>
              );
            })}

            {upcomingMatches.length === 0 && (
              <p className="text-center text-gray-600 text-sm py-8">No quedan partidos próximos.</p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default function FixturesPage() {
  return (
    <AuthGuard>
      <FixturesContent />
    </AuthGuard>
  );
}
