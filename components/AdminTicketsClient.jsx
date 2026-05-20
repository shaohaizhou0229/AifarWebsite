"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminAsyncState } from "@/components/AdminAsyncState";
import { getRequestTypeLabel, getTicketCategoryLabel, getTicketPriorityLabel, getTicketStatusLabel } from "@/i18n/labels";
import { localizedPath } from "@/i18n/routing";

const STATUS_OPTIONS = ["new", "in_progress", "waiting_customer", "resolved", "closed"];
const PRIORITY_OPTIONS = ["low", "normal", "high", "urgent"];
const CATEGORY_OPTIONS = ["account_access", "client_download", "installation", "product_usage", "bug_report", "partnership", "other"];

function formatShortDate(value, locale) {
  return value ? new Date(value).toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" }) : "";
}

function formatDate(value, locale) {
  return value ? new Date(value).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" }) : "";
}

function buildQuery(filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  return params.toString();
}

export function AdminContactTicketsClient({ locale, page, messages, initialStatus = "", initialTickets = null, loadingLabel, errorLabel }) {
  const skipInitialFetch = useRef(Boolean(initialTickets));
  const [tickets, setTickets] = useState(initialTickets || []);
  const [loading, setLoading] = useState(!initialTickets);
  const [error, setError] = useState("");

  useEffect(() => {
    if (skipInitialFetch.current) {
      skipInitialFetch.current = false;
      return undefined;
    }

    let cancelled = false;

    async function loadTickets() {
      setLoading(true);
      setError("");
      try {
        const query = buildQuery({ status: initialStatus });
        const params = new URLSearchParams(query);
        params.set("limit", "20");
        params.set("scope", "contact");
        const response = await fetch(`/api/admin/tickets/?${params.toString()}`);
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || errorLabel);
        if (!cancelled) setTickets(result.tickets || []);
      } catch (loadError) {
        if (!cancelled) setError(loadError.message || errorLabel);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadTickets();
    return () => {
      cancelled = true;
    };
  }, [initialStatus, errorLabel]);

  return (
    <AdminAsyncState loading={loading} error={error} loadingLabel={loadingLabel} errorLabel={errorLabel}>
      <div className="admin-table-list">
        {tickets.length ? tickets.map((ticket) => (
          <Link className="admin-table-row" key={ticket.id} href={localizedPath(locale, `/admin/tickets/${ticket.id}/`)} prefetch={false}>
            <div>
              <h3>{ticket.subject || getRequestTypeLabel(messages.forms, ticket.requestType)}</h3>
              <p>{ticket.name} - {ticket.workEmail}</p>
            </div>
            <time>{formatShortDate(ticket.createdAt, locale)}</time>
            <span className="admin-status admin-status-neutral">{getTicketStatusLabel(messages.forms.admin, ticket.status)}</span>
          </Link>
        )) : (
          <article className="admin-panel admin-empty-state">
            <h2>{page.emptyTitle}</h2>
            <p>{page.emptyLead}</p>
          </article>
        )}
      </div>
    </AdminAsyncState>
  );
}

export function AdminSupportClient({ locale, page, messages, initialFilters, initialData = null, loadingLabel, errorLabel }) {
  const router = useRouter();
  const adminLabels = messages.forms.admin;
  const skipInitialFetch = useRef(Boolean(initialData));
  const [filters, setFilters] = useState(initialFilters);
  const [tickets, setTickets] = useState(initialData?.tickets || []);
  const [stats, setStats] = useState(initialData?.stats || { pending: 0, inProgress: 0, today: 0, closed: 0 });
  const [profiles, setProfiles] = useState(initialData?.profiles || []);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState("");

  useEffect(() => {
    setFilters(initialFilters);
  }, [initialFilters]);

  useEffect(() => {
    if (skipInitialFetch.current) {
      skipInitialFetch.current = false;
      return undefined;
    }

    let cancelled = false;

    async function loadTickets() {
      setLoading(true);
      setError("");
      try {
        const query = buildQuery(filters);
        const params = new URLSearchParams(query);
        params.set("limit", "20");
        params.set("scope", "support");
        const response = await fetch(`/api/admin/tickets/?${params.toString()}`);
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || errorLabel);
        if (!cancelled) {
          setTickets(result.tickets || []);
          setStats(result.stats || { pending: 0, inProgress: 0, today: 0, closed: 0 });
          setProfiles(result.profiles || []);
        }
      } catch (loadError) {
        if (!cancelled) setError(loadError.message || errorLabel);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadTickets();
    return () => {
      cancelled = true;
    };
  }, [filters, errorLabel]);

  function updateFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function submitFilter(event) {
    event.preventDefault();
    const query = buildQuery(filters);
    router.push(`${localizedPath(locale, "/admin/support/")}${query ? `?${query}` : ""}`);
  }

  const statCards = [
    [page.stats.pending, stats.pending],
    [page.stats.inProgress, stats.inProgress],
    [page.stats.today, stats.today],
    [page.stats.closed, stats.closed]
  ];

  return (
    <>
      <div className="ticket-stat-grid">
        {statCards.map(([label, value]) => (
          <article className="ticket-stat admin-panel" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </div>
      <form className="ticket-filter-bar admin-panel" action={localizedPath(locale, "/admin/support/")} onSubmit={submitFilter}>
        <div className="field">
          <label htmlFor="status">{page.filters.status}</label>
          <select id="status" name="status" value={filters.status} onChange={(event) => updateFilter("status", event.target.value)}>
            <option value="">{page.filters.allStatuses}</option>
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>{getTicketStatusLabel(adminLabels, option)}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="priority">{page.filters.priority}</label>
          <select id="priority" name="priority" value={filters.priority} onChange={(event) => updateFilter("priority", event.target.value)}>
            <option value="">{page.filters.allPriorities}</option>
            {PRIORITY_OPTIONS.map((option) => (
              <option key={option} value={option}>{getTicketPriorityLabel(adminLabels, option)}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="category">{page.filters.category}</label>
          <select id="category" name="category" value={filters.category} onChange={(event) => updateFilter("category", event.target.value)}>
            <option value="">{page.filters.allCategories}</option>
            {CATEGORY_OPTIONS.map((option) => (
              <option key={option} value={option}>{getTicketCategoryLabel(adminLabels, option)}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="assignee">{page.filters.assignee}</label>
          <select id="assignee" name="assignee" value={filters.assignee} onChange={(event) => updateFilter("assignee", event.target.value)}>
            <option value="">{page.filters.allAssignees}</option>
            <option value="unassigned">{adminLabels.unassigned}</option>
            {profiles.map((profile) => (
              <option key={profile.id} value={profile.id}>{profile.displayName || profile.email}</option>
            ))}
          </select>
        </div>
        <div className="field ticket-search-field">
          <label htmlFor="q">{page.filters.keyword}</label>
          <input id="q" name="q" value={filters.q} placeholder={page.filters.keywordPlaceholder} onChange={(event) => updateFilter("q", event.target.value)} />
        </div>
        <button className="button primary compact" type="submit">{page.filters.apply}</button>
        <Link className="button secondary compact" href={localizedPath(locale, "/admin/support/")} prefetch={false}>{page.filters.reset}</Link>
      </form>
      <AdminAsyncState loading={loading} error={error} loadingLabel={loadingLabel} errorLabel={errorLabel}>
        <div className="ticket-table">
          {tickets.length ? tickets.map((ticket) => (
            <Link className="ticket-row" key={ticket.id} href={localizedPath(locale, `/admin/tickets/${ticket.id}/`)} prefetch={false}>
              <div className="ticket-main">
                <h3>{ticket.subject || getRequestTypeLabel(messages.forms, ticket.requestType)}</h3>
                <p>{ticket.name} - {ticket.workEmail}</p>
                <span>{ticket.organization || page.notProvided}</span>
              </div>
              <div className="ticket-meta">
                <span className="admin-status admin-status-neutral">{getTicketStatusLabel(adminLabels, ticket.status)}</span>
                <span>{getTicketPriorityLabel(adminLabels, ticket.priority)}</span>
                <span>{getTicketCategoryLabel(adminLabels, ticket.category || "other")}</span>
                <span>{ticket.assigneeName || ticket.assigneeEmail || adminLabels.unassigned}</span>
                <span>{formatDate(ticket.updatedAt || ticket.createdAt, locale)}</span>
              </div>
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
