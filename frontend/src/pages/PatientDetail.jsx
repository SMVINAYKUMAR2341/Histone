import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus } from "lucide-react";

const OUTCOME_CLASS = {
  urgent: "result-urgent",
  routine: "result-routine",
  borderline: "result-borderline",
  no_referral: "result-no-referral",
};

export default function PatientDetail() {
  const { id } = useParams();
  const [patient, setPatient] = useState(null);
  const [asms, setAsms] = useState([]);
  const nav = useNavigate();

  useEffect(() => {
    api.get(`/patients/${id}`).then((r) => setPatient(r.data));
    api.get(`/assessments?patient_id=${id}`).then((r) => setAsms(r.data));
  }, [id]);

  if (!patient) return <div className="text-slate-500">Loading…</div>;

  return (
    <div>
      <button data-testid="back-btn" onClick={() => nav("/patients")} className="text-sm text-slate-600 hover:text-slate-900 flex items-center gap-1 mb-4">
        <ArrowLeft className="w-4 h-4" /> Patients
      </button>
      <div className="flex items-end justify-between mb-8">
        <div>
          <div className="label-eyebrow mb-3">Patient record</div>
          <h1 className="font-heading font-bold text-4xl tracking-tight text-slate-900">{patient.initials}</h1>
          <div className="mt-2 text-sm text-slate-500 font-mono">DOB {patient.dob} · MRN {patient.mrn}</div>
        </div>
        <Button data-testid="new-asm-for-patient-btn" onClick={() => nav("/dashboard")} className="bg-brand hover:bg-brand text-white">
          <Plus className="w-4 h-4 mr-1.5" /> New assessment
        </Button>
      </div>

      <div className="label-eyebrow mb-3">Assessment history</div>
      {asms.length === 0 ? (
        <Card className="border-dashed border-slate-300">
          <CardContent className="py-12 text-center text-slate-500 text-sm">
            No assessments for this patient yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {asms.map((a) => (
            <button
              key={a.assessment_id}
              data-testid={`asm-row-${a.assessment_id}`}
              onClick={() => nav(`/assessment/${a.assessment_id}`)}
              className="w-full text-left flex items-center justify-between rounded-lg border border-slate-200 bg-white px-5 py-4 hover:border-brand transition-colors"
            >
              <div>
                <div className="font-heading font-semibold text-slate-900">{a.pathway_id.replace(/_/g, " ")}</div>
                <div className="text-xs text-slate-500 mt-0.5">{new Date(a.created_at).toLocaleString()}</div>
              </div>
              <Badge className={`uppercase tracking-wider text-[10px] font-bold ${OUTCOME_CLASS[a.outcome]} border-0`}>
                {a.outcome.replace("_", " ")}
              </Badge>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
