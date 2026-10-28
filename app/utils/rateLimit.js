// Remembers when each shop made each kind of request.
// Stored in memory, so it resets when the server restarts. Fine for this build.
const hits = new Map();

// Returns true if the shop is under its limit, and records this request.
// key: a name for the action and shop, e.g. "save:mayank-practice.myshopify.com"
// limit: how many requests are allowed
// windowMs: the time window in milliseconds
export function isAllowed(key, limit, windowMs) {
  const now = Date.now();

  // Keep only the requests that happened inside the window.
  const recent = (hits.get(key) || []).filter((t) => now - t < windowMs);

  if (recent.length >= limit) {
    hits.set(key, recent);
    return false;
  }

  recent.push(now);
  hits.set(key, recent);
  return true;
}