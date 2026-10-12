import { HeadContent, Link, Outlet, Scripts, createRootRoute } from "@tanstack/react-router";
import "@fontsource-variable/inter";
import appCss from "../styles.css?url";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "4x4 Builder" },
      { name: "description", content: "See real off-road upgrades on your own truck before you buy." },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootDocument,
  component: RootLayout,
  notFoundComponent: NotFound,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="font-sans">
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <div className="flex-1">
        <Outlet />
      </div>
      <SiteFooter />
    </div>
  );
}

function NotFound() {
  return (
    <main className="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-24 text-center">
      <h1 className="text-3xl">Build not found</h1>
      <p className="text-muted-foreground">It may have expired or the link is wrong.</p>
      <Link to="/" className="font-semibold text-primary">
        Browse the gallery
      </Link>
    </main>
  );
}
