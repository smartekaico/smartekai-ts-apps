import { Link, createFileRoute } from "@tanstack/react-router";
import { getProjects } from "@/lib/builds";

export const Route = createFileRoute("/projects")({
  loader: () => getProjects(),
  head: () => ({ meta: [{ title: "My projects | 4x4 Builder" }, { name: "robots", content: "noindex" }] }),
  component: ProjectsPage,
});

// Fixed locale + time zone so the server render and hydration produce the same text.
const DATE_FORMAT = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" });

const STATUS_LABEL: Record<string, string> = { processing: "Rendering…", failed: "Failed", completed: "" };

function ProjectsPage() {
  const projects = Route.useLoaderData();

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-3xl">My projects</h1>
      {projects.length === 0 ? (
        <p className="mt-6 text-muted-foreground">
          No builds yet.{" "}
          <Link to="/build" className="font-semibold text-primary">
            Build your first one
          </Link>
        </p>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <li key={p.id} className="overflow-hidden rounded-lg border border-border bg-card">
              {p.status === "completed" ? (
                <Link to="/builds/$slug/report" params={{ slug: p.id }} className="block hover:opacity-90">
                  <ProjectCard project={p} />
                </Link>
              ) : (
                <Link to="/builds/$slug" params={{ slug: p.id }} className="block hover:opacity-90">
                  <ProjectCard project={p} />
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function ProjectCard({ project }: { project: { vehicleName: string; createdAt: string; status: string; thumbUrl: string | null } }) {
  return (
    <>
      {project.thumbUrl ? (
        <img src={project.thumbUrl} alt={project.vehicleName} className="aspect-video w-full object-cover" />
      ) : (
        <div className="aspect-video w-full bg-muted" />
      )}
      <div className="flex items-center justify-between gap-2 p-3 text-sm">
        <span className="font-semibold">{project.vehicleName}</span>
        <span className="text-muted-foreground">
          {STATUS_LABEL[project.status] || DATE_FORMAT.format(new Date(project.createdAt))}
        </span>
      </div>
    </>
  );
}
