"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import AuthGuard, { useSession } from "@/components/AuthGuard";
import Navigation from "@/components/Navigation";
import MatchCard from "@/components/MatchCard";
import { Match } from "@/lib/types";

type PredMap = Record<number, { predicted_score1: number; predicted_score2: number; points: number | null }>;

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

function FixturesContent() {
  const session = useSession();
  const [matches, setMatches] = useState<Match[]>([]);
  const [predictions, setPredictions] = useState<PredMap>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/matches?dni=${session.dni}`);
      const data = await res.json();
      setMatches(data.matches ?? []);
      setPredictions(data.predictions ?? {});
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => { load(); }, [load]);

  // Group matches by day (Buenos Aires timezone)
  const grouped = useMemo(() => {
    const map = new Map<string, Match[]>();
    for (const m of matches) {
      const key = dayKey(m.match_date);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [matches]);

  // Progress stats
  const totalPredictable = matches.filter(m => m.team1 !== "Por definir" && m.status !== "finished").length;
  const predicted = matches.filter(m => predictions[m.id] && m.team1 !== "Por definir").length;

  // Find first upcoming day for auto-scroll id
  const firstUpcomingKey = grouped.find(([k]) => dayStatus(k) !== "past")?.[0] ?? null;

  return (
    <div className="min-h-screen bg-bg pb-24">
      <Navigation />

      <main className="max-w-lg mx-auto px-4 pt-3">

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
        ) : grouped.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">⚽</p>
            <p className="text-gray-600 text-sm">No hay partidos disponibles aún</p>
          </div>
        ) : (
          <div className="space-y-6">
            {grouped.map(([dayIso, dayMatches]) => {
              const status = dayStatus(dayIso);
              const isFirstUpcoming = dayIso === firstUpcomingKey;
              return (
                <section key={dayIso} id={isFirstUpcoming ? "proxima" : undefined}>
                  {/* Day header */}
                  <div className="flex items-center gap-2 mb-2.5 px-1">
                    <span className="text-sm font-black text-white capitalize">
                      {formatDayHeader(dayIso)}
                    </span>
                    {status === "today" && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#f97316]/20 text-[#f97316] uppercase tracking-wide">
                        Hoy
                      </span>
                    )}
                    {status === "upcoming" && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#22c55e]/15 text-[#22c55e] uppercase tracking-wide">
                        Próxima
                      </span>
                    )}
                    <div className="flex-1 h-px bg-[#1e1e1e]" />
                    <span className="text-[10px] text-gray-700">{dayMatches.length} {dayMatches.length === 1 ? "partido" : "partidos"}</span>
                  </div>

                  {/* Matches */}
                  <div className="space-y-3">
                    {dayMatches.map((m) => (
                      <MatchCard
                        key={m.id}
                        match={m}
                        prediction={predictions[m.id] ?? null}
                        userDni={session?.dni ?? ""}
                        onSaved={load}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
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
