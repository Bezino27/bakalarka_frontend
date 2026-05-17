import React, { useCallback, useContext, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { COLORS } from "@/constants/Colors";
import { AuthContext } from "@/context/AuthContext";
import { ChatConversation, getConversations } from "@/hooks/chatApi";
import { useFetchWithAuth } from "@/hooks/fetchWithAuth";

export default function ChatUsersScreen() {
  const { fetchWithAuth } = useFetchWithAuth();
  const { userRoles, currentRole } = useContext(AuthContext);
  const insets = useSafeAreaInsets();

  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const isLoadingConversationsRef = useRef(false);
  const canCreateGroups =
    currentRole?.role?.toLowerCase() === "coach" ||
    userRoles.some((role) => role.role?.toLowerCase() === "coach");
  const bottomPadding = Math.max(insets.bottom + 12, 24);

  const loadConversations = useCallback(
    async (showLoader = true) => {
      if (isLoadingConversationsRef.current) return;

      try {
        isLoadingConversationsRef.current = true;
        if (showLoader) setLoading(true);

        const data = await getConversations(fetchWithAuth);
        setConversations(data);
      } catch (error) {
        console.log("CHAT_CONVERSATIONS_ERROR:", error);
        Alert.alert(
          "Chyba",
          error instanceof Error
            ? error.message
            : "Nepodarilo sa načítať konverzácie."
        );
      } finally {
        isLoadingConversationsRef.current = false;
        setLoading(false);
        setRefreshing(false);
      }
    },
    [fetchWithAuth]
  );

  useFocusEffect(
    useCallback(() => {
      loadConversations(true);
    }, [loadConversations])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadConversations(false);
  };

  const openConversation = (conversation: ChatConversation) => {
    router.push({
      pathname: "/(stack)/chat/[conversationId]",
      params: {
        conversationId: String(conversation.id),
        name: encodeURIComponent(conversation.title || "Chat"),
      },
    } as any);
  };

  const goToNewDirect = () => {
    router.push("/(stack)/chat/new-direct" as any);
  };

  const goToNewGroup = () => {
    if (!canCreateGroups) {
      Alert.alert("Bez oprávnenia", "Skupinový chat môže vytvoriť iba tréner.");
      return;
    }

    router.push("/(stack)/chat/new-group" as any);
  };

  const formatTime = (value?: string | null) => {
    if (!value) return "";

    const date = new Date(value);
    const now = new Date();

    const isToday = date.toDateString() === now.toDateString();

    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    if (isToday) {
      return date.toLocaleTimeString("sk-SK", {
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    if (isYesterday) {
      return "Včera";
    }

    return date.toLocaleDateString("sk-SK", {
      day: "numeric",
      month: "numeric",
    });
  };

  const getLastMessageText = (conversation: ChatConversation) => {
    const last = conversation.last_message;

    if (!last) return "Zatiaľ žiadne správy";
    if (last.deleted_at) return "Správa bola odstránená";

    const prefix = conversation.type === "group" ? `${last.sender_name}: ` : "";
    return `${prefix}${last.text}`;
  };

  const renderConversation = ({ item }: { item: ChatConversation }) => {
    const hasUnread = item.unread_count > 0;

    const initials = (item.title || "CH")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("");

    return (
      <TouchableOpacity
        style={[
          styles.conversationCard,
          hasUnread && styles.conversationCardUnread,
        ]}
        activeOpacity={0.85}
        onPress={() => openConversation(item)}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials || "CH"}</Text>

          {item.type === "group" && (
            <View style={styles.groupBadge}>
              <Ionicons name="people" size={12} color={COLORS.white} />
            </View>
          )}
        </View>

        <View style={styles.conversationContent}>
          <View style={styles.conversationTopRow}>
            <Text
              style={[
                styles.conversationTitle,
                hasUnread && styles.conversationTitleUnread,
              ]}
              numberOfLines={1}
            >
              {item.title}
            </Text>

            <Text style={styles.conversationTime}>
              {formatTime(item.last_message?.created_at || item.updated_at)}
            </Text>
          </View>

          <View style={styles.conversationBottomRow}>
            <Text
              style={[
                styles.lastMessage,
                hasUnread && styles.lastMessageUnread,
              ]}
              numberOfLines={1}
            >
              {getLastMessageText(item)}
            </Text>

            {hasUnread && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>
                  {item.unread_count > 99 ? "99+" : item.unread_count}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => {
    if (loading) return null;

    return (
      <View style={styles.emptyWrap}>
        <View style={styles.emptyIcon}>
          <Ionicons
            name="chatbubble-ellipses-outline"
            size={38}
            color={COLORS.primary}
          />
        </View>

        <Text style={styles.emptyTitle}>Zatiaľ nemáš žiadne správy</Text>

        <Text style={styles.emptyText}>
          Začni nový chat s trénerom alebo hráčom.
        </Text>

        <TouchableOpacity
          style={styles.emptyButton}
          activeOpacity={0.85}
          onPress={goToNewDirect}
        >
          <Ionicons name="add" size={20} color={COLORS.white} />
          <Text style={styles.emptyButtonText}>Začať nový chat</Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Načítavam správy...</Text>
      </View>
    );
  }

  return (
    <View style={styles.background}>
      <View style={[styles.overlay, { paddingBottom: bottomPadding }]}>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.primaryAction}
            activeOpacity={0.85}
            onPress={goToNewDirect}
          >
            <Ionicons name="person-add-outline" size={18} color={COLORS.white} />
            <Text style={styles.primaryActionText}>Nový chat</Text>
          </TouchableOpacity>

          {canCreateGroups && (
            <TouchableOpacity
              style={styles.secondaryAction}
              activeOpacity={0.85}
              onPress={goToNewGroup}
            >
              <Ionicons name="people-outline" size={18} color={COLORS.primary} />
              <Text style={styles.secondaryActionText}>Skupina</Text>
            </TouchableOpacity>
          )}
        </View>

        <FlatList
          data={conversations}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderConversation}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: 28 + bottomPadding },
            conversations.length === 0 && styles.listContentEmpty,
          ]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
            />
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  overlay: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 18,
  },

  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.background,
  },

  loadingText: {
    marginTop: 12,
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: "600",
  },

  headerSection: {
    marginBottom: 14,
  },

  pageTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: COLORS.text,
    letterSpacing: -0.5,
  },

  pageSubtitle: {
    marginTop: 5,
    fontSize: 14,
    color: COLORS.textMuted,
    lineHeight: 20,
  },

  actionsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },

  primaryAction: {
    flex: 1,
    minHeight: 48,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 4,
  },

  primaryActionText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: "800",
  },

  secondaryAction: {
    flex: 1,
    minHeight: 48,
    borderRadius: 18,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },

  secondaryActionText: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: "800",
  },

  listContent: {
    paddingBottom: 28,
  },

  listContentEmpty: {
    flexGrow: 1,
  },

  conversationCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.cardSoft,
    borderRadius: 22,
    padding: 13,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },

  conversationCardUnread: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.card,
  },

  avatar: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    position: "relative",
  },

  avatarText: {
    color: COLORS.primary,
    fontSize: 17,
    fontWeight: "900",
  },

  groupBadge: {
    position: "absolute",
    right: -3,
    bottom: -3,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: COLORS.card,
  },

  conversationContent: {
    flex: 1,
    minWidth: 0,
  },

  conversationTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },

  conversationTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
  },

  conversationTitleUnread: {
    fontWeight: "900",
  },

  conversationTime: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: "600",
  },

  conversationBottomRow: {
    marginTop: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  lastMessage: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 18,
  },

  lastMessageUnread: {
    color: COLORS.text,
    fontWeight: "700",
  },

  unreadBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 7,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  unreadText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: "900",
  },

  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },

  emptyIcon: {
    width: 74,
    height: 74,
    borderRadius: 26,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },

  emptyTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: COLORS.text,
    textAlign: "center",
  },

  emptyText: {
    marginTop: 8,
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: "center",
    lineHeight: 21,
  },

  emptyButton: {
    marginTop: 20,
    minHeight: 48,
    borderRadius: 18,
    paddingHorizontal: 18,
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  emptyButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: "800",
  },
});
