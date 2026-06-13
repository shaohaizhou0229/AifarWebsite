"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminAsyncState } from "@/components/AdminAsyncState";
import { AdminInvitationActions } from "@/components/AdminInvitationActions";
import { localizedPath } from "@/i18n/routing";

function formatDate(value, locale) {
  return value ? new Date(value).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" }) : "";
}

function permissionSummary(user, page) {
  if (user.role !== "admin") return page.notProvided;
  const names = (user.adminPermissions || []).map((permission) => page.permissions[String(permission).split(".").pop()]).filter(Boolean);
  return names.length ? names.join(", ") : page.notProvided;
}

export function AdminUsersClient({ locale, page, initialQuery = "", initialStatus = "all", initialUsers = null, loadingLabel, errorLabel }) {
  const router = useRouter();
  const hasInitialUsers = Array.isArray(initialUsers);
  const [q, setQ] = useState(initialQuery);
  const [status, setStatus] = useState(initialStatus);
  const [users, setUsers] = useState(hasInitialUsers ? initialUsers : []);
  const [loading, setLoading] = useState(!hasInitialUsers);
  const [error, setError] = useState("");

  useEffect(() => {
    setQ(initialQuery);
    setStatus(initialStatus);
  }, [initialQuery, initialStatus]);

  useEffect(() => {
    if (!hasInitialUsers) return undefined;
    setUsers(initialUsers);
    setLoading(false);
    setError("");
    return undefined;
  }, [hasInitialUsers, initialUsers]);

  useEffect(() => {
    if (hasInitialUsers) {
      return undefined;
    }

    let cancelled = false;

    async function loadUsers() {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams();
        if (q) params.set("q", q);
        if (status) params.set("status", status);
        params.set("limit", "20");
        params.set("metrics", "deferred");
        const response = await fetch(`/api/admin/users/?${params.toString()}`);
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || errorLabel);
        const nextUsers = result.users || [];
        if (!cancelled) {
          setUsers(nextUsers);
          setLoading(false);
        }

        const metricIds = nextUsers.filter((user) => user.recordType !== "invitation").map((user) => user.id).filter(Boolean);
        if (metricIds.length) {
          try {
            const metricParams = new URLSearchParams();
            metricParams.set("ids", metricIds.join(","));
            const metricResponse = await fetch(`/api/admin/users/metrics/?${metricParams.toString()}`);
            const metricResult = await metricResponse.json().catch(() => ({}));
            if (metricResponse.ok && !cancelled) {
              const metricById = new Map((metricResult.metrics || []).map((item) => [item.id, item]));
              setUsers((currentUsers) => currentUsers.map((user) => {
                const metrics = metricById.get(user.id);
                return metrics ? {
                  ...user,
                  ticketCount: metrics.ticketCount,
                  lastFootprintAt: metrics.lastFootprintAt
                } : user;
              }));
            }
          } catch {
            // Metrics are secondary; the user list should remain usable if this follow-up request fails.
          }
        }
      } catch (loadError) {
        if (!cancelled) setError(loadError.message || errorLabel);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadUsers();
    return () => {
      cancelled = true;
    };
  }, [hasInitialUsers, q, status, errorLabel]);

  function submitFilter(event) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status && status !== "all") params.set("status", status);
    router.push(`${localizedPath(locale, "/admin/users/")}${params.toString() ? `?${params.toString()}` : ""}`);
  }

  return (
    <>
      <form className="admin-filter-bar" action={localizedPath(locale, "/admin/users/")} onSubmit={submitFilter}>
        <label className="sr-only" htmlFor="q">{page.searchLabel}</label>
        <input id="q" name="q" value={q} placeholder={page.searchPlaceholder} onChange={(event) => setQ(event.target.value)} />
        <label className="sr-only" htmlFor="status">{page.statusFilter}</label>
        <select id="status" name="status" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="all">{page.statuses.all}</option>
          <option value="active">{page.statuses.active}</option>
          <option value="deactivated">{page.statuses.deactivated}</option>
          <option value="deleted">{page.statuses.deleted}</option>
          <option value="pending">{page.statuses.pending}</option>
        </select>
        <button className="button secondary compact" type="submit">{page.searchAction}</button>
      </form>
      <AdminAsyncState loading={loading} error={error} loadingLabel={loadingLabel} errorLabel={errorLabel}>
        <div className="admin-table-list">
          {users.length ? users.map((user) => user.recordType === "invitation" ? (
            <article className="admin-table-row" key={user.id}>
              <div>
                <h3>{user.displayName || user.email}</h3>
                <p>{user.email} - {user.organization || page.notProvided}</p>
              </div>
              <span className="admin-status admin-status-attention">{page.statuses.pending}</span>
              <span>{page.roles[user.role] || user.role}</span>
              <span>{permissionSummary(user, page)}</span>
              <AdminInvitationActions invitationId={user.id} labels={page.invite.cancel} />
            </article>
          ) : (
            <Link className="admin-table-row" key={user.id} href={localizedPath(locale, `/admin/users/${user.id}/`)} prefetch={false}>
              <div>
                <h3>{user.displayName || user.email}</h3>
                <p>{user.email} - {user.organization || page.notProvided}</p>
              </div>
              <span className="admin-status admin-status-neutral">{page.roles[user.role] || user.role}</span>
              <span>{page.statuses[user.accountStatus] || user.accountStatus}</span>
              <span>{page.tickets}: {user.ticketCount}</span>
              <time>{formatDate(user.lastFootprintAt, locale) || page.notProvided}</time>
            </Link>
          )) : (
            <article className="admin-panel admin-empty-state">
              <h2>{page.emptyTitle}</h2>
              <p>{page.emptyLead}</p>
            </article>
          )}
        </div>
      </AdminAsyncState>
    </>
  );
}
