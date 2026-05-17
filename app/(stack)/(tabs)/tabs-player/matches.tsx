// app/(tabs)/matches.tsx

import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ImageBackground,
  RefreshControl,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
} from "react-native";
import { useFetchWithAuth } from "@/hooks/fetchWithAuth";
import { BASE_URL } from "@/hooks/api";
import { router } from "expo-router";
import { COLORS } from "@/constants/Colors";

type Match = {
  id: number;
  club_name: string;
  date: string;
  location: string;
  opponent: string;
  description: string;
  category: number;
  category_name: string;
  user_status: "confirmed" | "declined" | "unknown";
  rating?: number;
  plus_minus?: number;
  is_home: boolean;

  // ak už je nominácia vytvorená, hráč už nemôže meniť môžem/nemôžem
  nominations_created?: boolean;
};

export default function MatchesScreen() {
  const { fetchWithAuth } = useFetchWithAuth();

  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<"ODOHRANÉ" | "NEODOHRANÉ">("NEODOHRANÉ");
  const [voteLockDays, setVoteLockDays] = useState(0);

  const [showReasonModal, setShowReasonModal] = useState(false);
  const [selectedMatchId, setSelectedMatchId] = useState<number | null>(null);
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [customReason, setCustomReason] = useState("");

  const fetchMatches = useCallback(
    async (selectedFilter: "ODOHRANÉ" | "NEODOHRANÉ" = "NEODOHRANÉ") => {
      try {
        const response = await fetchWithAuth(
          `${BASE_URL}/matches_filtered/?filter=${selectedFilter}`
        );

        if (response.ok) {
          const data = await response.json();
          let fetchedMatches: Match[] = Array.isArray(data.matches) ? [...data.matches] : [];

          if (selectedFilter === "ODOHRANÉ") {
            fetchedMatches = fetchedMatches.sort(
              (a: Match, b: Match) =>
                new Date(b.date).getTime() - new Date(a.date).getTime()
            );
          } else {
            fetchedMatches = fetchedMatches.sort(
              (a: Match, b: Match) =>
                new Date(a.date).getTime() - new Date(b.date).getTime()
            );
          }

          setMatches(fetchedMatches);
          setVoteLockDays(Number(data.vote_lock_days) || 0);
        } else {
          const error = await response.text();
          console.error("Chyba pri načítaní zápasov:", error);
        }
      } catch (e) {
        console.error("❌ Chyba pri fetchnutí zápasov:", e);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [fetchWithAuth]
  );

  useEffect(() => {
    void fetchMatches("NEODOHRANÉ");
  }, [fetchMatches]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMatches(filter);
  };

  const onFilterChange = async (newFilter: "ODOHRANÉ" | "NEODOHRANÉ") => {
    setFilter(newFilter);
    setLoading(true);
    await fetchMatches(newFilter);
  };

  const updateStatus = async (
    matchId: number,
    status: "confirmed" | "declined",
    reason?: string
  ) => {
    const match = matches.find((m) => m.id === matchId);
    if (!match) return;

    if (match.nominations_created) {
      Alert.alert(
        "Nominácia je už vytvorená",
        "Účasť už nie je možné meniť, pretože tréner už vytvoril nomináciu na zápas."
      );
      return;
    }

    const diffDays =
      (new Date(match.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24);

    if (diffDays < voteLockDays) {
      Alert.alert(
        `Zmenu stavu je možné vykonať najneskôr ${voteLockDays} dni pred zápasom.`
      );
      return;
    }

    try {
      const res = await fetchWithAuth(`${BASE_URL}/match-participations/`, {
        method: "POST",
        body: JSON.stringify({
          match: matchId,
          confirmed: status === "confirmed",
          reason: reason ?? null,
        }),
      });

      if (res.ok) {
        void fetchMatches(filter);
      } else {
        Alert.alert("Nepodarilo sa uložiť stav.");
      }
    } catch {
      Alert.alert("Chyba pri ukladaní účasti.");
    }
  };

  const grouped = matches.reduce((acc, match) => {
    if (!acc[match.category_name]) acc[match.category_name] = [];
    acc[match.category_name].push(match);
    return acc;
  }, {} as Record<string, Match[]>);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={COLORS.primary} size="large" />
        <Text style={styles.loadingText}>Načítavam zápasy...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={COLORS.primary}
          colors={[COLORS.primary]}
        />
      }
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.filterRow}>
        {(["NEODOHRANÉ", "ODOHRANÉ"] as const).map((f) => (
          <TouchableOpacity
            key={f}
            onPress={() => void onFilterChange(f)}
            style={[styles.filterButton, filter === f && styles.filterButtonActive]}
            activeOpacity={0.85}
          >
            <Text style={filter === f ? styles.filterTextActive : styles.filterText}>
              {f}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {Object.entries(grouped).map(([category, items]) => (
        <View key={category} style={styles.categorySection}>
          <Text style={styles.categoryTitle}>{category}</Text>

          {items.map((m) => {
            const matchDate = new Date(m.date);

            const isTimeEditable =
              matchDate.getTime() - Date.now() >
              voteLockDays * 24 * 60 * 60 * 1000;

            const nominationCreated = Boolean(m.nominations_created);

            const editable = isTimeEditable && !nominationCreated;

            return (
              <TouchableOpacity
                key={m.id}
                onPress={() => router.push(`/match/${m.id}`)}
                activeOpacity={0.9}
              >
                <ImageBackground
                  source={
                    m.is_home
                      ? require("@/assets/images/zapas_doma.png")
                      : require("@/assets/images/zapas_vonku.png")
                  }
                  imageStyle={{ borderRadius: 10 }}
                  style={styles.card}
                >
                  <Text style={styles.title}>{m.opponent}</Text>

                  <Text style={styles.date}>
                    {matchDate.toLocaleTimeString("sk-SK", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    •{" "}
                    {matchDate.toLocaleDateString("sk-SK", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </Text>

                  <Text style={styles.location}>📍 {m.location}</Text>

                  {m.rating != null && (
                    <Text style={styles.stats}>⭐ Hodnotenie: {m.rating}</Text>
                  )}

                  {editable ? (
                    <View style={styles.voteRow}>
                      {(["confirmed", "declined"] as const).map((status) => {
                        const label = status === "confirmed" ? "Môžem" : "Nemôžem";
                        const isSelected = m.user_status === status;

                        const backgroundColor = isSelected
                          ? status === "confirmed"
                            ? COLORS.success
                            : COLORS.danger
                          : COLORS.neutralSoft;

                        return (
                          <TouchableOpacity
                            key={status}
                            onPress={() => {
                              if (status === "declined") {
                                setSelectedReason(null);
                                setCustomReason("");
                                setSelectedMatchId(m.id);
                                setShowReasonModal(true);
                              } else {
                                void updateStatus(m.id, status);
                              }
                            }}
                            style={[styles.voteButton, { backgroundColor }]}
                            activeOpacity={0.85}
                          >
                            <Text
                              style={[
                                styles.voteButtonText,
                                { color: isSelected ? COLORS.white : COLORS.text },
                              ]}
                            >
                              {label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ) : nominationCreated ? (
                    <Text style={styles.note}>
                      Nominácia je už vytvorená, účasť už nie je možné meniť.
                    </Text>
                  ) : (
                    <Text style={styles.note}>Zmena účasti už nie je možná</Text>
                  )}
                </ImageBackground>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}

      {showReasonModal && (
        <Modal
          transparent
          animationType="slide"
          onRequestClose={() => setShowReasonModal(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.modalOverlay}
          >
            <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Vyber dôvod neprítomnosti</Text>

                {["Škola", "Práca", "Choroba", "Zranenie", "Iné"].map((reason) => {
                  const isSelected = selectedReason === reason;

                  return (
                    <TouchableOpacity
                      key={reason}
                      style={[
                        styles.reasonButton,
                        {
                          backgroundColor: isSelected
                            ? COLORS.primary
                            : COLORS.neutralSoft,
                        },
                      ]}
                      onPress={() => setSelectedReason(reason)}
                      activeOpacity={0.85}
                    >
                      <Text
                        style={[
                          styles.reasonButtonText,
                          { color: isSelected ? COLORS.white : COLORS.text },
                        ]}
                      >
                        {reason}
                      </Text>
                    </TouchableOpacity>
                  );
                })}

                {selectedReason === "Iné" && (
                  <TextInput
                    style={styles.input}
                    placeholder="Zadaj dôvod..."
                    placeholderTextColor={COLORS.textMuted}
                    value={customReason}
                    onChangeText={setCustomReason}
                    multiline
                  />
                )}

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    onPress={() => {
                      setShowReasonModal(false);
                      setSelectedReason(null);
                      setCustomReason("");
                      Keyboard.dismiss();
                    }}
                    style={[styles.modalActionButton, styles.cancelButton]}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.cancelButtonText}>Zrušiť</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      if (!selectedReason) {
                        Alert.alert("Chyba", "Vyber prosím dôvod.");
                        return;
                      }

                      if (selectedReason === "Iné" && !customReason.trim()) {
                        Alert.alert(
                          "Chyba",
                          "Prosím, napíš dôvod, keď vyberieš možnosť 'Iné'."
                        );
                        return;
                      }

                      const finalReason =
                        selectedReason === "Iné"
                          ? customReason.trim()
                          : selectedReason;

                      if (selectedMatchId) {
                        void updateStatus(selectedMatchId, "declined", finalReason);
                      }

                      setShowReasonModal(false);
                      setSelectedReason(null);
                      setCustomReason("");
                      Keyboard.dismiss();
                    }}
                    style={[styles.modalActionButton, styles.confirmButton]}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.confirmButtonText}>Potvrdiť</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </Modal>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  content: {
    padding: 20,
    paddingBottom: 32,
  },

  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: COLORS.textMuted,
    fontWeight: "600",
  },

  filterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 5,
    marginBottom: 20,
  },

  filterButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    marginHorizontal: 5,
    backgroundColor: COLORS.card,
  },

  filterButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },

  filterText: {
    color: COLORS.textMuted,
    fontWeight: "500",
    fontSize: 12,
  },

  filterTextActive: {
    color: COLORS.white,
    fontWeight: "bold",
    fontSize: 12,
  },

  categorySection: {
    marginBottom: 30,
  },

  categoryTitle: {
    fontWeight: "bold",
    fontSize: 22,
    marginBottom: 15,
    color: COLORS.text,
  },

  card: {
    padding: 16,
    borderRadius: 12,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 3,
    marginBottom: 16,
    backgroundColor: COLORS.card,
    overflow: "hidden",
  },

  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.primaryDark,
    marginBottom: 6,
  },

  date: {
    color: COLORS.textMuted,
    fontWeight: "bold",
    marginBottom: 4,
  },

  location: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },

  note: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 10,
    fontStyle: "italic",
  },

  stats: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },

  voteRow: {
    flexDirection: "row",
    marginTop: 10,
    gap: 10,
  },

  voteButton: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
  },

  voteButtonText: {
    fontWeight: "600",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },

  modalContent: {
    backgroundColor: COLORS.card,
    borderRadius: 10,
    padding: 20,
    width: "85%",
    elevation: 5,
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
    color: COLORS.text,
  },

  reasonButton: {
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    marginVertical: 5,
  },

  reasonButtonText: {
    fontWeight: "600",
  },

  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
    backgroundColor: COLORS.card,
    color: COLORS.text,
    minHeight: 80,
    textAlignVertical: "top",
  },

  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 15,
    gap: 10,
  },

  modalActionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },

  cancelButton: {
    backgroundColor: COLORS.neutralSoft,
  },

  confirmButton: {
    backgroundColor: COLORS.primary,
  },

  cancelButtonText: {
    color: COLORS.text,
    fontWeight: "700",
  },

  confirmButtonText: {
    color: COLORS.white,
    fontWeight: "700",
  },
});
