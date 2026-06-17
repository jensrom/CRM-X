/**
 * InvoicePdf — React-PDF template til faktura
 * ────────────────────────────────────────────
 * Genererer en pæn dansk faktura-PDF.
 *
 * Layout-aftaler:
 *   • A4-format, 40pt margin paa alle sider
 *   • Header: tenant-info venstre + faktura-info hoejre
 *   • Modtager-block (kunde-info) under header
 *   • Linjer-tabel med vekslende baggrund for læsbarhed
 *   • Total-block hoejrejusteret nederst paa sidste side
 *   • Footer: betaling + tenant CVR/EAN
 *
 * Brug:
 *   import { renderToBuffer } from "@react-pdf/renderer";
 *   const buffer = await renderToBuffer(<InvoicePdf invoice={...} />);
 */

import React from "react";
import {
  Document, Page, View, Text, StyleSheet,
} from "@react-pdf/renderer";

// ─── Types ────────────────────────────────────────────────────────────────

export interface InvoiceLineLike {
  description: string;
  quantity:    number;
  unitPrice:   number;
  discountPct: number;
  isCredit?:   boolean;
}

export interface InvoiceLike {
  number:      number;
  issueDate:   Date | string;
  dueDate?:    Date | string | null;
  status:      string;
  notes?:      string | null;
  vatEnabled:  boolean;
  vatPct:      number;
  currency:    string;
  lines:       InvoiceLineLike[];
}

export interface CompanyLike {
  name:       string;
  address?:   string | null;
  zipCode?:   string | null;
  city?:      string | null;
  orgNumber?: string | null;
}

export interface TenantLike {
  name:                  string;
  invoicePrefix:         string;
  invoiceCompanyName?:   string | null;
  invoiceAddress?:       string | null;
  invoiceZipCity?:       string | null;
  invoiceCvr?:           string | null;
  invoiceEan?:           string | null;
  invoicePhone?:         string | null;
  invoiceEmail?:         string | null;
  invoiceFooter?:        string | null;
}

interface Props {
  invoice: InvoiceLike;
  company: CompanyLike;
  tenant:  TenantLike;
}

// ─── Styles (sundhed: bløde nordiske farver) ──────────────────────────────

const COLORS = {
  primary:  "#2563EB",  // blå
  text:     "#1F2937",  // næsten-sort
  muted:    "#6B7280",  // grå
  bgAlt:    "#F9FAFB",  // light bg for zebra
  border:   "#E5E7EB",
};

