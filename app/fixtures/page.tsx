"use client";
import { useEffect, useState, useCallback } from "react";
import AuthGuard, { useSession } from "@/components/AuthGuard";
import Navigation from "@/components/Navigation";
import MatchCard from "@/components/MatchCard";
import { Match } from "@/lib/types";

type PredMap = Record<number, { predicted_score1: number; predicted_score2: number; points: number | null }>;

const PHASES = [
  { key: "group", label: "Grupos" },
  { key: "r32",   label: "Ronda 32" },
  { key: "r16",   label: "Octavos" },
  { key: "qf",    label: "Cuartos" },
  { key: "sf",    label: "Semis" },
  { key: "f",     label: "Final" },
];

const GROUP_TABS = ["A","B","C","D","E","F","G","H","I","J","K","L"];

function FixturesContent() {
  const session = useSession();
  const [matches, setMatches] = useState<Match[]>([]);
  const [predictions, setPredictions] = useState<PredMap>({});
  const [activePhase, setActivePhase] = useState("group");
  const [activeGroup, setActiveGroup] = useState("A");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/matches?phase=${activePhase}&dni=${session.dni}`);
      const data = await res.json();
      setMatches(data.matches ?? []);
      setPredictions(data.predictions ?? {});
    } finally {
      setLoading(false);
    }
  }, [session, activePhase]);

  useEffect(() => { load(); }, [load]);

  // Filter matches for current view
  const visibleMatches = activePhase === "group"
    ? matches.filter(m => m.group_name === `Grupo ${activeGroup}`)
    : matches;

  // Count predictions for group stage
  const groupMatches = matches.filter(m => m.team1 !== "Por definir");
  const predictedCount = groupMatches.filter(m => predictions[m.id]).length;

  // Progress per group (for group stage)
  function groupProgress(g: string) {
    const gm = matches.filter(m => m.group_name === `Grupo ${g}` && m.team1 !== "Por definir");
    const done = gm.filter(m => predictions[m.id]).length;
    return { done, total: gm.length };
  }

  return (
    <div className="min-h-screen bg-bg pb-24">
      <Navigation />

      <main className="max-w-lg mx-auto px-4 pt-3">

        {/* Phase selector */}
        <div className="flex overflow-x-auto no-scrollbar gap-1.5 mb-3">
          {PHASES.map((p) => (
            <button
              key={p.key}
              onClick={() => setActivePhase(p.key)}
              className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                activePhase === p.key
                  ? "bg-[#22c55e] text-black"
                  : "bg-[#1a1a1a] text-gray-500 border border-[#242424]"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Group tabs (only in group phase) */}
        {activePhase === "group" && (
          <div className="mb-4">
            {/* Summary bar */}
            <div className="flex items-center justify-between mb-2 px-1">
              <p className="text-xs text-gray-600">
                Hola, <span className="text-white font-semibold">{session?.name}</span>
              </p>
              <p className="text-xs text-gray-600">
                <span className="text-[#22c55e] font-bold">{predictedCount}</span>
                <span className="text-gray-700">/{groupMatches.length}</span>
              </p>
            </div>

            {/* Group letter tabs */}
            <div className="flex overflow-x-auto no-scrollbar gap-1">
              {GROUP_TABS.map((g) => {
                const { done, total } = groupProgress(g);
                const complete = done === total && total > 0;
                const active = activeGroup === g;
                return (
                  <button
                    key={g}
                    onClick={() => setActiveGroup(g)}
                    className={`relative flex-shrink-0 w-10 h-10 rounded-xl text-sm font-black transition-all active:scale-95 ${
                      active
                        ? "bg-white text-black"
                        : complete
                        ? "bg-[#22c55e]/15 text-[#22c55e] border border-[#22c55e]/30"
                        : "bg-[#1a1a1a] text-gray-500 border border-[#242424]"
                    }`}
                  >
                    {g}
                    {complete && !active && (
                      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-[#22c55e] rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Matches */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-8 h-8 border-2 border-[#22c55e]/30 border-t-[#22c55e] rounded-full animate-spin" />
            <p className="text-xs text-gray-700">Cargando partidos...</p>
          </div>
        ) : visibleMatches.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">⚽</p>
            <p className="text-gray-600 text-sm">No hay partidos disponibles aún</p>
          </div>
        ) : (
          <>
            {activePhase === "group" && (
              <p className="text-xs text-gray-600 font-bold uppercase tracking-widest mb-3 px-1">
                Grupo {activeGroup}
              </p>
            )}
            <div className="space-y-3">
              {visibleMatches.map((m) => (
                <MatchCard
                  key={m.id}
                  match={m}
                  prediction={predictions[m.id] ?? null}
                  userDni={session?.dni ?? ""}
                  onSaved={load}
                />
              ))}
            </div>
          </>
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
