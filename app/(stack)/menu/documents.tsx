import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFetchWithAuth } from "@/hooks/fetchWithAuth";
import { BASE_URL } from "@/hooks/api";

type Document = {
  id: number;
  title: string;
  file: string;
  uploaded_at: string;
};

export default function DocumentsScreen() {
  const { fetchWithAuth } = useFetchWithAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const res = await fetchWithAuth(`${BASE_URL}/documents/`);
        const json = await res.json();
        setDocuments(json);
      } catch (err) {
        console.error("Chyba pri načítaní dokumentov:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, [fetchWithAuth]);

  const openDocument = (fileUrl: string) => {
    Linking.openURL(fileUrl);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["left", "right", "bottom"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={COLORS.primary} size="large" />
          <Text style={styles.loadingText}>Načítavam dokumenty...</Text>
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
        {documents.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconBox}>
              <Text style={styles.emptyIcon}>📁</Text>
            </View>

            <Text style={styles.emptyTitle}>Žiadne dokumenty</Text>
            <Text style={styles.emptyText}>
              Klub zatiaľ nepridal žiadne dokumenty na stiahnutie.
            </Text>
          </View>
        ) : (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Dostupné súbory</Text>
                <Text style={styles.sectionDescription}>
                  Počet dokumentov: {documents.length}
                </Text>
              </View>

              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{documents.length}</Text>
              </View>
            </View>

            {documents.map((doc) => (
              <View key={doc.id} style={styles.card}>
                <View style={styles.cardTopRow}>
                  <View style={styles.iconBox}>
                    <Image
                      source={require("@/assets/images/dokument.png")}
                      style={styles.icon}
                    />
                  </View>

                  <View style={styles.documentInfo}>
                    <Text style={styles.docTitle} numberOfLines={2}>
                      {doc.title}
                    </Text>

                    <View style={styles.dateRow}>
                      <Text style={styles.dateIcon}>🕒</Text>
                      <Text style={styles.date}>{doc.uploaded_at}</Text>
                    </View>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.downloadButton}
                  activeOpacity={0.88}
                  onPress={() => openDocument(doc.file)}
                >
                  <Text style={styles.downloadButtonIcon}>↓</Text>
                  <Text style={styles.downloadText}>Stiahnuť / Otvoriť</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.footerText}>Ludimus · dokumenty klubu</Text>
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
    borderColor: COLORS.borderSoft,
  },

  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 13,
  },

  iconBox: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
  },

  icon: {
    width: 34,
    height: 34,
    resizeMode: "contain",
  },

  documentInfo: {
    flex: 1,
  },

  docTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: COLORS.text,
    lineHeight: 21,
  },

  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
  },

  dateIcon: {
    fontSize: 12,
    marginRight: 5,
  },

  date: {
    fontSize: 13,
    color: COLORS.muted,
    fontWeight: "600",
  },

  downloadButton: {
    minHeight: 46,
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    shadowColor: COLORS.primary,
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 2,
  },

  downloadButtonIcon: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: "900",
    marginRight: 8,
    marginTop: -1,
  },

  downloadText: {
    color: COLORS.white,
    fontWeight: "900",
    fontSize: 14,
  },

  emptyContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 22,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 16,
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