/**
 * `npm run cf-typegen` (`wrangler types`) writes a `NodeJS.ProcessEnv` whose
 * `wrangler.jsonc` `vars` entries are definite `string`s. That holds in
 * production, but not locally: `.dev.vars` is generated from `.env.local` and a
 * var can be absent (e.g. `GOOGLE_AI_IMAGE_MODEL` is unset there), so the app's
 * `process.env.X ?? fallback` reads are deliberate — and the type-aware
 * `@typescript-eslint/no-unnecessary-condition` rule flags every one of them.
 *
 * Re-declaring the keys as optional merges into the generated interface and
 * restores `string | undefined`, so the fallbacks stay meaningful and lintable.
 * Keep this list in sync with the `vars` block in `wrangler.jsonc`.
 */
declare namespace NodeJS {
  interface ProcessEnv {
    PUBLIC_SITE_URL?: string;
    BETTER_AUTH_URL?: string;
    CARS_DAILY_RENDER_CAP?: string;
    NOWPAYMENTS_ENV?: string;
    GOOGLE_AI_MODEL?: string;
    AWS_REGION?: string;
    AWS_ENDPOINT_URL_S3?: string;
  }
}
