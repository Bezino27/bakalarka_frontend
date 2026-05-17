import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  DeviceEventEmitter,
  RefreshControl,
} from "react-native";
import { useFetchWithAuth } from "@/hooks/fetchWithAuth";
import { BASE_URL } from "@/hooks/api";
import { useFocusEffect } from "@react-navigation/native";
import { COLORS } from "@/constants/Colors";

type Announcement = {
  id: number;
  title: string;
  content: string;
  created_by: number;
  created_by_name: string;
  club: number;
  category: number | null;
  date_created: string;
  read_at: string | null;
};

export default function AnnouncementsScreen() {
  const { fetchWithAuth } = useFetchWithAuth();

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [selected, setSelected] = useState<Announcement | null>(null);
  const isFetchingAnnouncementsRef = useRef(false);
  const lastAnnouncementsFetchRef = useRef(0);
  const markingReadIdsRef = useRef<Set<number>>(new Set());

  const fetchAnnouncements = useCallback(async (force = false) => {
    const now = Date.now();

    if (isFetchingAnnouncementsRef.current) return;

    if (!force && now - lastAnnouncementsFetchRef.current < 15000) {
      return;
    }

    isFetchingAnnouncementsRef.current = true;
    lastAnnouncementsFetchRef.current = now;

    try {
      if (force) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const res = await fetchWithAuth(`${BASE_URL}/announcements/`);

      if (!res.ok) {
        console.log("Announcements fetch failed:", res.status);
        return;
      }

      const data: Announcement[] = await res.json();

      const sorted = [...data].sort(
        (a, b) =>
          new Date(b.date_created).getTime() -
          new Date(a.date_created).getTime()
      );

      setAnnouncements(sorted);
    } catch (err) {
      console.log("Announcements fetch error:", err);
    } finally {
      isFetchingAnnouncementsRef.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  }, [fetchWithAuth]);

  const markRead = async (id: number) => {
    if (markingReadIdsRef.current.has(id)) return;

    const target = announcements.find((announcement) => announcement.id === id);
    if (target?.read_at) return;

    markingReadIdsRef.current.add(id);

    try {
      const response = await fetchWithAuth(`${BASE_URL}/announcements/${id}/read/`, {
        method: "POST",
      });

      if (!response.ok) {
        console.log("Announcement mark as read failed:", response.status);
        return;
      }

      const now = new Date().toISOString();

      setAnnouncements((prev) =>
        prev.map((announcement) =>
          announcement.id === id
            ? { ...announcement, read_at: now }
            : announcement
        )
      );

      setSelected((prev) =>
        prev && prev.id === id ? { ...prev, read_at: now } : prev
      );

      DeviceEventEmitter.emit("refreshAnnouncements");
    } catch (err) {
      console.log("Announcement mark as read error:", err);
    } finally {
      markingReadIdsRef.current.delete(id);
    }
  };

  useEffect(() => {
    void fetchAnnouncements();
  }, [fetchAnnouncements]);

  useFocusEffect(
    useCallback(() => {
      void fetchAnnouncements();
    }, [fetchAnnouncements])
  );

  const openAnnouncement = (item: Announcement) => {
    setSelected(item);

    if (!item.read_at) {
      void markRead(item.id);
    }
  };

  const renderItem = ({ item }: { item: Announcement }) => {
    const isRead = Boolean(item.read_at);

    return (
      <TouchableOpacity
        style={[styles.card, !isRead && styles.unreadCard]}
        activeOpacity={0.88}
        onPress={() => openAnnouncement(item)}
      >
        <View style={styles.cardTopRow}>
          <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
            {item.title}
          </Text>

          {!isRead && <View style={styles.unreadDot} />}
        </View>

        <Text style={styles.meta}>
          {item.created_by_name} •{" "}
          {new Date(item.date_created).toLocaleString("sk-SK")}
        </Text>

        {isRead ? (
          <Text style={styles.preview} numberOfLines={2} ellipsizeMode="tail">
            {item.content}
          </Text>
        ) : (
          <Text style={styles.unreadPreview}>📩 Neotvorený oznam</Text>
        )}

        {item.read_at && (
          <Text style={styles.readMeta}>
            Prečítané: {new Date(item.read_at).toLocaleString("sk-SK")}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Načítavam oznamy...</Text>
      </View>
    );
  }

  if (selected) {
    return (
      <ScrollView
        style={styles.detailScreen}
        contentContainerStyle={styles.detailScreenContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void fetchAnnouncements(true)}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      >
        <View style={styles.detailCard}>
          <View style={styles.detailHeader}>
            <Text style={styles.detailTitle}>{selected.title}</Text>

            <Text style={styles.detailMeta}>
              {selected.created_by_name} •{" "}
              {new Date(selected.date_created).toLocaleString("sk-SK")}
            </Text>

            {selected.read_at && (
              <Text style={styles.detailRead}>
                Prečítané: {new Date(selected.read_at).toLocaleString("sk-SK")}
              </Text>
            )}
          </View>

          <Text style={styles.detailContent}>{selected.content}</Text>

          <TouchableOpacity
            onPress={() => setSelected(null)}
            style={styles.backButton}
            activeOpacity={0.88}
          >
            <Text style={styles.backButtonText}>Späť na zoznam</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <FlatList
      data={announcements}
      renderItem={renderItem}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={styles.listContent}
      style={styles.list}
      refreshing={refreshing}
      onRefresh={() => void fetchAnnouncements(true)}
      showsVerticalScrollIndicator={false}
      ListEmptyComponent={
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Žiadne oznamy</Text>
          <Text style={styles.emptyText}>
            Momentálne nemáš žiadne dostupné oznamy.
          </Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  listContent: {
    padding: 16,
    paddingBottom: 28,
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },

  loadingText: {
    marginTop: 10,
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: "600",
  },

  card: {
    backgroundColor: COLORS.card,
    padding: 16,
    marginBottom: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 2,
  },

  unreadCard: {
    borderLeftWidth: 5,
    borderLeftColor: COLORS.primary,
    backgroundColor: COLORS.primarySoft,
  },

  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  unreadDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },

  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 6,
    color: COLORS.text,
  },

  meta: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginBottom: 6,
    fontWeight: "600",
  },

  readMeta: {
    fontSize: 12,
    color: COLORS.success,
    marginTop: 7,
    fontStyle: "italic",
    fontWeight: "600",
  },

  preview: {
    fontSize: 15,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },

  unreadPreview: {
    fontSize: 14,
    color: COLORS.primary,
    fontStyle: "italic",
    marginTop: 4,
    fontWeight: "700",
  },

  emptyCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    marginTop: 20,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: COLORS.text,
    marginBottom: 6,
  },

  emptyText: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: "center",
    lineHeight: 20,
  },

  detailScreen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  detailScreenContent: {
    padding: 16,
    paddingBottom: 28,
  },

  detailCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },

  detailHeader: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 12,
    marginBottom: 14,
  },

  detailTitle: {
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 10,
    color: COLORS.text,
    lineHeight: 27,
  },

  detailMeta: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: 6,
    fontWeight: "600",
  },

  detailRead: {
    fontSize: 13,
    color: COLORS.success,
    fontStyle: "italic",
    fontWeight: "600",
  },

  detailContent: {
    fontSize: 16,
    lineHeight: 23,
    color: COLORS.textSecondary,
  },

  backButton: {
    marginTop: 24,
    padding: 14,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    alignItems: "center",
  },

  backButtonText: {
    color: COLORS.white,
    fontWeight: "900",
    fontSize: 16,
  },
});
