import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const OUTCOME_CLASS = {
  urgent: "result-urgent",
  routine: "result-routine",
  borderline: "result-borderline",
  no_referral: "result-no-referral",
};

export default function AssessmentHistory() {
  const [asms, setAsms] = useState([]);
  const nav = useNavigate();

  useEffect(() => { api.get("/assessments").then((r) => setAsms(r.data)); }, []);

  return (
    <div>
      <div className="label-eyebrow mb-3">History</div>
      <h1 className="font-heading font-bold text-4xl tracking-tight text-slate-900">Assessment history</h1>
      <p className="mt-2 text-sm text-slate-600">Your recent decision-support runs.</p>

      <div className="mt-8 space-y-3">
        {asms.length === 0 && (
          <Card className="border-dashed border-slate-300">
            <CardContent className="py-12 text-center text-slate-500 text-sm">
              No assessments yet. Start one from the pathway selector.
            </CardContent>
          </Card>
        )}
        {asms.map((a) => (
          <button
            key={a.assessment_id}
            data-testid={`hist-row-${a.assessment_id}`}
            onClick={() => nav(`/assessment/${a.assessment_id}`)}
            className="w-full text-left flex items-center justify-between rounded-lg border border-slate-200 bg-white px-5 py-4 hover:border-brand transition-colors"
          >
            <div>
              <div className="font-heading font-semibold text-slate-900">{a.pathway_id.replace(/_/g, " ")}</div>
              <div className="text-xs text-slate-500 mt-0.5">
                {new Date(a.created_at).toLocaleString()} {a.patient_id ? "· with patient" : "· standalone"}
              </div>
            </div>
            <Badge className={`uppercase tracking-wider text-[10px] font-bold ${OUTCOME_CLASS[a.outcome]} border-0`}>
              {a.outcome.replace("_", " ")}
            </Badge>
          </button>
        ))}
      </div>
    </div>
  );
}
