import { getDbCars, waitlistSignups } from "@smartekai/db/cars";
import { tryConsume } from "@/server/rate-limit";

/**
 * Pre-launch gate. While `COMING_SOON="true"` the worker answers *every* request
 * with this page — no route, server function, auth endpoint, affiliate redirect,
 * sitemap or checkout is reachable, so nothing can be used or billed.
 *
 * Three exceptions, all here:
 *   - `POST /api/waitlist` — the email capture on the page.
 *   - `?preview=<token>` — sets a cookie that lets one browser through to the real
 *     site, so launch QA is possible while the site stays dark to everyone else.
 *   - requests already carrying that cookie.
 *
 * It answers 503 + `Retry-After` rather than 200 so search engines treat the site
 * as temporarily unavailable instead of indexing a placeholder as its content.
 * Flip the var to `"false"` in wrangler.jsonc and redeploy to open the doors; no
 * code change is needed.
 */

const PREVIEW_COOKIE = "cars_preview";
const PREVIEW_CONTEXT = "cars-preview-gate";
const PREVIEW_MAX_AGE = 60 * 60 * 24 * 7;
const HOUR = 3_600_000;

/** Deliberately loose: the mail provider is the real validator, this only stops junk. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_EMAIL = 254;

type Notice = "joined" | "invalid" | "unavailable" | "slow" | null;

export function comingSoon(): boolean {
  return process.env.COMING_SOON === "true";
}

export async function comingSoonResponse(url?: URL): Promise<Response> {
  return html(page(noticeOf(url)), 503);
}

function noticeOf(url: URL | undefined): Notice {
  if (!url) return null;
  if (url.searchParams.get("joined") === "1") return "joined";
  const error = url.searchParams.get("error");
  return error === "invalid" || error === "unavailable" || error === "slow" ? error : null;
}

function redirect(path: string): Response {
  return new Response(null, {
    status: 303,
    headers: { location: path, "cache-control": "no-store", "x-robots-tag": "noindex, nofollow" },
  });
}

/** Honeypot: real people never see this field, bots fill every input they find. */
export async function handleWaitlist(request: Request): Promise<Response> {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return redirect("/?error=invalid");
  }
  if (String(form.get("website") ?? "") !== "") return redirect("/?joined=1");

  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (email.length === 0 || email.length > MAX_EMAIL || !EMAIL.test(email)) return redirect("/?error=invalid");

  const ip = request.headers.get("cf-connecting-ip")?.trim() || "unknown";
  try {
    if (!(await tryConsume([{ key: `waitlist:h:${ip}`, limit: 5, windowMs: HOUR }]))) return redirect("/?error=slow");
    // repeat sign-ups are silent: the page must not reveal whether an address is known.
    await getDbCars().insert(waitlistSignups).values({ id: crypto.randomUUID(), email }).onConflictDoNothing();
  } catch (err) {
    console.error("[waitlist] signup failed:", err);
    return redirect("/?error=unavailable");
  }
  return redirect("/?joined=1");
}

/**
 * `?preview=<token>` unlocks this browser and bounces to the same URL without the
 * token, so it does not linger in the address bar, history or a Referer header.
 * A wrong token falls through to the page with no hint that anything exists.
 */
export async function previewUnlock(url: URL): Promise<Response | null> {
  const provided = url.searchParams.get("preview");
  if (!provided) return null;
  const token = await previewToken();
  if (!token || !equalsConstantTime(provided, token)) return null;

  const clean = new URL(url);
  clean.searchParams.delete("preview");
  return new Response(null, {
    status: 303,
    headers: {
      location: clean.toString(),
      "set-cookie": `${PREVIEW_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${PREVIEW_MAX_AGE}`,
      "cache-control": "no-store",
      "x-robots-tag": "noindex, nofollow",
    },
  });
}

export async function isPreviewRequest(request: Request): Promise<boolean> {
  const token = await previewToken();
  if (!token) return false;
  const cookie = request.headers.get("cookie") ?? "";
  const match = cookie.match(/(?:^|;\s*)cars_preview=([A-Za-z0-9_-]+)(?:;|$)/);
  return match !== null && equalsConstantTime(match[1], token);
}

/**
 * Derived from the existing auth secret rather than a new one, so there is no extra
 * secret to set — and rotating BETTER_AUTH_SECRET invalidates every preview link.
 */
async function previewToken(): Promise<string> {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) return "";
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(PREVIEW_CONTEXT));
  return base64url(new Uint8Array(signature)).slice(0, 32);
}

function base64url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function equalsConstantTime(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function html(body: string, status: number): Response {
  return new Response(body, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "retry-after": "3600",
      "x-robots-tag": "noindex, nofollow",
    },
  });
}

function page(notice: Notice): string {
  const message =
    notice === "joined"
      ? `<p class="notice ok">You're on the list — we'll email you the moment it opens.</p>`
      : notice === "invalid"
        ? `<p class="notice bad">That email doesn't look right — try again?</p>`
        : notice === "unavailable"
          ? `<p class="notice bad">Something went wrong on our side — please try again.</p>`
          : notice === "slow"
            ? `<p class="notice bad">Too many attempts — give it a minute.</p>`
            : "";

  const form =
    notice === "joined"
      ? ""
      : `<form method="post" action="/api/waitlist" class="waitlist">
  <label for="email">Get told when we open</label>
  <div class="row">
    <input id="email" name="email" type="email" required maxlength="254" placeholder="you@example.com" autocomplete="email" spellcheck="false">
    <button type="submit">Notify me</button>
  </div>
  <input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
</form>`;

  return `<!doctype html>
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
  .waitlist { margin: 2rem auto 0; max-width: 26rem; }
  .waitlist label { display: block; margin-bottom: .6rem; font-size: .78rem; letter-spacing: .1em; text-transform: uppercase; color: #8c8275; }
  .row { display: flex; gap: .5rem; }
  input[type=email] {
    flex: 1; min-width: 0; padding: .72rem .85rem; border-radius: .45rem;
    border: 1px solid #3a332b; background: #1b1713; color: #f4efe8; font-size: .95rem;
  }
  input[type=email]:focus { outline: none; border-color: #c88a3d; }
  button {
    padding: .72rem 1.15rem; border: 0; border-radius: .45rem; cursor: pointer;
    background: #c88a3d; color: #1a1408; font-size: .95rem; font-weight: 700;
  }
  button:hover { background: #d99a4a; }
  .hp { position: absolute; left: -9999px; width: 1px; height: 1px; opacity: 0; }
  .notice { margin: 1.75rem auto 0; max-width: 26rem; padding: .65rem .85rem; border-radius: .45rem; font-size: .95rem; }
  .notice.ok { color: #a8d5a2; background: #16241a; border: 1px solid #24402b; }
  .notice.bad { color: #e8b4a6; background: #2a1714; border: 1px solid #4a2620; }
  small { display: block; margin-top: 2.5rem; font-size: .8rem; letter-spacing: .08em; color: #7d7367; }
  @media (max-width: 26rem) { .row { flex-direction: column; } }
</style>
</head>
<body>
<main>
  <div class="brand">4x4 Builder</div>
  <h1>Coming soon</h1>
  <p>We're putting the finishing touches on the configurator, the AI renders and the parts shop.</p>
  <div class="rule"></div>
  <p class="hook">See a real off-road build on your own truck before you buy.</p>
  ${message}
  ${form}
  <small>cars.smartekai.com</small>
</main>
</body>
</html>
`;
}
