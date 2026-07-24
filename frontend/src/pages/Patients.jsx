import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, User, Calendar, Hash } from "lucide-react";
import { toast } from "sonner";

export default function Patients() {
  const [patients, setPatients] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ initials: "", dob: "", mrn: "" });
  const nav = useNavigate();
  const [sp] = useSearchParams();

  const load = () => api.get("/patients").then((r) => setPatients(r.data));

  useEffect(() => {
    load();
    if (sp.get("new") === "1") setOpen(true);
  }, []);

  const submit = async () => {
    if (!form.initials || !form.dob || !form.mrn) {
      toast.error("All fields required");
      return;
    }
    try {
      await api.post("/patients", form);
      toast.success("Patient added");
      setForm({ initials: "", dob: "", mrn: "" });
      setOpen(false);
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed");
    }
  };

  return (
    <div>
      <div className="flex items-end justify-between mb-8">
        <div>
          <div className="label-eyebrow mb-3">Patient records</div>
          <h1 className="font-heading font-bold text-4xl tracking-tight text-slate-900">
            Patients
          </h1>
          <p className="mt-2 text-sm text-slate-600">Minimal identifiers only — initials, DOB, MRN.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="add-patient-btn" className="bg-brand hover:bg-brand text-white">
              <Plus className="w-4 h-4 mr-1.5" /> Add patient
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add a patient record</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="initials">Initials</Label>
                <Input
                  id="initials"
                  data-testid="patient-initials"
                  value={form.initials}
                  onChange={(e) => setForm({ ...form, initials: e.target.value })}
                  placeholder="e.g. J.D."
                />
              </div>
              <div>
                <Label htmlFor="dob">Date of birth</Label>
                <Input
                  id="dob"
                  data-testid="patient-dob"
                  type="date"
                  value={form.dob}
                  onChange={(e) => setForm({ ...form, dob: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="mrn">MRN</Label>
                <Input
                  id="mrn"
                  data-testid="patient-mrn"
                  value={form.mrn}
                  onChange={(e) => setForm({ ...form, mrn: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button data-testid="patient-save-btn" onClick={submit} className="bg-brand hover:bg-brand text-white">
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {patients.length === 0 ? (
        <Card className="border-dashed border-slate-300">
          <CardContent className="py-16 text-center text-slate-500">
            No patient records yet. Add one, or run standalone assessments from the pathway selector.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {patients.map((p) => (
            <button
              key={p.patient_id}
              data-testid={`patient-card-${p.mrn}`}
              onClick={() => nav(`/patients/${p.patient_id}`)}
              className="text-left rounded-lg border border-slate-200 bg-white p-5 hover:border-brand transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-md bg-slate-100 flex items-center justify-center">
                  <User className="w-5 h-5 text-slate-700" />
                </div>
                <div>
                  <div className="font-heading font-semibold text-slate-900">{p.initials}</div>
                  <div className="text-[11px] text-slate-500 font-mono">MRN {p.mrn}</div>
                </div>
              </div>
              <div className="mt-4 text-xs text-slate-500 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> DOB {p.dob}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
