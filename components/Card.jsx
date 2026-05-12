export function Card({ icon, title, children }) {
  return (
    <article className="card">
      <span className="icon">{icon}</span>
      <h3>{title}</h3>
      <p>{children}</p>
    </article>
  );
}
