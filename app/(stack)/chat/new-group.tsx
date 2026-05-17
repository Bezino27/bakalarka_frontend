import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { COLORS } from "@/constants/Colors";
import { AuthContext } from "@/context/AuthContext";
import {
  ChatUser,
  createGroupConversation,
  getChatUsers,
} from "@/hooks/chatApi";
import { useFetchWithAuth } from "@/hooks/fetchWithAuth";

export default function NewGroupChatScreen() {
  const { fetchWithAuth } = useFetchWithAuth();
  const { userRoles, currentRole } = useContext(AuthContext);
  const insets = useSafeAreaInsets();

  const [users, setUsers] = useState<ChatUser[]>([]);
  const [search, setSearch] = useState("");
  const [groupName, setGroupName] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const latestRequestIdRef = useRef(0);
  const rolesReady = userRoles.length > 0 || Boolean(currentRole);
  const canCreateGroups =
    currentRole?.role?.toLowerCase() === "coach" ||
    userRoles.some((role) => role.role?.toLowerCase() === "coach");
  const bottomPadding = Math.max(insets.bottom + 12, 20);

  const loadUsers = useCallback(
    async (query = "") => {
      const requestId = latestRequestIdRef.current + 1;
      latestRequestIdRef.current = requestId;

      try {
        setLoading(true);

        const data = await getChatUsers(fetchWithAuth, query);
        if (requestId !== latestRequestIdRef.current) return;
        setUsers(data);
      } catch (error) {
        if (requestId !== latestRequestIdRef.current) return;
        console.log("GROUP_CHAT_USERS_ERROR:", error);
        Alert.alert(
          "Chyba",
          error instanceof Error
            ? error.message
            : "Nepodarilo sa načítať používateľov."
        );
      } finally {
        if (requestId === latestRequestIdRef.current) {
          setLoading(false);
        }
      }
    },
    [fetchWithAuth]
  );

  useEffect(() => {
    if (!rolesReady || !canCreateGroups) return;

    const timer = setTimeout(() => {
      loadUsers(search);
    }, 350);

    return () => clearTimeout(timer);
  }, [search, loadUsers, rolesReady, canCreateGroups]);

  useEffect(() => {
    if (!rolesReady || canCreateGroups) return;

    Alert.alert("Bez oprávnenia", "Skupinový chat môže vytvoriť iba tréner.", [
      { text: "OK", onPress: () => router.back() },
    ]);
  }, [rolesReady, canCreateGroups]);

  const selectedUsers = useMemo(() => {
    return users.filter((user) => selectedIds.includes(user.id));
  }, [users, selectedIds]);

  const toggleSelected = (userId: number) => {
    setSelectedIds((prev) => {
      if (prev.includes(userId)) {
        return prev.filter((id) => id !== userId);
      }

      return [...prev, userId];
    });
  };

  const createGroup = async () => {
    if (!canCreateGroups) {
      Alert.alert("Bez oprávnenia", "Skupinový chat môže vytvoriť iba tréner.");
      return;
    }

    if (!groupName.trim()) {
      Alert.alert("Chýba názov", "Zadaj názov skupiny.");
      return;
    }

    if (selectedIds.length === 0) {
      Alert.alert("Vyber členov", "Vyber aspoň jedného člena skupiny.");
      return;
    }

    try {
      setCreating(true);

      const conversation = await createGroupConversation(
        fetchWithAuth,
        groupName.trim(),
        selectedIds
      );

      router.replace({
        pathname: "/(stack)/chat/[conversationId]",
        params: {
          conversationId: String(conversation.id),
          name: encodeURIComponent(conversation.title || groupName.trim()),
        },
      } as any);
    } catch (error) {
      console.log("CREATE_GROUP_CHAT_ERROR:", error);
      Alert.alert(
        "Chyba",
        error instanceof Error
          ? error.message
          : "Nepodarilo sa vytvoriť skupinu."
      );
    } finally {
      setCreating(false);
    }
  };

  const renderUser = ({ item }: { item: ChatUser }) => {
    const selected = selectedIds.includes(item.id);

    const initials = (item.full_name || item.username || "U")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("");

    return (
      <TouchableOpacity
        style={[styles.userCard, selected && styles.userCardSelected]}
        activeOpacity={0.85}
        onPress={() => toggleSelected(item.id)}
      >
        <View style={[styles.avatar, selected && styles.avatarSelected]}>
          <Text style={[styles.avatarText, selected && styles.avatarTextSelected]}>
            {initials || "U"}
          </Text>
        </View>

        <View style={styles.userInfo}>
          <Text style={styles.userName} numberOfLines={1}>
            {item.full_name || item.username}
          </Text>

          <Text style={styles.userMeta} numberOfLines={1}>
            {item.number ? `#${item.number} · ` : ""}
            @{item.username}
          </Text>
        </View>

        <View style={[styles.checkCircle, selected && styles.checkCircleSelected]}>
          {selected && <Ionicons name="checkmark" size={16} color={COLORS.white} />}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.background}>
        <View style={[styles.container, { paddingBottom: bottomPadding }]}>
          <View style={styles.groupNameWrap}>
            <Ionicons name="people" size={18} color={COLORS.primary} />
            <TextInput
              value={groupName}
              onChangeText={setGroupName}
              placeholder="Názov skupiny"
              placeholderTextColor={COLORS.textMuted}
              style={styles.groupNameInput}
            />
          </View>

          <View style={styles.searchWrap}>
            <Ionicons name="search" size={18} color={COLORS.textMuted} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Hľadať členov..."
              placeholderTextColor={COLORS.textMuted}
              style={styles.searchInput}
              autoCapitalize="none"
              autoCorrect={false}
            />

            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch("")}>
                <Ionicons name="close-circle" size={20} color={COLORS.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.sectionTitle}>Členovia skupiny</Text>
            <Text style={styles.selectedCount}>
              Vybraní: {selectedIds.length}
            </Text>
          </View>

          {selectedUsers.length > 0 && (
            <View style={styles.selectedPreview}>
              <Text style={styles.selectedPreviewText} numberOfLines={1}>
                {selectedUsers.map((user) => user.full_name || user.username).join(", ")}
              </Text>
            </View>
          )}

          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>Načítavam používateľov...</Text>
            </View>
          ) : (
            <FlatList
              data={users}
              keyExtractor={(item) => String(item.id)}
              renderItem={renderUser}
              contentContainerStyle={[styles.listContent, { paddingBottom: 18 + bottomPadding }]}
              showsVerticalScrollIndicator={false}
            />
          )}

          <TouchableOpacity
            style={[
              styles.createButton,
              (!groupName.trim() || selectedIds.length === 0 || creating) &&
                styles.createButtonDisabled,
            ]}
            activeOpacity={0.85}
            onPress={createGroup}
            disabled={!groupName.trim() || selectedIds.length === 0 || creating}
          >
            {creating ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color={COLORS.white} />
                <Text style={styles.createButtonText}>Vytvoriť skupinu</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  container: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 18,
  },

  groupNameWrap: {
    minHeight: 52,
    borderRadius: 18,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },

  groupNameInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "800",
  },

  searchWrap: {
    minHeight: 50,
    borderRadius: 18,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },

  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "600",
  },

  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: COLORS.text,
  },

  selectedCount: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.primary,
  },

  selectedPreview: {
    backgroundColor: COLORS.primarySoft,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 10,
  },

  selectedPreviewText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: "800",
  },

  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    marginTop: 12,
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: "600",
  },

  listContent: {
    paddingBottom: 18,
  },

  userCard: {
    minHeight: 72,
    borderRadius: 22,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
  },

  userCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primarySoft,
  },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 17,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  avatarSelected: {
    backgroundColor: COLORS.primary,
  },

  avatarText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: "900",
  },

  avatarTextSelected: {
    color: COLORS.white,
  },

  userInfo: {
    flex: 1,
    minWidth: 0,
  },

  userName: {
    fontSize: 15,
    fontWeight: "900",
    color: COLORS.text,
  },

  userMeta: {
    marginTop: 4,
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: "600",
  },

  checkCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },

  checkCircleSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },

  createButton: {
    minHeight: 52,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },

  createButtonDisabled: {
    opacity: 0.45,
  },

  createButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "900",
  },
});
