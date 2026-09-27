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
import { CorridorMetroTrack } from "./components/CorridorMetroTrack";
import { StrategicMonthlyRollup } from "./components/MonthlyStrategicRollup";
import RailwaySchedulePanel from "./components/RailwayGanttPanel";
import { KpiDerivationModal, type KpiMetricType } from "./components/KpiDerivationModal";

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
  const [activeKpiModal, setActiveKpiModal] = useState<KpiMetricType | null>(null);

  const [horizon, setHorizon] = useState<"weekly" | "monthly">("weekly");
  const [blocks, setBlocks] = useState<MaintenanceBlock[]>([]);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [pendingConflicts, setPendingConflicts] = useState<ConflictRecord[]>([]);
  const [auditLog, setAuditLog] = useState<ConflictAuditRecord[]>([]);
  const [, setIsLoading] = useState(false);
  const [emergencyStats, setEmergencyStats] = useState<{ ms: number; displacedCount: number } | null>(null);
  const [isInjectingEmergency, setIsInjectingEmergency] = useState(false);

  // Live Corridor Uptime State (Initialized with backend baseline defaults)
  const [uptimeMetrics, setUptimeMetrics] = useState<DynamicUptimeState>({
  corridor_uptime_pct: 0,
  total_equivalent_closure_hours: 0,
  tsr_impact_hours: 0,
  total_capacity_hours: 0,
  horizon_hours: 168,
  active_blocks_count: 0,
  single_line_retention_pct: 60.0,
  derivation_steps: [],
});
  const [, setIsUptimeLoading] = useState(false);

const [roiMetrics, setRoiMetrics] = useState<DynamicRoiState>({
  formatted_inr: "Calculating...",
  base_demurrage_saved_inr: 0,
  crew_idle_savings_inr: 0,
  total_financial_savings_inr: 0,
  derivation_formula: "",
  official_citation: "",
});

const fetchUptimeMetrics = async (currentHorizon: "weekly" | "monthly") => {
  const days = currentHorizon === "weekly" ? 7 : 30;
  setIsUptimeLoading(true);
  try {
    const res = await fetch(`${API_BASE}/api/corridor/uptime?horizon_days=${days}`);
    if (res.ok) {
      const data = await res.json();
      setUptimeMetrics(data);
    }
  } catch (err) {
    console.error("Uptime fetch error:", err);
  } finally {
    setIsUptimeLoading(false);
  }
};

const fetchFinancialRoi = async () => {
  try {
    const res = await fetch(`${API_BASE}/metrics/financial-roi`);
    if (res.ok) {
      const data = await res.json();
      setRoiMetrics(data);
    }
  } catch (err) {
    console.error("ROI fetch error:", err);
  }
};
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

  // Fetch Live Corridor Uptime from FastAPI Engine
  

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

const [showEmergencyModal, setShowEmergencyModal] = useState(false);
const [emergencyForm, setEmergencyForm] = useState({
  section_id: "PWL-KSV",
  km_marker: 84.2,
  line: "BOTH" as "UP" | "DOWN" | "BOTH",
  duration_mins: 90,
  requires_traction_isolation: true,
  isolation_buffer_mins: 20,
});

