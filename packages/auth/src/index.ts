import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization, magicLink } from "better-auth/plugins";
import {
  db,
  users,
  sessions,
  accounts,
  verifications,
  organizations,
  members,
  invitations,
  auditLogs,
} from "@smartekai/db";
import { eq } from "drizzle-orm";
import { resend } from "./mail";
import {
  TeamInvitationEmail,
  ResetPasswordEmail,
  MagicLinkEmail,
} from "@smartekai/emails";
import React from "react";

// In-memory store to capture magic link URLs during admin approval flow
export const pendingMagicLinkUrls = new Map<string, string>();

const getBaseUrl = () => {
  if (typeof window !== "undefined") return "";
  if (process.env.BETTER_AUTH_URL) return process.env.BETTER_AUTH_URL;
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  return "http://localhost:3000";
};

const getPublicUrl = () => {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
};

export const auth = betterAuth({
  baseURL: getBaseUrl(),
  trustedOrigins: [
    "https://smartekai.com",
    "http://smartekai.com",
    "https://legal.smartekai.com",
    "https://medical.smartekai.com",
    process.env.NEXT_PUBLIC_APP_URL || "",
    process.env.BETTER_AUTH_URL || "",
  ].filter(Boolean),
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: users,
      session: sessions,
      account: accounts,
      verification: verifications,
      organization: organizations,
      member: members,
      invitation: invitations,
    },
  }),
  user: {
    additionalFields: {
      activeOrganizationId: { type: "string" },
      industryRole: { type: "string" },
      creditBalance: { type: "number" },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
    additionalFields: {
      activeOrganizationId: { type: "string" },
      industryRole: { type: "string" },
    },
  },
  emailAndPassword: {
    enabled: true,
    async sendResetPassword(data: { user: any; url: string; token: string }) {
      const publicUrl = getPublicUrl();
      const resetLink = `${publicUrl}/reset-password?token=${data.token}`;

      await resend.emails.send({
        from: "Smartek AI Hub <team@smartekai.com>",
        to: [data.user.email],
        replyTo: "team@smartekai.com",
        subject: "استعادة كلمة المرور - Reset Your Password",
        react: React.createElement(ResetPasswordEmail, {
          userEmail: data.user.email,
          resetLink,
        }),
      });
    },
  },
  plugins: [
    organization({
      async sendInvitationEmail(data) {
        const publicUrl = getPublicUrl();
        const inviteLink = `${publicUrl}/accept-team-invite?id=${data.id}`;

        // Log Audit Action
        await db.insert(auditLogs).values({
          id: crypto.randomUUID(),
          userId: data.inviter.userId,
          organizationId: data.organization.id,
          action: "TEAM_INVITE_SENT",
          details: `تم إرسال دعوة إلى ${data.email} برتبة ${data.role}`,
          createdAt: new Date(),
        });

        await resend.emails.send({
          from: "Smartek AI Hub <team@smartekai.com>",
          to: [data.email],
          replyTo: "team@smartekai.com",
          subject: `دعوة للانضمام إلى فريق ${data.organization.name}`,
          react: React.createElement(TeamInvitationEmail, {
            inviterName: data.inviter.user.name,
            inviterEmail: data.inviter.user.email,
            orgName: data.organization.name,
            inviteLink,
          }),
        });
      },
      onMemberRemoved: async (data: {
        member: { userId: string; organizationId: string };
      }) => {
        await db.insert(auditLogs).values({
          id: crypto.randomUUID(),
          userId: data.member.userId,
          organizationId: data.member.organizationId,
          action: "MEMBER_REMOVED",
          details: `تمت إزالة العضو من الفريق (ID: ${data.member.userId})`,
          createdAt: new Date(),
        });
      },
    }),
    magicLink({
      expiresIn: 60 * 60 * 48, // 48 hours
      disableSignUp: true,
      async sendMagicLink(data) {
        const emailKey = data.email.toLowerCase();
        const [user] = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.email, emailKey))
          .limit(1);

        if (!user) {
          console.warn(
            `[AUTH] Blocked magic link request for unapproved email: ${data.email}`,
          );
          return;
        }

        pendingMagicLinkUrls.set(emailKey, data.url);

        if (!pendingMagicLinkUrls.get(`__suppress_${emailKey}`)) {
          const publicUrl = getPublicUrl();
          const finalUrl = data.url.replace(/^(https?:\/\/[^\/]+)/, publicUrl);

          await resend.emails.send({
            from: "Smartek AI Hub <team@smartekai.com>",
            to: [data.email],
            replyTo: "team@smartekai.com",
            subject: "تسجيل دخول آمن - Secure Magic Link Login",
            react: React.createElement(MagicLinkEmail, {
              userEmail: data.email,
              url: finalUrl,
            }),
          });
        }
        pendingMagicLinkUrls.delete(`__suppress_${emailKey}`);
      },
    }),
  ],
});

export type Auth = typeof auth;
