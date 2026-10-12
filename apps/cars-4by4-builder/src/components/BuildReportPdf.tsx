import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { formatPrice, summarize } from "@/lib/pricing";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 11 },
  title: { fontSize: 18, marginBottom: 12 },
  image: { width: "100%", marginBottom: 6 },
  caption: { fontSize: 9, color: "#666", marginBottom: 16 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: "#eee" },
  total: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, fontSize: 12 },
  sectionTitle: { fontSize: 14, marginTop: 16, marginBottom: 8 },
});

type Part = { id: string; name: string; priceUsd: string; laborHoursEst: string };

export function BuildReportPdf({
  title,
  renderUrl,
  parts,
  advisories,
}: {
  title: string;
  renderUrl: string;
  parts: Part[];
  advisories: { message: string }[];
}) {
  const totals = summarize(parts);
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{title}</Text>
        <Image src={renderUrl} style={styles.image} />
        <Text style={styles.caption}>AI visualization — actual appearance may vary.</Text>

        <Text style={styles.sectionTitle}>Estimated quote</Text>
        {parts.map((part) => (
          <View key={part.id} style={styles.row}>
            <Text>{part.name}</Text>
            <Text>
              {formatPrice(Number(part.priceUsd))} · {part.laborHoursEst} hrs
            </Text>
          </View>
        ))}
        <View style={styles.total}>
          <Text>Parts</Text>
          <Text>{formatPrice(totals.partsUsd)}</Text>
        </View>
        <View style={styles.total}>
          <Text>Est. labor ({totals.laborHours} hrs)</Text>
          <Text>{formatPrice(totals.laborUsd)}</Text>
        </View>
        <View style={styles.total}>
          <Text>Estimated total</Text>
          <Text>{formatPrice(totals.totalUsd)}</Text>
        </View>

        <Text style={styles.sectionTitle}>Fitment notes</Text>
        {advisories.map((a) => (
          <Text key={a.message} style={{ marginBottom: 6 }}>
            {a.message}
          </Text>
        ))}
      </Page>
    </Document>
  );
}
