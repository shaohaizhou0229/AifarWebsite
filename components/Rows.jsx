export function DownloadRow({ title, description, action, variant = "secondary" }) {
  return (
    <article className="download-row">
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <a className={`button ${variant}`} href="#">
        {action}
      </a>
    </article>
  );
}

export function DocLink({ title, description, pill }) {
  return (
    <a className="doc-link" href="#">
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <span className="pill">{pill}</span>
    </a>
  );
}

export function Release({ title, description, pill }) {
  return (
    <article className="release">
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <span className="pill">{pill}</span>
    </article>
  );
}
