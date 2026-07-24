// Structured pedigree editor with live SVG canvas visualization.
// Members: 4 grandparents + 2 parents + proband + variable siblings/children
// + variable paternal/maternal aunts-uncles. Each row: sex, age, affected,
// condition tags, deceased. Auto-derives family counts for the engine.

import { useMemo, useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, User as UserIcon } from "lucide-react";

export const CONDITION_OPTIONS = [
  { value: "breast_cancer", label: "Breast" },
  { value: "ovarian_cancer", label: "Ovarian" },
  { value: "colorectal_cancer", label: "Colorectal" },
  { value: "endometrial_cancer", label: "Endometrial" },
  { value: "pancreatic_cancer", label: "Pancreatic" },
  { value: "prostate_cancer", label: "Prostate" },
  { value: "recessive_condition", label: "Recessive disorder" },
  { value: "other", label: "Other genetic" },
];

const ANCESTRIES = [
  { value: "ashkenazi", label: "Ashkenazi" },
  { value: "mediterranean", label: "Mediterranean" },
  { value: "southeast_asian", label: "SE Asian" },
  { value: "african", label: "African / AA" },
  { value: "european", label: "European (non-AJ)" },
  { value: "latino", label: "Latino/Hispanic" },
  { value: "other", label: "Other" },
];

const FIXED_RELATIONS = [
  { key: "paternal_grandfather", label: "Paternal grandfather", sex: "M" },
  { key: "paternal_grandmother", label: "Paternal grandmother", sex: "F" },
  { key: "maternal_grandfather", label: "Maternal grandfather", sex: "M" },
  { key: "maternal_grandmother", label: "Maternal grandmother", sex: "F" },
  { key: "father", label: "Father", sex: "M" },
  { key: "mother", label: "Mother", sex: "F" },
  { key: "proband", label: "Proband (patient)", sex: "F" },
];

function newMember(relation, sex = "U") {
  return {
    id: `${relation}_${Math.random().toString(36).slice(2, 8)}`,
    relation,
    sex,
    label: "",
    age: null,
    deceased: false,
    age_at_death: null,
    affected: false,
    conditions: [],
    age_at_diagnosis: null,
    notes: "",
  };
}

function ensureFixed(members) {
  const map = new Map(members.map((m) => [m.relation, m]));
  for (const f of FIXED_RELATIONS) {
    if (!map.has(f.key)) {
      const m = newMember(f.key, f.sex);
      m.id = f.key;
      map.set(f.key, m);
    }
  }
  // Return ordered: fixed relations first, then variables
  const out = FIXED_RELATIONS.map((f) => map.get(f.key));
  const variables = members.filter(
    (m) => !FIXED_RELATIONS.some((f) => f.key === m.relation)
  );
  return [...out, ...variables];
}

