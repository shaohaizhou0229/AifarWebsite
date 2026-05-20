export function CmsToolbar({ labels, pageKey, locale, pageOptions, localeOptions, disabled, onLoadContent }) {
  return (
    <div className="cms-toolbar">
      <div className="field">
        <label htmlFor="cmsPage">{labels.page}</label>
        <select
          id="cmsPage"
          value={pageKey}
          onChange={(event) => onLoadContent(event.target.value, locale)}
          disabled={disabled}
        >
          {pageOptions.map((option) => (
            <option key={option.key} value={option.key}>{option.label}</option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="cmsLocale">{labels.locale}</label>
        <select
          id="cmsLocale"
          value={locale}
          onChange={(event) => onLoadContent(pageKey, event.target.value)}
          disabled={disabled}
        >
          {localeOptions.map((option) => (
            <option key={option.key} value={option.key}>{option.label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
