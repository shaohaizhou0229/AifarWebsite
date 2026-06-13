"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AdminAsyncState } from "@/components/AdminAsyncState";
import { localizedPath } from "@/i18n/routing";

function formatStatus(release, page) {
  return release.isPublished ? page.published : page.draft;
}

export function AdminDownloadsClient({ locale, page, initialPlatforms = null, loadingLabel, errorLabel }) {
  const hasInitialPlatforms = Array.isArray(initialPlatforms);
  const [platforms, setPlatforms] = useState(hasInitialPlatforms ? initialPlatforms : []);
  const [loading, setLoading] = useState(!hasInitialPlatforms);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!hasInitialPlatforms) return undefined;
    setPlatforms(initialPlatforms);
    setLoading(false);
    setError("");
    return undefined;
  }, [hasInitialPlatforms, initialPlatforms]);

  useEffect(() => {
    if (hasInitialPlatforms) {
      return undefined;
    }

    let cancelled = false;

    async function loadPlatforms() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch("/api/admin/downloads/");
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || errorLabel);
        if (!cancelled) setPlatforms(result.platforms || []);
      } catch (loadError) {
        if (!cancelled) setError(loadError.message || errorLabel);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadPlatforms();
    return () => {
      cancelled = true;
    };
  }, [hasInitialPlatforms, errorLabel]);

  return (
    <AdminAsyncState loading={loading} error={error} loadingLabel={loadingLabel} errorLabel={errorLabel}>
      <div className="admin-table-list">
        {platforms.map((platform) => (
          <Link className="admin-table-row" key={platform.key} href={localizedPath(locale, `/admin/downloads/${platform.key}/`)} prefetch={false}>
            <div>
              <h3>{platform.label}</h3>
              <p>{platform.release.version || page.noVersion}</p>
            </div>
            <span>{platform.release.buildNumber || "-"}</span>
            <span className="admin-status admin-status-neutral">{formatStatus(platform.release, page)}</span>
          </Link>
        ))}
      </div>
    </AdminAsyncState>
  );
}
