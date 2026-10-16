import { betterAuth } from "better-auth";
import type { BetterAuthOptions } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

type DrizzleDb = Parameters<typeof drizzleAdapter>[0];
type DrizzleSchema = NonNullable<Parameters<typeof drizzleAdapter>[1]["schema"]>;

const THIRTY_DAYS = 60 * 60 * 24 * 30;

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
