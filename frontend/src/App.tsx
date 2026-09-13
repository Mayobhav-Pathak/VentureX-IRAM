// frontend/src/App.tsx
import React, { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Layers,
  Lock,
  LogOut,
  ShieldCheck,
  Train,
  TrendingUp,
  User,
} from "lucide-react";

import { supabase } from "./supabaseClient";
import { BlockInspector, DepartmentLegend } from "./components/BlockInspector";
import {
  ConflictAuditPanel,
  type ConflictAuditRecord,
  type ConflictRecord,
} from "./components/ConflictAuditPanel";
import { WeeklyGanttChip } from "./components/GanttChipRiskBadges";
import { CorridorMetroTrack } from "./components/CorridorMetroTrack";
import { StrategicMonthlyRollup } from "./components/MonthlyStrategicRollup";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

interface CorridorSection {
  id: string;
  name: string;
}

const CORRIDOR_SECTIONS: CorridorSection[] = [
  { id: "NDLS-TKD", name: "New Delhi - Tuglakabad" },
  { id: "TKD-FDB", name: "Tuglakabad - Faridabad" },
  { id: "FDB-PWL", name: "Faridabad - Palwal" },
  { id: "PWL-KSV", name: "Palwal - Kosi Kalan" },
  { id: "KSV-MTJ", name: "Kosi Kalan - Mathura" },
  { id: "MTJ-AGC", name: "Mathura - Agra Cantt" },
];

export interface BlockJob {
  id: string;
  asset_id: string;
  section_id: string;
  department: "ENG" | "SNT" | "TRD";
  title: string;
  duration_mins: number;
}

