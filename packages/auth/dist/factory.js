"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAuth = createAuth;
const better_auth_1 = require("better-auth");
const drizzle_1 = require("better-auth/adapters/drizzle");
const THIRTY_DAYS = 60 * 60 * 24 * 30;
/**
 * Shared Better Auth defaults for an app that owns its database. The caller
 * passes its Drizzle db and table mapping — this module never imports
 * @smartekai/db, so an app only loads the database it uses. The legal/medical
 * `auth` instance in ./index is separate and unchanged.
 */
function createAuth({ db, schema, ...options }) {
    return (0, better_auth_1.betterAuth)({
        baseURL: process.env.BETTER_AUTH_URL,
        ...options,
        session: {
            expiresIn: THIRTY_DAYS,
            cookieCache: { enabled: true, maxAge: 5 * 60 },
            ...options.session,
        },
        database: (0, drizzle_1.drizzleAdapter)(db, { provider: "pg", schema }),
    });
}
