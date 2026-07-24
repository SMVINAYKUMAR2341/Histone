import { AlertTriangle } from "lucide-react";

export default function UnvalidatedBanner() {
  return (
    <div
      data-testid="unvalidated-banner"
      className="unvalidated-banner w-full text-[12px] font-semibold py-1.5 px-6 flex items-center justify-center gap-2"
    >
      <AlertTriangle className="w-3.5 h-3.5" />
      <span className="tracking-[0.14em] uppercase">
        Not yet clinically validated — placeholder criteria for demonstration only
      </span>
    </div>
  );
}
