import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from "recharts";

const OUTCOME_COLORS = {
  urgent: "#e11d48",
  routine: "#f59e0b",
  borderline: "#94a3b8",
  no_referral: "#10b981",
};

export default function Metrics() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get("/metrics/summary").then((r) => setData(r.data));
  }, []);

  if (!data) return <div className="text-slate-500">Loading…</div>;

  const totals = data.totals;
  const rows = Object.entries(data.by_pathway).map(([k, v]) => ({
    pathway: k.replace(/_/g, " "),
    ...v,
  }));

  return (
    <div>
      <div className="label-eyebrow mb-3">Admin · metrics</div>
      <h1 className="font-heading font-bold text-4xl tracking-tight text-slate-900">Referral metrics</h1>
      <p className="mt-2 text-sm text-slate-600">Aggregate, de-identified. No patient identifiers.</p>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-8">
        <Stat label="Total assessments" value={totals.total} />
        <Stat label="Urgent" value={totals.urgent} color="urgent" />
        <Stat label="Routine" value={totals.routine} color="routine" />
        <Stat label="Borderline" value={totals.borderline} color="borderline" />
        <Stat label="No referral" value={totals.no_referral} color="no_referral" />
      </div>

      <div className="mt-8 grid lg:grid-cols-2 gap-6">
        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="label-eyebrow mb-4">Outcomes by pathway</div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rows} margin={{ top: 0, right: 0, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="pathway" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="urgent" stackId="a" fill={OUTCOME_COLORS.urgent} />
                  <Bar dataKey="routine" stackId="a" fill={OUTCOME_COLORS.routine} />
                  <Bar dataKey="borderline" stackId="a" fill={OUTCOME_COLORS.borderline} />
                  <Bar dataKey="no_referral" stackId="a" fill={OUTCOME_COLORS.no_referral} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="label-eyebrow mb-4">Last 14 days · volume</div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.trend_14d}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#0f172a" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value, color }) {
  const clr = color ? OUTCOME_COLORS[color] : "#0f172a";
  return (
    <Card className="border-slate-200">
      <CardContent className="p-5">
        <div className="text-[11px] uppercase tracking-wider text-slate-500">{label}</div>
        <div className="mt-2 font-heading font-bold text-3xl" style={{ color: clr }}>{value ?? 0}</div>
      </CardContent>
    </Card>
  );
}
