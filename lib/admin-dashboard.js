import { listMyCollaborationSubtasks } from "@/lib/collaboration";
import { getPostgresPool } from "@/lib/db";
import { listAdminDocuments } from "@/lib/documents";
import { listAdminDownloadPlatforms } from "@/lib/downloads";
import { getAdminUserOverview } from "@/lib/profiles";
import { getSiteAnalyticsOverview } from "@/lib/site-analytics";
import { getAdminTicketStatsByScope, listAdminTickets } from "@/lib/tickets";
import { listRecentUserFootprints } from "@/lib/user-footprints";

function isOpenTicket(ticket) {
  return ticket.status !== "closed" && ticket.status !== "resolved";
}

function isOverdue(subtask) {
  if (!subtask.dueAt || subtask.status === "completed") return false;
  return new Date(subtask.dueAt).getTime() < Date.now();
}

function isDueToday(subtask) {
  if (!subtask.dueAt || subtask.status === "completed") return false;
  const due = new Date(subtask.dueAt);
  const now = new Date();
  return due.getFullYear() === now.getFullYear()
    && due.getMonth() === now.getMonth()
    && due.getDate() === now.getDate();
}

async function countProductDrafts() {
  try {
    const pool = getPostgresPool();
    const result = await pool.query(
      `select count(*)::int as count
       from public.site_page_contents
       where draft_content is not null
        and draft_content <> '{}'::jsonb
        and (
          is_published = false
          or published_at is null
          or updated_at > published_at
        )`
    );
    return Number(result.rows[0]?.count || 0);
  } catch {
    return 0;
  }
}

async function listRecentProductActivity(limit = 4) {
  try {
    const pool = getPostgresPool();
    const result = await pool.query(
      `select page_key, locale, is_published, published_at, updated_at, created_at
       from public.site_page_contents
       where draft_content is not null
        and draft_content <> '{}'::jsonb
       order by coalesce(updated_at, published_at, created_at) desc
       limit $1`,
      [limit]
    );
    return result.rows.map((row) => ({
      id: `${row.page_key}-${row.locale}`,
      pageKey: row.page_key,
      locale: row.locale,
      isPublished: Boolean(row.is_published),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      publishedAt: row.published_at
    }));
  } catch {
    return [];
  }
}

function isOperationalFootprint(item) {
  const eventType = String(item.eventType || "");
  return !["auth.logged_in", "auth.oauth_logged_in", "download.started"].includes(eventType);
}

function buildActivity({ footprints, tickets, documents, platforms, productActivity }) {
  const footprintItems = footprints.filter(isOperationalFootprint).map((item) => ({
    id: `footprint-${item.id}`,
    type: item.relatedType === "contact_request" ? "contact" : "footprint",
    eventType: item.eventType,
    title: item.summary,
    meta: item.actorName || item.actorEmail || item.eventType,
    href: item.relatedType === "contact_request" && item.relatedId ? `/admin/tickets/${item.relatedId}/` : "/admin/users/",
    createdAt: item.createdAt
  }));

  const ticketItems = tickets.slice(0, 6).map((ticket) => ({
    id: `ticket-${ticket.id}`,
    type: "ticket",
    activityKey: "ticketUpdated",
    title: ticket.subject || ticket.requestType || "Contact request",
    meta: ticket.workEmail,
    href: `/admin/tickets/${ticket.id}/`,
    createdAt: ticket.updatedAt || ticket.createdAt
  }));

  const productItems = productActivity.map((entry) => ({
    id: `product-${entry.id}`,
    type: "product",
    activityKey: entry.isPublished ? "siteContentPublished" : "siteContentDraft",
    title: `${entry.pageKey} / ${entry.locale}`,
    metaKey: entry.isPublished ? "publishedSiteContent" : "draftSiteContent",
    href: "/admin/product/",
    createdAt: entry.updatedAt || entry.publishedAt || entry.createdAt
  }));

  const documentItems = documents.slice(0, 4).map((document) => ({
    id: `document-${document.id}`,
    type: "document",
    activityKey: document.isPublished ? "documentPublished" : "documentDraft",
    title: document.title,
    metaKey: document.isPublished ? "publishedDocument" : "draftDocument",
    href: `/admin/docs/${document.id}/`,
    createdAt: document.updatedAt || document.createdAt
  }));

  const releaseItems = platforms
    .filter((platform) => platform.release?.updatedAt)
    .slice(0, 4)
    .map((platform) => ({
      id: `download-${platform.key}`,
      type: "download",
      activityKey: "downloadUpdated",
      title: platform.label,
      meta: platform.release.version || "",
      metaKey: platform.release.isPublished ? "publishedRelease" : "draftRelease",
      href: `/admin/downloads/${platform.key}/`,
      createdAt: platform.release.updatedAt
    }));

  return [...footprintItems, ...ticketItems, ...productItems, ...documentItems, ...releaseItems]
    .filter((item) => item.createdAt)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);
}

