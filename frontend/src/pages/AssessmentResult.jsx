import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, API } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Download, FileText, Save } from "lucide-react";
import { toast } from "sonner";

const OUTCOME_LABEL = {
  urgent: "Refer — Urgent",
  routine: "Refer — Routine",
  borderline: "Borderline — Consider discussion",
  no_referral: "No referral needed",
};

const OUTCOME_CLASS = {
  urgent: "result-urgent",
  routine: "result-routine",
  borderline: "result-borderline",
  no_referral: "result-no-referral",
};

export default function AssessmentResult() {
  const { id } = useParams();
  const [asm, setAsm] = useState(null);
  const nav = useNavigate();

  useEffect(() => {
    api.get(`/assessments/${id}`).then((r) => setAsm(r.data));
  }, [id]);

  const downloadPdf = async () => {
    try {
      const r = await api.get(`/assessments/${id}/pdf`, { responseType: "blob" });
      const url = window.URL.createObjectURL(r.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `referral_${id}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      toast.error("Failed to generate PDF");
    }
  };

  if (!asm) return <div className="text-slate-500">Loading…</div>;
  const outcomeClass = OUTCOME_CLASS[asm.outcome] || "result-borderline";
  const outcomeLabel = OUTCOME_LABEL[asm.outcome] || asm.outcome;

  return (
    <div>
      <button
        data-testid="back-btn"
        onClick={() => nav(-1)}
        className="text-sm text-slate-600 hover:text-slate-900 flex items-center gap-1 mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="label-eyebrow mb-3">Recommendation</div>

      <div
        data-testid="result-hero"
        className={`${outcomeClass} rounded-lg px-8 py-8 md:px-10 md:py-10`}
      >
        <div className="text-[11px] uppercase tracking-[0.24em] opacity-80">{asm.pathway_id.replace(/_/g, " ")}</div>
        <div data-testid="outcome-label" className="font-heading font-bold text-4xl sm:text-5xl lg:text-6xl mt-2 leading-none">
          {outcomeLabel}
        </div>
        {asm.referral_target && asm.referral_target !== "None" && (
          <div className="mt-4 text-base opacity-95">
            <span className="text-[11px] uppercase tracking-widest opacity-70 mr-2">Referral target</span>
            {asm.referral_target}
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mt-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-slate-200">
            <CardContent className="p-6">
              <div className="label-eyebrow mb-4">Criteria matched</div>
              {asm.matched_criteria.length === 0 ? (
                <div className="text-sm text-slate-600">
                  No criteria met. No referral is triggered by the current rule set.
                </div>
              ) : (
                <ul className="space-y-4">
                  {asm.matched_criteria.map((m, i) => (
                    <li key={i} className="pb-4 border-b last:border-b-0 border-slate-100" data-testid={`criterion-${i}`}>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="font-heading font-semibold text-slate-900">{m.label}</div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            Target: <span className="text-slate-700">{m.referral_target}</span>
                          </div>
                        </div>
                        <Badge
                          className={`uppercase tracking-wider text-[10px] font-bold ${OUTCOME_CLASS[m.outcome]} border-0`}
                        >
                          {m.outcome.replace("_", " ")}
                        </Badge>
                      </div>
                      <div className="mt-2 flex items-start gap-2">
                        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-brand text-white tracking-wide">
                          {m.guideline_source}
                        </span>
                        <span className="text-xs text-slate-600 leading-relaxed">{m.citation}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {asm.explanation && (
            <Card className="border-slate-200">
              <CardContent className="p-6">
                <div className="label-eyebrow mb-3">Plain-language summary</div>
                <p className="text-slate-700 text-[15px] leading-relaxed whitespace-pre-wrap">{asm.explanation}</p>
              </CardContent>
            </Card>
          )}

          <Card className="border-slate-200">
            <CardContent className="p-6">
              <div className="label-eyebrow mb-3">Input data</div>
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                {Object.entries(asm.input_data || {}).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3 border-b border-slate-100 pb-1.5">
                    <dt className="text-slate-500">{k.replace(/_/g, " ")}</dt>
                    <dd className="text-slate-900 font-medium text-right break-all">
                      {Array.isArray(v) ? v.join(", ") : typeof v === "boolean" ? (v ? "yes" : "no") : String(v ?? "-")}
                    </dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-3">
          <Button
            data-testid="download-pdf-btn"
            onClick={downloadPdf}
            className="w-full bg-brand hover:bg-brand text-white h-12"
          >
            <Download className="w-4 h-4 mr-2" /> Download referral PDF
          </Button>
          <Button
            data-testid="new-assessment-btn"
            onClick={() => nav("/dashboard")}
            variant="outline"
            className="w-full h-11"
          >
            <FileText className="w-4 h-4 mr-2" /> New assessment
          </Button>
          <div className="rounded-md border border-amber-300 bg-amber-50 p-4">
            <div className="text-[11px] uppercase tracking-widest text-amber-800 font-bold">Disclosure</div>
            <div className="mt-1 text-[13px] text-amber-900 leading-relaxed">
              Decision support only. Placeholder criteria — not yet clinically validated.
              Always apply clinical judgement.
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
