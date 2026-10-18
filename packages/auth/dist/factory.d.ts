import type { BetterAuthOptions } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
type DrizzleDb = Parameters<typeof drizzleAdapter>[0];
type DrizzleSchema = NonNullable<Parameters<typeof drizzleAdapter>[1]["schema"]>;
export declare const pbkdf2Password: {
    hash(password: string): Promise<string>;
    verify({ hash, password }: {
        hash: string;
        password: string;
    }): Promise<boolean>;
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
export declare function createAuth<O extends CreateAuthOptions>({ db, schema, ...options }: O): import("better-auth").Auth<{
    baseURL: string | undefined;
} & Omit<O, "schema" | "db"> & {
    session: {
        expiresIn: number;
        cookieCache: {
            enabled: true;
            maxAge: number;
        };
    };
    database: (options: BetterAuthOptions) => import("better-auth").DBAdapter<BetterAuthOptions>;
}>;
export {};