function collaborationStatus(subtask) {
  if (isOverdue(subtask)) return { statusKey: "overdue", tone: "danger" };
  if (subtask.status === "blocked") return { statusKey: "blocked", tone: "danger" };
  if (isDueToday(subtask)) return { statusKey: "today", tone: "attention" };
  if (subtask.status === "in_progress") return { statusKey: "inProgress", tone: "attention" };
  return { statusKey: "pending", tone: "neutral" };
}

function buildCollaborationTodo(subtasks) {
  return subtasks
    .filter((subtask) => subtask.status !== "completed")
    .map((subtask) => {
      const status = collaborationStatus(subtask);
      return {
        key: subtask.id,
        title: subtask.title,
        meta: [subtask.taskTitle, subtask.spaceName].filter(Boolean).join(" / "),
        dueAt: subtask.dueAt,
        status: subtask.status,
        href: `/admin/collaboration/subtasks/${subtask.id}/`,
        ...status
      };
    })
    .sort((a, b) => {
      const rank = { danger: 0, attention: 1, neutral: 2 };
      const toneDiff = (rank[a.tone] ?? 3) - (rank[b.tone] ?? 3);
      if (toneDiff) return toneDiff;
      return new Date(a.dueAt || 0).getTime() - new Date(b.dueAt || 0).getTime();
    })
    .slice(0, 8);
}

function safeAnalyticsRange(value) {
  return Number(value) === 1 ? 1 : 7;
}

export async function getAdminDashboardOverview({ userId, analyticsDays = 7, trafficAnalyticsDays, downloadAnalyticsDays }) {
  const safeTrafficAnalyticsDays = safeAnalyticsRange(trafficAnalyticsDays ?? analyticsDays);
  const safeDownloadAnalyticsDays = safeAnalyticsRange(downloadAnalyticsDays);
  const trafficAnalyticsRequest = getSiteAnalyticsOverview(safeTrafficAnalyticsDays);
  const downloadAnalyticsRequest = safeDownloadAnalyticsDays === safeTrafficAnalyticsDays
    ? trafficAnalyticsRequest
    : getSiteAnalyticsOverview(safeDownloadAnalyticsDays);
  const [trafficAnalytics, downloadAnalytics, platforms, contactTickets, supportTickets, contactStats, supportStats, userOverview, documents, subtasks, footprints, productDrafts, productActivity] = await Promise.all([
    trafficAnalyticsRequest,
    downloadAnalyticsRequest,
    listAdminDownloadPlatforms(),
    listAdminTickets({ scope: "contact", limit: 20 }),
    listAdminTickets({ scope: "support", limit: 20 }),
    getAdminTicketStatsByScope("contact"),
    getAdminTicketStatsByScope("support"),
    getAdminUserOverview(),
    listAdminDocuments({ limit: 20 }),
    listMyCollaborationSubtasks(userId),
    listRecentUserFootprints(16),
    countProductDrafts(),
    listRecentProductActivity()
  ]);

  const tickets = [...contactTickets, ...supportTickets]
    .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
    .slice(0, 20);
  const openTickets = supportTickets.filter(isOpenTicket);
  const draftDocuments = documents.filter((document) => !document.isPublished);
  const downloadGaps = platforms.filter((platform) => !platform.release.version || !platform.release.isPublished);
  const supportOpenCount = openTickets.length;
  const contactOpenCount = contactStats.pending + contactStats.inProgress;

  return {
    rangeDays: safeTrafficAnalyticsDays,
    trafficRangeDays: safeTrafficAnalyticsDays,
    downloadRangeDays: safeDownloadAnalyticsDays,
    analytics: trafficAnalytics,
    trafficAnalytics,
    downloadAnalytics,
    metrics: {
      todayViews: trafficAnalytics.todayViews,
      totalViews: trafficAnalytics.totalViews,
      newUsers: userOverview.todayCount,
      pendingSiteContent: productDrafts,
      draftDocuments: draftDocuments.length,
      draftClients: downloadGaps.length,
      openTickets: supportOpenCount,
      contactRequests: contactOpenCount
    },
    pendingWork: buildCollaborationTodo(subtasks),
    activity: buildActivity({ footprints, tickets, documents, platforms, productActivity })
  };
}