export default function PedigreeEditor({ value, onChange }) {
  const [pedigree, setPedigree] = useState(() => ({
    ashkenazi_ancestry: false,
    consanguinity: false,
    ancestries: [],
    members: [],
    ...(value || {}),
    members: ensureFixed((value && value.members) || []),
  }));

  useEffect(() => { onChange?.(pedigree); }, [pedigree]);

  const updateMember = (id, patch) => {
    setPedigree((p) => ({
      ...p,
      members: p.members.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    }));
  };
  const addMember = (relation, sex = "U") => {
    setPedigree((p) => ({ ...p, members: [...p.members, newMember(relation, sex)] }));
  };
  const removeMember = (id) => {
    setPedigree((p) => ({ ...p, members: p.members.filter((m) => m.id !== id) }));
  };

  const fixed = pedigree.members.filter((m) => FIXED_RELATIONS.some((f) => f.key === m.relation));
  const siblings = pedigree.members.filter((m) => m.relation === "sibling");
  const children = pedigree.members.filter((m) => m.relation === "child");
  const paternalAuntsUncles = pedigree.members.filter((m) => m.relation === "paternal_uncle_aunt");
  const maternalAuntsUncles = pedigree.members.filter((m) => m.relation === "maternal_uncle_aunt");

  return (
    <div className="space-y-6">
      <PedigreeVisualization pedigree={pedigree} />

      <Card className="border-slate-200">
        <CardContent className="p-6 space-y-4">
          <div className="label-eyebrow">Pedigree-level factors</div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <Label>Ashkenazi Jewish ancestry</Label>
              <Switch
                data-testid="ped-ashkenazi"
                checked={pedigree.ashkenazi_ancestry}
                onCheckedChange={(v) => setPedigree({ ...pedigree, ashkenazi_ancestry: v })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Consanguinity</Label>
              <Switch
                data-testid="ped-consanguinity"
                checked={pedigree.consanguinity}
                onCheckedChange={(v) => setPedigree({ ...pedigree, consanguinity: v })}
              />
            </div>
          </div>
          <div>
            <Label className="mb-2 block">Reported ancestries</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {ANCESTRIES.map((a) => (
                <label key={a.value} className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 hover:bg-blush cursor-pointer">
                  <Checkbox
                    data-testid={`ped-ancestry-${a.value}`}
                    checked={pedigree.ancestries.includes(a.value)}
                    onCheckedChange={() =>
                      setPedigree({
                        ...pedigree,
                        ancestries: pedigree.ancestries.includes(a.value)
                          ? pedigree.ancestries.filter((x) => x !== a.value)
                          : [...pedigree.ancestries, a.value],
                      })
                    }
                  />
                  <span className="text-sm text-slate-800">{a.label}</span>
                </label>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <SectionGroup title="Grandparents (2nd degree)">
        {fixed.filter((m) => m.relation.includes("grand")).map((m) => (
          <MemberRow key={m.id} member={m} label={FIXED_RELATIONS.find((f) => f.key === m.relation).label} onChange={(p) => updateMember(m.id, p)} />
        ))}
      </SectionGroup>

      <SectionGroup title="Parents (1st degree)">
        {fixed.filter((m) => m.relation === "father" || m.relation === "mother").map((m) => (
          <MemberRow key={m.id} member={m} label={FIXED_RELATIONS.find((f) => f.key === m.relation).label} onChange={(p) => updateMember(m.id, p)} />
        ))}
      </SectionGroup>

      <SectionGroup title="Proband (patient)">
        {fixed.filter((m) => m.relation === "proband").map((m) => (
          <MemberRow key={m.id} member={m} label="Proband" onChange={(p) => updateMember(m.id, p)} sexEditable />
        ))}
      </SectionGroup>

      <SectionList
        title="Siblings (1st degree)"
        items={siblings}
        onAdd={() => addMember("sibling")}
        onRemove={removeMember}
        onChange={updateMember}
        addTestId="add-sibling-btn"
        emptyMsg="No siblings entered."
        sexEditable
      />
      <SectionList
        title="Children (1st degree)"
        items={children}
        onAdd={() => addMember("child")}
        onRemove={removeMember}
        onChange={updateMember}
        addTestId="add-child-btn"
        emptyMsg="No children entered."
        sexEditable
      />
      <SectionList
        title="Paternal aunts / uncles (2nd degree)"
        items={paternalAuntsUncles}
        onAdd={() => addMember("paternal_uncle_aunt")}
        onRemove={removeMember}
        onChange={updateMember}
        addTestId="add-pat-relative-btn"
        emptyMsg="None entered."
        sexEditable
      />
      <SectionList
        title="Maternal aunts / uncles (2nd degree)"
        items={maternalAuntsUncles}
        onAdd={() => addMember("maternal_uncle_aunt")}
        onRemove={removeMember}
        onChange={updateMember}
        addTestId="add-mat-relative-btn"
        emptyMsg="None entered."
        sexEditable
      />
    </div>
  );
}

function SectionGroup({ title, children }) {
  return (
    <div>
      <div className="label-eyebrow mb-3">{title}</div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function SectionList({ title, items, onAdd, onRemove, onChange, addTestId, emptyMsg, sexEditable }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="label-eyebrow">{title}</div>
        <Button
          data-testid={addTestId}
          size="sm"
          variant="outline"
          className="h-8"
          onClick={onAdd}
        >
          <Plus className="w-3.5 h-3.5 mr-1" /> Add
        </Button>
      </div>
      {items.length === 0 ? (
        <div className="text-xs text-slate-500 italic">{emptyMsg}</div>
      ) : (
        <div className="space-y-2">
          {items.map((m, i) => (
            <MemberRow
              key={m.id}
              member={m}
              label={`${title.split(" ")[0]} #${i + 1}`}
              onChange={(p) => onChange(m.id, p)}
              onRemove={() => onRemove(m.id)}
              sexEditable={sexEditable}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MemberRow({ member, label, onChange, onRemove, sexEditable }) {
  return (
    <Card className="border-slate-200">
      <CardContent className="p-4">
        <div className="flex items-start gap-3 flex-wrap">
          <div className="flex items-center gap-2 min-w-[180px]">
            <div className={`w-8 h-8 flex items-center justify-center rounded-md ${member.affected ? "bg-brand text-white" : "bg-blush text-brand"}`}>
              {member.sex === "M" ? "♂" : member.sex === "F" ? "♀" : "?"}
            </div>
            <div>
              <div className="font-heading font-semibold text-sm text-slate-900">{label}</div>
              <div className="text-[10px] uppercase tracking-widest text-slate-500">{member.relation.replace(/_/g, " ")}</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 flex-1">
            {sexEditable && (
              <Select value={member.sex} onValueChange={(v) => onChange({ sex: v })}>
                <SelectTrigger data-testid={`ped-sex-${member.id}`} className="w-[100px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="M">Male</SelectItem>
                  <SelectItem value="F">Female</SelectItem>
                  <SelectItem value="U">Unknown</SelectItem>
                </SelectContent>
              </Select>
            )}
            <Input
              data-testid={`ped-age-${member.id}`}
              type="number"
              placeholder="Age"
              value={member.age ?? ""}
              onChange={(e) => onChange({ age: e.target.value === "" ? null : Number(e.target.value) })}
              className="w-[80px] h-9"
            />
            <label className="flex items-center gap-2 border border-slate-200 rounded-md px-3 h-9 text-sm hover:bg-blush cursor-pointer">
              <Checkbox
                data-testid={`ped-affected-${member.id}`}
                checked={member.affected}
                onCheckedChange={(v) => onChange({ affected: !!v })}
              />
              Affected
            </label>
            <label className="flex items-center gap-2 border border-slate-200 rounded-md px-3 h-9 text-sm hover:bg-blush cursor-pointer">
              <Checkbox
                data-testid={`ped-deceased-${member.id}`}
                checked={member.deceased}
                onCheckedChange={(v) => onChange({ deceased: !!v })}
              />
              Deceased
            </label>
            {onRemove && (
              <button
                data-testid={`ped-remove-${member.id}`}
                onClick={onRemove}
                className="text-slate-500 hover:text-brand p-2"
                title="Remove"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        {member.affected && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            <div className="text-[11px] uppercase tracking-widest text-slate-500 mb-2">Conditions</div>
            <div className="flex flex-wrap gap-2">
              {CONDITION_OPTIONS.map((c) => (
                <label
                  key={c.value}
                  className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs cursor-pointer border ${
                    member.conditions?.includes(c.value)
                      ? "bg-brand text-white border-brand"
                      : "border-slate-200 hover:border-brand"
                  }`}
                >
                  <Checkbox
                    data-testid={`ped-cond-${member.id}-${c.value}`}
                    checked={member.conditions?.includes(c.value)}
                    onCheckedChange={() => {
                      const set = new Set(member.conditions || []);
                      set.has(c.value) ? set.delete(c.value) : set.add(c.value);
                      onChange({ conditions: [...set] });
                    }}
                    className="w-3 h-3"
                  />
                  {c.label}
                </label>
              ))}
              <Input
                data-testid={`ped-diag-age-${member.id}`}
                type="number"
                placeholder="Age at dx"
                value={member.age_at_diagnosis ?? ""}
                onChange={(e) => onChange({ age_at_diagnosis: e.target.value === "" ? null : Number(e.target.value) })}
                className="w-[110px] h-8 text-xs"
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------- Live SVG visualization ----------
function PedigreeVisualization({ pedigree }) {
  const layout = useMemo(() => buildLayout(pedigree), [pedigree]);
  return (
    <Card className="border-slate-200 bg-white">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="label-eyebrow">Pedigree · live view</div>
          <div className="flex items-center gap-3 text-[10px] text-slate-500">
            <span className="flex items-center gap-1"><span className="w-3 h-3 border border-slate-500 inline-block"></span>Male</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 border border-slate-500 inline-block rounded-full"></span>Female</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-brand inline-block"></span>Affected</span>
          </div>
        </div>
        <svg viewBox={`0 0 ${layout.width} ${layout.height}`} className="w-full h-[280px]" data-testid="pedigree-svg">
          {layout.lines.map((l, i) => (
            <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke="#64748b" strokeWidth="1" />
          ))}
          {layout.nodes.map((n, i) => (
            <g key={i} transform={`translate(${n.x}, ${n.y})`}>
              {n.sex === "M" ? (
                <rect x={-16} y={-16} width={32} height={32} fill={n.affected ? "#b9207a" : "#fff"} stroke="#334155" strokeWidth="1.5" />
              ) : n.sex === "F" ? (
                <circle r={16} fill={n.affected ? "#b9207a" : "#fff"} stroke="#334155" strokeWidth="1.5" />
              ) : (
                <polygon points="0,-18 18,0 0,18 -18,0" fill={n.affected ? "#b9207a" : "#fff"} stroke="#334155" strokeWidth="1.5" />
              )}
              {n.deceased && (
                <line x1={-18} y1={-18} x2={18} y2={18} stroke="#334155" strokeWidth="1.5" />
              )}
              {n.proband && (
                <text x={0} y={30} textAnchor="middle" fontSize="10" fill="#b9207a" fontWeight="bold">P</text>
              )}
              <text x={0} y={-22} textAnchor="middle" fontSize="9" fill="#475569">
                {n.short}
              </text>
            </g>
          ))}
        </svg>
      </CardContent>
    </Card>
  );
}

function buildLayout(pedigree) {
  // Simple layered layout: gen 1 grandparents; gen 2 parents + aunts/uncles; gen 3 proband + siblings; gen 4 children
  const W = 900;
  const H = 400;
  const rowY = { g1: 50, g2: 150, g3: 250, g4: 350 };
  const nodes = [];
  const lines = [];
  const get = (rel) => pedigree.members.find((m) => m.relation === rel);
  const many = (rel) => pedigree.members.filter((m) => m.relation === rel);

  const put = (m, x, y, extra = {}) => {
    if (!m) return null;
    const n = {
      x, y,
      sex: m.sex,
      affected: m.affected,
      deceased: m.deceased,
      proband: m.relation === "proband",
      short: (m.label || m.relation.replace(/_/g, " ").slice(0, 8)) + (m.age ? ` (${m.age})` : ""),
      ...extra,
    };
    nodes.push(n);
    return n;
  };

  // Gen 1
  const pgf = put(get("paternal_grandfather"), 200, rowY.g1);
  const pgm = put(get("paternal_grandmother"), 280, rowY.g1);
  const mgf = put(get("maternal_grandfather"), 620, rowY.g1);
  const mgm = put(get("maternal_grandmother"), 700, rowY.g1);
  if (pgf && pgm) lines.push({ x1: pgf.x + 16, y1: pgf.y, x2: pgm.x - 16, y2: pgm.y });
  if (mgf && mgm) lines.push({ x1: mgf.x + 16, y1: mgf.y, x2: mgm.x - 16, y2: mgm.y });

  // Gen 2 - parents (father from paternal side, mother from maternal side)
  const patAunts = many("paternal_uncle_aunt");
  const matAunts = many("maternal_uncle_aunt");
  const father = put(get("father"), 340, rowY.g2);
  const mother = put(get("mother"), 560, rowY.g2);
  patAunts.forEach((m, i) => {
    put(m, 100 + i * 40, rowY.g2);
  });
  matAunts.forEach((m, i) => {
    put(m, 760 + i * 40, rowY.g2);
  });
  if (father && pgf && pgm) {
    const mid = (pgf.x + pgm.x) / 2;
    lines.push({ x1: mid, y1: pgf.y + 8, x2: mid, y2: rowY.g2 - 30 });
    lines.push({ x1: mid, y1: rowY.g2 - 30, x2: father.x, y2: rowY.g2 - 30 });
    lines.push({ x1: father.x, y1: rowY.g2 - 30, x2: father.x, y2: father.y - 16 });
  }
  if (mother && mgf && mgm) {
    const mid = (mgf.x + mgm.x) / 2;
    lines.push({ x1: mid, y1: mgf.y + 8, x2: mid, y2: rowY.g2 - 30 });
    lines.push({ x1: mid, y1: rowY.g2 - 30, x2: mother.x, y2: rowY.g2 - 30 });
    lines.push({ x1: mother.x, y1: rowY.g2 - 30, x2: mother.x, y2: mother.y - 16 });
  }
  if (father && mother) lines.push({ x1: father.x + 16, y1: father.y, x2: mother.x - 16, y2: mother.y });

  // Gen 3 - proband + siblings
  const siblings = many("sibling");
  const total = 1 + siblings.length;
  const startX = 450 - ((total - 1) * 60) / 2;
  const proband = put(get("proband"), startX, rowY.g3);
  const sibNodes = siblings.map((s, i) => put(s, startX + (i + 1) * 60, rowY.g3));
  if (proband && father && mother) {
    const midParent = (father.x + mother.x) / 2;
    const busY = rowY.g3 - 30;
    lines.push({ x1: midParent, y1: father.y + 16, x2: midParent, y2: busY });
    const xs = [proband, ...sibNodes].filter(Boolean).map((n) => n.x);
    xs.forEach((x) => {
      lines.push({ x1: x, y1: busY, x2: x, y2: rowY.g3 - 16 });
    });
    if (xs.length > 1) {
      lines.push({ x1: Math.min(...xs), y1: busY, x2: Math.max(...xs), y2: busY });
    }
  }

  // Gen 4 - children
  const children = many("child");
  if (proband && children.length) {
    const startCX = proband.x - ((children.length - 1) * 60) / 2;
    const busY = rowY.g4 - 30;
    lines.push({ x1: proband.x, y1: proband.y + 16, x2: proband.x, y2: busY });
    children.forEach((c, i) => {
      const cx = startCX + i * 60;
      put(c, cx, rowY.g4);
      lines.push({ x1: cx, y1: busY, x2: cx, y2: rowY.g4 - 16 });
    });
    if (children.length > 1) {
      const xs = children.map((_, i) => startCX + i * 60);
      lines.push({ x1: Math.min(...xs), y1: busY, x2: Math.max(...xs), y2: busY });
    }
  }

  return { width: W, height: H, nodes, lines };
}
