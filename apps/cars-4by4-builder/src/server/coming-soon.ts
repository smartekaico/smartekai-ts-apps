/**
 * Pre-launch gate. While `COMING_SOON="true"` the worker answers *every* request
 * with this page — no route, server function, auth endpoint, affiliate redirect,
 * sitemap or checkout is reachable, so nothing can be used or billed.
 *
 * It answers 503 + `Retry-After` rather than 200 so search engines treat the site
 * as temporarily unavailable instead of indexing a placeholder as its content.
 * Flip the var to `"false"` in wrangler.jsonc and redeploy to open the doors; no
 * code change is needed.
 */
const PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Coming soon | 4x4 Builder</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 2rem;
    background: radial-gradient(1200px 620px at 50% -12%, #2a2118 0%, #14110e 55%, #0d0b09 100%);
    color: #f4efe8;
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  main { width: 100%; max-width: 34rem; text-align: center; }
  .brand { font-size: .95rem; font-weight: 700; letter-spacing: .24em; text-transform: uppercase; color: #c88a3d; }
  h1 { margin: 1.5rem 0 1rem; font-size: clamp(2.1rem, 7vw, 3.1rem); line-height: 1.05; letter-spacing: -.02em; }
  p { margin: 0 auto; max-width: 30rem; font-size: 1.05rem; line-height: 1.65; color: #b8aea2; }
  .rule { width: 3rem; height: 2px; margin: 2rem auto; background: #c88a3d; }
  .hook { font-size: 1.15rem; font-weight: 600; color: #eee5d9; }
  small { display: block; margin-top: 2.5rem; font-size: .8rem; letter-spacing: .08em; color: #7d7367; }
</style>
</head>
<body>
<main>
  <div class="brand">4x4 Builder</div>
  <h1>Coming soon</h1>
  <p>We're putting the finishing touches on the configurator, the AI renders and the parts shop.</p>
  <div class="rule"></div>
  <p class="hook">See a real off-road build on your own truck before you buy.</p>
  <small>cars.smartekai.com</small>
</main>
</body>
</html>
`;

export function comingSoon(): boolean {
  return process.env.COMING_SOON === "true";
}

export function comingSoonResponse(): Response {
  return new Response(PAGE, {
    status: 503,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "retry-after": "3600",
      "x-robots-tag": "noindex, nofollow",
    },
  });
}
