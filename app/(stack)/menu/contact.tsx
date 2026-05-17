import React, { useEffect, useState, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  Linking,
  TouchableOpacity,
  ScrollView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthContext } from "@/context/AuthContext";
import { useFetchWithAuth } from "@/hooks/fetchWithAuth";
import { BASE_URL } from "@/hooks/api";

type ClubInfo = {
  name: string;
  description?: string;
  address?: string;
  phone?: string;
  email?: string;
  contact_person?: string;
  iban?: string;
};

export default function ContactScreen() {
  const { userClub } = useContext(AuthContext);
  const { fetchWithAuth } = useFetchWithAuth();
  const [club, setClub] = useState<ClubInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClub = async () => {
      try {
        if (!userClub) {
          setLoading(false);
          return;
        }

        const res = await fetchWithAuth(`${BASE_URL}/clubs/${userClub.id}/`);

        if (res.ok) {
          const data = await res.json();
          setClub(data);
        }
      } catch (error) {
        console.error("Nepodarilo sa načítať údaje o klube:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchClub();
  }, [fetchWithAuth, userClub]);

  const openMap = (address: string) => {
    const encoded = encodeURIComponent(address);
    const url =
      Platform.OS === "ios"
        ? `http://maps.apple.com/?daddr=${encoded}`
        : `https://www.google.com/maps/dir/?api=1&destination=${encoded}`;

    Linking.openURL(url);
  };

  const openPhone = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const openEmail = (email: string) => {
    Linking.openURL(`mailto:${email}`);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["left", "right", "bottom"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={COLORS.primary} size="large" />
          <Text style={styles.loadingText}>Načítavam údaje o klube...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!club) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["left", "right", "bottom"]}>
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconBox}>
            <Text style={styles.emptyIcon}>🏒</Text>
          </View>

          <Text style={styles.emptyTitle}>Klub sa nepodarilo načítať</Text>
          <Text style={styles.emptyText}>
            Skontroluj pripojenie alebo sa prihlás znova do aplikácie.
          </Text>
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
        <View style={styles.titleBlock}>

          <View style={styles.titleTextBox}>
            <Text style={styles.screenLabel}>Kontakt</Text>
            <Text style={styles.title} numberOfLines={2}>
              {club.name}
            </Text>
            <Text style={styles.subtitle}>
              Kontaktné a platobné údaje tvojho klubu.
            </Text>
          </View>
        </View>

        {club.description && (
          <View style={styles.descriptionCard}>
            <View style={styles.descriptionIconBox}>
              <Text style={styles.descriptionIcon}>📋</Text>
            </View>

            <View style={styles.descriptionTextBox}>
              <Text style={styles.descriptionTitle}>O klube</Text>
              <Text style={styles.descriptionText}>{club.description}</Text>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Kontaktné údaje</Text>
          <Text style={styles.sectionDescription}>
            Kliknutím na údaj otvoríš mapu, telefonovanie alebo email.
          </Text>

          {club.address && (
            <TouchableOpacity
              style={styles.contactRow}
              activeOpacity={0.85}
              onPress={() => openMap(club.address!)}
            >
              <View style={styles.contactIconBox}>
                <Text style={styles.contactIcon}>📍</Text>
              </View>

              <View style={styles.contactTextBox}>
                <Text style={styles.contactLabel}>Adresa</Text>
                <Text style={styles.contactValue}>{club.address}</Text>
              </View>

              <Text style={styles.contactArrow}>›</Text>
            </TouchableOpacity>
          )}

          {club.phone && (
            <TouchableOpacity
              style={styles.contactRow}
              activeOpacity={0.85}
              onPress={() => openPhone(club.phone!)}
            >
              <View style={styles.contactIconBox}>
                <Text style={styles.contactIcon}>📞</Text>
              </View>

              <View style={styles.contactTextBox}>
                <Text style={styles.contactLabel}>Telefón</Text>
                <Text style={styles.contactValue}>{club.phone}</Text>
              </View>

              <Text style={styles.contactArrow}>›</Text>
            </TouchableOpacity>
          )}

          {club.email && (
            <TouchableOpacity
              style={styles.contactRow}
              activeOpacity={0.85}
              onPress={() => openEmail(club.email!)}
            >
              <View style={styles.contactIconBox}>
                <Text style={styles.contactIcon}>✉️</Text>
              </View>

              <View style={styles.contactTextBox}>
                <Text style={styles.contactLabel}>Email</Text>
                <Text style={styles.contactValue}>{club.email}</Text>
              </View>

              <Text style={styles.contactArrow}>›</Text>
            </TouchableOpacity>
          )}

          {club.contact_person && (
            <View style={styles.contactRowStatic}>
              <View style={styles.contactIconBox}>
                <Text style={styles.contactIcon}>👤</Text>
              </View>

              <View style={styles.contactTextBox}>
                <Text style={styles.contactLabel}>Kontaktná osoba</Text>
                <Text style={styles.staticValue}>{club.contact_person}</Text>
              </View>
            </View>
          )}
        </View>

        {club.iban && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Platobné údaje</Text>
            <Text style={styles.sectionDescription}>
              IBAN môžeš označiť a skopírovať.
            </Text>

            <View style={styles.ibanCard}>
              <View style={styles.ibanTopRow}>
                <View style={styles.ibanIconBox}>
                  <Text style={styles.ibanIcon}>🏦</Text>
                </View>

                <View style={styles.ibanTitleBox}>
                  <Text style={styles.ibanLabel}>IBAN</Text>
                  <Text style={styles.ibanSubLabel}>Bankový účet klubu</Text>
                </View>
              </View>

              <View style={styles.ibanBox}>
                <Text selectable style={styles.ibanText}>
                  {club.iban}
                </Text>
              </View>
            </View>
          </View>
        )}

        <Text style={styles.footerText}>Ludimus · kontakty klubu</Text>
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

  descriptionCard: {
    backgroundColor: COLORS.white,
    borderRadius: 22,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    flexDirection: "row",
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 2,
  },

  descriptionIconBox: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  descriptionIcon: {
    fontSize: 20,
  },

  descriptionTextBox: {
    flex: 1,
  },

  descriptionTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 5,
  },

  descriptionText: {
    color: COLORS.textSoft,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "500",
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

  sectionTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 5,
    letterSpacing: -0.2,
  },

  sectionDescription: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 14,
    fontWeight: "500",
  },

  contactRow: {
    minHeight: 72,
    borderRadius: 18,
    padding: 12,
    backgroundColor: COLORS.cardSoft,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },

  contactRowStatic: {
    minHeight: 72,
    borderRadius: 18,
    padding: 12,
    backgroundColor: COLORS.cardSoft,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    flexDirection: "row",
    alignItems: "center",
  },

  contactIconBox: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  contactIcon: {
    fontSize: 19,
  },

  contactTextBox: {
    flex: 1,
    paddingRight: 8,
  },

  contactLabel: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginBottom: 3,
  },

  contactValue: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 20,
  },

  staticValue: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 20,
  },

  contactArrow: {
    color: COLORS.primary,
    fontSize: 26,
    fontWeight: "700",
  },

  ibanCard: {
    borderRadius: 18,
    backgroundColor: COLORS.cardSoft,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    padding: 14,
  },

  ibanTopRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },

  ibanIconBox: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: COLORS.successSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  ibanIcon: {
    fontSize: 19,
  },

  ibanTitleBox: {
    flex: 1,
  },

  ibanLabel: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "900",
  },

  ibanSubLabel: {
    color: COLORS.muted,
    fontSize: 12.5,
    fontWeight: "500",
    marginTop: 2,
  },

  ibanBox: {
    backgroundColor: COLORS.white,
    padding: 13,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  ibanText: {
    fontSize: 15,
    color: COLORS.textSoft,
    fontWeight: "800",
    lineHeight: 22,
  },

  footerText: {
    color: COLORS.mutedLight,
    textAlign: "center",
    fontSize: 12,
    marginTop: 2,
    fontWeight: "600",
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

  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },

  emptyIconBox: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },

  emptyIcon: {
    fontSize: 32,
  },

  emptyTitle: {
    color: COLORS.text,
    fontSize: 19,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 6,
  },

  emptyText: {
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    fontWeight: "500",
  },
});