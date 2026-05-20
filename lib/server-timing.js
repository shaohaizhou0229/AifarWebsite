function now() {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

function cleanToken(value) {
  return String(value || "step").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 40) || "step";
}

function cleanDescription(value) {
  return String(value || "").replace(/["\\]/g, "").slice(0, 80);
}

function formatMetric(metric) {
  const name = cleanToken(metric.name);
  const parts = [name];
  if (metric.description) {
    parts.push(`desc="${cleanDescription(metric.description)}"`);
  }
  if (Number.isFinite(metric.duration)) {
    parts.push(`dur=${Math.max(0, metric.duration).toFixed(1)}`);
  }
  return parts.join(";");
}

export function createServerTiming() {
  const startedAt = now();
  const metrics = [];

  return {
    async measure(name, task) {
      const stepStartedAt = now();
      try {
        return await task();
      } finally {
        metrics.push({
          name,
          duration: now() - stepStartedAt
        });
      }
    },
    headers() {
      const total = now() - startedAt;
      return {
        "Server-Timing": [
          ...metrics,
          { name: "total", duration: total },
          { name: "region", description: process.env.VERCEL_REGION || "local" }
        ].map(formatMetric).join(", "),
        "X-Aifar-Function-Region": process.env.VERCEL_REGION || "local"
      };
    }
  };
}
