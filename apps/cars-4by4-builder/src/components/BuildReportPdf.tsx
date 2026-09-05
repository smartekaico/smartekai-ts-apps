import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 11 },
  title: { fontSize: 18, marginBottom: 12 },
  image: { width: "100%", marginBottom: 16 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: "#eee" },
  sectionTitle: { fontSize: 14, marginTop: 16, marginBottom: 8 },
});

type Part = { id: string; name: string; priceUsd: string; laborHoursEst: string };

export function BuildReportPdf({
  renderUrl,
  parts,
  advisories,
}: {
  renderUrl: string;
  parts: Part[];
  advisories: { message: string }[];
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Your AI-Generated 4x4 Build</Text>
        <Image src={renderUrl} style={styles.image} />

        <Text style={styles.sectionTitle}>Itemized Quote</Text>
        {parts.map((part) => (
          <View key={part.id} style={styles.row}>
            <Text>{part.name}</Text>
            <Text>
              ${part.priceUsd} | {part.laborHoursEst} hrs
            </Text>
          </View>
        ))}

        <Text style={styles.sectionTitle}>Fitment Notes</Text>
        {advisories.map((a, i) => (
          <Text key={i} style={{ marginBottom: 6 }}>
            {a.message}
          </Text>
        ))}
      </Page>
    </Document>
  );
}