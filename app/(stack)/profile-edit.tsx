import React, { useContext, useState, useEffect } from "react";
import {
  SafeAreaView,
  StyleSheet,
  ScrollView,
  Text,
  View,
  TextInput,
  Alert,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { AuthContext } from "@/context/AuthContext";
import { BASE_URL } from "@/hooks/api";
import { useFetchWithAuth } from "@/hooks/fetchWithAuth";

// Pomocná funkcia pre prevod dátumu z 5.5.2020 na 2020-05-05
function formatDateToBackend(date: string): string {
  const parts = date.split(".");
  if (parts.length === 3) {
    const [day, month, year] = parts.map((p) => p.trim().padStart(2, "0"));
    return `${year}-${month}-${day}`;
  }
  return date;
}

export default function ProfileEditScreen() {
  const router = useRouter();
  const { userDetails, setUserDetails } = useContext(AuthContext);
  const { fetchWithAuth } = useFetchWithAuth();

  const [username, setuserName] = useState(userDetails?.username || "");
  const [email, setEmail] = useState(userDetails?.email || "");
  const [email2, setEmail2] = useState(userDetails?.email_2 || "");

  const [birthDate, setBirthDate] = useState(() => {
    const date = userDetails?.birth_date;
    if (date) {
      const [y, m, d] = date.split("-");
      return `${Number(d)}.${Number(m)}.${y}`;
    }
    return "";
  });

  const [height, setHeight] = useState(userDetails?.height || "");
  const [weight, setWeight] = useState(userDetails?.weight || "");
  const [side, setSide] = useState(userDetails?.side || "");
  const [number, setNumber] = useState(userDetails?.number || "");

  const [position, setPosition] = useState<number | null>(null);
  const [positionName, setPositionName] = useState<string>("");
  const [positions, setPositions] = useState<{ id: number; name: string }[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (userDetails?.position && typeof userDetails.position === "string") {
      setPositionName(userDetails.position);
    }
  }, [userDetails]);

  useEffect(() => {
    const fetchPositions = async () => {
      try {
        const res = await fetchWithAuth(`${BASE_URL}/positions/`);
        if (!res.ok) throw new Error("Nepodarilo sa načítať pozície");

        const data = await res.json();
        setPositions(data);
      } catch (e) {
        console.error("Nepodarilo sa načítať pozície", e);
      }
    };

    fetchPositions();
  }, [fetchWithAuth]);

  const handleSave = async () => {
    try {
      setSaving(true);

      let selectedPositionId = position;

      // Ak nebolo vybrané ID ale máme meno, pokúsime sa ho nájsť v zozname
      if (!selectedPositionId && positionName) {
        const found = positions.find((p) => p.name === positionName);
        if (found) selectedPositionId = found.id;
      }

      const payload = {
        username,
        email,
        email_2: email2,
        birth_date: formatDateToBackend(birthDate),
        height,
        weight,
        side,
        number,
        position: selectedPositionId,
      };

      const res = await fetchWithAuth(`${BASE_URL}/me/`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        const errorMsg = Object.entries(errData)
          .map(([field, msg]) => `${field}: ${Array.isArray(msg) ? msg.join(", ") : msg}`)
          .join("\n");

        throw new Error(errorMsg || "Nepodarilo sa uložiť údaje");
      }

      const refreshedRes = await fetchWithAuth(`${BASE_URL}/me/`);

      if (!refreshedRes.ok) {
        throw new Error("Nepodarilo sa načítať nové údaje");
      }

      const freshUserData = await refreshedRes.json();
      setUserDetails(freshUserData);

      Alert.alert("Úspech", "Údaje boli uložené");
      router.back();
    } catch (e: any) {
      Alert.alert("Chyba", e.message || "Skontroluj údaje alebo spojenie");
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.container}
        >
          <View style={styles.headerCard}>
            <View style={styles.headerTopRow}>
              <TouchableOpacity
                style={styles.backButton}
                activeOpacity={0.8}
                onPress={() => router.back()}
              >
                <Text style={styles.backButtonText}>‹</Text>
              </TouchableOpacity>

              <View style={styles.headerBadge}>
                <Text style={styles.headerBadgeText}>Profil</Text>
              </View>
            </View>

            <View style={styles.headerMainRow}>
              <View style={styles.headerIconBox}>
                <Text style={styles.headerIcon}>👤</Text>
              </View>

              <View style={styles.headerTextWrap}>
                <Text style={styles.headerTitle}>Úprava profilu</Text>
                <Text style={styles.headerSubtitle}>
                  Uprav svoje osobné údaje, kontakty a športový profil.
                </Text>
              </View>
            </View>

            <View style={styles.headerPillsRow}>
              <View style={styles.headerPill}>
                <Text style={styles.headerPillText}>Osobné údaje</Text>
              </View>

              <View style={styles.headerPill}>
                <Text style={styles.headerPillText}>Kontakty</Text>
              </View>

              <View style={styles.headerPill}>
                <Text style={styles.headerPillText}>Hráčsky profil</Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Prihlasovacie údaje</Text>

            <View style={styles.field}>
              <Text style={styles.label}>Používateľské meno</Text>
              <TextInput
                value={username}
                onChangeText={setuserName}
                style={styles.input}
                placeholder="Používateľské meno"
                placeholderTextColor={COLORS.placeholder}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                style={styles.input}
                keyboardType="email-address"
                placeholder="Email"
                placeholderTextColor={COLORS.placeholder}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.fieldLast}>
              <Text style={styles.label}>Alternatívny email</Text>
              <TextInput
                value={email2}
                onChangeText={setEmail2}
                style={styles.input}
                keyboardType="email-address"
                placeholder="Alternatívny email"
                placeholderTextColor={COLORS.placeholder}
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Osobné údaje</Text>

            <View style={styles.field}>
              <Text style={styles.label}>Dátum narodenia</Text>
              <TextInput
                value={birthDate}
                onChangeText={setBirthDate}
                style={styles.input}
                placeholder="napr. 5.5.2008"
                placeholderTextColor={COLORS.placeholder}
                keyboardType="numbers-and-punctuation"
              />
              <Text style={styles.helperText}>Formát: deň.mesiac.rok</Text>
            </View>

            <View style={styles.inlineFields}>
              <View style={styles.halfField}>
                <Text style={styles.label}>Výška</Text>
                <TextInput
                  value={height}
                  onChangeText={setHeight}
                  style={styles.input}
                  keyboardType="numeric"
                  placeholder="cm"
                  placeholderTextColor={COLORS.placeholder}
                />
              </View>

              <View style={styles.halfField}>
                <Text style={styles.label}>Váha</Text>
                <TextInput
                  value={weight}
                  onChangeText={setWeight}
                  style={styles.input}
                  keyboardType="numeric"
                  placeholder="kg"
                  placeholderTextColor={COLORS.placeholder}
                />
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Športový profil</Text>

            <View style={styles.field}>
              <Text style={styles.label}>Strana držania hokejky</Text>
              <TextInput
                value={side}
                onChangeText={setSide}
                style={styles.input}
                placeholder="ľavá / pravá"
                placeholderTextColor={COLORS.placeholder}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Číslo na drese</Text>
              <TextInput
                value={number}
                onChangeText={setNumber}
                style={styles.input}
                keyboardType="numeric"
                placeholder="napr. 27"
                placeholderTextColor={COLORS.placeholder}
              />
            </View>

            <View style={styles.fieldLast}>
              <Text style={styles.label}>Pozícia</Text>
              <TouchableOpacity
                style={styles.selectInput}
                activeOpacity={0.85}
                onPress={() => setModalVisible(true)}
              >
                <View>
                  <Text
                    style={[
                      styles.selectText,
                      !positionName && styles.selectPlaceholder,
                    ]}
                  >
                    {positionName || "Vyber pozíciu"}
                  </Text>

                  {positionName ? (
                    <Text style={styles.selectHelper}>Klikni pre zmenu pozície</Text>
                  ) : null}
                </View>

                <Text style={styles.selectArrow}>⌄</Text>
              </TouchableOpacity>
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

          <TouchableOpacity
            style={styles.cancelButton}
            activeOpacity={0.8}
            onPress={() => router.back()}
          >
            <Text style={styles.cancelButtonText}>Zrušiť</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHandle} />

            <Text style={styles.modalTitle}>Vyber pozíciu</Text>
            <Text style={styles.modalSubtitle}>
              Zvoľ pozíciu, ktorá sa uloží do tvojho profilu.
            </Text>

            <ScrollView
              style={styles.modalScroll}
              showsVerticalScrollIndicator={false}
            >
              {positions.length === 0 ? (
                <View style={styles.emptyPositionBox}>
                  <Text style={styles.emptyPositionText}>
                    Pozície sa nepodarilo načítať.
                  </Text>
                </View>
              ) : (
                positions.map((pos) => {
                  const isSelected = positionName === pos.name;

                  return (
                    <TouchableOpacity
                      key={pos.id}
                      style={[
                        styles.modalOption,
                        isSelected && styles.modalOptionSelected,
                      ]}
                      activeOpacity={0.85}
                      onPress={() => {
                        setPosition(pos.id);
                        setPositionName(pos.name);
                        setModalVisible(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.modalOptionText,
                          isSelected && styles.modalOptionTextSelected,
                        ]}
                      >
                        {pos.name}
                      </Text>

                      {isSelected && <Text style={styles.selectedCheck}>✓</Text>}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.modalCloseButton}
              activeOpacity={0.8}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.modalCloseText}>Zavrieť</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  placeholder: "#999999",

  border: "#E0E0E0",
  borderSoft: "#EFEFF3",

  primary: "#D32F2F",
  primaryDark: "#8C1919",
  primarySoft: "#FFF1F1",

  success: "#169C35",
  shadow: "#000000",
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  keyboardView: {
    flex: 1,
  },

  container: {
    padding: 18,
    paddingBottom: 36,
  },

  headerCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 28,
    padding: 18,
    marginBottom: 18,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    elevation: 6,
  },

  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },

  backButtonText: {
    color: COLORS.white,
    fontSize: 28,
    lineHeight: 28,
    fontWeight: "700",
    marginTop: -2,
  },

  headerBadge: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },

  headerBadgeText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.3,
  },

  headerMainRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },

  headerIconBox: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.13)",
  },

  headerIcon: {
    fontSize: 30,
  },

  headerTextWrap: {
    flex: 1,
  },

  headerTitle: {
    color: COLORS.white,
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -0.5,
    marginBottom: 4,
  },

  headerSubtitle: {
    color: "rgba(255,255,255,0.88)",
    fontSize: 13.5,
    lineHeight: 20,
    fontWeight: "500",
  },

  headerPillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  headerPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },

  headerPillText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "700",
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
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 14,
    letterSpacing: -0.2,
  },

  field: {
    marginBottom: 14,
  },

  fieldLast: {
    marginBottom: 0,
  },

  label: {
    color: COLORS.textSoft,
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 7,
    marginLeft: 2,
  },

  input: {
    minHeight: 50,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: COLORS.text,
    backgroundColor: COLORS.cardSoft,
    fontSize: 15,
    fontWeight: "600",
  },

  helperText: {
    color: COLORS.mutedLight,
    fontSize: 12,
    marginTop: 6,
    marginLeft: 2,
    fontWeight: "500",
  },

  inlineFields: {
    flexDirection: "row",
    gap: 10,
  },

  halfField: {
    flex: 1,
  },

  selectInput: {
    minHeight: 54,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: COLORS.cardSoft,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  selectText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "800",
  },

  selectPlaceholder: {
    color: COLORS.placeholder,
    fontWeight: "600",
  },

  selectHelper: {
    color: COLORS.mutedLight,
    fontSize: 12,
    marginTop: 3,
    fontWeight: "500",
  },

  selectArrow: {
    color: COLORS.primary,
    fontSize: 24,
    fontWeight: "800",
    marginLeft: 12,
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

  cancelButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    marginTop: 6,
  },

  cancelButtonText: {
    color: COLORS.muted,
    fontSize: 15,
    fontWeight: "800",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.42)",
    alignItems: "center",
    justifyContent: "flex-end",
    padding: 14,
  },

  modalContainer: {
    width: "100%",
    maxHeight: "78%",
    backgroundColor: COLORS.white,
    borderRadius: 26,
    padding: 18,
    paddingBottom: 16,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: -6 },
    shadowRadius: 16,
    elevation: 8,
  },

  modalHandle: {
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#D8D8DE",
    alignSelf: "center",
    marginBottom: 16,
  },

  modalTitle: {
    color: COLORS.text,
    fontSize: 21,
    fontWeight: "900",
    letterSpacing: -0.3,
  },

  modalSubtitle: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 5,
    marginBottom: 14,
  },

  modalScroll: {
    maxHeight: 360,
  },

  modalOption: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    backgroundColor: COLORS.cardSoft,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 9,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  modalOptionSelected: {
    backgroundColor: COLORS.primarySoft,
    borderColor: COLORS.primary,
  },

  modalOptionText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "800",
  },

  modalOptionTextSelected: {
    color: COLORS.primaryDark,
  },

  selectedCheck: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: "900",
  },

  emptyPositionBox: {
    backgroundColor: COLORS.cardSoft,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
  },

  emptyPositionText: {
    color: COLORS.muted,
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },

  modalCloseButton: {
    marginTop: 8,
    minHeight: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F1F1",
  },

  modalCloseText: {
    color: COLORS.textSoft,
    fontSize: 15,
    fontWeight: "900",
  },
});