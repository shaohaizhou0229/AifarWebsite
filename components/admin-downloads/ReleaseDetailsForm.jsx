export function ReleaseDetailsForm({ labels, form, saving, onChange, onSubmit }) {
  return (
    <form className="admin-actions" onSubmit={onSubmit}>
      <div className="field">
        <label htmlFor="version">{labels.version}</label>
        <input id="version" name="version" value={form.version} onChange={onChange} />
      </div>
      <div className="field">
        <label htmlFor="buildNumber">{labels.buildNumber}</label>
        <input id="buildNumber" name="buildNumber" value={form.buildNumber} onChange={onChange} />
      </div>
      <div className="field">
        <label htmlFor="externalUrl">{labels.externalUrl}</label>
        <input id="externalUrl" name="externalUrl" value={form.externalUrl} onChange={onChange} />
      </div>
      <div className="field">
        <label htmlFor="releaseNotes">{labels.releaseNotes}</label>
        <textarea id="releaseNotes" name="releaseNotes" value={form.releaseNotes} onChange={onChange} />
      </div>
      <label className="checkbox-line">
        <input name="isPublished" type="checkbox" checked={form.isPublished} onChange={onChange} />
        <span>{labels.published}</span>
      </label>
      <button className="button primary" type="submit" disabled={saving}>
        {saving ? labels.saving : labels.save}
      </button>
    </form>
  );
}
