import type { FastifyInstance } from 'fastify';

/** Successful polling is summarized, never logged once per fragment. */
export function registerRequestLogging(app: FastifyInstance, intervalMs = 60_000) {
  let requests = 0, failures = 0, slow = 0, maxMs = 0;
  const counts = new Map<string, number>();
  app.addHook('onResponse', async (request, reply) => {
    const route = request.routeOptions.url || 'unmatched';
    const ms = Math.round(reply.elapsedTime);
    requests++; maxMs = Math.max(maxMs, ms);
    // Route templates only: never log query strings, OAuth codes, bodies or credentials.
    if (counts.size < 40 || counts.has(route)) counts.set(route, (counts.get(route) || 0) + 1);
    const fields = { method: request.method, route, statusCode: reply.statusCode, durationMs: ms };
    if (reply.statusCode >= 500) { failures++; request.log.error(fields, 'HTTP server error'); }
    else if (reply.statusCode >= 400) { failures++; request.log.warn(fields, 'HTTP request rejected'); }
    else if (ms >= 5000) { slow++; request.log.warn(fields, 'Slow HTTP request'); }
    else request.log.debug(fields, 'HTTP request completed');
  });
  const timer = setInterval(() => {
    if (!requests) return;
    app.log.info({ requests, failures, slow, maxMs, routes: Object.fromEntries(counts) }, 'HTTP activity / minute');
    requests = failures = slow = maxMs = 0; counts.clear();
  }, intervalMs);
  timer.unref();
  app.addHook('onClose', async () => { clearInterval(timer); });
}
