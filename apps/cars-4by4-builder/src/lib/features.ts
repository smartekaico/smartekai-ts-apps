/**
 * Feature switches for the cars app.
 *
 * `AI_RENDERS_ENABLED = false` is the MVP mode described in Spec 7
 * (`.agents/cars-4by4-builder/specs/2026-11-07-mvp-no-ai-renders-design.md`):
 * visitors browse popular builds and parts lists, and nothing calls Gemini at
 * request time. The AI code (photo upload, renders, credits, checkout) stays in
 * the codebase behind this switch so it can come back with one line and a
 * deploy.
 *
 * Safe on both client and server (a plain constant).
 */
// The `as boolean` keeps the declared type wide: a bare `false` would be
// narrowed to the literal type and every `AI_RENDERS_ENABLED ?` in the code
// would look like dead code to the linter.
export const AI_RENDERS_ENABLED = false as boolean;

/** Why a paused feature refused, shown to the user. */
export const FEATURE_PAUSED_MESSAGE = "This feature is paused.";
