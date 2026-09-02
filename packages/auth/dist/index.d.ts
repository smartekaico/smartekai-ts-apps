export declare const pendingMagicLinkUrls: Map<string, string>;
export declare const auth: import("better-auth").Auth<{
    baseURL: string;
    trustedOrigins: string[];
    database: (options: import("better-auth").BetterAuthOptions) => import("better-auth").DBAdapter<import("better-auth").BetterAuthOptions>;
    user: {
        additionalFields: {
            activeOrganizationId: {
                type: "string";
            };
            industryRole: {
                type: "string";
            };
            creditBalance: {
                type: "number";
            };
        };
    };
    session: {
        expiresIn: number;
        cookieCache: {
            enabled: true;
            maxAge: number;
        };
        additionalFields: {
            activeOrganizationId: {
                type: "string";
            };
            industryRole: {
                type: "string";
            };
        };
    };
    emailAndPassword: {
        enabled: true;
        sendResetPassword(data: {
            user: any;
            url: string;
            token: string;
        }): Promise<void>;
    };
    plugins: [import("better-auth/plugins").DefaultOrganizationPlugin<{
        sendInvitationEmail(data: {
            id: string;
            role: string;
            email: string;
            organization: import("better-auth/plugins").Organization;
            invitation: import("better-auth/plugins").Invitation;
            inviter: import("better-auth/plugins").Member & {
                user: import("better-auth").User;
            };
        }): Promise<void>;
        onMemberRemoved: (data: {
            member: {
                userId: string;
                organizationId: string;
            };
        }) => Promise<void>;
    }>, {
        id: "magic-link";
        version: string;
        endpoints: {
            signInMagicLink: import("better-auth").StrictEndpoint<"/sign-in/magic-link", {
                method: "POST";
                requireHeaders: true;
                use: import("better-auth").Middleware<import("better-auth").MiddlewareOptions, (inputContext: import("better-auth").MiddlewareInputContext<import("better-auth").MiddlewareOptions>) => Promise<void>>[];
                body: import("better-auth").ZodObject<{
                    email: import("better-auth").ZodEmail;
                    name: import("better-auth").ZodOptional<import("better-auth").ZodString>;
                    callbackURL: import("better-auth").ZodOptional<import("better-auth").ZodString>;
                    newUserCallbackURL: import("better-auth").ZodOptional<import("better-auth").ZodString>;
                    errorCallbackURL: import("better-auth").ZodOptional<import("better-auth").ZodString>;
                    metadata: import("better-auth").ZodOptional<import("better-auth").ZodRecord<import("better-auth").ZodString, import("better-auth").ZodAny>>;
                }, import("zod/v4/core").$strip>;
                metadata: {
                    openapi: {
                        operationId: string;
                        description: string;
                        responses: {
                            200: {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            type: "object";
                                            properties: {
                                                status: {
                                                    type: string;
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
            }, {
                status: boolean;
            }>;
            magicLinkVerify: import("better-auth").StrictEndpoint<"/magic-link/verify", {
                method: "GET";
                query: import("better-auth").ZodObject<{
                    token: import("better-auth").ZodString;
                    callbackURL: import("better-auth").ZodOptional<import("better-auth").ZodString>;
                    errorCallbackURL: import("better-auth").ZodOptional<import("better-auth").ZodString>;
                    newUserCallbackURL: import("better-auth").ZodOptional<import("better-auth").ZodString>;
                }, import("zod/v4/core").$strip>;
                use: import("better-auth").Middleware<import("better-auth").MiddlewareOptions, (inputContext: import("better-auth").MiddlewareInputContext<import("better-auth").MiddlewareOptions>) => Promise<void>>[];
                requireHeaders: true;
                metadata: {
                    openapi: {
                        operationId: string;
                        description: string;
                        responses: {
                            200: {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            type: "object";
                                            properties: {
                                                session: {
                                                    $ref: string;
                                                };
                                                user: {
                                                    $ref: string;
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
            }, {
                token: string;
                user: {
                    id: string;
                    createdAt: Date;
                    updatedAt: Date;
                    email: string;
                    emailVerified: boolean;
                    name: string;
                    image?: string | null | undefined;
                };
                session: {
                    id: string;
                    createdAt: Date;
                    updatedAt: Date;
                    userId: string;
                    expiresAt: Date;
                    token: string;
                    ipAddress?: string | null | undefined;
                    userAgent?: string | null | undefined;
                };
            }>;
        };
        rateLimit: {
            pathMatcher(path: string): boolean;
            window: number;
            max: number;
        }[];
        options: import("better-auth/plugins").MagicLinkOptions;
    }];
}>;
export type Auth = typeof auth;