export interface MaintenanceBlock {
  id: string;
  section_id: string;
  title: string;
  start_time: string;
  end_time: string;
  departments: ("ENG" | "SNT" | "TRD")[];
  is_bundled: boolean;
  is_conflict: boolean;
  jobs: BlockJob[];
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);

  const [horizon, setHorizon] = useState<"weekly" | "monthly">("weekly");
  const [blocks, setBlocks] = useState<MaintenanceBlock[]>([]);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [pendingConflicts, setPendingConflicts] = useState<ConflictRecord[]>([]);
  const [auditLog, setAuditLog] = useState<ConflictAuditRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Supabase Auth listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    const { error } = await supabase.auth.signInWithPassword({
      email: authEmail,
      password: authPassword,
    });
    if (error) setAuthError(error.message);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  // Fetch Schedule & Jobs
  const fetchScheduleAndJobs = async (currentHorizon: "weekly" | "monthly") => {
    setIsLoading(true);
    try {
      const [schedRes, jobsRes] = await Promise.all([
        fetch(`${API_BASE}/schedule?horizon=${currentHorizon}`),
        fetch(`${API_BASE}/jobs`),
      ]);

      if (!schedRes.ok || !jobsRes.ok) {
        throw new Error("Failed to load operations data");
      }

      const rawBlocks = await schedRes.json();
      const rawJobs = await jobsRes.json();

      const jobsMap = new Map<string, any>();
      rawJobs.forEach((j: any) => jobsMap.set(j.id, j));

      const formattedBlocks: MaintenanceBlock[] = rawBlocks.map((b: any) => {
        const assignedJobs: BlockJob[] = (b.assigned_job_ids || []).map((jid: string) => {
          const match = jobsMap.get(jid);
          return match
            ? {
                id: match.id,
                asset_id: match.asset_id || "TRK-ASSET",
                section_id: match.section_id,
                department: match.department,
                title: match.defect_code,
                duration_mins: match.duration_mins,
              }
            : {
                id: jid,
                asset_id: "TRK-ASSET",
                section_id: b.section_id,
                department: b.department_list?.[0] ?? "ENG",
                title: jid,
                duration_mins: 120,
              };
        });

        return {
          id: b.id,
          section_id: b.section_id,
          title: assignedJobs[0]?.title ?? b.id,
          start_time: b.start_time,
          end_time: b.end_time,
          departments: b.department_list || ["ENG"],
          is_bundled: b.is_bundled,
          is_conflict: b.is_conflict,
          jobs: assignedJobs,
        };
      });

      setBlocks(formattedBlocks);

      if (
        formattedBlocks.length > 0 &&
        (!selectedBlockId || !formattedBlocks.find((b) => b.id === selectedBlockId))
      ) {
        setSelectedBlockId(formattedBlocks[0].id);
        setSelectedJobId(formattedBlocks[0].jobs[0]?.id ?? null);
      }
    } catch (err) {
      console.error("Schedule error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch Conflicts
  const fetchConflicts = async () => {
    try {
      const [pendingRes, resolvedRes] = await Promise.all([
        fetch(`${API_BASE}/conflicts?status=pending`),
        fetch(`${API_BASE}/conflicts?status=resolved`),
      ]);

      if (pendingRes.ok) {
        const pData = await pendingRes.json();
        setPendingConflicts(
          pData.map((c: any) => ({
            id: c.id,
            section_id: c.section_id,
            departments: c.competing_jobs.map((j: any) => j.department),
            created_at: c.window_start,
          }))
        );
      }

      if (resolvedRes.ok) {
        const rData = await resolvedRes.json();
        setAuditLog(
          rData.map((c: any) => ({
            id: c.id,
            section_id: c.section_id,
            departments: c.competing_jobs.map((j: any) => j.department),
            resolution:
              c.resolution_action === "bundle"
                ? `Bundled Together (${c.time_saved_mins ?? 0}m saved)`
                : c.resolution_action === "reschedule"
                ? "Rescheduled (+180m)"
                : "Priority Override",
            resolved_at: c.resolved_at || new Date().toISOString(),
          }))
        );
      }
    } catch (err) {
      console.error("Conflict fetch error:", err);
    }
  };

  useEffect(() => {
    fetchScheduleAndJobs(horizon);
    fetchConflicts();
  }, [horizon]);

  // Dynamic Day Headers: 7 days for weekly, 30 days for monthly
  const activeTimelineDays = useMemo(() => {
    const totalDays = horizon === "weekly" ? 7 : 30;
    const dates: Date[] = [];
    const base = new Date();
    base.setHours(0, 0, 0, 0);

    for (let i = 0; i < totalDays; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      dates.push(d);
    }
    return dates;
  }, [horizon]);

  const totalPossessionHours = useMemo(() => {
    const totalMinutes = blocks.reduce((acc, b) => {
      const diff = new Date(b.end_time).getTime() - new Date(b.start_time).getTime();
      return acc + Math.max(diff / (60 * 1000), 0);
    }, 0);
    return (totalMinutes / 60).toFixed(1);
  }, [blocks]);

  const selectedBlock = useMemo(
    () => blocks.find((b) => b.id === selectedBlockId) ?? null,
    [blocks, selectedBlockId]
  );

  // Authentication Loading State
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f2f5f9] text-[#0b4f8a]">
        <div className="flex items-center gap-3 font-semibold text-sm">
          <div className="h-6 w-6 animate-spin rounded-full border-3 border-[#0b4f8a] border-t-transparent" />
          <span>Verifying IRCTC Railway Operational Credentials...</span>
        </div>
      </div>
    );
  }

  // IRCTC Themed Authentication Screen
  if (!session) {
    return (
      <div className="min-h-screen bg-[#f3f6fa] flex flex-col font-sans">
        {/* IRCTC Top Alert Ribbon */}
        <div className="bg-[#f37021] text-white px-6 py-1.5 text-xs font-semibold flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2 truncate">
            <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider">
              CRIS ADVISORY
            </span>
            <span>
              Restricted Portal: Access reserved strictly for Indian Railways Possession Controllers & Section Engineers.
            </span>
          </div>
          <div className="hidden md:flex items-center gap-4 text-[11px] font-mono">
            <span>{new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" })}</span>
            <span>|</span>
            <span>IR-RAMS SECURE GATEWAY</span>
          </div>
        </div>

        {/* IRCTC Blue Brand Nav Banner */}
        <header className="bg-[#0b4f8a] text-white px-8 py-3.5 shadow-md flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-full bg-white flex items-center justify-center shadow">
              <Train className="h-6 w-6 text-[#0b4f8a]" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-wide leading-tight">
                INDIAN RAILWAYS CAUTION & POSSESSION SYSTEM
              </h1>
              <p className="text-[11px] text-blue-100 font-medium">
                Integrated Corridor Asset Maintenance & Conflict Resolution Engine
              </p>
            </div>
          </div>
          <span className="hidden sm:inline-block text-xs font-semibold bg-[#f37021] px-3 py-1 rounded shadow text-white">
            ZONE: NORTHERN RAILWAY (NR)
          </span>
        </header>

        {/* Login Hero Content */}
        <div className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="bg-linear-to-r from-[#0b4f8a] to-[#1268b3] px-6 py-5 text-white">
              <div className="flex items-center gap-2 text-[#f37021]">
                <ShieldCheck className="h-6 w-6 text-orange-400" />
                <span className="text-xs uppercase font-extrabold tracking-widest text-orange-200">
                  Controller Single Sign-On
                </span>
              </div>
              <h2 className="text-xl font-bold mt-1">Section Controller Login</h2>
              <p className="text-xs text-blue-100 mt-0.5">
                Delhi–Agra Saturated Corridor (NDLS - AGC)
              </p>
            </div>

            <form onSubmit={handleLogin} className="p-6 space-y-4">
              {authError && (
                <div className="rounded border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700">
                  {authError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Official Email ID
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="controller@railway.gov.in"
                    className="w-full rounded-md border border-slate-300 pl-9 pr-3 py-2 text-sm text-slate-900 focus:border-[#0b4f8a] focus:ring-1 focus:ring-[#0b4f8a] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Controller Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full rounded-md border border-slate-300 pl-9 pr-3 py-2 text-sm text-slate-900 focus:border-[#0b4f8a] focus:ring-1 focus:ring-[#0b4f8a] focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full mt-2 cursor-pointer rounded-md bg-[#f37021] hover:bg-[#d95e14] py-2.5 text-sm font-bold text-white shadow transition flex items-center justify-center gap-2"
              >
                <span>AUTHENTICATE & ENTER CORRIDOR</span>
              </button>

              <div className="border-t border-slate-100 pt-4 text-center">
                <span className="text-[11px] text-slate-500">
                  Secured with IR-RAMS SECURE GATEWAY . Unauthorized access is strictly prohibited.
                </span>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated IRCTC Application Dashboard
  return (
    <div className="min-h-screen bg-[#f3f6fa] text-slate-900 flex flex-col font-sans">
      {/* Top Advisory Strip */}
      <div className="bg-[#f37021] text-white px-6 py-1 text-xs font-medium flex items-center justify-between">
        <div className="flex items-center gap-2 truncate">
          <span className="bg-white/20 px-1.5 py-0.2 rounded font-bold text-[10px]">LIVE</span>
          <span>Delhi–Agra Chord & Trunk Sections: 20 possessions queued for today. High freight density logged on TKD-PWL.</span>
        </div>
        <div className="hidden lg:flex items-center gap-3 text-[11px] font-mono">
          <span>13-SEP-2026</span>
          <span>|</span>
          <span>SYSTEM READY</span>
        </div>
      </div>

      {/* Main IRCTC Header Bar */}
      <header className="bg-[#0b4f8a] text-white sticky top-0 z-30 shadow-md">
        <div className="mx-auto flex w-full max-w-[98%] items-center justify-between px-4 py-2.5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center text-[#0b4f8a] shadow">
              <Train className="h-6 w-6" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold tracking-wider uppercase text-orange-300">
                DELHI–AGRA SATURATED CORRIDOR (199.3 KM)
              </span>
              <h1 className="text-lg font-black tracking-tight leading-none text-white">
                Maintenance Possession Controller
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Horizon Switcher */}
            <div className="flex rounded-md bg-white/10 p-1 border border-white/20">
              <button
                type="button"
                onClick={() => setHorizon("weekly")}
                className={`cursor-pointer rounded px-3 py-1 text-xs font-bold transition ${
                  horizon === "weekly"
                    ? "bg-[#f37021] text-white shadow"
                    : "text-blue-100 hover:text-white"
                }`}
              >
                7-Day Tactical (Weekly)
              </button>
              <button
                type="button"
                onClick={() => setHorizon("monthly")}
                className={`cursor-pointer rounded px-3 py-1 text-xs font-bold transition ${
                  horizon === "monthly"
                    ? "bg-[#f37021] text-white shadow"
                    : "text-blue-100 hover:text-white"
                }`}
              >
                30-Day Strategic (Monthly)
              </button>
            </div>

            {/* Controller Profile & Logout */}
            <div className="flex items-center gap-3 border-l border-white/20 pl-4">
              <div className="text-right">
                <p className="text-xs font-bold text-white">{session.user.email}</p>
                <p className="text-[10px] text-orange-300 font-semibold uppercase">Authorized Controller</p>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                title="Log Out"
                className="cursor-pointer rounded bg-white/10 p-2 text-white hover:bg-rose-600 transition"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
       <main className="mx-auto max-w-[98%] w-full px-4 py-4 space-y-4 flex-1">
        {/* KPI Strip */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-[#0b4f8a]">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Possession Hours</p>
              <p className="text-2xl font-black text-[#0b4f8a]">{totalPossessionHours}h</p>
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Backlog Cleared</p>
              <p className="text-2xl font-black text-emerald-700">94.2%</p>
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 text-[#f37021]">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Corridor Uptime</p>
              <p className="text-2xl font-black text-[#f37021]">98.6%</p>
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pending Conflicts</p>
              <p className="text-2xl font-black text-rose-600">{pendingConflicts.length}</p>
            </div>
          </div>
        </section>

        {/* Legend Toolbar */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-[#0b4f8a]" />
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
              Corridor Department Allocation
            </span>
          </div>
          <DepartmentLegend />
        </div>

         {/* Workspace Layout */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        {/* Main Matrix Area (9 Cols) */}
        <div className="xl:col-span-9 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col md:flex-row min-w-0">
            {/* 1. Connected Metro Map Corridor Schematic (Pins to left) */}
            <CorridorMetroTrack
              selectedSectionId={selectedBlock?.section_id}
              onSelectSection={(secId) => {
                const found = blocks.find((b) => b.section_id === secId);
                if (found) setSelectedBlockId(found.id);
              }}
            />

            {/* 2. Coarse vs Tactical Altitude Branch */}
            {horizon === "weekly" ? (
              /* 7-DAY TACTICAL HOURLY GANTT MATRIX */
              <div className="flex-1 flex flex-col overflow-x-auto min-w-0">
                {/* Subheader */}
                <div className="border-b border-slate-200 bg-[#f8fafc] px-4 py-2.5 flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase text-[#0b4f8a] tracking-wider font-railway">
                    7-Day Tactical Schedule • Fine-Grained Corridor Windows
                  </span>
                  <span className="text-[11px] font-mono font-bold text-slate-500">
                    {activeTimelineDays.length} Operational Days
                  </span>
                </div>

                {/* Day Columns Header */}
                <div className="flex border-b border-slate-200 bg-slate-100 text-[11px] font-bold text-slate-700 font-railway uppercase">
                  {activeTimelineDays.map((d) => (
                    <div
                      key={d.toISOString()}
                      className="flex-1 p-2 text-center bg-slate-50 border-r border-slate-200 last:border-r-0"
                    >
                      <p className="text-[10px] text-slate-500 uppercase">
                        {d.toLocaleDateString("en-US", { weekday: "short" })}
                      </p>
                      <p className="font-bold text-slate-800">
                        {d.toLocaleDateString("en-US", { day: "2-digit", month: "short" })}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Tactical Day Rows */}
                {isLoading ? (
                  <div className="flex h-96 items-center justify-center text-xs text-slate-400 font-medium">
                    Loading possession blocks from Supabase...
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 flex-1">
                    {CORRIDOR_SECTIONS.map((section) => {
                      const sectionBlocks = blocks.filter((b) => b.section_id === section.id);

                      return (
                        <div key={section.id} className="flex min-h-20.5 hover:bg-slate-50/50 transition">
                          {activeTimelineDays.map((day) => {
                            const dayStart = new Date(day);
                            dayStart.setHours(0, 0, 0, 0);
                            const dayEnd = new Date(day);
                            dayEnd.setHours(23, 59, 59, 999);

                            const slotBlocks = sectionBlocks.filter((b) => {
                              const bTime = new Date(b.start_time).getTime();
                              return bTime >= dayStart.getTime() && bTime <= dayEnd.getTime();
                            });

                            return (
                              <div
                                key={day.toISOString()}
                                className="flex-1 p-1.5 flex flex-col gap-1.5 border-r border-slate-100 last:border-r-0 justify-center min-w-0"
                              >
                                {slotBlocks.map((blk) => (
                                  <WeeklyGanttChip
                                    key={blk.id}
                                    blockId={blk.id}
                                    sectionName={section.name}
                                    departments={blk.departments}
                                    startTime={blk.start_time}
                                    endTime={blk.end_time}
                                    isBundled={blk.is_bundled}
                                    className={`w-full ${
                                      selectedBlockId === blk.id
                                        ? "ring-2 ring-[#0b4f8a] ring-offset-1"
                                        : ""
                                    }`}
                                    onClick={() => {
                                      setSelectedBlockId(blk.id);
                                      setSelectedJobId(blk.jobs[0]?.id ?? null);
                                    }}
                                  />
                                ))}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              /* 30-DAY STRATEGIC MACRO ROLLUP VIEW */
              <StrategicMonthlyRollup
  blocks={blocks}
  selectedBlockId={selectedBlockId}
  selectedSectionId={selectedBlock?.section_id || "ALL"}
  onSelectBlock={(blkId, jobId) => {
    setSelectedBlockId(blkId);
    if (jobId) setSelectedJobId(jobId);
  }}
  onSelectSection={(secId) => {
    const found = blocks.find((b) => b.section_id === secId);
    if (found) setSelectedBlockId(found.id);
  }}
/>
            )}
          </div>
          {/* Inspector Panel (3 Cols) */}
        <div className="xl:col-span-3 min-w-0">
            <BlockInspector
              selectedBlock={selectedBlock}
              selectedJobId={selectedJobId}
              onSelectJob={(jobId) => setSelectedJobId(jobId)}
            />
          </div>
        </div>

        {/* Conflict Audit & Resolution Panel */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <ConflictAuditPanel
            pendingConflicts={pendingConflicts}
            auditLog={auditLog}
            onOpenConflict={(conflictId) => {
              setSelectedBlockId(conflictId);
            }}
            onResetComplete={async () => {
              await fetchScheduleAndJobs(horizon);
              await fetchConflicts();
            }}
          />
        </div>
      </main>
    </div>
  );
}