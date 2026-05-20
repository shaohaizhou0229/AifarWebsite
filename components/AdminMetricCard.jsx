export function AdminMetricCard({ label, value, meta, tone = "neutral" }) {
  return (
    <article className={`admin-metric-card admin-metric-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {meta ? <small>{meta}</small> : null}
    </article>
  );
}
