// frontend/src/components/ConflictAuditPanel.tsx
import React, { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Layers,
  RotateCcw,
  ShieldAlert,
  X,
  Zap,
} from "lucide-react";
import { supabase } from "../supabaseClient";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

export interface ConflictRecord {
  id: string;
  section_id: string;
  departments: string[];
  created_at: string;
}

export interface ConflictAuditRecord {
  id: string;
  section_id: string;
  departments: string[];
  resolution: string;
  resolved_at: string;
}

interface ConflictAuditPanelProps {
  pendingConflicts: ConflictRecord[];
  auditLog: ConflictAuditRecord[];
  onOpenConflict?: (conflictId: string) => void;
  onResetComplete: () => Promise<void>;
}

export const ConflictAuditPanel: React.FC<ConflictAuditPanelProps> = ({
  pendingConflicts,
  auditLog,
  onResetComplete,
}) => {
  const [activeTab, setActiveTab] = useState<"pending" | "audit">("pending");
  const [selectedConflict, setSelectedConflict] = useState<ConflictRecord | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleResolve = async (action: "bundle" | "reschedule" | "override") => {
    if (!selectedConflict) return;
    setIsResolving(true);
    setStatusMessage(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const res = await fetch(`${API_BASE}/conflicts/${selectedConflict.id}/resolve`, {
        method: "POST",
        headers,
        body: JSON.stringify({ action }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to resolve conflict");
      }

      setSelectedConflict(null);
      await onResetComplete();
    } catch (err: any) {
      setStatusMessage(err.message || "Conflict resolution failed.");
    } finally {
      setIsResolving(false);
    }
  };

  const handleResetDemo = async () => {
    try {
      const res = await fetch(`${API_BASE}/demo/reset-conflicts`, { method: "POST" });
      if (res.ok) {
        await onResetComplete();
      }
    } catch (err) {
      console.error("Reset error:", err);
    }
  };

  return (
    <div className="p-4 bg-white">
      {/* Tab Controls */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab("pending")}
            className={`cursor-pointer pb-2 text-xs font-bold uppercase tracking-wider transition ${
              activeTab === "pending"
                ? "border-b-2 border-[#0b4f8a] text-[#0b4f8a]"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Pending Review ({pendingConflicts.length})
          </button>
          <button
            onClick={() => setActiveTab("audit")}
            className={`cursor-pointer pb-2 text-xs font-bold uppercase tracking-wider transition ${
              activeTab === "audit"
                ? "border-b-2 border-[#0b4f8a] text-[#0b4f8a]"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Resolution Audit Log ({auditLog.length})
          </button>
        </div>

        <button
          onClick={handleResetDemo}
          className="flex cursor-pointer items-center gap-1.5 text-xs font-bold text-[#0b4f8a] hover:underline"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Reset Demo Conflict</span>
        </button>
      </div>

      {/* Tab Panels */}
      <div className="mt-4">
        {activeTab === "pending" ? (
          pendingConflicts.length === 0 ? (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-4 text-xs font-semibold text-emerald-800 border border-emerald-200">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>All track possession windows clear. Zero scheduling overlaps detected.</span>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingConflicts.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between rounded-lg border border-rose-200 bg-rose-50/70 p-3.5 text-slate-800 transition hover:bg-rose-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-600 text-white shadow-sm">
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-slate-900">{c.section_id}</span>
                        <span className="rounded bg-rose-200/80 px-1.5 py-0.5 text-[10px] font-extrabold uppercase text-rose-800">
                          Overlapping Window
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Competing departments: <span className="font-bold text-slate-800">{c.departments.join(" + ")}</span>
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedConflict(c)}
                    className="cursor-pointer rounded-md bg-[#0b4f8a] px-4 py-2 text-xs font-bold text-white shadow transition hover:bg-[#083a66]"
                  >
                    Review & Resolve
                  </button>
                </div>
              ))}
            </div>
          )
        ) : auditLog.length === 0 ? (
          <p className="text-xs text-slate-500 py-3">No actions logged yet in this session.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {auditLog.map((log) => (
              <div key={log.id} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-800">{log.section_id}</span>
                  <span className="ml-2 font-mono text-slate-500">({log.departments.join(", ")})</span>
                  <p className="text-slate-600">{log.resolution}</p>
                </div>
                <span className="text-[11px] font-mono text-slate-400">
                  {new Date(log.resolved_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Interactive Resolution Action Modal */}
      {selectedConflict && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-150">
            {/* Modal Header */}
            <div className="bg-[#0b4f8a] px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ShieldAlert className="h-5 w-5 text-orange-400" />
                <h3 className="text-sm font-extrabold uppercase tracking-wide">
                  Resolve Possession Conflict: {selectedConflict.section_id}
                </h3>
              </div>
              <button
                onClick={() => setSelectedConflict(null)}
                className="cursor-pointer text-white/70 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-700 border border-slate-200">
                <p className="font-bold text-slate-900">Overlapping Demands Logged:</p>
                <p className="mt-1">
                  Both <strong>{selectedConflict.departments.join(" & ")}</strong> departments require the same corridor track block simultaneously. Choose an automated resolution strategy:
                </p>
              </div>

              {statusMessage && (
                <div className="rounded border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
                  {statusMessage}
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-2.5">
                {/* Option 1: Bundle */}
                <button
                  disabled={isResolving}
                  onClick={() => handleResolve("bundle")}
                  className="w-full cursor-pointer rounded-lg border border-blue-200 bg-blue-50/50 p-3.5 text-left transition hover:bg-blue-100/70 flex items-start gap-3"
                >
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#0b4f8a] text-white">
                    <Layers className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#0b4f8a]">
                      Coordinated Bundling (Recommended)
                    </p>
                    <p className="text-[11px] text-slate-600">
                      Merge both teams into one synchronized shadow possession window, saving up to 120 corridor operational minutes.
                    </p>
                  </div>
                </button>

                {/* Option 2: Reschedule */}
                <button
                  disabled={isResolving}
                  onClick={() => handleResolve("reschedule")}
                  className="w-full cursor-pointer rounded-lg border border-amber-200 bg-amber-50/50 p-3.5 text-left transition hover:bg-amber-100/70 flex items-start gap-3"
                >
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#f37021] text-white">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#b44800]">
                      Reschedule Secondary Block (+180m)
                    </p>
                    <p className="text-[11px] text-slate-600">
                      Push the secondary department possession to the following operational lull window.
                    </p>
                  </div>
                </button>

                {/* Option 3: Override */}
                <button
                  disabled={isResolving}
                  onClick={() => handleResolve("override")}
                  className="w-full cursor-pointer rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-left transition hover:bg-slate-100 flex items-start gap-3"
                >
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-700 text-white">
                    <Zap className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">
                      Chief Controller Priority Override
                    </p>
                    <p className="text-[11px] text-slate-600">
                      Enforce higher FMEA priority ranking without altering current corridor schedules.
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-slate-100 bg-slate-50 px-6 py-3 text-right">
              <button
                type="button"
                onClick={() => setSelectedConflict(null)}
                className="cursor-pointer rounded-md border border-slate-300 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};