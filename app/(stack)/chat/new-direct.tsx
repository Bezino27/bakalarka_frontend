import React, { useCallback, useEffect, useRef, useState } from "react";
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
import {
  ChatUser,
  createDirectConversation,
  getChatUsers,
} from "@/hooks/chatApi";
import { useFetchWithAuth } from "@/hooks/fetchWithAuth";

export default function NewDirectChatScreen() {
  const { fetchWithAuth } = useFetchWithAuth();
  const insets = useSafeAreaInsets();

  const [users, setUsers] = useState<ChatUser[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [creatingUserId, setCreatingUserId] = useState<number | null>(null);
  const latestRequestIdRef = useRef(0);
  const bottomPadding = Math.max(insets.bottom + 12, 24);

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
        console.log("CHAT_USERS_ERROR:", error);
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
    const timer = setTimeout(() => {
      loadUsers(search);
    }, 350);

    return () => clearTimeout(timer);
  }, [search, loadUsers]);

  const openDirectChat = async (user: ChatUser) => {
    try {
      setCreatingUserId(user.id);

      const conversation = await createDirectConversation(fetchWithAuth, user.id);

      router.replace({
        pathname: "/(stack)/chat/[conversationId]",
        params: {
          conversationId: String(conversation.id),
          name: encodeURIComponent(conversation.title || user.full_name || "Chat"),
        },
      } as any);
    } catch (error) {
      console.log("CREATE_DIRECT_CHAT_ERROR:", error);
      Alert.alert(
        "Chyba",
        error instanceof Error
          ? error.message
          : "Nepodarilo sa vytvoriť chat."
      );
    } finally {
      setCreatingUserId(null);
    }
  };

  const renderUser = ({ item }: { item: ChatUser }) => {
    const initials = (item.full_name || item.username || "U")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("");

    const creating = creatingUserId === item.id;

    return (
      <TouchableOpacity
        style={styles.userCard}
        activeOpacity={0.85}
        onPress={() => openDirectChat(item)}
        disabled={creatingUserId !== null}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials || "U"}</Text>
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

        {creating ? (
          <ActivityIndicator size="small" color={COLORS.primary} />
        ) : (
          <Ionicons name="chevron-forward" size={22} color={COLORS.textMuted} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.background}>
        <View style={[styles.container, { paddingBottom: bottomPadding }]}>
          <View style={styles.searchWrap}>
            <Ionicons name="search" size={18} color={COLORS.textMuted} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Hľadať používateľa..."
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

          <Text style={styles.sectionTitle}>Vyber používateľa</Text>

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
              contentContainerStyle={[
                styles.listContent,
                { paddingBottom: 28 + bottomPadding },
                users.length === 0 && styles.emptyContent,
              ]}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyWrap}>
                  <Ionicons
                    name="people-outline"
                    size={42}
                    color={COLORS.primary}
                  />
                  <Text style={styles.emptyTitle}>Nikto sa nenašiel</Text>
                  <Text style={styles.emptyText}>
                    Skús zmeniť vyhľadávanie alebo skontroluj používateľov v klube.
                  </Text>
                </View>
              }
            />
          )}
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
    marginBottom: 18,
  },

  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "600",
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: COLORS.text,
    marginBottom: 12,
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
    paddingBottom: 28,
  },

  emptyContent: {
    flexGrow: 1,
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

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 17,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  avatarText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: "900",
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

  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },

  emptyTitle: {
    marginTop: 14,
    fontSize: 19,
    fontWeight: "900",
    color: COLORS.text,
  },

  emptyText: {
    marginTop: 8,
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: "center",
    lineHeight: 21,
  },
});
