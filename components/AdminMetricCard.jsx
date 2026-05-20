export function AdminMetricCard({ label, value, meta, metaTone = "neutral", tone = "neutral", icon: Icon }) {
  return (
    <article className={`admin-metric-card admin-metric-${tone}`}>
      <div className="admin-metric-card-label">
        {Icon ? <Icon aria-hidden="true" size={16} strokeWidth={1.8} /> : null}
        <span>{label}</span>
      </div>
      <strong>{value}</strong>
      {meta ? <small className={`admin-metric-meta admin-metric-meta-${metaTone}`}>{meta}</small> : null}
    </article>
  );
}
