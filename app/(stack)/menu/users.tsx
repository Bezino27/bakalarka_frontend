import React, { useCallback, useEffect, useMemo, useState, useContext } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFetchWithAuth } from "@/hooks/fetchWithAuth";
import { AuthContext } from "@/context/AuthContext";
import { BASE_URL } from "@/hooks/api";

type Player = {
  id: number;
  name: string;
  birth_date: string;
  categories: string[];
};

type Category = {
  id: number;
  name: string;
};

export default function ManageCategoryScreen() {
  const { fetchWithAuth } = useFetchWithAuth();
  const { userRoles } = useContext(AuthContext);

  const coachCategories: Category[] = useMemo(() => {
    return userRoles
      .filter((r) => r.role === "coach" && r.category)
      .map((r) => r.category);
  }, [userRoles]);

  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedInCategory, setSelectedInCategory] = useState<number[]>([]);

  const fetchPlayers = useCallback(async () => {
    try {
      const res = await fetchWithAuth(`${BASE_URL}/users-in-club/`);
      const data = await res.json();

      const users = Array.isArray(data) ? data : [];

      const onlyPlayers: Player[] = users
        .filter(
          (u: any) =>
            Array.isArray(u.roles) &&
            u.roles.some((r: any) => r.role === "player")
        )
        .map((u: any) => ({
          id: u.id,
          name: u.name || u.username,
          birth_date: u.birth_date,
          categories: u.roles
            .filter((r: any) => r.role === "player")
            .map((r: any) => r.category__name)
            .filter(Boolean),
        }));

      setPlayers(onlyPlayers);
    } catch (error) {
      console.error("Nepodarilo sa načítať hráčov:", error);
      Alert.alert("Chyba", "Nepodarilo sa načítať hráčov.");
    } finally {
      setLoading(false);
    }
  }, [fetchWithAuth]);

  const handleSelectCategory = (cat: Category) => {
    setSelectedCategory(cat);

    const inCategory = players
      .filter((p) => p.categories.includes(cat.name))
      .map((p) => p.id);

    setSelectedInCategory(inCategory);
  };

  const togglePlayer = (playerId: number) => {
    setSelectedInCategory((prev) =>
      prev.includes(playerId)
        ? prev.filter((id) => id !== playerId)
        : [...prev, playerId]
    );
  };

  const handleSave = async () => {
    if (!selectedCategory) return;

    try {
      setSaving(true);

      const res = await fetchWithAuth(`${BASE_URL}/assign-players-to-category/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category_id: selectedCategory.id,
          player_ids: selectedInCategory,
        }),
      });

      if (!res.ok) throw new Error();

      Alert.alert("✅ Uložené", "Hráči boli priradení.");
      await fetchPlayers();
    } catch (error) {
      console.error("Nepodarilo sa uložiť zmeny:", error);
      Alert.alert("❌ Chyba", "Nepodarilo sa uložiť zmeny.");
    } finally {
      setSaving(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPlayers();
    setRefreshing(false);
  };

  useEffect(() => {
    void fetchPlayers();
  }, [fetchPlayers]);

  const sortedPlayers = useMemo(() => {
    return [...players].sort((a, b) => {
      const aTime = a.birth_date ? new Date(a.birth_date).getTime() : 0;
      const bTime = b.birth_date ? new Date(b.birth_date).getTime() : 0;
      return aTime - bTime;
    });
  }, [players]);

  const playersInCategory = useMemo(() => {
    return sortedPlayers.filter((p) => selectedInCategory.includes(p.id));
  }, [sortedPlayers, selectedInCategory]);

  const playersNotInCategory = useMemo(() => {
    return sortedPlayers.filter((p) => !selectedInCategory.includes(p.id));
  }, [sortedPlayers, selectedInCategory]);

  const formatBirthYear = (date?: string) => {
    if (!date) return "Bez dátumu";
    return date.slice(0, 4);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["left", "right", "bottom"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={COLORS.primary} size="large" />
          <Text style={styles.loadingText}>Načítavam hráčov...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["left", "right", "bottom"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
      >
        <View style={styles.topHeader}>
          <View>
            <Text style={styles.screenLabel}>Kategória</Text>
            <Text style={styles.title}>Správa hráčov</Text>
            <Text style={styles.subtitle}>
              Vyber kategóriu a priraď hráčov kliknutím.
            </Text>
          </View>

          {selectedCategory && (
            <TouchableOpacity
              style={[styles.topSaveButton, saving && styles.saveButtonDisabled]}
              activeOpacity={0.9}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.topSaveButtonText}>Uložiť</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Vyber kategóriu</Text>
              <Text style={styles.sectionDescription}>
                Dostupné sú len kategórie, kde máš rolu trénera.
              </Text>
            </View>

            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{coachCategories.length}</Text>
            </View>
          </View>

          {coachCategories.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>🏷️</Text>
              <Text style={styles.emptyTitle}>Nemáš trénerskú kategóriu</Text>
              <Text style={styles.emptyText}>
                Pre správu hráčov musíš mať priradenú rolu trénera v kategórii.
              </Text>
            </View>
          ) : (
            <View style={styles.chipRow}>
              {coachCategories.map((cat) => {
                const isSelected = selectedCategory?.id === cat.id;

                return (
                  <TouchableOpacity
                    key={cat.id}
                    activeOpacity={0.85}
                    onPress={() => handleSelectCategory(cat)}
                    style={[styles.chip, isSelected && styles.chipSelected]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        isSelected && styles.chipTextSelected,
                      ]}
                    >
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {!selectedCategory && coachCategories.length > 0 && (
          <View style={styles.helperCard}>
            <View style={styles.helperIconBox}>
              <Text style={styles.helperIcon}>ℹ️</Text>
            </View>

            <View style={styles.helperTextBox}>
              <Text style={styles.helperTitle}>Vyber kategóriu</Text>
              <Text style={styles.helperText}>
                Po výbere sa zobrazia hráči rozdelení podľa toho, či sú v kategórii alebo mimo nej.
              </Text>
            </View>
          </View>
        )}

        {selectedCategory && (
          <>
            <View style={styles.overviewRow}>
              <View style={styles.overviewCard}>
                <Text style={styles.overviewValue}>{playersInCategory.length}</Text>
                <Text style={styles.overviewLabel}>V kategórii</Text>
              </View>

              <View style={styles.overviewCard}>
                <Text style={styles.overviewValue}>
                  {playersNotInCategory.length}
                </Text>
                <Text style={styles.overviewLabel}>Mimo</Text>
              </View>

              <View style={styles.overviewCard}>
                <Text style={styles.overviewValue}>{sortedPlayers.length}</Text>
                <Text style={styles.overviewLabel}>Spolu</Text>
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={styles.sectionTitle}>{selectedCategory.name}</Text>
                  <Text style={styles.sectionDescription}>
                    Kliknutím hráča presunieš medzi zoznamami.
                  </Text>
                </View>
              </View>

              <View style={styles.playersColumns}>
                <View style={styles.column}>
                  <View style={styles.columnHeaderIn}>
                    <Text style={styles.columnTitle}>V kategórii</Text>
                    <Text style={styles.columnCount}>
                      {playersInCategory.length}
                    </Text>
                  </View>

                  {playersInCategory.length === 0 ? (
                    <View style={styles.columnEmptyBox}>
                      <Text style={styles.columnEmptyText}>Žiadni hráči</Text>
                    </View>
                  ) : (
                    playersInCategory.map((player) => (
                      <TouchableOpacity
                        key={player.id}
                        activeOpacity={0.85}
                        onPress={() => togglePlayer(player.id)}
                        style={[styles.playerCard, styles.playerCardIn]}
                      >
                        <Text style={styles.playerName} numberOfLines={2}>
                          {player.name}
                        </Text>

                        <View style={styles.playerMetaRow}>
                          <Text style={styles.playerMeta}>
                            Ročník {formatBirthYear(player.birth_date)}
                          </Text>
                        </View>

                        <Text style={styles.playerStatusIn}>✓ V kategórii</Text>
                      </TouchableOpacity>
                    ))
                  )}
                </View>

                <View style={styles.column}>
                  <View style={styles.columnHeaderOut}>
                    <Text style={styles.columnTitle}>Mimo</Text>
                    <Text style={styles.columnCount}>
                      {playersNotInCategory.length}
                    </Text>
                  </View>

                  {playersNotInCategory.length === 0 ? (
                    <View style={styles.columnEmptyBox}>
                      <Text style={styles.columnEmptyText}>Žiadni hráči</Text>
                    </View>
                  ) : (
                    playersNotInCategory.map((player) => (
                      <TouchableOpacity
                        key={player.id}
                        activeOpacity={0.85}
                        onPress={() => togglePlayer(player.id)}
                        style={[styles.playerCard, styles.playerCardOut]}
                      >
                        <Text style={styles.playerName} numberOfLines={2}>
                          {player.name}
                        </Text>

                        <View style={styles.playerMetaRow}>
                          <Text style={styles.playerMeta}>
                            Ročník {formatBirthYear(player.birth_date)}
                          </Text>
                        </View>

                        <Text style={styles.playerStatusOut}>+ Pridať</Text>
                      </TouchableOpacity>
                    ))
                  )}
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              activeOpacity={0.9}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.saveButtonIcon}>💾</Text>
                  <Text style={styles.saveButtonText}>Uložiť zmeny</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}

        <Text style={styles.footerText}>Ludimus · správa kategórie</Text>
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

  neutral: "#555555",
  neutralSoft: "#F1F1F1",

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

  topHeader: {
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
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
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: -0.5,
  },

  subtitle: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
    fontWeight: "500",
    maxWidth: 230,
  },

  topSaveButton: {
    minWidth: 86,
    minHeight: 42,
    borderRadius: 15,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 2,
  },

  topSaveButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "900",
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
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 14,
    gap: 12,
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

  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  chip: {
    backgroundColor: COLORS.cardSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
  },

  chipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },

  chipText: {
    fontWeight: "900",
    color: COLORS.textSoft,
    fontSize: 13,
  },

  chipTextSelected: {
    color: COLORS.white,
  },

  helperCard: {
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

  helperIconBox: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  helperIcon: {
    fontSize: 19,
  },

  helperTextBox: {
    flex: 1,
  },

  helperTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "900",
    marginBottom: 4,
  },

  helperText: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "500",
  },

  overviewRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },

  overviewCard: {
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

  overviewValue: {
    color: COLORS.primary,
    fontSize: 22,
    fontWeight: "900",
  },

  overviewLabel: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 3,
    textAlign: "center",
  },

  playersColumns: {
    flexDirection: "row",
    gap: 10,
  },

  column: {
    flex: 1,
  },

  columnHeaderIn: {
    minHeight: 42,
    borderRadius: 15,
    paddingHorizontal: 10,
    paddingVertical: 9,
    backgroundColor: COLORS.successSoft,
    borderWidth: 1,
    borderColor: "#BFE9C9",
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  columnHeaderOut: {
    minHeight: 42,
    borderRadius: 15,
    paddingHorizontal: 10,
    paddingVertical: 9,
    backgroundColor: COLORS.neutralSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  columnTitle: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "900",
  },

  columnCount: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: "900",
  },

  playerCard: {
    borderRadius: 16,
    padding: 11,
    marginBottom: 10,
    borderWidth: 1,
  },

  playerCardIn: {
    backgroundColor: COLORS.successSoft,
    borderColor: "#BFE9C9",
  },

  playerCardOut: {
    backgroundColor: COLORS.cardSoft,
    borderColor: COLORS.border,
  },

  playerName: {
    color: COLORS.text,
    fontSize: 13.5,
    fontWeight: "900",
    lineHeight: 18,
  },

  playerMetaRow: {
    marginTop: 5,
  },

  playerMeta: {
    color: COLORS.muted,
    fontSize: 11.5,
    fontWeight: "700",
  },

  playerStatusIn: {
    color: COLORS.success,
    fontSize: 12,
    fontWeight: "900",
    marginTop: 7,
  },

  playerStatusOut: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: "900",
    marginTop: 7,
  },

  columnEmptyBox: {
    backgroundColor: COLORS.cardSoft,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
  },

  columnEmptyText: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },

  saveButton: {
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    shadowColor: COLORS.primary,
    shadowOpacity: 0.24,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 4,
  },

  saveButtonDisabled: {
    opacity: 0.75,
  },

  saveButtonIcon: {
    fontSize: 17,
    marginRight: 8,
  },

  saveButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "900",
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