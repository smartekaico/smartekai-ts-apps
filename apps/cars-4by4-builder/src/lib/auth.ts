import { createAuth, pbkdf2Password } from "@smartekai/auth/factory";
import { eq } from "drizzle-orm";
import { admin, anonymous } from "better-auth/plugins";
import { builds, carsAccounts, carsSessions, carsUsers, carsVerifications, creditLedger, getDbCars } from "@smartekai/db/cars";
import { googleProvider } from "@/server/social-auth";
import { grantWelcomeCredits } from "@/server/credits";
import { requestIp } from "@/server/request";
import { tryConsume, welcomeRules } from "@/server/rate-limit";

const google = googleProvider();

export const auth = createAuth({
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3002",
  trustedOrigins: ["https://overlander.smartekai.com", "http://overlander.smartekai.com", process.env.BETTER_AUTH_URL ?? ""].filter(
    Boolean,
  ),
  db: getDbCars(),
  schema: {
    user: carsUsers,
    session: carsSessions,
    account: carsAccounts,
    verification: carsVerifications,
  },
  // Web Crypto PBKDF2 rather than Better Auth's pure-JS scrypt: measured at ~80 ms
  // of CPU per sign-up on a Worker, where a Free-plan request gets 10 ms.
  emailAndPassword: { enabled: true, password: pbkdf2Password },
  // Only offer Google when it can actually complete: credentials plus the
  // registered redirect URI (`AUTH_GOOGLE_ENABLED`). See src/server/social-auth.ts.
  socialProviders: google ? { google } : {},
  plugins: [
    anonymous({
      // Fires on /sign-in*, /sign-up* and /callback* (OAuth) in better-auth
      // 1.7.7, so sign-up, sign-in to an existing account and Google all move
      // the guest's builds. The plugin deletes the guest user afterwards.
      // Best-effort like the rest of ownership: a failed move must not fail the
      // sign-in (the builds then become unowned when the guest is deleted).
      onLinkAccount: async ({ anonymousUser, newUser }) => {
        try {
          const db = getDbCars();
          await db.update(builds).set({ userId: newUser.user.id }).where(eq(builds.userId, anonymousUser.user.id));
          // Spec 3 §4: signing up must not reset the free render
          // (new.free_render_used = new OR guest). Guests never hold credits,
          // so no balance moves.
          const guest = (
            await db
              .select({ freeRenderUsed: carsUsers.freeRenderUsed })
              .from(carsUsers)
              .where(eq(carsUsers.id, anonymousUser.user.id))
          ).at(0);
          if (guest?.freeRenderUsed) {
            await db.update(carsUsers).set({ freeRenderUsed: true }).where(eq(carsUsers.id, newUser.user.id));
          }
        } catch (err) {
          console.error("onLinkAccount: moving guest builds / free render failed", err);
        }
      },
    }),
    // Better Auth admin plugin: role "admin" (cars_user.role) unlocks /admin,
    // bans block sign-in, and sessions can be revoked. Defaults are enough —
    // adminRoles ["admin"], defaultRole "user". No adminUserIds list: the role
    // column stays the single source of truth.
    admin(),
  ],
  // First-admin bootstrap: the account whose email matches ADMIN_BOOTSTRAP_EMAIL
  // is inserted with role "admin" while no admin exists yet. It is the operator's
  // own sign-up on an empty install, so no manual UPDATE is needed.
  //
  // - Before insert, not after: the session created in this same sign-up then
  //   carries role "admin". A post-insert UPDATE would leave the 5-minute cookie
  //   cache saying "user", and /admin would 404 until it refreshed.
  // - Email, not "first row wins", because the site is public: otherwise any
  //   visitor could claim admin. Email is unverified at sign-up, so this only
  //   gates the bootstrap while zero admins exist.
  // - Guests are created by the first page visit and must not count.
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const bootstrapEmail = process.env.ADMIN_BOOTSTRAP_EMAIL?.trim().toLowerCase();
          if (!bootstrapEmail || user.isAnonymous) return;
          if (user.email.trim().toLowerCase() !== bootstrapEmail) return;
          const db = getDbCars();
          const existingAdmin = (
            await db.select({ id: carsUsers.id }).from(carsUsers).where(eq(carsUsers.role, "admin")).limit(1)
          ).at(0);
          if (existingAdmin) return;
          return { data: { ...user, role: "admin" } };
        },
      },
    },
    account: {
      create: {
        after: async (account) => {
          try {
            if (account.providerId !== "google") return;
            const db = getDbCars();
            const googleAccountId = account.accountId;
            // Check if this Google id already has a welcome grant (survives user deletion).
            const existing = (
              await db
                .select({ id: creditLedger.id })
                .from(creditLedger)
                .where(eq(creditLedger.paymentRef, `welcome:google:${googleAccountId}`))
                .limit(1)
            ).at(0);
            if (existing) return;
            // Consume rate limit after the check so repeat sign-ins use no quota.
            const ip = requestIp();
            if (!(await tryConsume(welcomeRules(ip)))) return;
            await grantWelcomeCredits(account.userId, googleAccountId);
          } catch (err) {
            console.error("account.create.after: welcome credits failed", err);
          }
        },
      },
    },
  },
});
