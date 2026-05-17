import React, { useState } from "react";
import {
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  View,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { BASE_URL } from "@/hooks/api";
import { useFetchWithAuth } from "@/hooks/fetchWithAuth";

export default function ChangePasswordScreen() {
  const router = useRouter();
  const { fetchWithAuth } = useFetchWithAuth();

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      Alert.alert("Chyba", "Vyplň všetky polia.");
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Chyba", "Nové heslá sa nezhodujú.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetchWithAuth(`${BASE_URL}/change-password/`, {
        method: "POST",
        body: JSON.stringify({
          old_password: oldPassword,
          new_password: newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        Alert.alert("Chyba", data.detail || "Nepodarilo sa zmeniť heslo.");
        return;
      }

      Alert.alert("✅ Úspech", data.detail || "Heslo bolo zmenené.");
      router.back();
    } catch (error) {
      console.error(error);
      Alert.alert("Chyba", "Skús to znova neskôr.");
    } finally {
      setLoading(false);
    }
  };

  const passwordMatch =
    newPassword.length > 0 &&
    confirmPassword.length > 0 &&
    newPassword === confirmPassword;

  const passwordMismatch =
    newPassword.length > 0 &&
    confirmPassword.length > 0 &&
    newPassword !== confirmPassword;

  return (
    <SafeAreaView style={styles.safeArea} edges={["left", "right", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Prihlasovacie údaje</Text>
            <Text style={styles.sectionDescription}>
              Pre zmenu hesla musíš najprv zadať aktuálne heslo a následne nové heslo.
            </Text>

            <View style={styles.field}>
              <Text style={styles.label}>Aktuálne heslo</Text>
              <TextInput
                style={styles.input}
                secureTextEntry={!showPassword}
                placeholder="Staré heslo"
                placeholderTextColor={COLORS.placeholder}
                value={oldPassword}
                onChangeText={setOldPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Nové heslo</Text>
              <TextInput
                style={styles.input}
                secureTextEntry={!showPassword}
                placeholder="Nové heslo"
                placeholderTextColor={COLORS.placeholder}
                value={newPassword}
                onChangeText={setNewPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.fieldLast}>
              <Text style={styles.label}>Zopakuj nové heslo</Text>
              <TextInput
                style={[
                  styles.input,
                  passwordMatch && styles.inputSuccess,
                  passwordMismatch && styles.inputError,
                ]}
                secureTextEntry={!showPassword}
                placeholder="Zopakuj nové heslo"
                placeholderTextColor={COLORS.placeholder}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />

              {passwordMatch && (
                <Text style={styles.successText}>Heslá sa zhodujú.</Text>
              )}

              {passwordMismatch && (
                <Text style={styles.errorText}>Heslá sa nezhodujú.</Text>
              )}
            </View>
          </View>

          <View style={styles.infoCard}>
            <View style={styles.infoIconBox}>
              <Text style={styles.infoIcon}>ℹ️</Text>
            </View>

            <View style={styles.infoTextBox}>
              <Text style={styles.infoTitle}>Odporúčanie</Text>
              <Text style={styles.infoText}>
                Použi heslo, ktoré má aspoň 8 znakov a obsahuje číslo. Nepoužívaj rovnaké heslo ako v iných aplikáciách.
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => setShowPassword((prev) => !prev)}
            style={styles.toggleButton}
            activeOpacity={0.85}
          >
            <Text style={styles.toggleIcon}>{showPassword ? "🙈" : "👁️"}</Text>
            <Text style={styles.toggleText}>
              {showPassword ? "Skryť heslá" : "Zobraziť heslá"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleChangePassword}
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            disabled={loading}
            activeOpacity={0.9}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.submitButtonIcon}>✓</Text>
                <Text style={styles.submitButtonText}>Zmeniť heslo</Text>
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
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 5,
    letterSpacing: -0.2,
  },

  sectionDescription: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 16,
    fontWeight: "500",
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
    minHeight: 52,
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

  inputSuccess: {
    borderColor: COLORS.success,
    backgroundColor: COLORS.successSoft,
  },

  inputError: {
    borderColor: COLORS.danger,
    backgroundColor: COLORS.dangerSoft,
  },

  successText: {
    color: COLORS.success,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 6,
    marginLeft: 2,
  },

  errorText: {
    color: COLORS.danger,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 6,
    marginLeft: 2,
  },

  infoCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 15,
    marginBottom: 14,
    flexDirection: "row",
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 1,
  },

  infoIconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  infoIcon: {
    fontSize: 19,
  },

  infoTextBox: {
    flex: 1,
  },

  infoTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 3,
  },

  infoText: {
    color: COLORS.muted,
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: "500",
  },

  toggleButton: {
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 1,
  },

  toggleIcon: {
    fontSize: 18,
    marginRight: 8,
  },

  toggleText: {
    color: COLORS.primary,
    fontWeight: "900",
    fontSize: 14,
  },

  submitButton: {
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

  submitButtonDisabled: {
    opacity: 0.75,
  },

  submitButtonIcon: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: "900",
    marginRight: 8,
  },

  submitButtonText: {
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
});