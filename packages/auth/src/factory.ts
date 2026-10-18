import { betterAuth } from "better-auth";
import type { BetterAuthOptions } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { verifyPassword } from "better-auth/crypto";

type DrizzleDb = Parameters<typeof drizzleAdapter>[0];
type DrizzleSchema = NonNullable<Parameters<typeof drizzleAdapter>[1]["schema"]>;

const THIRTY_DAYS = 60 * 60 * 24 * 30;

/**
 * Password hashing for a Workers runtime, for an app to pass as
 * `emailAndPassword.password`.
 *
 * Better Auth's default is `@noble/hashes` scrypt — pure JavaScript, measured at
 * 78–84 ms of CPU per sign-up/sign-in on a Worker, where a Free-plan request is
 * allowed 10 ms. PBKDF2-HMAC-SHA256 runs in the runtime's native Web Crypto and
 * costs 18–22 ms. It is not the stronger choice: it is not memory-hard, and workerd
 * caps it at 100 000 iterations — 6× below OWASP's recommended cost — so this
 * trades hash strength for CPU. Numbers, and the alternatives that keep scrypt
 * (hash inside a Durable Object, whose budget is 30 s; or Workers Paid), are in
 * `.agents/logs/2026-10-18-cars-workers-port.md`, "§7.1 applied".
 *
 * Hashes carry a `pbkdf2-sha256$…` prefix. Anything without it goes to Better
 * Auth's own verifier, so scrypt hashes written before this was adopted still
 * work; a user only gets the new format when their password is next set.
 */
const PBKDF2_PREFIX = "pbkdf2-sha256";
// workerd rejects PBKDF2 above this: "iteration counts above 100000 are not supported".
const PBKDF2_ITERATIONS = 100_000;
const SALT_BYTES = 16;
const KEY_BYTES = 32;

const base64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const fromBase64 = (value: string): Uint8Array<ArrayBuffer> =>
  Uint8Array.from(atob(value), (char) => char.charCodeAt(0));

async function deriveKey(password: string, salt: Uint8Array<ArrayBuffer>, iterations: number) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password.normalize("NFKC")), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations, hash: "SHA-256" }, key, KEY_BYTES * 8);
  return new Uint8Array(bits);
}

/** Byte comparison that doesn't stop early, so timing doesn't leak a match. */
function equal(a: Uint8Array, b: Uint8Array) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export const pbkdf2Password = {
  async hash(password: string) {
    const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
    const key = await deriveKey(password, salt, PBKDF2_ITERATIONS);
    return [PBKDF2_PREFIX, PBKDF2_ITERATIONS, base64(salt), base64(key)].join("$");
  },
  async verify({ hash, password }: { hash: string; password: string }) {
    if (!hash.startsWith(`${PBKDF2_PREFIX}$`)) return verifyPassword({ hash, password }); // scrypt, pre-PBKDF2
    const [, iterations, salt, key] = hash.split("$");
    const rounds = Number(iterations);
    if (!salt || !key || !Number.isSafeInteger(rounds) || rounds <= 0) return false;
    return equal(await deriveKey(password, fromBase64(salt), rounds), fromBase64(key));
  },
};

export type CreateAuthOptions = Omit<BetterAuthOptions, "database"> & {
  db: DrizzleDb;
  schema: DrizzleSchema;
};

/**
 * Shared Better Auth defaults for an app that owns its database. The caller
 * passes its Drizzle db and table mapping — this module never imports
 * @smartekai/db, so an app only loads the database it uses. The legal/medical
 * `auth` instance in ./index is separate and unchanged.
 */
export function createAuth<O extends CreateAuthOptions>({ db, schema, ...options }: O) {
  return betterAuth({
    baseURL: process.env.BETTER_AUTH_URL,
    ...options,
    session: {
      expiresIn: THIRTY_DAYS,
      cookieCache: { enabled: true, maxAge: 5 * 60 },
      ...options.session,
    },
    database: drizzleAdapter(db, { provider: "pg", schema }),
  });
}
