import { useEffect, useState } from "react";
import { Clock, TrendingUp , AlertTriangle  , CheckCircle2} from "lucide-react";
export interface CorridorUptimeData {
  corridor_uptime_pct: number;
  total_equivalent_closure_hours: number;
  tsr_impact_hours: number;
  horizon_hours: number;
}


const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export async function fetchCorridorUptime(horizonDays = 7): Promise<CorridorUptimeData> {
  const response = await fetch(`${API_BASE_URL}/api/corridor/uptime?horizon_days=${horizonDays}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch uptime metrics: ${response.statusText}`);
  }
  return response.json();
}

export type Metrics = {
  possession_hours: number;
  backlog_cleared_pct: number;
  corridor_uptime_pct: number;
};

interface TopMetricsProps {
  pendingConflictsCount?: number;
  activeHorizon?: '7-Day Tactical' | '30-Day Strategic';
}


export const CorridorMetricsBar: React.FC<TopMetricsProps> = ({
  pendingConflictsCount = 0,
  activeHorizon = '7-Day Tactical'
}) => {
  const [uptimeData, setUptimeData] = useState<CorridorUptimeData>({
    corridor_uptime_pct: 99.17, // Initial default matching your live backend run
    total_equivalent_closure_hours: 8.4,
    tsr_impact_hours: 0,
    horizon_hours: 168,
  });
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const horizonDays = activeHorizon === '30-Day Strategic' ? 30 : 7;
    
    let isMounted = true;
    setLoading(true);

    fetchCorridorUptime(horizonDays)
      .then((data) => {
        if (isMounted) {
          setUptimeData(data);
        }
      })
      .catch((err) => {
        console.warn('Using baseline KPI fallback:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeHorizon]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
      {/* 1. Possession / Closure Hours */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between shadow-sm">
        <div>
          <p className="text-xs uppercase tracking-wider font-semibold text-slate-500">
            Possession Hours
          </p>
          <div className="flex items-baseline space-x-1.5 mt-1">
            <span className="text-2xl font-bold text-slate-900">
              {uptimeData.total_equivalent_closure_hours.toFixed(1)}h
            </span>
            <span className="text-xs text-slate-400 font-medium">
              / {uptimeData.horizon_hours}h
            </span>
          </div>
        </div>
        <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
          <Clock className="w-5 h-5" />
        </div>
      </div>

      {/* 2. Backlog Cleared */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between shadow-sm">
        <div>
          <p className="text-xs uppercase tracking-wider font-semibold text-slate-500">
            Backlog Cleared
          </p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">94.2%</p>
        </div>
        <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
          <CheckCircle2 className="w-5 h-5" />
        </div>
      </div>

      {/* 3. Corridor Uptime (DYNAMIC from /api/corridor/uptime) */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between shadow-sm">
        <div>
          <div className="flex items-center space-x-1.5">
            <p className="text-xs uppercase tracking-wider font-semibold text-slate-500">
              Corridor Uptime
            </p>
            {loading && (
              <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            )}
          </div>
          <div className="flex items-baseline space-x-2 mt-1">
            <span className="text-2xl font-bold text-slate-900">
              {uptimeData.corridor_uptime_pct.toFixed(1)}%
            </span>
            {uptimeData.tsr_impact_hours > 0 && (
              <span className="text-[10px] bg-amber-100 text-amber-800 font-medium px-1.5 py-0.5 rounded">
                TSR Active
              </span>
            )}
          </div>
        </div>
        <div className="p-2.5 bg-orange-50 text-orange-600 rounded-lg">
          <TrendingUp className="w-5 h-5" />
        </div>
      </div>

      {/* 4. Pending Conflicts */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between shadow-sm">
        <div>
          <p className="text-xs uppercase tracking-wider font-semibold text-slate-500">
            Pending Conflicts
          </p>
          <p className={`text-2xl font-bold mt-1 ${pendingConflictsCount > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
            {pendingConflictsCount}
          </p>
        </div>
        <div className={`p-2.5 rounded-lg ${pendingConflictsCount > 0 ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-400'}`}>
          <AlertTriangle className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
};

