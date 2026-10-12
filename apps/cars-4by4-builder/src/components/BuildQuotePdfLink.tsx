import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

type Part = { id: string; name: string; priceUsd: string; laborHoursEst: string };
type Props = {
  title: string;
  renderUrl: string;
  parts: Part[];
  advisories: { message: string }[];
};

const LINK_CLASS = "rounded-md border border-border px-4 py-2 text-sm font-semibold hover:border-primary";

export function BuildQuotePdfLink({ title, renderUrl, parts, advisories }: Props) {
  const propsRef = useRef({ title, renderUrl, parts, advisories });
  propsRef.current = { title, renderUrl, parts, advisories };

  const [render, setRender] = useState<null | (() => ReactNode)>(null);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([import("@react-pdf/renderer"), import("@/components/BuildReportPdf")]).then(
      ([pdf, report]) => {
        if (cancelled) return;
        const { PDFDownloadLink } = pdf;
        const { BuildReportPdf } = report;
        setRender(() => () => (
          <PDFDownloadLink
            document={<BuildReportPdf {...propsRef.current} />}
            fileName="4x4-build-quote.pdf"
            className={LINK_CLASS}
          >
            {({ loading }: { loading: boolean }) => (loading ? "Preparing PDF…" : "PDF quote")}
          </PDFDownloadLink>
        ));
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  if (!render) return <span className={LINK_CLASS}>PDF quote</span>;
  return <>{render()}</>;
}
