/**
 * Google provider config, or null when Google sign-in cannot work end to end.
 *
 * Credentials alone are not enough: the OAuth client must also have
 * `https://overlander.smartekai.com/api/auth/callback/google` registered, otherwise
 * Google answers `redirect_uri_mismatch` and the button is a dead end. That
 * lives in the Google console, so it is gated by an explicit switch —
 * `AUTH_GOOGLE_ENABLED=true` — rather than inferred from the secrets.
 */
export function googleProvider(): { clientId: string; clientSecret: string } | null {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (process.env.AUTH_GOOGLE_ENABLED !== "true" || !clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}
