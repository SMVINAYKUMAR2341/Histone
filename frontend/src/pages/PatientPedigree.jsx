import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import PedigreeEditor from "@/components/PedigreeEditor";
import { toast } from "sonner";
import { ArrowLeft, Save } from "lucide-react";

export default function PatientPedigree() {
  const { id } = useParams();
  const nav = useNavigate();
  const [patient, setPatient] = useState(null);
  const [pedigree, setPedigree] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get(`/patients/${id}`).then((r) => setPatient(r.data));
    api.get(`/patients/${id}/pedigree`).then((r) => setPedigree(r.data));
  }, [id]);

  const save = async () => {
    setSaving(true);
    try {
      const body = {
        ashkenazi_ancestry: !!pedigree.ashkenazi_ancestry,
        consanguinity: !!pedigree.consanguinity,
        ancestries: pedigree.ancestries || [],
        members: (pedigree.members || []).map((m) => ({
          id: m.id,
          relation: m.relation,
          sex: m.sex,
          label: m.label || "",
          age: m.age ?? null,
          deceased: !!m.deceased,
          age_at_death: m.age_at_death ?? null,
          affected: !!m.affected,
          conditions: m.conditions || [],
          age_at_diagnosis: m.age_at_diagnosis ?? null,
          notes: m.notes || "",
        })),
      };
      await api.put(`/patients/${id}/pedigree`, body);
      toast.success("Pedigree saved");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (!patient || !pedigree) return <div className="text-slate-500">Loading…</div>;

  return (
    <div>
      <button
        data-testid="back-btn"
        onClick={() => nav(`/patients/${id}`)}
        className="text-sm text-slate-600 hover:text-brand flex items-center gap-1 mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> Back to patient
      </button>
      <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
        <div>
          <div className="label-eyebrow mb-3">Multigenerational pedigree</div>
          <h1 className="font-heading font-bold text-4xl tracking-tight text-slate-900">
            {patient.initials}
          </h1>
          <div className="mt-2 text-sm text-slate-500 font-mono">DOB {patient.dob} · MRN {patient.mrn}</div>
          <p className="mt-2 text-sm text-slate-600 max-w-2xl">
            Fills family history for all six pathways automatically. Fixed slots exist for 4 grandparents, both parents, and the proband. Add siblings, children, aunts and uncles as needed.
          </p>
        </div>
        <Button
          data-testid="save-pedigree-btn"
          onClick={save}
          disabled={saving}
          className="bg-brand hover:bg-brand text-white h-11"
        >
          <Save className="w-4 h-4 mr-1.5" />
          {saving ? "Saving…" : "Save pedigree"}
        </Button>
      </div>

      <PedigreeEditor value={pedigree} onChange={setPedigree} />

      <div className="mt-8 sticky bottom-4">
        <Button
          data-testid="save-pedigree-btn-bottom"
          onClick={save}
          disabled={saving}
          size="lg"
          className="bg-brand hover:bg-brand text-white h-12 shadow-lg"
        >
          <Save className="w-4 h-4 mr-2" />
          {saving ? "Saving…" : "Save pedigree"}
        </Button>
      </div>
    </div>
  );
}
