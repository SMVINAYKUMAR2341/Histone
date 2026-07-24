import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { PATHWAY_ICONS } from "@/lib/pathways";
import { ArrowRight, Plus } from "lucide-react";

export default function Dashboard() {
  const [pathways, setPathways] = useState([]);
  const nav = useNavigate();

  useEffect(() => {
    api.get("/pathways").then((r) => setPathways(r.data));
  }, []);

  return (
    <div>
      <div className="flex items-end justify-between mb-10">
        <div>
          <div className="label-eyebrow mb-3">New assessment</div>
          <h1 className="font-heading font-bold text-4xl sm:text-5xl tracking-tight text-slate-900">
            Which clinical scenario applies?
          </h1>
          <p className="mt-3 text-slate-600 max-w-xl">
            Pick the pathway that matches this patient's presentation. Every result is
            linked to its source guideline and takes under two minutes.
          </p>
        </div>
        <button
          data-testid="new-patient-btn"
          onClick={() => nav("/patients?new=1")}
          className="hidden md:flex items-center gap-2 text-sm font-medium text-slate-900 hover:bg-slate-100 rounded-md px-3 py-2 border border-slate-200"
        >
          <Plus className="w-4 h-4" /> Add patient
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {pathways.map((p) => {
          const Icon = PATHWAY_ICONS[p.id] || PATHWAY_ICONS.hereditary_cancer;
          return (
            <button
              key={p.id}
              data-testid={`pathway-card-${p.id}`}
              onClick={() => nav(`/assessment/new?pathway=${p.id}`)}
              className="group text-left rounded-lg border border-slate-200 bg-white p-6 hover:border-brand hover:shadow-sm transition-[border-color,box-shadow] duration-150"
              style={{ transition: "border-color 200ms ease, box-shadow 200ms ease" }}
            >
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-md bg-blush group-hover:bg-brand group-hover:text-white text-brand flex items-center justify-center transition-colors duration-150">
                  <Icon className="w-5 h-5" />
                </div>
                <span className="font-mono text-[10px] tracking-widest uppercase text-slate-400">{p.short}</span>
              </div>
              <div className="mt-6 font-heading font-semibold text-xl leading-tight text-slate-900">
                {p.name}
              </div>
              <div className="mt-2 text-sm text-slate-600 leading-relaxed">{p.description}</div>
              <div className="mt-6 flex items-center gap-1.5 text-sm font-medium text-slate-900">
                Start
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-150" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
