import { listCollaborationSpaces, listMyCollaborationSubtasks } from "@/lib/collaboration";
import { getPostgresPool } from "@/lib/db";
import { listAdminDocuments } from "@/lib/documents";
import { listAdminDownloadPlatforms } from "@/lib/downloads";
import { getAdminUserOverview } from "@/lib/profiles";
import { getSiteAnalyticsOverview } from "@/lib/site-analytics";
import { getAdminTicketStatsByScope, listAdminTickets } from "@/lib/tickets";
import { listRecentUserFootprints, USER_FOOTPRINT_EVENTS } from "@/lib/user-footprints";

function isOpenTicket(ticket) {
  return ticket.status !== "closed" && ticket.status !== "resolved";
}

function isOverdue(subtask) {
  if (!subtask.dueAt || subtask.status === "completed") return false;
  return new Date(subtask.dueAt).getTime() < Date.now();
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

function latestDate(values = []) {
  return values
    .filter(Boolean)
    .map((value) => new Date(value).getTime())
    .filter((value) => !Number.isNaN(value))
    .sort((a, b) => b - a)[0] || null;
}

function buildActivity({ footprints, tickets, documents, platforms, spaces }) {
  const footprintItems = footprints.map((item) => ({
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

  const spaceItems = spaces.slice(0, 4).map((space) => ({
    id: `space-${space.id}`,
    type: "collaboration",
    activityKey: "collaborationUpdated",
    title: space.name,
    metaKey: "openSubtasks",
    metaCount: space.openSubtaskCount || 0,
    href: `/admin/collaboration/spaces/${space.id}/`,
    createdAt: space.updatedAt || space.createdAt
  }));

  return [...footprintItems, ...ticketItems, ...documentItems, ...releaseItems, ...spaceItems]
    .filter((item) => item.createdAt)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);
}

export async function getAdminDashboardOverview({ userId, analyticsDays = 7 }) {
  const safeAnalyticsDays = [1, 7, 30].includes(Number(analyticsDays)) ? Number(analyticsDays) : 7;
  const [analytics, platforms, contactTickets, supportTickets, contactStats, supportStats, userOverview, documents, spaces, subtasks, footprints, productDrafts] = await Promise.all([
    getSiteAnalyticsOverview(safeAnalyticsDays),
    listAdminDownloadPlatforms(),
    listAdminTickets({ scope: "contact", limit: 20 }),
    listAdminTickets({ scope: "support", limit: 20 }),
    getAdminTicketStatsByScope("contact"),
    getAdminTicketStatsByScope("support"),
    getAdminUserOverview(),
    listAdminDocuments({ limit: 20 }),
    listCollaborationSpaces(userId),
    listMyCollaborationSubtasks(userId),
    listRecentUserFootprints(16),
    countProductDrafts()
  ]);

  const tickets = [...contactTickets, ...supportTickets]
    .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
    .slice(0, 20);
  const openTickets = supportTickets.filter(isOpenTicket);
  const unassignedTickets = openTickets.filter((ticket) => !ticket.assigneeUserId);
  const draftDocuments = documents.filter((document) => !document.isPublished);
  const downloadGaps = platforms.filter((platform) => !platform.release.version || !platform.release.isPublished);
  const overdueSubtasks = subtasks.filter(isOverdue);
  const downloadFootprints = footprints.filter((item) => item.eventType === USER_FOOTPRINT_EVENTS.downloadStarted);
  const hasDownloadSplit = Boolean(analytics.downloads);
  const analyticsClientDownloads = hasDownloadSplit ? Number(analytics.downloads.client || 0) : Number(analytics.downloadClicks || 0);
  const clientDownloads = analyticsClientDownloads || downloadFootprints.length;
  const documentDownloads = hasDownloadSplit ? Number(analytics.downloads.document || 0) : 0;
  const totalDownloads = clientDownloads + documentDownloads;
  const normalizedAnalytics = {
    ...analytics,
    downloadClicks: totalDownloads,
    downloads: {
      client: clientDownloads,
      document: documentDownloads
    },
    trend: analytics.trend.map((point) => ({
      ...point,
      clientDownloads: point.clientDownloads ?? point.downloads ?? 0,
      documentDownloads: point.documentDownloads ?? 0,
      downloads: point.downloads ?? ((point.clientDownloads || 0) + (point.documentDownloads || 0))
    }))
  };

  return {
    analytics: normalizedAnalytics,
    metrics: {
      todayViews: analytics.todayViews,
      totalViews: analytics.totalViews,
      downloadClicks: totalDownloads,
      newContacts: contactStats.pending,
      openTickets: supportStats.pending + supportStats.inProgress,
      newUsers: userOverview.todayCount,
      draftContent: productDrafts + draftDocuments.length,
      collaborationTodo: subtasks.filter((subtask) => subtask.status !== "completed").length
    },
    pendingWork: [
      { key: "newContacts", count: contactStats.pending, href: "/admin/contact/?status=new", statusKey: "new", tone: contactStats.pending ? "attention" : "good" },
      { key: "unassignedTickets", count: unassignedTickets.length, href: "/admin/support/?assignee=unassigned", statusKey: "urgent", tone: unassignedTickets.length ? "attention" : "good" },
      { key: "draftContent", count: productDrafts + draftDocuments.length, href: "/admin/product/", statusKey: "pending", tone: productDrafts + draftDocuments.length ? "neutral" : "good" },
      { key: "downloadGaps", count: downloadGaps.length, href: "/admin/downloads/", statusKey: "pending", tone: downloadGaps.length ? "attention" : "good" },
      { key: "overdueSubtasks", count: overdueSubtasks.length, href: "/admin/collaboration/", statusKey: "overdue", tone: overdueSubtasks.length ? "danger" : "good" }
    ],
    activity: buildActivity({ footprints, tickets, documents, platforms, spaces }),
    moduleHealth: [
      {
        key: "product",
        count: productDrafts,
        statusKey: productDrafts ? "needsReview" : "ready",
        tone: productDrafts ? "attention" : "good",
        updatedAt: null,
        href: "/admin/product/"
      },
      {
        key: "downloads",
        count: `${platforms.filter((platform) => platform.release.isPublished).length}/${platforms.length}`,
        statusKey: downloadGaps.length ? "needsReview" : "ready",
        tone: downloadGaps.length ? "attention" : "good",
        updatedAt: latestDate(platforms.map((platform) => platform.release.updatedAt || platform.release.createdAt)),
        href: "/admin/downloads/"
      },
      {
        key: "users",
        count: userOverview.activeCount,
        statusKey: "ready",
        tone: "good",
        updatedAt: userOverview.lastUpdatedAt,
        href: "/admin/users/"
      },
      {
        key: "docs",
        count: documents.length,
        statusKey: draftDocuments.length ? "needsReview" : "ready",
        tone: draftDocuments.length ? "attention" : "good",
        updatedAt: latestDate(documents.map((document) => document.updatedAt || document.createdAt)),
        href: "/admin/docs/"
      },
      {
        key: "support",
        count: supportStats.pending + supportStats.inProgress,
        statusKey: supportStats.pending + supportStats.inProgress ? "active" : "ready",
        tone: supportStats.pending + supportStats.inProgress ? "attention" : "good",
        updatedAt: latestDate(supportTickets.map((ticket) => ticket.updatedAt || ticket.createdAt)),
        href: "/admin/support/"
      },
      {
        key: "contact",
        count: contactStats.pending,
        statusKey: contactStats.pending ? "active" : "ready",
        tone: contactStats.pending ? "attention" : "good",
        updatedAt: latestDate(contactTickets.map((ticket) => ticket.createdAt)),
        href: "/admin/contact/"
      },
      {
        key: "collaboration",
        count: spaces.length,
        statusKey: overdueSubtasks.length ? "needsReview" : "ready",
        tone: overdueSubtasks.length ? "danger" : "good",
        updatedAt: latestDate(spaces.map((space) => space.updatedAt || space.createdAt)),
        href: "/admin/collaboration/"
      }
    ]
  };
}
