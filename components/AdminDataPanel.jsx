export function AdminDataPanel({ title, meta, action, children, className = "" }) {
  return (
    <section className={`admin-panel ${className}`}>
      <header className="admin-panel-header">
        <div>
          <h2>{title}</h2>
          {meta ? <p>{meta}</p> : null}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}
