import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "@/lib/api";
import { PATHWAY_FORMS, PATHWAY_ICONS } from "@/lib/pathways";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Sparkles } from "lucide-react";

export default function NewAssessment() {
  const [sp] = useSearchParams();
  const pathwayId = sp.get("pathway");
  const nav = useNavigate();
  const [patients, setPatients] = useState([]);
  const [patientId, setPatientId] = useState("");
  const [values, setValues] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const schema = PATHWAY_FORMS[pathwayId];
  const Icon = PATHWAY_ICONS[pathwayId];

  useEffect(() => {
    api.get("/patients").then((r) => setPatients(r.data));
  }, []);

  const setValue = (k, v) => setValues((prev) => ({ ...prev, [k]: v }));

  if (!schema) {
    return (
      <div className="text-slate-600">
        Unknown pathway. <button className="underline" onClick={() => nav("/dashboard")}>Back</button>
      </div>
    );
  }

  const submit = async () => {
    setSubmitting(true);
    try {
      const r = await api.post("/assessments", {
        pathway_id: pathwayId,
        patient_id: patientId || null,
        input_data: values,
        request_explanation: true,
      });
      toast.success("Assessment complete");
      nav(`/assessment/${r.data.assessment_id}`);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <button
        data-testid="back-to-pathways-btn"
        onClick={() => nav("/dashboard")}
        className="text-sm text-slate-600 hover:text-slate-900 flex items-center gap-1 mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> All pathways
      </button>
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="label-eyebrow mb-3">Pathway · {pathwayId.replace(/_/g, " ")}</div>
          <h1 className="font-heading font-bold text-3xl sm:text-4xl tracking-tight text-slate-900">
            {schema.title}
          </h1>
          <p className="mt-2 text-sm text-slate-600 max-w-2xl">
            Fill in only what applies. Fields left blank are treated as negative / not present.
          </p>
        </div>
        {Icon && (
          <div className="w-11 h-11 rounded-md bg-brand text-white flex items-center justify-center">
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="border-slate-200">
            <CardContent className="p-6 space-y-5">
              {schema.fields.map((f) => {
                if (f.showIf && !f.showIf(values)) return null;
                return (
                  <FieldRenderer key={f.key} field={f} value={values[f.key]} onChange={(v) => setValue(f.key, v)} />
                );
              })}
            </CardContent>
          </Card>
        </div>
        <aside>
          <Card className="border-slate-200">
            <CardContent className="p-6">
              <div className="label-eyebrow mb-3">Patient (optional)</div>
              <Select value={patientId || "__none"} onValueChange={(v) => setPatientId(v === "__none" ? "" : v)}>
                <SelectTrigger data-testid="patient-select" className="h-10">
                  <SelectValue placeholder="Standalone / no patient record" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">Standalone / no patient record</SelectItem>
                  {patients.map((p) => (
                    <SelectItem key={p.patient_id} value={p.patient_id}>
                      {p.initials} · MRN {p.mrn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="mt-3 text-[11px] text-slate-500">
                Assessment can be saved to a chart or run standalone.
              </div>
            </CardContent>
          </Card>
          <div className="mt-6 flex flex-col gap-3">
            <Button
              data-testid="run-assessment-btn"
              onClick={submit}
              disabled={submitting}
              size="lg"
              className="bg-brand hover:bg-brand text-white h-12 rounded-md"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {submitting ? "Evaluating…" : "Run decision support"}
            </Button>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Decision support only. Not a diagnosis. Every recommendation is inspectable.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function FieldRenderer({ field, value, onChange }) {
  const t = field.type;
  const id = `f-${field.key}`;
  if (t === "bool") {
    return (
      <div className="flex items-start justify-between py-1 border-b border-slate-100">
        <div className="max-w-[75%]">
          <Label htmlFor={id} className="text-sm font-medium text-slate-900">{field.label}</Label>
        </div>
        <Switch
          id={id}
          data-testid={`field-${field.key}`}
          checked={!!value}
          onCheckedChange={onChange}
        />
      </div>
    );
  }
  if (t === "number") {
    return (
      <div>
        <Label htmlFor={id} className="text-sm font-medium text-slate-900">{field.label}</Label>
        <Input
          id={id}
          data-testid={`field-${field.key}`}
          type="number"
          step={field.step || 1}
          min={field.min}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
          className="mt-1.5 h-10"
        />
      </div>
    );
  }
  if (t === "text") {
    return (
      <div>
        <Label htmlFor={id} className="text-sm font-medium text-slate-900">{field.label}</Label>
        <Input
          id={id}
          data-testid={`field-${field.key}`}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1.5 h-10"
        />
      </div>
    );
  }
  if (t === "select") {
    return (
      <div>
        <Label htmlFor={id} className="text-sm font-medium text-slate-900">{field.label}</Label>
        <Select value={value || ""} onValueChange={onChange}>
          <SelectTrigger id={id} data-testid={`field-${field.key}`} className="mt-1.5 h-10">
            <SelectValue placeholder="Select…" />
          </SelectTrigger>
          <SelectContent>
            {field.options.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }
  if (t === "multi") {
    const arr = value || [];
    const toggle = (v) => {
      onChange(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
    };
    return (
      <div>
        <Label className="text-sm font-medium text-slate-900">{field.label}</Label>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {field.options.map((o) => (
            <label
              key={o.value}
              className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 hover:bg-slate-50 cursor-pointer"
            >
              <Checkbox
                data-testid={`field-${field.key}-${o.value}`}
                checked={arr.includes(o.value)}
                onCheckedChange={() => toggle(o.value)}
              />
              <span className="text-sm text-slate-800">{o.label}</span>
            </label>
          ))}
        </div>
      </div>
    );
  }
  return null;
}