const handleInjectEmergencyJob = async (e?: React.FormEvent) => {
  if (e) e.preventDefault();
  setIsInjectingEmergency(true);
  try {
    const res = await fetch(`${API_BASE}/demo/inject-emergency-job`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(emergencyForm),
    });
    if (!res.ok) throw new Error("Emergency injection endpoint failed");

    const data = await res.json();
    setEmergencyStats({
      ms: Number(data.execution_time_ms) || 0,
      displacedCount: Array.isArray(data.displaced_jobs) ? data.displaced_jobs.length : 0,
    });
    setShowEmergencyModal(false);

    // Refresh all views
    await Promise.all([
      fetchScheduleAndJobs(horizon),
      fetchConflicts(),
      fetchUptimeMetrics(horizon),
    ]);
  } catch (err) {
    console.error("Emergency fracture simulation error:", err);
  } finally {
    setIsInjectingEmergency(false);
  }
};

  useEffect(() => {
    fetchScheduleAndJobs(horizon);
    fetchConflicts();
    fetchUptimeMetrics(horizon);
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

const refreshAllData = async () => {
  await Promise.all([
    fetchScheduleAndJobs(horizon),
    fetchConflicts(),
    fetchUptimeMetrics(horizon),
    fetchFinancialRoi(),
  ]);
};

useEffect(() => {
  refreshAllData();
}, [horizon]);


interface DynamicUptimeState {
  corridor_uptime_pct: number;
  total_equivalent_closure_hours: number;
  tsr_impact_hours: number;
  total_capacity_hours: number;
  horizon_hours: number;
  active_blocks_count: number;
  single_line_retention_pct: number;
  derivation_steps: string[];
}

interface DynamicRoiState {
  formatted_inr: string;
  base_demurrage_saved_inr: number;
  crew_idle_savings_inr: number;
  total_financial_savings_inr: number;
  derivation_formula: string;
  official_citation: string;
}

useEffect(() => {
  fetch(`${API_BASE}/metrics/financial-roi`)
    .then((res) => res.json())
    .then((data) => {
      if (data?.formatted_inr) fetchFinancialRoi();
    })
    .catch((err) => console.warn("ROI fetch fallback:", err));
}, []);

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
      {/* Top Advisory Strip & Live Emergency Injection Trigger */}
<div className="bg-[#f37021] text-white px-4 py-1.5 text-xs font-medium flex items-center justify-between shadow-xs">
  <div className="flex items-center gap-2 truncate">
    <span className="bg-white/20 px-1.5 py-0.5 rounded font-bold text-[10px] tracking-wide">
      LIVE ADVISORY
    </span>
    <span className="truncate">
      Delhi–Agra Chord & Trunk Sections: High freight density on TKD-PWL. 20 possessions queued.
    </span>
  </div>

  <div className="flex items-center gap-3 shrink-0">
    {/* Real-time Sub-Second Solver Metric Badge */}
    {emergencyStats && (
      <span className="hidden sm:inline-flex items-center gap-1.5 bg-emerald-950/40 text-emerald-200 border border-emerald-300/40 px-2 py-0.5 rounded text-[11px] font-mono">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
        CP-SAT Solved in <b>{emergencyStats.ms.toFixed(1)}ms</b> ({emergencyStats.displacedCount} displaced)
      </span>
    )}

    <button
  type="button"
  onClick={() => setShowEmergencyModal(true)}
  title="Open Emergency Rail Fracture Allocation Console"
  className="cursor-pointer bg-red-700 hover:bg-red-800 text-white font-black text-[11px] px-2.5 py-1 rounded shadow flex items-center gap-1.5 transition active:scale-95 border border-red-400"
>
  <AlertTriangle className="h-3.5 w-3.5" />
  <span>CONFIGURE EMERGENCY FRACTURE</span>
</button>

    <div className="hidden lg:flex items-center gap-2 text-[11px] font-mono border-l border-white/20 pl-3">
      <span>SYSTEM READY</span>
    </div>
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
        {/* Dynamic Clickable KPI Strip */}
<section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 select-none">
  {/* 1. Dynamic Possession Hours */}
  <div
    role="button"
    onClick={() => setActiveKpiModal("possession_hours")}
    title="Click to view mathematical derivation of possession hours"
    className="group flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-[#0b4f8a] hover:shadow-md cursor-pointer transition"
  >
    <div className="flex items-center gap-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-[#0b4f8a] group-hover:scale-110 transition">
        <Clock className="h-6 w-6" />
      </div>
      <div>
        <div className="flex items-center gap-1.5">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Possession Hours</p>
          <span className="text-[9px] font-semibold text-blue-600 bg-blue-50 px-1 py-0.2 rounded opacity-0 group-hover:opacity-100 transition">
            DERIVATION
          </span>
        </div>
        <div className="flex items-baseline gap-1 mt-0.5">
          <p className="text-2xl font-black text-[#0b4f8a]">
            {uptimeMetrics.total_equivalent_closure_hours.toFixed(1)}h
          </p>
        </div>
      </div>
    </div>
  </div>

  {/* 2. Monthly Financial Cost Recovery */}
  <div
    role="button"
    onClick={() => setActiveKpiModal("financial_roi")}
    title="Click to view Ministry of Railways Demurrage and Crew Avoidance formula"
    className="group flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-emerald-600 hover:shadow-md cursor-pointer transition"
  >
    <div className="flex items-center gap-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 group-hover:scale-110 transition">
        <CheckCircle2 className="h-6 w-6" />
      </div>
      <div>
        <div className="flex items-center gap-1.5">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Financial Cost Recovery</p>
          <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded opacity-0 group-hover:opacity-100 transition">
            AUDIT
          </span>
        </div>
        <p className="text-xl font-black text-emerald-700 mt-0.5">{roiMetrics.formatted_inr}</p>
        <span className="text-[10px] text-slate-400 font-medium">Demurrage & Crew Avoidance</span>
      </div>
    </div>
  </div>

  {/* 3. Dynamic Corridor Uptime with Speed Restriction (TSR) Badge */}
  <div
    role="button"
    onClick={() => setActiveKpiModal("corridor_uptime")}
    title="Click to view uptime calculation with TSR speed restriction impact"
    className="group flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-[#f37021] hover:shadow-md cursor-pointer transition"
  >
    <div className="flex items-center gap-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 text-[#f37021] group-hover:scale-110 transition">
        <TrendingUp className="h-6 w-6" />
      </div>
      <div>
        <div className="flex items-center gap-1.5">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Corridor Uptime</p>
          <span className="text-[9px] font-semibold text-orange-600 bg-orange-50 px-1 py-0.2 rounded opacity-0 group-hover:opacity-100 transition">
            FORMULA
          </span>
        </div>
        <div className="flex items-baseline gap-2 mt-0.5">
          <p className="text-2xl font-black text-[#f37021]">
            {uptimeMetrics.corridor_uptime_pct.toFixed(2)}%
          </p>
          {uptimeMetrics.tsr_impact_hours > 0 ? (
            <span className="text-[10px] bg-amber-100 text-amber-900 font-bold px-1.5 py-0.5 rounded">
              TSR ACTIVE
            </span>
          ) : (
            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-1.5 py-0.5 rounded">
              OPTIMAL
            </span>
          )}
        </div>
      </div>
    </div>
  </div>

  {/* 4. Pending Conflicts */}
  <div
    role="button"
    onClick={() => setActiveKpiModal("pending_conflicts")}
    title="Click to view G&SR 3.51 boundary lockout audit details"
    className="group flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-rose-600 hover:shadow-md cursor-pointer transition"
  >
    <div className="flex items-center gap-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-50 text-rose-600 group-hover:scale-110 transition">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <div>
        <div className="flex items-center gap-1.5">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pending Conflicts</p>
          <span className="text-[9px] font-semibold text-rose-600 bg-rose-50 px-1 py-0.2 rounded opacity-0 group-hover:opacity-100 transition">
            RULES
          </span>
        </div>
        <p className="text-2xl font-black text-rose-600 mt-0.5">{pendingConflicts.length}</p>
      </div>
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
            <CorridorMetroTrack
             blocks={blocks} 
            selectedSectionId={selectedBlock?.section_id}
            onSelectSection={(secId) => {
            const found = blocks.find((b) => b.section_id === secId);
            if (found) setSelectedBlockId(found.id);
            }}
          />

            {/* 2. Coarse vs Tactical Altitude Branch */}
            {horizon === "weekly" ? (
  <div className="flex-1 min-w-0">
    <RailwaySchedulePanel
      sections={CORRIDOR_SECTIONS}
      viewStart={activeTimelineDays[0] || new Date()}
      viewEnd={activeTimelineDays[activeTimelineDays.length - 1] || new Date()}
      selectedBlockId={selectedBlockId}
      onSelectBlock={(b) => {
        setSelectedBlockId(b.id);
        const originalBlock = blocks.find((blk) => blk.id === b.id);
        if (originalBlock && originalBlock.jobs.length > 0) {
          setSelectedJobId(originalBlock.jobs[0].id);
        }
      }}
      blocks={blocks.map((b) => ({
        id: b.id,
        section_id: b.section_id,
        line: (b as any).line || (b.id.includes("UP") ? "UP" : b.id.includes("DOWN") ? "DOWN" : "BOTH"),
        start_time: b.start_time,
        end_time: b.end_time,
        title: b.title,
        department: b.departments[0] || "ENG",
        departments: b.departments || ["ENG"], // Passes departments for diagonal stripes
        is_bundled: b.is_bundled,               // Displays diagonal multi-dept background
        is_conflict: b.is_conflict,             // Triggers warning pulse + exclamation badge
        has_isolation_buffer: (b as any).has_isolation_buffer ?? (b.departments.includes("ENG") || b.departments.includes("TRD")),
        isolation_buffer_mins: 20,
        post_block_tsr_speed_kmph: (b as any).post_block_tsr_speed_kmph ?? 30,
        tsr_duration_hours: (b as any).tsr_duration_hours ?? 2.0,
      }))}
    />
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
    // Instantly refreshes blocks, conflicts, and uptime on the chart
    await Promise.all([
      fetchScheduleAndJobs(horizon),
      fetchConflicts(),
      fetchUptimeMetrics(horizon),
    ]);
  }}
/>
        </div>
      </main>
      {/* Interactive Emergency Allocation Modal */}
{showEmergencyModal && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
    <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl border border-red-200 overflow-hidden">
      {/* Header */}
      <div className="bg-linear-to-r from-red-700 to-rose-800 px-5 py-3.5 text-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-300" />
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider">
              Emergency Track Possession Injection
            </h3>
            <p className="text-[11px] text-red-100">
              Deterministic Google OR-Tools Preemption & Rescheduling Engine
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowEmergencyModal(false)}
          className="text-white/80 hover:text-white text-lg font-bold p-1 cursor-pointer"
        >
          ✕
        </button>
      </div>

      {/* Form Body */}
      <form onSubmit={handleInjectEmergencyJob} className="p-5 space-y-4">
        {/* Section Target */}
        <div>
          <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
            Target Corridor Section
          </label>
          <select
            value={emergencyForm.section_id}
            onChange={(e) => {
              const sec = CORRIDOR_SECTIONS.find((s) => s.id === e.target.value);
              setEmergencyForm({
                ...emergencyForm,
                section_id: e.target.value,
                km_marker: sec ? (e.target.value === "NDLS-TKD" ? 8.4 : 84.2) : 84.2,
              });
            }}
            className="w-full rounded border border-slate-300 p-2 text-xs font-semibold text-slate-900 focus:border-red-600 focus:outline-none"
          >
            {CORRIDOR_SECTIONS.map((sec) => (
              <option key={sec.id} value={sec.id}>
                {sec.name} ({sec.id})
              </option>
            ))}
          </select>
        </div>

        {/* Chainage KM & Track Line Segregation */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
              Kilometer Chainage
            </label>
            <input
              type="number"
              step="0.1"
              value={emergencyForm.km_marker}
              onChange={(e) =>
                setEmergencyForm({ ...emergencyForm, km_marker: parseFloat(e.target.value) || 0 })
              }
              className="w-full rounded border border-slate-300 p-2 text-xs font-mono font-bold text-slate-900 focus:border-red-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
              Line Restriction
            </label>
            <select
              value={emergencyForm.line}
              onChange={(e) =>
                setEmergencyForm({ ...emergencyForm, line: e.target.value as "UP" | "DOWN" | "BOTH" })
              }
              className="w-full rounded border border-slate-300 p-2 text-xs font-bold text-slate-900 focus:border-red-600 focus:outline-none"
            >
              <option value="BOTH">BOTH (Total Line Closure)</option>
              <option value="UP">UP Line (Single-Line Working on DN)</option>
              <option value="DOWN">DOWN Line (Single-Line Working on UP)</option>
            </select>
          </div>
        </div>

        {/* Duration & OHE Parameters */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
              Active Duration (Mins)
            </label>
            <input
              type="number"
              step="15"
              min="30"
              max="240"
              value={emergencyForm.duration_mins}
              onChange={(e) =>
                setEmergencyForm({ ...emergencyForm, duration_mins: parseInt(e.target.value) || 90 })
              }
              className="w-full rounded border border-slate-300 p-2 text-xs font-mono font-bold text-slate-900 focus:border-red-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
              OHE Power Cut Buffer
            </label>
            <div className="flex items-center gap-2 mt-2">
              <input
                type="checkbox"
                id="reqIso"
                checked={emergencyForm.requires_traction_isolation}
                onChange={(e) =>
                  setEmergencyForm({ ...emergencyForm, requires_traction_isolation: e.target.checked })
                }
                className="h-4 w-4 rounded text-red-600 cursor-pointer"
              />
              <label htmlFor="reqIso" className="text-xs font-semibold text-slate-700 cursor-pointer">
                20m TRD Earthing Buffer
              </label>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setShowEmergencyModal(false)}
            className="px-3 py-1.5 rounded text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isInjectingEmergency}
            className="cursor-pointer rounded bg-red-700 hover:bg-red-800 disabled:opacity-50 px-4 py-1.5 text-xs font-black text-white shadow transition flex items-center gap-1.5"
          >
            {isInjectingEmergency ? "SOLVING WITH CP-SAT..." : "EXECUTE PREEMPTION & DISPATCH"}
          </button>
        </div>
      </form>
    </div>
  </div>
)}
<KpiDerivationModal
  metricType={activeKpiModal}
  onClose={() => setActiveKpiModal(null)}
  data={{
    possessionHours: uptimeMetrics.total_equivalent_closure_hours,
    horizonHours: uptimeMetrics.horizon_hours,
    totalCapacityHours: uptimeMetrics.total_capacity_hours,
    uptimePct: uptimeMetrics.corridor_uptime_pct,
    tsrImpactHours: uptimeMetrics.tsr_impact_hours,
    singleLineRetentionPct: uptimeMetrics.single_line_retention_pct,
    uptimeDerivationSteps: uptimeMetrics.derivation_steps,
    financialTotal: roiMetrics.formatted_inr,
    financialBaseDemurrage: roiMetrics.base_demurrage_saved_inr,
    financialCrewSavings: roiMetrics.crew_idle_savings_inr,
    financialFormula: roiMetrics.derivation_formula,
    financialCitation: roiMetrics.official_citation,
    pendingCount: pendingConflicts.length,
    activeBlocksCount: uptimeMetrics.active_blocks_count,
  }}
/>
    </div>
  );
}

