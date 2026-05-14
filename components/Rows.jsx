export function DownloadRow({ title, description, action, variant = "secondary", href = "#", disabled = false, meta = "" }) {
  return (
    <article className="download-row">
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
        {meta ? <p className="muted-line">{meta}</p> : null}
      </div>
      <a className={`button ${disabled ? "secondary disabled" : variant}`} href={disabled ? "#" : href} aria-disabled={disabled}>
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