const styles = StyleSheet.create({
  page: {
    fontSize:   10,
    fontFamily: "Helvetica",
    color:      COLORS.text,
    padding:    40,
    lineHeight: 1.4,
  },

  // ─── Header ────
  header: {
    flexDirection:  "row",
    justifyContent: "space-between",
    marginBottom:   32,
  },
  headerLeft: {
    flexDirection: "column",
    maxWidth:      "55%",
  },
  tenantName: {
    fontSize:    16,
    fontWeight:  "bold",
    color:       COLORS.primary,
    marginBottom: 4,
  },
  tenantInfo: {
    fontSize: 9,
    color:    COLORS.muted,
  },
  headerRight: {
    flexDirection: "column",
    alignItems:    "flex-end",
  },
  invoiceTitle: {
    fontSize:     18,
    fontWeight:   "bold",
    marginBottom: 8,
    letterSpacing: 1,
  },
  invoiceRef: {
    fontSize:    10,
    color:       COLORS.muted,
    marginBottom: 2,
  },

  // ─── Modtager ────
  recipient: {
    marginBottom: 32,
    padding:      12,
    borderLeft:   `3pt solid ${COLORS.primary}`,
  },
  recipientLabel: {
    fontSize:     9,
    color:        COLORS.muted,
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  recipientName: {
    fontSize:    12,
    fontWeight:  "bold",
    marginBottom: 2,
  },

  // ─── Linjer-tabel ────
  table: {
    marginBottom: 16,
  },
  tableHead: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: COLORS.primary,
    color:          "white",
    fontSize:       9,
    fontWeight:     "bold",
    textTransform:  "uppercase",
    letterSpacing:  0.5,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottom: `0.5pt solid ${COLORS.border}`,
  },
  tableRowAlt: {
    backgroundColor: COLORS.bgAlt,
  },
  col_desc:  { flex: 4 },
  col_qty:   { flex: 1, textAlign: "right" },
  col_price: { flex: 1.4, textAlign: "right" },
  col_disc:  { flex: 0.8, textAlign: "right" },
  col_total: { flex: 1.6, textAlign: "right", fontWeight: "bold" },

  // ─── Total-block ────
  totalSection: {
    marginTop:  16,
    alignItems: "flex-end",
  },
  totalRow: {
    flexDirection: "row",
    width:         220,
    paddingVertical: 4,
    justifyContent: "space-between",
  },
  totalLabel: {
    fontSize: 10,
    color:    COLORS.muted,
  },
  totalValue: {
    fontSize: 10,
  },
  grandTotalRow: {
    flexDirection:  "row",
    width:          220,
    paddingTop:     8,
    paddingBottom:  8,
    marginTop:      4,
    borderTop:      `1pt solid ${COLORS.text}`,
    justifyContent: "space-between",
  },
  grandTotalLabel: {
    fontSize:   12,
    fontWeight: "bold",
  },
  grandTotalValue: {
    fontSize:   12,
    fontWeight: "bold",
    color:      COLORS.primary,
  },

  // ─── Noter / footer ────
  notes: {
    marginTop:    24,
    padding:      12,
    backgroundColor: COLORS.bgAlt,
    borderRadius: 4,
    fontSize:     9,
    color:        COLORS.muted,
  },
  footer: {
    position:   "absolute",
    bottom:     30,
    left:       40,
    right:      40,
    paddingTop: 12,
    borderTop:  `0.5pt solid ${COLORS.border}`,
    fontSize:   8,
    color:      COLORS.muted,
    textAlign:  "center",
  },
});

// ─── Helpers ──────────────────────────────────────────────────────────────

