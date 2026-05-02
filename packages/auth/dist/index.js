"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.auth = exports.pendingMagicLinkUrls = void 0;
const better_auth_1 = require("better-auth");
const drizzle_1 = require("better-auth/adapters/drizzle");
const plugins_1 = require("better-auth/plugins");
const db_1 = require("@smartekai/db");
const drizzle_orm_1 = require("drizzle-orm");
const mail_1 = require("./mail");
const emails_1 = require("@smartekai/emails");
const react_1 = __importDefault(require("react"));
// In-memory store to capture magic link URLs during admin approval flow
exports.pendingMagicLinkUrls = new Map();
const getBaseUrl = () => {
    if (typeof window !== "undefined")
        return "";
    if (process.env.BETTER_AUTH_URL)
        return process.env.BETTER_AUTH_URL;
    if (process.env.NEXT_PUBLIC_APP_URL)
        return process.env.NEXT_PUBLIC_APP_URL;
    return "http://localhost:3000";
};
const getPublicUrl = () => {
    return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
};
exports.auth = (0, better_auth_1.betterAuth)({
    baseURL: getBaseUrl(),
    trustedOrigins: [
        "https://smartekai.com",
        "http://smartekai.com",
        "https://legal.smartekai.com",
        "https://medical.smartekai.com",
        process.env.NEXT_PUBLIC_APP_URL || "",
        process.env.BETTER_AUTH_URL || "",
    ].filter(Boolean),
    database: (0, drizzle_1.drizzleAdapter)(db_1.db, {
        provider: "pg",
        schema: {
            user: db_1.users,
            session: db_1.sessions,
            account: db_1.accounts,
            verification: db_1.verifications,
            organization: db_1.organizations,
            member: db_1.members,
            invitation: db_1.invitations,
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
        async sendResetPassword(data) {
            const publicUrl = getPublicUrl();
            const resetLink = `${publicUrl}/reset-password?token=${data.token}`;
            await mail_1.resend.emails.send({
                from: "Smartek AI Hub <team@smartekai.com>",
                to: [data.user.email],
                replyTo: "team@smartekai.com",
                subject: "استعادة كلمة المرور - Reset Your Password",
                react: react_1.default.createElement(emails_1.ResetPasswordEmail, {
                    userEmail: data.user.email,
                    resetLink,
                }),
            });
        },
    },
    plugins: [
        (0, plugins_1.organization)({
            async sendInvitationEmail(data) {
                const publicUrl = getPublicUrl();
                const inviteLink = `${publicUrl}/accept-team-invite?id=${data.id}`;
                // Log Audit Action
                await db_1.db.insert(db_1.auditLogs).values({
                    id: crypto.randomUUID(),
                    userId: data.inviter.userId,
                    organizationId: data.organization.id,
                    action: "TEAM_INVITE_SENT",
                    details: `تم إرسال دعوة إلى ${data.email} برتبة ${data.role}`,
                    createdAt: new Date(),
                });
                await mail_1.resend.emails.send({
                    from: "Smartek AI Hub <team@smartekai.com>",
                    to: [data.email],
                    replyTo: "team@smartekai.com",
                    subject: `دعوة للانضمام إلى فريق ${data.organization.name}`,
                    react: react_1.default.createElement(emails_1.TeamInvitationEmail, {
                        inviterName: data.inviter.user.name,
                        inviterEmail: data.inviter.user.email,
                        orgName: data.organization.name,
                        inviteLink,
                    }),
                });
            },
            onMemberRemoved: async (data) => {
                await db_1.db.insert(db_1.auditLogs).values({
                    id: crypto.randomUUID(),
                    userId: data.member.userId,
                    organizationId: data.member.organizationId,
                    action: "MEMBER_REMOVED",
                    details: `تمت إزالة العضو من الفريق (ID: ${data.member.userId})`,
                    createdAt: new Date(),
                });
            },
        }),
        (0, plugins_1.magicLink)({
            expiresIn: 60 * 60 * 48, // 48 hours
            disableSignUp: true,
            async sendMagicLink(data) {
                const emailKey = data.email.toLowerCase();
                const [user] = await db_1.db
                    .select({ id: db_1.users.id })
                    .from(db_1.users)
                    .where((0, drizzle_orm_1.eq)(db_1.users.email, emailKey))
                    .limit(1);
                if (!user) {
                    console.warn(`[AUTH] Blocked magic link request for unapproved email: ${data.email}`);
                    return;
                }
                exports.pendingMagicLinkUrls.set(emailKey, data.url);
                if (!exports.pendingMagicLinkUrls.get(`__suppress_${emailKey}`)) {
                    const publicUrl = getPublicUrl();
                    const finalUrl = data.url.replace(/^(https?:\/\/[^\/]+)/, publicUrl);
                    await mail_1.resend.emails.send({
                        from: "Smartek AI Hub <team@smartekai.com>",
                        to: [data.email],
                        replyTo: "team@smartekai.com",
                        subject: "تسجيل دخول آمن - Secure Magic Link Login",
                        react: react_1.default.createElement(emails_1.MagicLinkEmail, {
                            userEmail: data.email,
                            url: finalUrl,
                        }),
                    });
                }
                exports.pendingMagicLinkUrls.delete(`__suppress_${emailKey}`);
            },
        }),
    ],
});
