import React, { useContext, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from "react-native";
import { AuthContext } from "@/context/AuthContext";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/constants/Colors";

export default function ProfileScreen() {
  const {
    isLoggedIn,
    userClub,
    userDetails,
  } = useContext(AuthContext);

  const router = useRouter();

  useEffect(() => {
    if (isLoggedIn === false) {
      router.replace("/login");
    }
  }, [isLoggedIn, router]);

  if (isLoggedIn !== true) {
    return (
      <View style={styles.centered}>
        <View style={styles.loadingBadge}>
          <Ionicons
            name="person-circle-outline"
            size={34}
            color={COLORS.primary}
          />
        </View>
        <Text style={styles.loadingText}>Overujem prihlásenie...</Text>
      </View>
    );
  }

  const rawPosition = userDetails?.position as
    | string
    | { id: number; name: string }
    | null
    | undefined;

  const positionName =
    typeof rawPosition === "string"
      ? rawPosition
      : rawPosition?.name;

  const fullName =
    userDetails?.name?.trim() ||
    userDetails?.username ||
    "Hráč";

  const initials = getInitials(fullName);

  return (
    <SafeAreaView style={styles.safeArea} edges={["left", "right", "bottom"]}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>

          <View style={styles.heroInfo}>
            <Text style={styles.welcomeText}>Môj profil</Text>
            <Text style={styles.nameText} numberOfLines={1}>
              {fullName}
            </Text>

            <View style={styles.clubPill}>
              <Ionicons
                name="shield-checkmark-outline"
                size={15}
                color={COLORS.primary}
              />
              <Text style={styles.clubPillText} numberOfLines={1}>
                {userClub?.name || "Bez klubu"}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.quickInfoGrid}>
          <InfoBox
            icon="shirt-outline"
            label="Číslo"
            value={userDetails?.number || "—"}
          />

          <InfoBox
            icon="body-outline"
            label="Pozícia"
            value={positionName || "—"}
          />
        </View>

        <ProfileSection title="Osobné údaje" icon="person-outline">
          <ProfileRow label="Používateľské meno" value={userDetails?.username} />
          <ProfileRow label="Email" value={userDetails?.email} />
          <ProfileRow label="Alternatívny email" value={userDetails?.email_2} />
          <ProfileRow
            label="Dátum narodenia"
            value={formatDate(userDetails?.birth_date)}
          />
        </ProfileSection>

        <ProfileSection title="Hráčske údaje" icon="fitness-outline">
          <ProfileRow
            label="Výška"
            value={formatUnit(userDetails?.height, "cm")}
          />
          <ProfileRow
            label="Váha"
            value={formatUnit(userDetails?.weight, "kg")}
          />
          <ProfileRow label="Strana hokejky" value={userDetails?.side} />
          <ProfileRow label="Pozícia" value={positionName} />
          <ProfileRow label="Číslo na drese" value={userDetails?.number} />
        </ProfileSection>

        <ProfileSection title="Klub" icon="business-outline">
          <ProfileRow label="Názov klubu" value={userClub?.name} />
        </ProfileSection>
      </ScrollView>
    </SafeAreaView>
  );
}

function ProfileSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIcon}>
          <Ionicons name={icon} size={18} color={COLORS.primary} />
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>

      <View style={styles.card}>{children}</View>
    </View>
  );
}

function ProfileRow({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value} numberOfLines={2}>
        {String(value)}
      </Text>
    </View>
  );
}

function InfoBox({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string | number;
}) {
  return (
    <View style={styles.infoBox}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={20} color={COLORS.primary} />
      </View>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={1}>
        {String(value)}
      </Text>
    </View>
  );
}

function getInitials(name: string) {
  const parts = name
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) return "H";

  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function formatUnit(value?: string | number | null, unit?: string) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const text = String(value);

  if (!unit) return text;
  if (text.toLowerCase().includes(unit.toLowerCase())) return text;

  return `${text} ${unit}`;
}

function formatDate(value?: string | null) {
  if (!value) return undefined;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("sk-SK", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  });
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  container: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 34,
  },

  heroCard: {
    backgroundColor: COLORS.card,
    borderRadius: 26,
    padding: 18,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },

  avatar: {
    width: 74,
    height: 74,
    borderRadius: 26,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  avatarText: {
    fontSize: 25,
    fontWeight: "900",
    color: COLORS.primary,
  },

  heroInfo: {
    flex: 1,
    minWidth: 0,
  },

  welcomeText: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.textMuted,
    marginBottom: 4,
  },

  nameText: {
    fontSize: 23,
    fontWeight: "900",
    color: COLORS.text,
    letterSpacing: -0.4,
  },

  clubPill: {
    marginTop: 10,
    alignSelf: "flex-start",
    maxWidth: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.primarySoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  clubPillText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: "900",
    maxWidth: 180,
  },

  quickInfoGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 18,
  },

  infoBox: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },

  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 14,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },

  infoLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: "800",
    marginBottom: 4,
  },

  infoValue: {
    fontSize: 17,
    color: COLORS.text,
    fontWeight: "900",
  },

  section: {
    marginBottom: 18,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 9,
    paddingHorizontal: 2,
  },

  sectionIcon: {
    width: 34,
    height: 34,
    borderRadius: 13,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: COLORS.text,
  },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: 22,
    paddingHorizontal: 15,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomColor: COLORS.border,
    borderBottomWidth: 1,
    paddingVertical: 13,
    gap: 14,
  },

  label: {
    color: COLORS.textMuted,
    fontWeight: "800",
    fontSize: 14,
    flex: 1,
  },

  value: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "800",
    flex: 1.25,
    textAlign: "right",
    lineHeight: 19,
  },

  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },

  loadingBadge: {
    width: 66,
    height: 66,
    borderRadius: 24,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },

  loadingText: {
    fontSize: 16,
    color: COLORS.textMuted,
    fontWeight: "700",
  },
});