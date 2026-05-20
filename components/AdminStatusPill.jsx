export function AdminStatusPill({ children, tone = "neutral" }) {
  return <span className={`admin-status admin-status-${tone}`}>{children}</span>;
}
