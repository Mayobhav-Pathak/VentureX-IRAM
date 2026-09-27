import React from "react";
import { Calculator, X } from "lucide-react";

export type KpiMetricType = "possession_hours" | "financial_roi" | "corridor_uptime" | "pending_conflicts";

export interface LiveAuditData {
  possessionHours: number;
  horizonHours: number;
  totalCapacityHours: number;
  uptimePct: number;
  tsrImpactHours: number;
  singleLineRetentionPct: number;
  uptimeDerivationSteps: string[];
  financialTotal: string;
  financialBaseDemurrage: number;
  financialCrewSavings: number;
  financialFormula: string;
  financialCitation: string;
  pendingCount: number;
  activeBlocksCount: number;
}

interface Props {
  metricType: KpiMetricType | null;
  onClose: () => void;
  data: LiveAuditData;
}

export const KpiDerivationModal: React.FC<Props> = ({ metricType, onClose, data }) => {
  if (!metricType) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs select-none">
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-[#0b4f8a] text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-lg">
              <Calculator className="h-5 w-5 text-orange-300" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-orange-300 block">
                LIVE AUDIT TRAIL & DERIVATION
              </span>
              <h3 className="text-base font-bold text-white">
                {metricType === "possession_hours" && "Possession Hours & Capacity Retention"}
                {metricType === "financial_roi" && "Cost Recovery & Demurrage Model"}
                {metricType === "corridor_uptime" && "Corridor Uptime & Speed Restriction Drag"}
                {metricType === "pending_conflicts" && "G&SR 3.51 & ACTM 2.14 Spatial Conflict Audit"}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Dynamic Modal Content */}
        <div className="p-6 space-y-4 text-xs text-slate-700 max-h-[80vh] overflow-y-auto">

          {/* 1. POSSESSION HOURS */}
          {metricType === "possession_hours" && (
            <>
              <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div>
                  <span className="text-slate-500 font-semibold uppercase text-[10px]">Net Equivalent Closures</span>
                  <p className="text-2xl font-black text-[#0b4f8a]">{data.possessionHours.toFixed(1)} Hours</p>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 font-semibold uppercase text-[10px]">Active Scheduled Blocks</span>
                  <p className="text-sm font-bold text-slate-800 font-mono">{data.activeBlocksCount} Blocks</p>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 text-sm">Active Corridor Parameters:</h4>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 font-mono text-[11px] space-y-1.5">
                  <p>• <b>Total Monitoring Horizon:</b> {data.horizonHours} hours</p>
                  <p>• <b>Single-Line Retention:</b> {data.singleLineRetentionPct}% throughput preserved during single track blocks</p>
                  <p>• <b>Equivalent Penalty per Hour:</b> {(100 - data.singleLineRetentionPct) / 100} hours equivalent closure</p>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3 text-[11px] text-slate-500">
                Data dynamically aggregated from active IR-RAMS block records.
              </div>
            </>
          )}

          {/* 2. FINANCIAL COST RECOVERY */}
          {metricType === "financial_roi" && (
            <>
              <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <div>
                  <span className="text-emerald-700 font-semibold uppercase text-[10px]">Calculated Financial Savings</span>
                  <p className="text-2xl font-black text-emerald-700">{data.financialTotal}</p>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 font-semibold uppercase text-[10px]">Base Demurrage Saved</span>
                  <p className="text-sm font-bold text-slate-800 font-mono">₹{data.financialBaseDemurrage.toLocaleString("en-IN")}</p>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 text-sm">Dynamic Calculation Breakdown:</h4>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 font-mono text-[11px] space-y-2">
                  <p className="text-slate-800">{data.financialFormula}</p>
                  <p className="text-emerald-700 font-bold">
                    • Crew Detention Avoidance: ₹{data.financialCrewSavings.toLocaleString("en-IN")}
                  </p>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3 text-[11px] text-slate-500">
                {data.financialCitation}
              </div>
            </>
          )}

          {/* 3. CORRIDOR UPTIME */}
          {metricType === "corridor_uptime" && (
            <>
              <div className="flex items-center justify-between bg-orange-50 border border-orange-200 rounded-xl p-4">
                <div>
                  <span className="text-orange-700 font-semibold uppercase text-[10px]">Corridor Uptime</span>
                  <p className="text-2xl font-black text-[#f37021]">{data.uptimePct.toFixed(2)}%</p>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 font-semibold uppercase text-[10px]">TSR Friction Penalty</span>
                  <p className="text-sm font-bold text-amber-700 font-mono">+{data.tsrImpactHours.toFixed(2)} Impact Hours</p>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 text-sm">Step-by-Step Solver Derivation:</h4>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 font-mono text-[11px] space-y-1.5">
                  {data.uptimeDerivationSteps.map((step, idx) => (
                    <p key={idx} className="text-slate-700">• {step}</p>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3 text-[11px] text-slate-500">
                Dynamically calculated from corridor capacity ({data.totalCapacityHours} total section-hours).
              </div>
            </>
          )}

          {/* 4. PENDING CONFLICTS */}
          {metricType === "pending_conflicts" && (
            <>
              <div className="flex items-center justify-between bg-rose-50 border border-rose-200 rounded-xl p-4">
                <div>
                  <span className="text-rose-700 font-semibold uppercase text-[10px]">Pending Conflicts</span>
                  <p className="text-2xl font-black text-rose-600">{data.pendingCount}</p>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 font-semibold uppercase text-[10px]">G&SR Compliance Engine</span>
                  <p className="text-sm font-bold text-emerald-700 font-mono">Online</p>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 text-sm">Rules Enforced:</h4>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2 text-[11px]">
                  <p>• <b>G&SR 3.51 (Boundary Lockout):</b> Simultaneous track occupancy on boundary points and turnouts strictly locked.</p>
                  <p>• <b>ACTM 2.14 (Traction Isolation):</b> Track work under 25kV OHE requires 20-minute de-energization buffer verification.</p>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3 text-[11px] text-slate-500">
                Updates dynamically as conflicts are bundled, rescheduled, or injected.
              </div>
            </>
          )}

        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-100 px-6 py-3 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer px-4 py-1.5 rounded-lg bg-[#0b4f8a] hover:bg-[#093e6d] text-white font-bold text-xs shadow-xs transition"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};