const fmtKr = (n: number, currency = "DKK"): string => {
  return new Intl.NumberFormat("da-DK", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(n);
};

const fmtDate = (d: Date | string | null | undefined): string => {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("da-DK", {
    day: "numeric", month: "long", year: "numeric",
  });
};

const STATUS_LABEL: Record<string, string> = {
  draft:     "KLADDE",
  sent:      "FAKTURA",
  paid:      "BETALT",
  cancelled: "ANNULLERET",
};

// ─── Component ────────────────────────────────────────────────────────────

export function InvoicePdf({ invoice, company, tenant }: Props) {
  const invoiceRef = `${tenant.invoicePrefix}-${String(invoice.number).padStart(4, "0")}`;
  const senderName    = tenant.invoiceCompanyName ?? tenant.name;
  const senderAddress = tenant.invoiceAddress;
  const senderZipCity = tenant.invoiceZipCity;

  // Beregn totaler
  let subtotal = 0;
  for (const line of invoice.lines) {
    const base = line.quantity * line.unitPrice;
    const afterDisc = base * (1 - (line.discountPct ?? 0) / 100);
    subtotal += line.isCredit ? -afterDisc : afterDisc;
  }
  const vatAmount = invoice.vatEnabled ? subtotal * (invoice.vatPct / 100) : 0;
  const total = subtotal + vatAmount;

  return (
    <Document
      title={`Faktura ${invoiceRef}`}
      author={senderName}
      subject={`Faktura ${invoiceRef} til ${company.name}`}
    >
      <Page size="A4" style={styles.page}>
        {/* ─── HEADER ──────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.tenantName}>{senderName}</Text>
            {senderAddress && <Text style={styles.tenantInfo}>{senderAddress}</Text>}
            {senderZipCity && <Text style={styles.tenantInfo}>{senderZipCity}</Text>}
            {tenant.invoiceCvr && <Text style={styles.tenantInfo}>CVR: {tenant.invoiceCvr}</Text>}
            {tenant.invoicePhone && <Text style={styles.tenantInfo}>{tenant.invoicePhone}</Text>}
            {tenant.invoiceEmail && <Text style={styles.tenantInfo}>{tenant.invoiceEmail}</Text>}
          </View>

          <View style={styles.headerRight}>
            <Text style={styles.invoiceTitle}>
              {STATUS_LABEL[invoice.status] ?? "FAKTURA"}
            </Text>
            <Text style={styles.invoiceRef}>Nr: {invoiceRef}</Text>
            <Text style={styles.invoiceRef}>Udstedt: {fmtDate(invoice.issueDate)}</Text>
            {invoice.dueDate && (
              <Text style={styles.invoiceRef}>Forfald: {fmtDate(invoice.dueDate)}</Text>
            )}
          </View>
        </View>

        {/* ─── MODTAGER ────────────────────────────────────────────────── */}
        <View style={styles.recipient}>
          <Text style={styles.recipientLabel}>Faktureres til</Text>
          <Text style={styles.recipientName}>{company.name}</Text>
          {company.address && <Text>{company.address}</Text>}
          {(company.zipCode || company.city) && (
            <Text>{[company.zipCode, company.city].filter(Boolean).join(" ")}</Text>
          )}
          {company.orgNumber && <Text>CVR: {company.orgNumber}</Text>}
        </View>

        {/* ─── LINJER-TABEL ────────────────────────────────────────────── */}
        <View style={styles.table}>
          <View style={styles.tableHead}>
            <Text style={styles.col_desc}>Beskrivelse</Text>
            <Text style={styles.col_qty}>Antal</Text>
            <Text style={styles.col_price}>Pris</Text>
            <Text style={styles.col_disc}>Rabat</Text>
            <Text style={styles.col_total}>Total</Text>
          </View>

          {invoice.lines.length === 0 ? (
            <View style={styles.tableRow}>
              <Text style={{ flex: 1, color: COLORS.muted, fontStyle: "italic" }}>
                Ingen linjer
              </Text>
            </View>
          ) : (
            invoice.lines.map((line, i) => {
              const base = line.quantity * line.unitPrice;
              const lineTotal = base * (1 - (line.discountPct ?? 0) / 100);
              const signedTotal = line.isCredit ? -lineTotal : lineTotal;
              const isAlt = i % 2 === 1;

              return (
                <View key={i} style={[styles.tableRow, isAlt ? styles.tableRowAlt : {}]}>
                  <Text style={styles.col_desc}>{line.description}</Text>
                  <Text style={styles.col_qty}>
                    {Number(line.quantity).toLocaleString("da-DK", { maximumFractionDigits: 2 })}
                  </Text>
                  <Text style={styles.col_price}>{fmtKr(line.unitPrice, invoice.currency)}</Text>
                  <Text style={styles.col_disc}>
                    {(line.discountPct ?? 0) > 0 ? `${line.discountPct}%` : "—"}
                  </Text>
                  <Text style={styles.col_total}>{fmtKr(signedTotal, invoice.currency)}</Text>
                </View>
              );
            })
          )}
        </View>

        {/* ─── TOTAL ───────────────────────────────────────────────────── */}
        <View style={styles.totalSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>{fmtKr(subtotal, invoice.currency)}</Text>
          </View>
          {invoice.vatEnabled && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Moms ({invoice.vatPct}%)</Text>
              <Text style={styles.totalValue}>{fmtKr(vatAmount, invoice.currency)}</Text>
            </View>
          )}
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>I alt</Text>
            <Text style={styles.grandTotalValue}>{fmtKr(total, invoice.currency)}</Text>
          </View>
        </View>

        {/* ─── NOTER ───────────────────────────────────────────────────── */}
        {invoice.notes && (
          <View style={styles.notes}>
            <Text style={{ fontWeight: "bold", marginBottom: 4 }}>Bemærkninger</Text>
            <Text>{invoice.notes}</Text>
          </View>
        )}

        {/* ─── FOOTER ──────────────────────────────────────────────────── */}
        <View style={styles.footer} fixed>
          {tenant.invoiceFooter ? (
            <Text>{tenant.invoiceFooter}</Text>
          ) : (
            <Text>
              {senderName}
              {tenant.invoiceCvr && ` · CVR ${tenant.invoiceCvr}`}
              {tenant.invoiceEan && ` · EAN ${tenant.invoiceEan}`}
            </Text>
          )}
        </View>
      </Page>
    </Document>
  );
}
