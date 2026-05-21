import { getPostgresPool } from "@/lib/db";
import { locales } from "@/i18n/routing";

const EVENT_TYPES = new Set(["page_view", "download_click"]);
const PUBLIC_PATH_BLOCKLIST = new Set(["admin", "account", "login", "register", "api", "_next"]);

function cleanText(value = "", max = 200) {
  return String(value || "").trim().slice(0, max);
}

function sanitizePath(value = "/") {
  const path = cleanText(value, 260);
  if (!path.startsWith("/") || path.startsWith("//")) return "/";
  const parts = path.split("/").filter(Boolean);
  const section = locales.includes(parts[0]) ? parts[1] : parts[0];
  if (PUBLIC_PATH_BLOCKLIST.has(section)) return "";
  return path === "/" ? "/" : `${path.replace(/\/$/, "")}/`;
}

function sanitizeLocale(value = "") {
  return locales.includes(value) ? value : "";
}

export function getUserAgentFamily(userAgent = "") {
  const value = userAgent.toLowerCase();
  if (value.includes("edg/")) return "Edge";
  if (value.includes("chrome/")) return "Chrome";
  if (value.includes("safari/")) return "Safari";
  if (value.includes("firefox/")) return "Firefox";
  if (value.includes("bot") || value.includes("crawler")) return "Bot";
  return "Other";
}

export function getReferrerHost(value = "") {
  try {
    return value ? new URL(value).hostname.slice(0, 120) : "";
  } catch {
    return "";
  }
}

export async function recordSiteAnalyticsEvent({
  path,
  locale = "",
  eventType = "page_view",
  referrerHost = "",
  userAgentFamily = ""
}) {
  const safePath = sanitizePath(path);
  const safeEventType = EVENT_TYPES.has(eventType) ? eventType : "page_view";
  if (!safePath) return null;

  try {
    const pool = getPostgresPool();
    await pool.query(
      `insert into public.site_analytics_events
        (path, locale, event_type, referrer_host, user_agent_family)
       values ($1, $2, $3, $4, $5)`,
      [
        safePath,
        sanitizeLocale(locale) || null,
        safeEventType,
        cleanText(referrerHost, 120) || null,
        cleanText(userAgentFamily, 80) || null
      ]
    );
  } catch (error) {
    console.error("Failed to record site analytics event", error);
  }

  return null;
}

function emptyTrend(days) {
  const today = new Date();
  return Array.from({ length: days }).map((_, index) => {
    const day = new Date(today);
    day.setDate(today.getDate() - (days - index - 1));
    return {
      label: day.toISOString().slice(5, 10),
      date: day.toISOString().slice(0, 10),
      views: 0,
      downloads: 0,
      clientDownloads: 0,
      documentDownloads: 0
    };
  });
}

export function emptyAnalyticsOverview(days = 7) {
  return {
    todayViews: 0,
    totalViews: 0,
    downloadClicks: 0,
    visitedPages: 0,
    downloads: {
      client: 0,
      document: 0
    },
    topPages: [],
    languages: [],
    trend: emptyTrend(days),
    hasData: false
  };
}

export async function getSiteAnalyticsOverview(days = 7) {
  const safeDays = Math.min(Math.max(Number(days) || 7, 1), 30);
  const interval = `${safeDays} days`;

  try {
    const pool = getPostgresPool();
    const [summaryResult, topPagesResult, languageResult, trendResult] = await Promise.all([
      pool.query(
        `select
          count(*) filter (where event_type = 'page_view' and created_at >= date_trunc('day', now()))::int as today_views,
          count(*) filter (where event_type = 'page_view')::int as total_views,
          count(distinct path) filter (where event_type = 'page_view')::int as visited_pages,
          count(*) filter (where event_type = 'download_click')::int as client_downloads,
          count(*) filter (where event_type = 'document_download')::int as document_downloads,
          count(*) filter (where event_type in ('download_click', 'document_download'))::int as download_clicks
         from public.site_analytics_events
         where created_at >= now() - $1::interval`,
        [interval]
      ),
      pool.query(
        `select path, count(*)::int as count
         from public.site_analytics_events
         where event_type = 'page_view'
          and created_at >= now() - $1::interval
         group by path
         order by count desc, path
         limit 5`,
        [interval]
      ),
      pool.query(
        `select coalesce(locale, 'unknown') as locale, count(*)::int as count
         from public.site_analytics_events
         where event_type = 'page_view'
          and created_at >= now() - $1::interval
         group by coalesce(locale, 'unknown')
         order by count desc
         limit 6`,
        [interval]
      ),
      pool.query(
        `select
          to_char(date_trunc('day', created_at), 'YYYY-MM-DD') as date,
          count(*) filter (where event_type = 'page_view')::int as views,
          count(*) filter (where event_type = 'download_click')::int as client_downloads,
          count(*) filter (where event_type = 'document_download')::int as document_downloads,
          count(*) filter (where event_type in ('download_click', 'document_download'))::int as downloads
         from public.site_analytics_events
         where created_at >= now() - $1::interval
         group by date_trunc('day', created_at)
         order by date_trunc('day', created_at)`,
        [interval]
      )
    ]);

    const trendMap = new Map(trendResult.rows.map((row) => [row.date, row]));
    const trend = emptyTrend(safeDays).map((point) => {
      const row = trendMap.get(point.date);
      return row ? {
        ...point,
        views: Number(row.views || 0),
        downloads: Number(row.downloads || 0),
        clientDownloads: Number(row.client_downloads || 0),
        documentDownloads: Number(row.document_downloads || 0)
      } : point;
    });
    const summary = summaryResult.rows[0] || {};
    const clientDownloads = Number(summary.client_downloads || 0);
    const documentDownloads = Number(summary.document_downloads || 0);

    return {
      todayViews: Number(summary.today_views || 0),
      totalViews: Number(summary.total_views || 0),
      visitedPages: Number(summary.visited_pages || 0),
      downloadClicks: Number(summary.download_clicks || 0),
      downloads: {
        client: clientDownloads,
        document: documentDownloads
      },
      topPages: topPagesResult.rows.map((row) => ({ path: row.path, count: Number(row.count || 0) })),
      languages: languageResult.rows.map((row) => ({ locale: row.locale, count: Number(row.count || 0) })),
      trend,
      hasData: Boolean(Number(summary.total_views || 0) || Number(summary.download_clicks || 0))
    };
  } catch (error) {
    console.error("Failed to load site analytics overview", error);
    return emptyAnalyticsOverview(safeDays);
  }
}
