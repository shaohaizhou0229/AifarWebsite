export function DownloadRow({
  title,
  description,
  action,
  variant = "secondary",
  href = "#",
  disabled = false,
  meta = "",
  checksum = ""
}) {
  return (
    <article className="download-row">
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
        {meta ? <p className="muted-line">{meta}</p> : null}
        {checksum ? <code className="checksum-line">SHA-256: {checksum}</code> : null}
      </div>
      <a className={`button ${disabled ? "secondary disabled" : variant}`} href={disabled ? "#" : href} aria-disabled={disabled}>
        {action}
      </a>
    </article>
  );
}

export function DocLink({ title, description, pill, href = "#", action = "" }) {
  return (
    <a className="doc-link" href={href}>
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <span className="pill">{action || pill}</span>
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
