import React, { useCallback, useContext, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Image,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthContext } from "@/context/AuthContext";
import { useFetchWithAuth } from "@/hooks/fetchWithAuth";
import { BASE_URL } from "@/hooks/api";

// === Typy pre backend dáta ===
type MemberPayment = {
  id: number;
  amount: string | number;
  variable_symbol: string;
  is_paid: boolean;
  description: string;
  due_date: string;
  created_at: string;
  iban: string;
};

type OrderPayment = {
  id: number;
  order: number;
  jersey_order: number;
  amount: string | number;
  variable_symbol: string;
  is_paid: boolean;
  created_at: string;
  paid_at?: string | null;
  iban: string;
};

type ClubPaymentSettings = {
  iban: string;
  variable_symbol_prefix: string;
  payment_cycle: string;
  due_day: number;
};

export default function PaymentsScreen() {
  const { fetchWithAuth } = useFetchWithAuth();
  const { userClub } = useContext(AuthContext);

  const [memberPayments, setMemberPayments] = useState<MemberPayment[]>([]);
  const [orderPayments, setOrderPayments] = useState<OrderPayment[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPayments = useCallback(async () => {
    try {
      const res1 = await fetchWithAuth(`${BASE_URL}/member-payments/`);
      const memberData = res1.ok ? await res1.json() : [];
      setMemberPayments(Array.isArray(memberData) ? memberData : []);

      const res2 = await fetchWithAuth(`${BASE_URL}/orders-payments/`);
      const orderData = res2.ok ? await res2.json() : [];
      setOrderPayments(Array.isArray(orderData) ? orderData : []);
    } catch (err) {
      console.error("❌ Chyba pri fetchnutí platieb:", err);
    }
  }, [fetchWithAuth]);

  const fetchClubPaymentSettings = useCallback(async () => {
    if (!userClub?.id) return;

    try {
      const res = await fetchWithAuth(
        `${BASE_URL}/club-payments-settings/${userClub.id}/`
      );

      if (!res.ok) {
        console.error("❌ Klub payment settings error:", res.status, await res.text());
        return;
      }

      const data: ClubPaymentSettings = await res.json();
      console.log("IBAN pre klubové platby:", data.iban);
    } catch (e) {
      console.error("❌ Nepodarilo sa načítať IBAN:", e);
    }
  }, [fetchWithAuth, userClub?.id]);

  useEffect(() => {
    Promise.all([fetchPayments(), fetchClubPaymentSettings()]).finally(() =>
      setLoading(false)
    );
  }, [fetchClubPaymentSettings, fetchPayments]);

  const formatDate = (value?: string) => {
    if (!value) return "";
    return new Date(value).toLocaleDateString("sk-SK");
  };

  const totalPayments = memberPayments.length + orderPayments.length;
  const unpaidCount =
    memberPayments.filter((p) => !p.is_paid).length +
    orderPayments.filter((p) => !p.is_paid).length;
  const paidCount = totalPayments - unpaidCount;

  // Komponent pre jednu kartu
  const PaymentCard = ({
    id,
    type,
    label,
    amount,
    variable_symbol,
    is_paid,
    description,
    due_date,
    created_at,
    iban,
  }: {
    id: string;
    type: "member" | "order";
    label: string;
    amount: number;
    variable_symbol: string;
    is_paid: boolean;
    description?: string;
    due_date?: string;
    created_at?: string;
    iban?: string;
  }) => {
    const isExpanded = expandedId === id;
    const realId = id.split("-")[1];

    return (
      <View style={[styles.card, is_paid ? styles.cardPaid : styles.cardUnpaid]}>
        <Pressable onPress={() => setExpandedId(isExpanded ? null : id)}>
          <View style={styles.cardTopRow}>
            <View
              style={[
                styles.paymentIconBox,
                is_paid ? styles.paymentIconBoxPaid : styles.paymentIconBoxUnpaid,
              ]}
            >
              <Text style={styles.paymentIcon}>{is_paid ? "✓" : "!"}</Text>
            </View>

            <View style={styles.cardTitleBox}>
              <Text style={styles.description} numberOfLines={2}>
                {description || label}
              </Text>

              <Text style={styles.cardType}>
                {type === "member" ? "Členská platba" : "Objednávková platba"}
              </Text>
            </View>

            <Text style={styles.expandIcon}>{isExpanded ? "⌃" : "⌄"}</Text>
          </View>

          <View style={styles.amountRow}>
            <Text style={styles.amount}>{amount.toFixed(2)} €</Text>

            <View style={[styles.statusBadge, is_paid ? styles.statusPaid : styles.statusUnpaid]}>
              <Text
                style={[
                  styles.statusBadgeText,
                  is_paid ? styles.statusPaidText : styles.statusUnpaidText,
                ]}
              >
                {is_paid ? "Uhradené" : "Neuhradené"}
              </Text>
            </View>
          </View>

          <View style={styles.metaGrid}>
            {due_date && (
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Splatnosť</Text>
                <Text style={styles.metaValue}>{formatDate(due_date)}</Text>
              </View>
            )}

            {created_at && (
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Vytvorené</Text>
                <Text style={styles.metaValue}>{formatDate(created_at)}</Text>
              </View>
            )}
          </View>
        </Pressable>

        {isExpanded && (
          <View style={styles.expandedBox}>
            <View style={styles.paymentDetailRow}>
              <Text style={styles.paymentDetailLabel}>Variabilný symbol</Text>
              <Text selectable style={styles.copyable}>
                {variable_symbol}
              </Text>
            </View>

            {iban && (
              <View style={styles.paymentDetailRow}>
                <Text style={styles.paymentDetailLabel}>IBAN</Text>
                <Text selectable style={styles.copyable}>
                  {iban}
                </Text>
              </View>
            )}

            <View style={styles.qrBox}>
              <Image
                source={{
                  uri: `${BASE_URL}/payment-qr/${type}/${realId}/`,
                }}
                style={styles.qr}
              />
              <Text style={styles.qrLabel}>QR kód pre platbu</Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["left", "right", "bottom"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={COLORS.primary} size="large" />
          <Text style={styles.loadingText}>Načítavam platby...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["left", "right", "bottom"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{totalPayments}</Text>
            <Text style={styles.summaryLabel}>Spolu</Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={[styles.summaryValue, styles.summaryPaid]}>{paidCount}</Text>
            <Text style={styles.summaryLabel}>Uhradené</Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={[styles.summaryValue, styles.summaryUnpaid]}>{unpaidCount}</Text>
            <Text style={styles.summaryLabel}>Chýba</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Členské platby</Text>
              <Text style={styles.sectionDescription}>
                Počet platieb: {memberPayments.length}
              </Text>
            </View>

            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{memberPayments.length}</Text>
            </View>
          </View>

          {memberPayments.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>🏦</Text>
              <Text style={styles.emptyTitle}>Žiadne členské platby</Text>
              <Text style={styles.emptyText}>
                Momentálne nemáš priradené žiadne členské platby.
              </Text>
            </View>
          ) : (
            memberPayments.map((p) => (
              <PaymentCard
                key={`member-${p.id}`}
                id={`member-${p.id}`}
                type="member"
                label="Členský príspevok"
                amount={Number(p.amount)}
                variable_symbol={p.variable_symbol}
                is_paid={p.is_paid}
                description={p.description}
                due_date={p.due_date}
                created_at={p.created_at}
                iban={p.iban}
              />
            ))
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Platby za objednávky</Text>
              <Text style={styles.sectionDescription}>
                Počet platieb: {orderPayments.length}
              </Text>
            </View>

            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{orderPayments.length}</Text>
            </View>
          </View>

          {orderPayments.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>🛒</Text>
              <Text style={styles.emptyTitle}>Žiadne objednávkové platby</Text>
              <Text style={styles.emptyText}>
                Zatiaľ nemáš žiadne platby za objednávky.
              </Text>
            </View>
          ) : (
            orderPayments.map((p) => (
              <PaymentCard
                key={`order-${p.id}`}
                id={`order-${p.id}`}
                type="order"
                label={
                  p.order
                    ? `Objednávka #${p.order}`
                    : p.jersey_order
                      ? `Dresová objednávka #${p.jersey_order}`
                      : "Objednávka"
                }
                amount={Number(p.amount)}
                variable_symbol={p.variable_symbol}
                is_paid={p.is_paid}
                created_at={p.created_at}
                iban={p.iban}
              />
            ))
          )}
        </View>

        <Text style={styles.footerText}>Ludimus · platby</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const COLORS = {
  background: "#F4F4F8",
  white: "#FFFFFF",
  card: "#FFFFFF",
  cardSoft: "#FAFAFC",

  text: "#111111",
  textSoft: "#333333",
  muted: "#555555",
  mutedLight: "#777777",

  border: "#E0E0E0",
  borderSoft: "#EFEFF3",

  primary: "#D32F2F",
  primaryDark: "#8C1919",
  primarySoft: "#FFF1F1",

  success: "#169C35",
  successSoft: "#EAF7EE",

  danger: "#E12525",
  dangerSoft: "#FFF1F1",

  shadow: "#000000",
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  container: {
    padding: 18,
    paddingBottom: 36,
  },

  titleBlock: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 2,
  },

  titleIconBox: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },

  titleIcon: {
    fontSize: 27,
  },

  titleTextBox: {
    flex: 1,
  },

  screenLabel: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.7,
    marginBottom: 3,
  },

  title: {
    color: COLORS.text,
    fontSize: 23,
    fontWeight: "900",
    letterSpacing: -0.4,
  },

  subtitle: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
    fontWeight: "500",
  },

  summaryRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },

  summaryCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    alignItems: "center",
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 1,
  },

  summaryValue: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: "900",
  },

  summaryPaid: {
    color: COLORS.success,
  },

  summaryUnpaid: {
    color: COLORS.primary,
  },

  summaryLabel: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 3,
  },

  section: {
    backgroundColor: COLORS.card,
    borderRadius: 22,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 2,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },

  sectionTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 4,
    letterSpacing: -0.2,
  },

  sectionDescription: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
  },

  countBadge: {
    minWidth: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#FFD4D4",
  },

  countBadgeText: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: "900",
  },

  card: {
    backgroundColor: COLORS.cardSoft,
    borderRadius: 20,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
  },

  cardPaid: {
    borderColor: "#CDEFD6",
  },

  cardUnpaid: {
    borderColor: "#FFD4D4",
  },

  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },

  paymentIconBox: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  paymentIconBoxPaid: {
    backgroundColor: COLORS.successSoft,
  },

  paymentIconBoxUnpaid: {
    backgroundColor: COLORS.primarySoft,
  },

  paymentIcon: {
    fontSize: 20,
    fontWeight: "900",
    color: COLORS.primary,
  },

  cardTitleBox: {
    flex: 1,
  },

  description: {
    fontSize: 15,
    fontWeight: "900",
    color: COLORS.text,
    lineHeight: 20,
  },

  cardType: {
    color: COLORS.muted,
    fontSize: 12.5,
    fontWeight: "600",
    marginTop: 3,
  },

  expandIcon: {
    color: COLORS.primary,
    fontSize: 22,
    fontWeight: "900",
    marginLeft: 8,
  },

  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 12,
  },

  amount: {
    fontSize: 22,
    fontWeight: "900",
    color: COLORS.primary,
  },

  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },

  statusPaid: {
    backgroundColor: COLORS.successSoft,
    borderColor: "#BFE9C9",
  },

  statusUnpaid: {
    backgroundColor: COLORS.dangerSoft,
    borderColor: "#FFD4D4",
  },

  statusBadgeText: {
    fontSize: 12,
    fontWeight: "900",
  },

  statusPaidText: {
    color: COLORS.success,
  },

  statusUnpaidText: {
    color: COLORS.primary,
  },

  metaGrid: {
    flexDirection: "row",
    gap: 10,
  },

  metaItem: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
  },

  metaLabel: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginBottom: 3,
  },

  metaValue: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "800",
  },

  expandedBox: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },

  paymentDetailRow: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    marginBottom: 10,
  },

  paymentDetailLabel: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 5,
  },

  copyable: {
    fontWeight: "800",
    color: COLORS.textSoft,
    fontSize: 14,
    lineHeight: 20,
  },

  qrBox: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    alignItems: "center",
  },

  qr: {
    width: 180,
    height: 180,
  },

  qrLabel: {
    textAlign: "center",
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 8,
    fontWeight: "700",
  },

  emptyBox: {
    backgroundColor: COLORS.cardSoft,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    alignItems: "center",
  },

  emptyIcon: {
    fontSize: 28,
    marginBottom: 8,
  },

  emptyTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 5,
  },

  emptyText: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "500",
    textAlign: "center",
  },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },

  loadingText: {
    color: COLORS.muted,
    fontSize: 15,
    fontWeight: "700",
    marginTop: 12,
    textAlign: "center",
  },

  footerText: {
    color: COLORS.mutedLight,
    textAlign: "center",
    fontSize: 12,
    marginTop: 2,
    fontWeight: "600",
  },
});