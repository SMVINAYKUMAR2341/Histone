import { Button } from "@/components/ui/button";
import { Dna, ShieldCheck, Zap } from "lucide-react";
import BrandMark from "@/components/BrandMark";

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
export default function Login() {
  const signIn = () => {
    const redirectUrl = window.location.origin + "/dashboard";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="min-h-screen bg-white flex">
      <div className="grid-lines absolute inset-0 opacity-20 pointer-events-none" />
      <div className="max-w-[1400px] mx-auto w-full px-6 py-16 grid lg:grid-cols-2 gap-16 items-center relative">
        <div>
          <div className="flex items-center gap-3 mb-8">
            <BrandMark size={44} />
            <div>
              <div className="font-heading font-extrabold text-2xl leading-none text-brand tracking-tight">HistoNe</div>
              <div className="text-[10px] tracking-[0.2em] uppercase text-slate-500 mt-1">Genetics DSS</div>
            </div>
          </div>
          <div className="label-eyebrow mb-4 text-brand" style={{ color: "hsl(var(--brand-magenta))" }}>
            Decision support for OB / GYN
          </div>
          <h1 className="font-heading font-bold text-4xl sm:text-5xl lg:text-6xl leading-[1.02] tracking-tight text-slate-900">
            Know when to refer to genetics.
            <br />
            <span className="text-brand">In under two minutes.</span>
          </h1>
          <p className="mt-6 text-slate-600 text-base leading-relaxed max-w-xl">
            A point-of-care tool that maps a patient's history, labs, or ultrasound
            findings against ACOG, NCCN, ACMG and ASRM criteria — and tells you
            whether a genetic counseling referral is needed, how urgent, and why.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 items-center">
            <Button
              data-testid="google-signin-btn"
              size="lg"
              onClick={signIn}
              className="bg-brand hover:bg-brand text-white h-12 px-6 rounded-md"
            >
              Sign in with Google
            </Button>
            <div className="text-xs text-slate-500">
              Provider · Admin · Nurse · Genetic counselor
            </div>
          </div>
          <div className="mt-14 grid sm:grid-cols-3 gap-4 max-w-xl">
            <Feature icon={Zap} title="Under 2 min" body="Every decision, in-visit or immediately after." />
            <Feature icon={ShieldCheck} title="Guideline-linked" body="Every result cites the source rule." />
            <Feature icon={Dna} title="Six pathways" body="Cancer, carrier, NIPT, US, RPL, family Hx." />
          </div>
        </div>
        <div className="hidden lg:block">
          <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
            <div className="label-eyebrow mb-3">Example result</div>
            <div className="result-urgent px-5 py-4 rounded-md">
              <div className="text-[11px] uppercase tracking-widest opacity-80">Recommendation</div>
              <div className="font-heading font-bold text-3xl mt-1">Refer — Urgent</div>
              <div className="text-sm mt-2 opacity-95">Cancer genetic counselor</div>
            </div>
            <div className="mt-6 space-y-3">
              <RuleRow src="NCCN" text="Personal breast cancer age ≤ 50" />
              <RuleRow src="NCCN" text="Male breast cancer in first-degree relative" />
              <RuleRow src="NCCN" text="Ashkenazi ancestry + family history" />
            </div>
            <div className="mt-8 pt-4 border-t border-slate-200 text-[11px] text-slate-500">
              Every rule shown is inspectable and editable in the admin console.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Feature({ icon: Icon, title, body }) {
  return (
    <div>
      <Icon className="w-5 h-5 text-brand mb-2" />
      <div className="font-heading font-semibold text-sm text-slate-900">{title}</div>
      <div className="text-xs text-slate-600 mt-0.5">{body}</div>
    </div>
  );
}

function RuleRow({ src, text }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-brand text-white tracking-wide">{src}</span>
      <span className="text-slate-700">{text}</span>
    </div>
  );
}
