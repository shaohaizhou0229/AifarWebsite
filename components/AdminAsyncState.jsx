export function AdminAsyncState({ loading, error, loadingLabel, errorLabel, children }) {
  if (loading) {
    return (
      <article className="admin-panel admin-empty-state" aria-busy="true">
        <h2>{loadingLabel}</h2>
      </article>
    );
  }

  if (error) {
    return (
      <article className="admin-panel admin-empty-state">
        <h2>{errorLabel}</h2>
        <p>{error}</p>
      </article>
    );
  }

  return children;
}
