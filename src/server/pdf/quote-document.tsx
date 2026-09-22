import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
} from "@react-pdf/renderer";
import { formatCurrency } from "@/lib/formatting/currency";

export interface QuotePdfOrg {
  name: string;
  legalName?: string | null;
  email?: string | null;
  phone?: string | null;
  addressLine1?: string | null;
  city?: string | null;
  country?: string | null;
  taxId?: string | null;
}

export interface QuotePdfContact {
  name: string;
  email?: string | null;
}

export interface QuotePdfItem {
  description: string;
  quantity: number;
  unitPriceMinor: number;
  taxRate: number;
}

export interface QuotePdfData {
  /** Titre du document (« DEVIS » par défaut, « FACTURE » pour une facture). */
  docTitle?: string;
  org: QuotePdfOrg;
  contact: QuotePdfContact;
  number: string;
  issueDate: Date;
  expiryDate?: Date | null;
  dueDate?: Date | null;
  currency: string;
  locale: string;
  items: QuotePdfItem[];
  subtotalMinor: number;
  discountMinor: number;
  taxMinor: number;
  totalMinor: number;
  depositMinor: number;
  notes?: string | null;
}

const INK = "#12263A";
const MUTED = "#667085";
const BORDER = "#E4E7EC";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, color: INK, fontFamily: "Helvetica" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24 },
  brand: { fontSize: 20, fontFamily: "Helvetica-Bold", color: INK },
  muted: { color: MUTED },
  small: { fontSize: 9, color: MUTED, marginTop: 2 },
  docTitle: { fontSize: 18, fontFamily: "Helvetica-Bold", textAlign: "right" },
  block: { marginBottom: 16 },
  label: { fontSize: 8, color: MUTED, marginBottom: 2, textTransform: "uppercase" },
  tableHead: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: INK,
    paddingBottom: 4,
    marginTop: 8,
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    paddingVertical: 5,
  },
  cDesc: { flex: 1 },
  cQty: { width: 40, textAlign: "right" },
  cPrice: { width: 80, textAlign: "right" },
  cTax: { width: 45, textAlign: "right" },
  cTotal: { width: 85, textAlign: "right" },
  th: { fontSize: 8, color: MUTED },
  totals: { marginTop: 16, marginLeft: "auto", width: 220 },
  tRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  tStrong: { fontSize: 12, fontFamily: "Helvetica-Bold" },
  divider: { borderBottomWidth: 1, borderBottomColor: BORDER, marginVertical: 4 },
  footer: { position: "absolute", bottom: 30, left: 40, right: 40, fontSize: 8, color: MUTED, textAlign: "center" },
});

export function QuoteDocument({ data }: { data: QuotePdfData }) {
  const money = (m: number) => formatCurrency(m, data.currency, data.locale);
  const dtf = new Intl.DateTimeFormat(data.locale, { dateStyle: "medium" });
  const remaining = data.totalMinor - data.depositMinor;

  return (
    <Document title={`Devis ${data.number}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.brand}>{data.org.name}</Text>
            {data.org.legalName ? <Text style={styles.small}>{data.org.legalName}</Text> : null}
            {data.org.addressLine1 ? <Text style={styles.small}>{data.org.addressLine1}</Text> : null}
            {data.org.city ? <Text style={styles.small}>{data.org.city}{data.org.country ? `, ${data.org.country}` : ""}</Text> : null}
            {data.org.email ? <Text style={styles.small}>{data.org.email}</Text> : null}
            {data.org.phone ? <Text style={styles.small}>{data.org.phone}</Text> : null}
            {data.org.taxId ? <Text style={styles.small}>N° fiscal : {data.org.taxId}</Text> : null}
          </View>
          <View>
            <Text style={styles.docTitle}>{data.docTitle ?? "DEVIS"}</Text>
            <Text style={[styles.small, { textAlign: "right" }]}>N° {data.number}</Text>
            <Text style={[styles.small, { textAlign: "right" }]}>Émis le {dtf.format(data.issueDate)}</Text>
            {data.expiryDate ? (
              <Text style={[styles.small, { textAlign: "right" }]}>Valable jusqu’au {dtf.format(data.expiryDate)}</Text>
            ) : null}
            {data.dueDate ? (
              <Text style={[styles.small, { textAlign: "right" }]}>Échéance : {dtf.format(data.dueDate)}</Text>
            ) : null}
          </View>
        </View>

        <View style={styles.block}>
          <Text style={styles.label}>Adressé à</Text>
          <Text>{data.contact.name}</Text>
          {data.contact.email ? <Text style={styles.small}>{data.contact.email}</Text> : null}
        </View>

        <View style={styles.tableHead}>
          <Text style={[styles.cDesc, styles.th]}>Description</Text>
          <Text style={[styles.cQty, styles.th]}>Qté</Text>
          <Text style={[styles.cPrice, styles.th]}>P.U. HT</Text>
          <Text style={[styles.cTax, styles.th]}>TVA</Text>
          <Text style={[styles.cTotal, styles.th]}>Total HT</Text>
        </View>
        {data.items.map((it, i) => (
          <View style={styles.row} key={i}>
            <Text style={styles.cDesc}>{it.description}</Text>
            <Text style={styles.cQty}>{it.quantity}</Text>
            <Text style={styles.cPrice}>{money(it.unitPriceMinor)}</Text>
            <Text style={styles.cTax}>{it.taxRate} %</Text>
            <Text style={styles.cTotal}>{money(it.unitPriceMinor * it.quantity)}</Text>
          </View>
        ))}

        <View style={styles.totals}>
          <View style={styles.tRow}>
            <Text style={styles.muted}>Sous-total HT</Text>
            <Text>{money(data.subtotalMinor)}</Text>
          </View>
          {data.discountMinor > 0 ? (
            <View style={styles.tRow}>
              <Text style={styles.muted}>Remise</Text>
              <Text>- {money(data.discountMinor)}</Text>
            </View>
          ) : null}
          <View style={styles.tRow}>
            <Text style={styles.muted}>TVA</Text>
            <Text>{money(data.taxMinor)}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.tRow}>
            <Text style={styles.tStrong}>Total TTC</Text>
            <Text style={styles.tStrong}>{money(data.totalMinor)}</Text>
          </View>
          {data.depositMinor > 0 ? (
            <>
              <View style={styles.tRow}>
                <Text style={styles.muted}>Acompte demandé</Text>
                <Text>{money(data.depositMinor)}</Text>
              </View>
              <View style={styles.tRow}>
                <Text style={styles.muted}>Reste à payer</Text>
                <Text>{money(remaining)}</Text>
              </View>
            </>
          ) : null}
        </View>

        {data.notes ? (
          <View style={[styles.block, { marginTop: 20 }]}>
            <Text style={styles.label}>Notes</Text>
            <Text>{data.notes}</Text>
          </View>
        ) : null}

        <Text style={styles.footer}>
          {data.org.name} · Document édité via KoraFlow.
        </Text>
      </Page>
    </Document>
  );
}
