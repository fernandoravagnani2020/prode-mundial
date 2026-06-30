"use client";
import { useEffect, useState, useCallback } from "react";
import AuthGuard, { useSession } from "@/components/AuthGuard";
import Navigation from "@/components/Navigation";
import { Match, PHASE_LABELS } from "@/lib/types";

interface AdminUser {
  dni: string; name: string; is_admin: number; created_at: string; total_predictions: number;
}

function AdminContent() {
  const session = useSession();
  const [tab, setTab] = useState<"matches" | "users">("matches");
  const [matches, setMatches] = useState<Match[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<AdminUser | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [resetting, setResetting] = useState<string | null>(null);
  const [resetMsg, setResetMsg] = useState("");
  const [editMatch, setEditMatch] = useState<Match | null>(null);
  const [editScore1, setEditScore1] = useState("");
  const [editScore2, setEditScore2] = useState("");
  const [editTeam1, setEditTeam1] = useState("");
  const [editTeam2, setEditTeam2] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editVenue, setEditVenue] = useState("");
  const [editAdvancer, setEditAdvancer] = useState<"team1" | "team2" | "">("");
  const [saving, setSaving] = useState(false);
  const [phaseFilter, setPhaseFilter] = useState("group");
  // Mantenimiento / limpieza de partidos huérfanos
  type CleanupReport = {
    total: number; apiCount: number; orphanCount: number; orphanPredTotal: number;
    orphanDetail: { id: number; external_id: string | null; teams: string; phase: string; predictions: number }[];
  };
  type CleanupResult = {
    backup: string; deleted: number; keptWithPredictions: number; apiMatches: number;
    keptDetail: { teams: string; phase: string; predictions: number }[];
  };
  const [cleanupReport, setCleanupReport] = useState<CleanupReport | null>(null);
  const [cleanupResult, setCleanupResult] = useState<CleanupResult | null>(null);
  const [cleanupBusy, setCleanupBusy] = useState(false);
  const [confirmCleanup, setConfirmCleanup] = useState(false);

  const loadMatches = useCallback(async () => {
    const res = await fetch(`/api/matches?phase=${phaseFilter}`);
    const data = await res.json();
    setMatches(data.matches ?? []);
  }, [phaseFilter]);

  const loadUsers = useCallback(async () => {
    if (!session) return;
    const res = await fetch(`/api/admin/users?dni=${session.dni}`);
    const data = await res.json();
    setUsers(data.users ?? []);
  }, [session]);

  useEffect(() => { loadMatches(); }, [loadMatches]);
  useEffect(() => { if (tab === "users") loadUsers(); }, [tab, loadUsers]);

  async function sync() {
    if (!session) return;
    setSyncing(true); setSyncMsg("");
    try {
      const res = await fetch("/api/admin/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dni: session.dni }),
      });
      const data = await res.json();
      setSyncMsg(res.ok
        ? `✓ ${data.synced} partidos (${data.source === "api" ? "football-data.org" : "local"})`
        : "✗ Error al sincronizar");
      if (res.ok) loadMatches();
    } catch { setSyncMsg("✗ Error de conexión"); }
    finally { setSyncing(false); }
  }

  function openEdit(m: Match) {
    setEditMatch(m);
    setEditScore1(m.score1 != null ? String(m.score1) : "");
    setEditScore2(m.score2 != null ? String(m.score2) : "");
    setEditTeam1(m.team1); setEditTeam2(m.team2);
    setEditDate(m.match_date ? m.match_date.slice(0, 16) : "");
    setEditVenue(m.venue ?? "");
    setEditAdvancer(m.winner_team ?? "");
  }

  async function deleteUser(u: AdminUser) {
    if (!session) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/users/${u.dni}?admin_dni=${session.dni}`, { method: "DELETE" });
      if (res.ok) { setConfirmDelete(null); loadUsers(); }
    } finally { setDeleting(false); }
  }

  async function resetPassword(u: AdminUser) {
    if (!session) return;
    setResetting(u.dni); setResetMsg("");
    try {
      const res = await fetch(`/api/admin/users/${u.dni}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ admin_dni: session.dni }),
      });
      setResetMsg(res.ok
        ? `✓ Contraseña reseteada a ${u.name}. En su próximo ingreso elige una nueva.`
        : "✗ Error al resetear");
      setTimeout(() => setResetMsg(""), 4000);
    } catch {
      setResetMsg("✗ Error de conexión");
    } finally { setResetting(null); }
  }

  async function analizarLimpieza() {
    if (!session) return;
    setCleanupBusy(true); setCleanupResult(null);
    try {
      const res = await fetch(`/api/admin/cleanup?dni=${session.dni}`);
      const data = await res.json();
      if (res.ok) setCleanupReport(data);
    } finally { setCleanupBusy(false); }
  }

  async function ejecutarLimpieza() {
    if (!session) return;
    setCleanupBusy(true);
    try {
      const res = await fetch("/api/admin/cleanup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dni: session.dni }),
      });
      const data = await res.json();
      if (res.ok) {
        setCleanupResult(data);
        setCleanupReport(null);
        setConfirmCleanup(false);
        loadMatches();
      }
    } finally { setCleanupBusy(false); }
  }

  async function saveEdit() {
    if (!editMatch || !session) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        dni: session.dni,
        team1: editTeam1 || undefined, team2: editTeam2 || undefined,
        match_date: editDate ? new Date(editDate).toISOString() : undefined,
        venue: editVenue || undefined,
      };
      if (editScore1 !== "" && editScore2 !== "") {
        body.score1 = Number(editScore1); body.score2 = Number(editScore2); body.status = "finished";
      }
      // En eliminatorias mandamos quién clasifica (incluso vacío, para poder borrarlo)
      if (editMatch.phase !== "group") {
        body.winner_team = editAdvancer || null;
      }
      const res = await fetch(`/api/admin/matches/${editMatch.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      if (res.ok) { setEditMatch(null); loadMatches(); }
    } finally { setSaving(false); }
  }

  const PHASES = [
    { key: "group", label: "Grupos" }, { key: "r32", label: "R32" },
    { key: "r16", label: "Octavos" }, { key: "qf", label: "Cuartos" },
    { key: "sf", label: "Semis" }, { key: "f", label: "Final" },
  ];

  return (
    <div className="min-h-screen bg-bg pb-24">
      <Navigation />

      <main className="max-w-lg mx-auto px-4 pt-3">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-black text-white">Panel Admin</h1>
            <p className="text-xs text-gray-600">N360</p>
          </div>
          <span className="text-[10px] font-bold text-[#f97316] bg-[#f97316]/10 border border-[#f97316]/20 px-2 py-1 rounded-full uppercase tracking-wide">Admin</span>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          {(["matches", "users"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                tab === t ? "bg-white text-black" : "bg-[#1a1a1a] text-gray-500 border border-[#242424]"
              }`}>
              {t === "matches" ? "Partidos" : "Usuarios"}
            </button>
          ))}
        </div>

        {tab === "matches" && (
          <>
            {/* Sync card */}
            <div className="bg-card border border-[#242424] rounded-2xl p-4 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-white">Sincronizar Fixture</p>
                  <p className="text-xs text-gray-600 mt-0.5">Actualiza partidos y resultados</p>
                </div>
                <button onClick={sync} disabled={syncing}
                  className="bg-[#22c55e] hover:bg-[#16a34a] disabled:opacity-50 text-black text-xs font-bold px-4 py-2 rounded-xl transition-all active:scale-95 flex items-center gap-1.5">
                  {syncing ? <><span className="w-3 h-3 border-2 border-black/30 border-t-black rounded-full animate-spin" />Sync...</> : "↻ Sincronizar"}
                </button>
              </div>
              {syncMsg && <p className={`text-xs mt-2 font-medium ${syncMsg.startsWith("✓") ? "text-[#22c55e]" : "text-red-400"}`}>{syncMsg}</p>}
            </div>

            {/* Mantenimiento: limpiar partidos huérfanos */}
            <div className="bg-card border border-[#242424] rounded-2xl p-4 mb-4">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white">Limpiar partidos huérfanos</p>
                  <p className="text-xs text-gray-600 mt-0.5">Saca partidos que no son del fixture oficial</p>
                </div>
                <button onClick={analizarLimpieza} disabled={cleanupBusy}
                  className="bg-[#1a1a1a] border border-[#2e2e2e] hover:border-[#3e3e3e] disabled:opacity-50 text-gray-300 text-xs font-bold px-4 py-2 rounded-xl transition-all active:scale-95">
                  {cleanupBusy && !confirmCleanup ? "Analizando..." : "Analizar"}
                </button>
              </div>

              {/* Reporte del análisis */}
              {cleanupReport && (
                <div className="mt-3 pt-3 border-t border-[#1a1a1a] text-xs space-y-1.5">
                  <p className="text-gray-400">Partidos en la base: <span className="text-white font-bold">{cleanupReport.total}</span></p>
                  <p className="text-[#22c55e]">✓ Oficiales (API): <span className="font-bold">{cleanupReport.apiCount}</span></p>
                  <p className="text-[#f97316]">⚠ Huérfanos: <span className="font-bold">{cleanupReport.orphanCount}</span>
                    {cleanupReport.orphanPredTotal > 0 && <span className="text-gray-500"> · {cleanupReport.orphanPredTotal} con pronósticos (se conservan)</span>}
                  </p>

                  {cleanupReport.orphanCount > 0 ? (
                    <div className="pt-2">
                      <p className="text-gray-500 mb-2">
                        Se hará un <span className="text-white font-semibold">backup completo</span> y se borrarán {cleanupReport.orphanDetail.filter(m => m.predictions === 0).length} huérfanos sin pronósticos.
                        Los partidos con pronósticos NO se tocan.
                      </p>
                      {!confirmCleanup ? (
                        <button onClick={() => setConfirmCleanup(true)}
                          className="w-full bg-[#f97316]/15 border border-[#f97316]/40 text-[#f97316] text-xs font-bold py-2.5 rounded-xl">
                          Hacer backup y limpiar
                        </button>
                      ) : (
                        <div className="flex gap-2">
                          <button onClick={() => setConfirmCleanup(false)} disabled={cleanupBusy}
                            className="flex-1 bg-[#1a1a1a] border border-[#2e2e2e] text-gray-400 text-xs font-bold py-2.5 rounded-xl">
                            Cancelar
                          </button>
                          <button onClick={ejecutarLimpieza} disabled={cleanupBusy}
                            className="flex-1 bg-[#f97316] hover:bg-[#ea580c] disabled:opacity-50 text-black text-xs font-black py-2.5 rounded-xl">
                            {cleanupBusy ? "Procesando..." : "Confirmar"}
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-[#22c55e] pt-1">✓ No hay partidos huérfanos. Todo limpio.</p>
                  )}
                </div>
              )}

              {/* Resultado de la limpieza */}
              {cleanupResult && (
                <div className="mt-3 pt-3 border-t border-[#1a1a1a] text-xs space-y-1">
                  <p className="text-[#22c55e] font-bold">✓ Limpieza completada</p>
                  <p className="text-gray-400">Backup guardado: <span className="text-white font-mono">{cleanupResult.backup}</span></p>
                  <p className="text-gray-400">Partidos borrados: <span className="text-white font-bold">{cleanupResult.deleted}</span></p>
                  <p className="text-gray-400">Oficiales restantes: <span className="text-white font-bold">{cleanupResult.apiMatches}</span></p>
                  {cleanupResult.keptWithPredictions > 0 && (
                    <p className="text-[#f97316]">⚠ {cleanupResult.keptWithPredictions} huérfanos con pronósticos se conservaron (revisalos manualmente).</p>
                  )}
                </div>
              )}
            </div>

            {/* Phase filter */}
            <div className="flex overflow-x-auto no-scrollbar gap-1.5 mb-3">
              {PHASES.map((p) => (
                <button key={p.key} onClick={() => setPhaseFilter(p.key)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                    phaseFilter === p.key ? "bg-[#f97316] text-black" : "bg-[#1a1a1a] text-gray-500 border border-[#242424]"
                  }`}>
                  {p.label}
                </button>
              ))}
            </div>

            {/* Matches */}
            <div className="space-y-2">
              {matches.map((m) => (
                <div key={m.id} className="bg-card border border-[#242424] rounded-xl p-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium truncate">
                      {m.team1_flag} {m.team1} <span className="text-gray-600">{m.score1 != null ? `${m.score1}-${m.score2}` : "vs"}</span> {m.team2} {m.team2_flag}
                    </p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {m.group_name ?? PHASE_LABELS[m.phase]} · {new Date(m.match_date).toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
                      {" · "}
                      <span className={m.status === "finished" ? "text-gray-700" : m.status === "live" ? "text-red-400" : "text-[#22c55e]"}>
                        {m.status === "finished" ? "Final" : m.status === "live" ? "En vivo" : "Programado"}
                      </span>
                    </p>
                  </div>
                  <button onClick={() => openEdit(m)}
                    className="flex-shrink-0 text-xs text-gray-400 hover:text-white border border-[#2e2e2e] hover:border-[#3e3e3e] px-2.5 py-1.5 rounded-lg transition-colors">
                    Editar
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === "users" && (
          <div className="bg-card border border-[#242424] rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[#1a1a1a]">
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">{users.length} participantes</p>
            </div>
            {resetMsg && (
              <div className={`px-4 py-2.5 text-xs font-medium border-b border-[#1a1a1a] ${resetMsg.startsWith("✓") ? "text-[#22c55e]" : "text-red-400"}`}>
                {resetMsg}
              </div>
            )}
            {users.map((u) => (
              <div key={u.dni} className="px-4 py-3 border-b border-[#111111] last:border-0 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm text-white font-medium truncate">
                    {u.name} {u.is_admin ? <span className="text-[10px] text-[#f97316] font-bold ml-1">ADMIN</span> : ""}
                  </p>
                  <p className="text-xs text-gray-600">DNI {u.dni} · {u.total_predictions} pronósticos · {new Date(u.created_at).toLocaleDateString("es-AR")}</p>
                </div>
                {!u.is_admin && (
                  <div className="flex-shrink-0 flex items-center gap-1.5">
                    <button
                      onClick={() => resetPassword(u)}
                      disabled={resetting === u.dni}
                      className="text-xs text-[#f97316] hover:text-[#fb923c] border border-[#f97316]/30 hover:border-[#f97316]/50 disabled:opacity-50 px-2.5 py-1.5 rounded-lg transition-colors"
                    >
                      {resetting === u.dni ? "..." : "Resetear"}
                    </button>
                    <button
                      onClick={() => setConfirmDelete(u)}
                      className="text-xs text-red-500 hover:text-red-400 border border-red-900/50 hover:border-red-700/50 px-2.5 py-1.5 rounded-lg transition-colors"
                    >
                      Eliminar
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end justify-center z-50">
          <div className="bg-[#111111] border border-[#2a2a2a] rounded-t-3xl w-full max-w-lg p-6 pb-8">
            <div className="w-10 h-1 bg-[#2e2e2e] rounded-full mx-auto mb-5" />
            <h3 className="text-white font-black text-base mb-1">Eliminar usuario</h3>
            <p className="text-gray-500 text-sm mb-1">
              ¿Seguro que querés eliminar a <span className="text-white font-semibold">{confirmDelete.name}</span>?
            </p>
            <p className="text-gray-700 text-xs mb-6">
              DNI {confirmDelete.dni} · Se borrarán sus {confirmDelete.total_predictions} pronósticos. Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(null)}
                className="flex-1 py-3.5 rounded-xl bg-[#1a1a1a] border border-[#2e2e2e] text-gray-400 text-sm font-bold">
                Cancelar
              </button>
              <button onClick={() => deleteUser(confirmDelete)} disabled={deleting}
                className="flex-1 py-3.5 rounded-xl bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-black">
                {deleting ? "Eliminando..." : "Sí, eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editMatch && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end justify-center z-50">
          <div className="bg-[#111111] border border-[#2a2a2a] rounded-t-3xl w-full max-w-lg p-6 pb-8">
            <div className="w-10 h-1 bg-[#2e2e2e] rounded-full mx-auto mb-5" />
            <h3 className="text-white font-black text-base mb-4">
              Editar · {editMatch.group_name ?? PHASE_LABELS[editMatch.phase]}
            </h3>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {[["Local", editTeam1, setEditTeam1], ["Visitante", editTeam2, setEditTeam2]].map(([label, val, setter]) => (
                  <div key={String(label)}>
                    <label className="text-[10px] text-gray-600 font-bold uppercase tracking-wider mb-1 block">{String(label)}</label>
                    <input value={String(val)} onChange={e => (setter as (v: string) => void)(e.target.value)}
                      className="w-full bg-[#1a1a1a] border border-[#2e2e2e] rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#f97316]" />
                  </div>
                ))}
              </div>

              <div>
                <label className="text-[10px] text-gray-600 font-bold uppercase tracking-wider mb-1 block">Resultado oficial</label>
                <div className="flex items-center gap-3">
                  <input type="number" min="0" max="30" value={editScore1} onChange={e => setEditScore1(e.target.value)} placeholder="—"
                    className="w-16 text-center bg-[#1a1a1a] border border-[#2e2e2e] rounded-xl py-3 text-white font-black text-xl focus:outline-none focus:border-[#f97316]" />
                  <span className="text-gray-600 font-black text-xl">-</span>
                  <input type="number" min="0" max="30" value={editScore2} onChange={e => setEditScore2(e.target.value)} placeholder="—"
                    className="w-16 text-center bg-[#1a1a1a] border border-[#2e2e2e] rounded-xl py-3 text-white font-black text-xl focus:outline-none focus:border-[#f97316]" />
                  <p className="text-xs text-gray-700 flex-1">Dejá vacío si el partido aún no terminó</p>
                </div>
              </div>

              {editMatch.phase !== "group" && (
                <div>
                  <label className="text-[10px] text-gray-600 font-bold uppercase tracking-wider mb-1 block">
                    ¿Quién clasifica? <span className="text-gray-700 normal-case font-medium">(en caso de empate / penales)</span>
                  </label>
                  <div className="flex gap-2">
                    {([
                      ["team1", `${editMatch.team1_flag} ${editTeam1 || editMatch.team1}`],
                      ["team2", `${editMatch.team2_flag} ${editTeam2 || editMatch.team2}`],
                      ["", "Sin definir"],
                    ] as const).map(([val, label]) => {
                      const active = editAdvancer === val;
                      return (
                        <button key={val || "none"} type="button"
                          onClick={() => setEditAdvancer(val as "team1" | "team2" | "")}
                          className={`flex-1 py-2.5 px-2 rounded-xl text-xs font-bold truncate transition-all ${
                            active ? "bg-[#f97316] text-black" : "bg-[#1a1a1a] border border-[#2e2e2e] text-gray-400"
                          }`}>
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <label className="text-[10px] text-gray-600 font-bold uppercase tracking-wider mb-1 block">Fecha y hora</label>
                <input type="datetime-local" value={editDate} onChange={e => setEditDate(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#2e2e2e] rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#f97316]" />
              </div>

              <div>
                <label className="text-[10px] text-gray-600 font-bold uppercase tracking-wider mb-1 block">Estadio</label>
                <input value={editVenue} onChange={e => setEditVenue(e.target.value)} placeholder="Ej: MetLife Stadium"
                  className="w-full bg-[#1a1a1a] border border-[#2e2e2e] rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#f97316]" />
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <button onClick={() => setEditMatch(null)}
                className="flex-1 py-3.5 rounded-xl bg-[#1a1a1a] border border-[#2e2e2e] text-gray-400 text-sm font-bold">
                Cancelar
              </button>
              <button onClick={saveEdit} disabled={saving}
                className="flex-1 py-3.5 rounded-xl bg-[#f97316] hover:bg-[#ea580c] disabled:opacity-50 text-black text-sm font-black">
                {saving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminPage() {
  return (
    <AuthGuard adminOnly>
      <AdminContent />
    </AuthGuard>
  );
}
