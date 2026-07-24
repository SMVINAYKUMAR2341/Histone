import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";

const PATHWAYS = [
  { id: "hereditary_cancer", name: "Hereditary cancer" },
  { id: "carrier_screening", name: "Carrier screening" },
  { id: "nipt_results", name: "NIPT results" },
  { id: "abnormal_ultrasound", name: "Ultrasound" },
  { id: "infertility_rpl", name: "Infertility / RPL" },
  { id: "family_history", name: "Family history" },
];

export default function AdminCriteria() {
  const [criteria, setCriteria] = useState([]);
  const [pathway, setPathway] = useState(PATHWAYS[0].id);

  const load = () => api.get(`/criteria?pathway_id=${pathway}`).then((r) => setCriteria(r.data));

  useEffect(() => { load(); }, [pathway]);

  const patch = async (id, changes) => {
    try {
      const r = await api.patch(`/criteria/${id}`, changes);
      setCriteria((prev) => prev.map((c) => (c.criterion_id === id ? r.data : c)));
      toast.success("Saved");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed");
    }
  };

  return (
    <div>
      <div className="label-eyebrow mb-3">Admin · criteria</div>
      <h1 className="font-heading font-bold text-4xl tracking-tight text-slate-900">Clinical criteria</h1>
      <p className="mt-2 text-sm text-slate-600 max-w-2xl">
        Every rule is versioned. Only <b>Active + Approved</b> rules are used by the decision engine.
        Placeholder values based on public ACOG / NCCN / ACMG / ASRM summaries — validate before real patient use.
      </p>

      <Tabs value={pathway} onValueChange={setPathway} className="mt-8">
        <TabsList className="h-auto flex-wrap bg-slate-100 p-1 rounded-md">
          {PATHWAYS.map((p) => (
            <TabsTrigger
              key={p.id}
              value={p.id}
              data-testid={`crit-tab-${p.id}`}
              className="h-auto py-1.5 px-3 data-[state=active]:bg-brand data-[state=active]:text-white"
            >
              {p.name}
            </TabsTrigger>
          ))}
        </TabsList>
        {PATHWAYS.map((p) => (
          <TabsContent key={p.id} value={p.id} className="mt-6 space-y-3">
            {criteria.map((c) => (
              <CriterionRow key={c.criterion_id} c={c} onSave={patch} />
            ))}
            {criteria.length === 0 && (
              <div className="text-sm text-slate-500">No criteria configured for this pathway.</div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function CriterionRow({ c, onSave }) {
  const [thr, setThr] = useState(c.threshold ?? "");
  const [outcome, setOutcome] = useState(c.outcome);
  const [target, setTarget] = useState(c.referral_target);
  useEffect(() => {
    setThr(c.threshold ?? "");
    setOutcome(c.outcome);
    setTarget(c.referral_target);
  }, [c.criterion_id]);

  const dirty =
    (c.threshold ?? "") !== thr ||
    c.outcome !== outcome ||
    c.referral_target !== target;

  return (
    <Card className="border-slate-200">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="font-heading font-semibold text-slate-900">{c.label}</div>
            <div className="text-xs text-slate-500 mt-0.5">{c.description}</div>
            <div className="mt-2 text-[11px]">
              <span className="font-mono px-1.5 py-0.5 rounded bg-brand text-white mr-2">{c.guideline_source}</span>
              <span className="text-slate-600">{c.citation}</span>
            </div>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label className="text-[11px] uppercase tracking-wider text-slate-500">Threshold</Label>
                <Input
                  data-testid={`crit-threshold-${c.rule_key}`}
                  type="number"
                  value={thr}
                  onChange={(e) => setThr(e.target.value)}
                  placeholder="—"
                  className="h-9 mt-1"
                />
              </div>
              <div>
                <Label className="text-[11px] uppercase tracking-wider text-slate-500">Outcome</Label>
                <select
                  data-testid={`crit-outcome-${c.rule_key}`}
                  value={outcome}
                  onChange={(e) => setOutcome(e.target.value)}
                  className="h-9 mt-1 w-full rounded-md border border-slate-200 bg-white px-2 text-sm"
                >
                  {["no_referral", "borderline", "routine", "urgent"].map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-[11px] uppercase tracking-wider text-slate-500">Referral target</Label>
                <Input
                  data-testid={`crit-target-${c.rule_key}`}
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  className="h-9 mt-1"
                />
              </div>
            </div>
            <div className="mt-3 text-[10px] text-slate-500 font-mono">
              v{c.version} · updated {new Date(c.updated_at).toLocaleString()}
            </div>
          </div>
          <div className="flex flex-col items-end gap-3 min-w-[140px]">
            <div className="flex items-center gap-2">
              <Switch
                data-testid={`crit-active-${c.rule_key}`}
                checked={c.active}
                onCheckedChange={(v) => onSave(c.criterion_id, { active: v })}
              />
              <span className="text-xs text-slate-700">Active</span>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                data-testid={`crit-approved-${c.rule_key}`}
                checked={c.approved}
                onCheckedChange={(v) => onSave(c.criterion_id, { approved: v })}
              />
              <span className="text-xs text-slate-700">Approved</span>
            </div>
            <Button
              size="sm"
              data-testid={`crit-save-${c.rule_key}`}
              disabled={!dirty}
              onClick={() =>
                onSave(c.criterion_id, {
                  threshold: thr === "" ? null : Number(thr),
                  outcome,
                  referral_target: target,
                })
              }
              className="bg-brand hover:bg-brand text-white h-8"
            >
              Save
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
