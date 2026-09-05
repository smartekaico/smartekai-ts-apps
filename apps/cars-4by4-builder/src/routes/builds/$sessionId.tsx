import { createFileRoute } from "@tanstack/react-router";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { getSession } from "@/lib/queries";
import { BeforeAfterSlider } from "@/components/BeforeAfterSlider";
import { BuildReportPdf } from "@/components/BuildReportPdf";
import { getAdvisories } from "@/lib/advisories";

export const Route = createFileRoute("/builds/$sessionId")({
  loader: async ({ params }) => getSession({ data: params.sessionId }),
  head: ({ loaderData }) => ({
    meta: [
      { title: "My 4x4 Build" },
      { property: "og:image", content: loaderData?.session.transformedImageUrl ?? "" },
      { property: "og:title", content: "Check out my AI-generated 4x4 build" },
    ],
  }),
  component: BuildReport,
});

function BuildReport() {
  const { session, parts } = Route.useLoaderData();
  const advisories = getAdvisories(parts);
  const laborHours = parts.reduce((sum, p) => sum + Number(p.laborHoursEst), 0);
  const partsTotal = parts.reduce((sum, p) => sum + Number(p.priceUsd), 0);
  const laborCost = laborHours * 100;

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-semibold">Your AI-Generated Build</h1>

      {session.transformedImageUrl && (
        <div className="mt-4">
          <BeforeAfterSlider beforeUrl={session.originalImageUrl} afterUrl={session.transformedImageUrl} />
        </div>
      )}

      <section className="mt-6">
        <h2 className="font-medium">Itemized Quote</h2>
        <table className="mt-2 w-full text-sm">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="py-1">Upgrade</th>
              <th className="py-1">Fitment</th>
              <th className="py-1 text-right">Labor</th>
              <th className="py-1 text-right">Price</th>
              <th className="py-1 text-right">Buy</th>
            </tr>
          </thead>
          <tbody>
            {parts.map((part) => (
              <tr key={part.id} className="border-b border-border">
                <td className="py-1">{part.name}</td>
                <td className="py-1">{part.fitmentDifficulty}</td>
                <td className="py-1 text-right">{part.laborHoursEst} hrs</td>
                <td className="py-1 text-right">${part.priceUsd}</td>
                <td className="py-1 text-right">
                  <a href={part.affiliateUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                    View ↗
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-2 flex flex-col items-end text-sm">
          <span>Total Upgrades Cost: ${partsTotal.toFixed(2)}</span>
          <span>Estimated Installation ({laborHours} hrs @ $100/hr): ${laborCost.toFixed(2)}</span>
          <span className="font-semibold">Estimated Total Build: ${(partsTotal + laborCost).toFixed(2)}</span>
        </div>
      </section>

      <section className="mt-6">
        <h2 className="font-medium">Fitment & Mechanical Advisory Notes</h2>
        <ul className="mt-2 flex flex-col gap-2">
          {advisories.map((a, i) => (
            <li
              key={i}
              className={a.type === "warning" ? "rounded-md border border-destructive/40 bg-destructive/10 p-2 text-destructive" : "rounded-md border border-border bg-muted p-2"}
            >
              {a.message}
            </li>
          ))}
        </ul>
      </section>

      {session.transformedImageUrl && (
        <div className="mt-4">
          <PDFDownloadLink
            document={<BuildReportPdf renderUrl={session.transformedImageUrl} parts={parts} advisories={advisories} />}
            fileName="4x4-build-quote.pdf"
            className="rounded-md border border-border px-3 py-1.5 text-sm"
          >
            {({ loading }) => (loading ? "Preparing PDF…" : "Download PDF Quote")}
          </PDFDownloadLink>
        </div>
      )}

      <div className="mt-6 flex gap-2">
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(window.location.href);
          }}
          className="rounded-md border border-border px-3 py-1.5 text-sm"
        >
          Share My Build
        </button>
      </div>
    </main>
  );
}