// HistoNe brand mark — cream/yellow circle with magenta "H" wordmark hint.
export default function BrandMark({ size = 36 }) {
  return (
    <div
      className="rounded-full bg-cream flex items-center justify-center shadow-sm"
      style={{ width: size, height: size }}
      aria-label="HistoNe"
    >
      <span
        className="font-heading font-extrabold text-brand"
        style={{ fontSize: size * 0.5, lineHeight: 1, letterSpacing: "-0.05em" }}
      >
        H
      </span>
    </div>
  );
}
