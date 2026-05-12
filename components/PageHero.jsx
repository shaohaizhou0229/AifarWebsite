export function PageHero({ eyebrow, title, lead }) {
  return (
    <section className="page-hero">
      <div className="section-inner">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="lead">{lead}</p>
      </div>
    </section>
  );
}
