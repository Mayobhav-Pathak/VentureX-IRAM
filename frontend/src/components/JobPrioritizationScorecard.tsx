import { useEffect, useState } from "react";

type SHAPDriver = {
  feature: string;
  impact: number;
  description?: string;
};

type ScorecardData = {
  rule_based_fmea_score: number;
  ml_score: number;
  top_shap_impacts: SHAPDriver[];
};

function formatFeature(name: string): string {
  return name.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function JobPrioritizationScorecard({
  job_id,
}: {
  job_id: string;
}) {
  const [data, setData] = useState<ScorecardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!job_id) return;

    let active = true;
    setLoading(true);
    setError(null);

    fetch(`http://127.0.0.1:8000/api/jobs/${encodeURIComponent(job_id)}/prioritization`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load prioritization details");
        return res.json();
      })
      .then((resData) => {
        if (active) setData(resData);
      })
      .catch((err) => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [job_id]);

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
        <div className="mt-2 h-6 w-48 animate-pulse rounded bg-slate-100" />
        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="h-20 animate-pulse rounded-xl bg-slate-100" />
          <div className="h-20 animate-pulse rounded-xl bg-slate-100" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
        {error ?? "Prioritization data unavailable"}
      </div>
    );
  }

  const maxImpact = Math.max(
    ...data.top_shap_impacts.map((d) => Math.abs(d.impact)),
    1
  );

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Why was this prioritized?
      </p>
      <h3 className="mt-1 font-mono text-xl font-bold text-slate-900">
        Job {job_id}
      </h3>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
            Rule-Based FMEA
          </p>
          <p className="mt-1 text-2xl font-black text-amber-950">
            {data.rule_based_fmea_score.toFixed(1)}
            <span className="text-sm font-normal text-amber-700"> / 100</span>
          </p>
        </div>

        <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-blue-800">
            ML Risk Score
          </p>
          <p className="mt-1 text-2xl font-black text-blue-950">
            {data.ml_score.toFixed(1)}
            <span className="text-sm font-normal text-blue-700"> / 100</span>
          </p>
        </div>
      </div>

      <div className="mt-6">
        <p className="text-xs font-bold text-slate-800">Top ML drivers</p>
        <p className="text-[11px] text-slate-400">
          Positive values increase predicted failure risk; negative values reduce it.
        </p>

        <div className="mt-4 space-y-3">
          {data.top_shap_impacts.map((driver) => {
            const isPositive = driver.impact >= 0;

            return (
              <div key={driver.feature}>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">
                    {formatFeature(driver.feature)}
                  </span>
                  <span
                    className={`font-mono font-bold ${
                      isPositive ? "text-red-600" : "text-emerald-600"
                    }`}
                  >
                    {isPositive ? "+" : ""}
                    {driver.impact.toFixed(2)}
                  </span>
                </div>
                <div className="mt-1.5 h-2 w-full rounded-full bg-slate-100">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      isPositive ? "bg-red-500" : "bg-emerald-500"
                    }`}
                    style={{
                      width: `${(Math.abs(driver.impact) / maxImpact) * 100}%`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}