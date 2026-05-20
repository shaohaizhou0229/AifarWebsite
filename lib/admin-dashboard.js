import { listCollaborationSpaces, listMyCollaborationSubtasks } from "@/lib/collaboration";
import { getPostgresPool } from "@/lib/db";
import { listAdminDocuments } from "@/lib/documents";
import { listAdminDownloadPlatforms } from "@/lib/downloads";
import { listAdminUsers } from "@/lib/profiles";
import { getSiteAnalyticsOverview } from "@/lib/site-analytics";
import { listAdminTickets } from "@/lib/tickets";
import { listRecentUserFootprints, USER_FOOTPRINT_EVENTS } from "@/lib/user-footprints";

function isToday(value) {
  if (!value) return false;
  const date = new Date(value);
  const now = new Date();
  return date.toDateString() === now.toDateString();
}

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
    type: "footprint",
    title: item.summary,
    meta: item.actorName || item.actorEmail || item.eventType,
    href: item.relatedType === "contact_request" && item.relatedId ? `/admin/tickets/${item.relatedId}/` : "/admin/users/",
    createdAt: item.createdAt
  }));

  const ticketItems = tickets.slice(0, 6).map((ticket) => ({
    id: `ticket-${ticket.id}`,
    type: "ticket",
    title: ticket.subject || ticket.requestType || "Contact request",
    meta: ticket.workEmail,
    href: `/admin/tickets/${ticket.id}/`,
    createdAt: ticket.updatedAt || ticket.createdAt
  }));

  const documentItems = documents.slice(0, 4).map((document) => ({
    id: `document-${document.id}`,
    type: "document",
    title: document.title,
    meta: document.isPublished ? "Published document" : "Draft document",
    href: `/admin/docs/${document.id}/`,
    createdAt: document.updatedAt || document.createdAt
  }));

  const releaseItems = platforms
    .filter((platform) => platform.release?.updatedAt)
    .slice(0, 4)
    .map((platform) => ({
      id: `download-${platform.key}`,
      type: "download",
      title: platform.label,
      meta: platform.release.isPublished ? platform.release.version || "Published release" : "Draft release",
      href: `/admin/downloads/${platform.key}/`,
      createdAt: platform.release.updatedAt
    }));

  const spaceItems = spaces.slice(0, 4).map((space) => ({
    id: `space-${space.id}`,
    type: "collaboration",
    title: space.name,
    meta: `${space.openSubtaskCount || 0} open subtasks`,
    href: `/admin/collaboration/spaces/${space.id}/`,
    createdAt: space.updatedAt || space.createdAt
  }));

  return [...footprintItems, ...ticketItems, ...documentItems, ...releaseItems, ...spaceItems]
    .filter((item) => item.createdAt)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);
}

export async function getAdminDashboardOverview({ userId, analyticsDays = 7 }) {
  const [analytics, platforms, tickets, users, documents, spaces, subtasks, footprints, productDrafts] = await Promise.all([
    getSiteAnalyticsOverview(analyticsDays),
    listAdminDownloadPlatforms(),
    listAdminTickets(),
    listAdminUsers(),
    listAdminDocuments(),
    listCollaborationSpaces(userId),
    listMyCollaborationSubtasks(userId),
    listRecentUserFootprints(16),
    countProductDrafts()
  ]);

  const openTickets = tickets.filter(isOpenTicket);
  const newContacts = tickets.filter((ticket) => ticket.status === "new");
  const unassignedTickets = openTickets.filter((ticket) => !ticket.assigneeUserId);
  const draftDocuments = documents.filter((document) => !document.isPublished);
  const downloadGaps = platforms.filter((platform) => !platform.release.version || !platform.release.isPublished);
  const overdueSubtasks = subtasks.filter(isOverdue);
  const activeUsers = users.filter((user) => user.recordType !== "invitation" && user.accountStatus === "active");
  const newUsers = users.filter((user) => user.recordType !== "invitation" && isToday(user.createdAt));
  const downloadFootprints = footprints.filter((item) => item.eventType === USER_FOOTPRINT_EVENTS.downloadStarted);

  return {
    analytics,
    metrics: {
      todayViews: analytics.todayViews,
      totalViews: analytics.totalViews,
      downloadClicks: analytics.downloadClicks || downloadFootprints.length,
      newContacts: newContacts.length,
      openTickets: openTickets.length,
      newUsers: newUsers.length,
      draftContent: productDrafts + draftDocuments.length,
      collaborationTodo: subtasks.filter((subtask) => subtask.status !== "completed").length
    },
    pendingWork: [
      { key: "newContacts", count: newContacts.length, href: "/admin/contact/?status=new", tone: newContacts.length ? "attention" : "good" },
      { key: "unassignedTickets", count: unassignedTickets.length, href: "/admin/support/?assignee=unassigned", tone: unassignedTickets.length ? "attention" : "good" },
      { key: "draftContent", count: productDrafts + draftDocuments.length, href: "/admin/product/", tone: productDrafts + draftDocuments.length ? "neutral" : "good" },
      { key: "downloadGaps", count: downloadGaps.length, href: "/admin/downloads/", tone: downloadGaps.length ? "attention" : "good" },
      { key: "overdueSubtasks", count: overdueSubtasks.length, href: "/admin/collaboration/", tone: overdueSubtasks.length ? "danger" : "good" }
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
        count: activeUsers.length,
        statusKey: "ready",
        tone: "good",
        updatedAt: latestDate(users.map((user) => user.updatedAt || user.createdAt)),
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
        count: openTickets.length,
        statusKey: openTickets.length ? "active" : "ready",
        tone: openTickets.length ? "attention" : "good",
        updatedAt: latestDate(tickets.map((ticket) => ticket.updatedAt || ticket.createdAt)),
        href: "/admin/support/"
      },
      {
        key: "contact",
        count: newContacts.length,
        statusKey: newContacts.length ? "active" : "ready",
        tone: newContacts.length ? "attention" : "good",
        updatedAt: latestDate(tickets.map((ticket) => ticket.createdAt)),
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
