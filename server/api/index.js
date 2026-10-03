import app from "../src/app.js";

/**
 * Vercel Node entry. Restores full path when platform rewrites to /api.
 */
export default function handler(req, res) {
  const forwarded =
    req.headers["x-forwarded-uri"] ||
    req.headers["x-invoke-path"] ||
    req.headers["x-matched-path"];

  if (forwarded && typeof forwarded === "string") {
    const pathOnly = forwarded.startsWith("http")
      ? new URL(forwarded).pathname + (new URL(forwarded).search || "")
      : forwarded;
    if (pathOnly && pathOnly !== "/api" && pathOnly !== "/api/") {
      req.url = pathOnly;
    }
  }

  // Query param fallback from rewrite: /api?__path=/api/session/login
  try {
    const host = req.headers.host || "localhost";
    const u = new URL(req.url || "/", `http://${host}`);
    const viaQuery = u.searchParams.get("__path");
    if (viaQuery) {
      req.url = viaQuery;
    }
  } catch {
    /* ignore */
  }

  return app(req, res);
}
