import { createServerFn } from "@tanstack/react-start";
import { googleProvider } from "@/server/social-auth";

/** Tells /sign-in whether to offer the Google button at all. */
export const getAuthOptions = createServerFn({ method: "GET" }).handler(async () => ({
  google: googleProvider() !== null,
}));
