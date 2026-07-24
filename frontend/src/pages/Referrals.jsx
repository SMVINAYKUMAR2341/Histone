import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { User, ExternalLink, Send } from "lucide-react";

const OUTCOME_CLASS = {
  urgent: "result-urgent",
  routine: "result-routine",
  borderline: "result-borderline",
};

const STATUS_META = {
  pending: { label: "Pending", cls: "bg-amber-100 text-amber-800 border-amber-300" },
  sent: { label: "Sent", cls: "bg-blush text-brand border-brand" },
  completed: { label: "Completed", cls: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  declined: { label: "Declined", cls: "bg-slate-100 text-slate-700 border-slate-300" },
};

const STATUS_OPTIONS = ["pending", "sent", "completed", "declined"];

export default function Referrals() {
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState("all");
  const nav = useNavigate();

  const load = () => api.get("/referrals").then((r) => setRows(r.data));
  useEffect(() => { load(); }, []);

  const setStatus = async (id, status) => {
    try {
      await api.patch(`/referrals/${id}/status`, { status });
      setRows((prev) => prev.map((r) => (r.assessment_id === id ? { ...r, status } : r)));
      toast.success(`Marked ${STATUS_META[status].label.toLowerCase()}`);
    } catch (e) {
      toast.error("Failed to update");
    }
  };

  const filtered = rows.filter((r) => (filter === "all" ? true : r.status === filter));
  const counts = STATUS_OPTIONS.reduce((acc, s) => ({ ...acc, [s]: rows.filter((r) => r.status === s).length }), {});

  return (
    <div>
      <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
        <div>
          <div className="label-eyebrow mb-3">Referrals tracker</div>
          <h1 className="font-heading font-bold text-4xl tracking-tight text-slate-900">
            Referrals
          </h1>
          <p className="mt-2 text-sm text-slate-600 max-w-2xl">
            Every assessment that produced a referral. Track status from generated to sent to completed.
          </p>
        </div>
      </div>

      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList className="h-auto bg-blush p-1">
          <TabsTrigger data-testid="ref-filter-all" value="all" className="h-auto py-1.5 px-3 data-[state=active]:bg-brand data-[state=active]:text-white">
            All ({rows.length})
          </TabsTrigger>
          {STATUS_OPTIONS.map((s) => (
            <TabsTrigger
              key={s}
              value={s}
              data-testid={`ref-filter-${s}`}
              className="h-auto py-1.5 px-3 data-[state=active]:bg-brand data-[state=active]:text-white"
            >
              {STATUS_META[s].label} ({counts[s] || 0})
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="mt-6 space-y-3">
        {filtered.length === 0 && (
          <Card className="border-dashed border-slate-300">
            <CardContent className="py-12 text-center text-slate-500 text-sm">
              No referrals in this bucket.
            </CardContent>
          </Card>
        )}
        {filtered.map((r) => (
          <Card key={r.assessment_id} className="border-slate-200">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-[220px]">
                  <div className="flex items-center gap-3">
                    <Badge className={`uppercase tracking-wider text-[10px] font-bold border-0 ${OUTCOME_CLASS[r.outcome]}`}>
                      {r.outcome === "urgent" ? "Urgent" : r.outcome === "routine" ? "Routine" : "Borderline"}
                    </Badge>
                    <span className="font-mono text-[10px] tracking-widest uppercase text-slate-500">
                      {r.pathway_id.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-500" />
                    <span className="font-heading font-semibold text-slate-900">
                      {r.patient_name || "Standalone (no patient record)"}
                    </span>
                    {r.patient_mrn && (
                      <span className="text-[11px] font-mono text-slate-500">MRN {r.patient_mrn}</span>
                    )}
                  </div>
                  <div className="mt-2 text-sm text-slate-700">
                    <span className="text-[11px] uppercase tracking-widest text-slate-500 mr-2">Reason</span>
                    {r.reason}
                    {r.matched_criteria_count > 1 && (
                      <span className="text-xs text-slate-500"> · +{r.matched_criteria_count - 1} more</span>
                    )}
                  </div>
                  <div className="mt-1.5 text-xs text-slate-500">
                    Target: {r.referral_target} · {new Date(r.created_at).toLocaleString()}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={`uppercase text-[10px] tracking-wider ${STATUS_META[r.status].cls}`}>
                    {STATUS_META[r.status].label}
                  </Badge>
                  <Select value={r.status} onValueChange={(v) => setStatus(r.assessment_id, v)}>
                    <SelectTrigger data-testid={`ref-status-${r.assessment_id}`} className="w-[140px] h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s} value={s}>{STATUS_META[s].label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <button
                    data-testid={`ref-open-${r.assessment_id}`}
                    onClick={() => nav(`/assessment/${r.assessment_id}`)}
                    className="rounded-md border border-slate-200 hover:border-brand hover:text-brand px-2.5 py-1.5 text-slate-700"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
