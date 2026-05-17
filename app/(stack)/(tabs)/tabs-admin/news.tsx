// app/admin/AnnouncementsAdminScreen.tsx
import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Alert,
} from "react-native";
import { useFetchWithAuth } from "@/hooks/fetchWithAuth";
import { BASE_URL } from "@/hooks/api";

type Announcement = {
  id: number;
  title: string;
  content: string;
  club: number;
  club_name: string;
  category: number | null;
  category_name?: string;
  date_created: string;
  created_by: number;
  created_by_name: string;
  read_count: number;
  total_count: number;
};

type Category = { id: number; name: string };

type Reader = { id: number; full_name: string; read_at: string | null };

export default function AnnouncementsAdminScreen() {
  const { fetchWithAuth } = useFetchWithAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Announcement | null>(null);
  const [showReaders, setShowReaders] = useState(false);

  // vytváranie
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // ciele
  const [targetWholeClub, setTargetWholeClub] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);

  // čitatelia
  const [readers, setReaders] = useState<Reader[]>([]);
  const [loadingReaders, setLoadingReaders] = useState(false);

  const fetchAnnouncements = useCallback(async () => {
    try {
      const res = await fetchWithAuth(`${BASE_URL}/announcements-admin/`);
      if (!res.ok) throw new Error("Nepodarilo sa načítať oznamy");
      const data = await res.json();
      setAnnouncements(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("❌ Chyba pri načítaní oznamov:", err);
      Alert.alert("Chyba", "Nepodarilo sa načítať oznamy");
    } finally {
      setLoading(false);
    }
  }, [fetchWithAuth]);
  // doplníme funkciu
  const deleteAnnouncement = async (id: number) => {
    Alert.alert(
      "Potvrdenie",
      "Naozaj chceš zmazať tento oznam?",
      [
        { text: "Zrušiť", style: "cancel" },
        {
          text: "Zmazať",
          style: "destructive",
          onPress: async () => {
            try {
              const res = await fetchWithAuth(`${BASE_URL}/announcements-delete/${id}/`, {
                method: "DELETE",
              });
              if (!res.ok) throw new Error("Nepodarilo sa zmazať oznam");
              Alert.alert("✅ Hotovo", "Oznam bol zmazaný.");
              setSelected(null);
              setShowReaders(false);
              void fetchAnnouncements();
            } catch (err) {
              console.error("❌ Chyba pri mazaní oznamu:", err);
              Alert.alert("Chyba", "Nepodarilo sa zmazať oznam.");
            }
          },
        },
      ]
    );
  };

  const fetchCategories = async () => {
    try {
      const res = await fetchWithAuth(`${BASE_URL}/categories-admin/`);
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (err) {
      console.error("❌ Chyba pri načítaní kategórií:", err);
    }
  };

  const fetchReaders = async (id: number) => {
    if (showReaders) {
      setShowReaders(false);
      return;
    }
    setLoadingReaders(true);
    try {
      const res = await fetchWithAuth(
        `${BASE_URL}/announcements-admin/${id}/readers/`
      ); // admin endpoint
      if (res.ok) {
        const data = await res.json();
        setReaders(data);
        setShowReaders(true);
      }
    } catch (err) {
      console.error("❌ Chyba pri načítaní čitateľov:", err);
    } finally {
      setLoadingReaders(false);
    }
  };

  const createAnnouncement = async () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert("Upozornenie", "Prosím vyplň názov a obsah oznamu");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetchWithAuth(`${BASE_URL}/announcements/create/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content,
          target: targetWholeClub ? "club" : "categories",
          categories: selectedCategories,
        }),
      });
      if (res.ok) {
        setTitle("");
        setContent("");
        setCreating(false);
        void fetchAnnouncements();
      } else {
        const errorText = await res.text();
        console.error("❌ Chyba pri vytváraní oznamu:", errorText);
        Alert.alert("Chyba", "Nepodarilo sa vytvoriť oznam");
      }
    } catch (err) {
      console.error("❌ Chyba pri vytváraní oznamu:", err);
      Alert.alert("Chyba", "Nepodarilo sa pripojiť na server");
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    void fetchAnnouncements();
  }, [fetchAnnouncements]);

  const renderItem = ({ item }: { item: Announcement }) => (
    <TouchableOpacity style={styles.card} onPress={() => setSelected(item)}>
      <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
        {item.title}
      </Text>
      <Text style={styles.meta}>
        {item.created_by_name} •{" "}
        {new Date(item.date_created).toLocaleDateString("sk-SK")}
      </Text>
      <Text style={styles.readStats}>
        {item.read_count}/{item.total_count} prečítaných
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#D32F2F" />
      </View>
    );
  }

  // CREATE VIEW
  if (creating) {
    return (
      <FlatList
        data={targetWholeClub ? [] : categories}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => {
          const selected = selectedCategories.includes(item.id);
          return (
            <TouchableOpacity
              style={styles.categoryItem}
              onPress={() => {
                if (selected) {
                  setSelectedCategories((prev) =>
                    prev.filter((id) => id !== item.id)
                  );
                } else {
                  setSelectedCategories((prev) => [...prev, item.id]);
                }
              }}
            >
              <Text style={{ flex: 1 }}>{item.name}</Text>
              <Text>{selected ? "✅" : "⬜️"}</Text>
            </TouchableOpacity>
          );
        }}
        ListHeaderComponent={
          <View style={styles.formContainer}>
            <Text style={styles.detailTitle}>Vytvoriť oznam</Text>
            <TextInput
              style={styles.input}
              placeholder="Názov oznamu"
              value={title}
              onChangeText={setTitle}
            />
            <TextInput
              style={[styles.input, { height: 120 }]}
              placeholder="Obsah oznamu"
              value={content}
              onChangeText={setContent}
              multiline
            />

            <View style={styles.toggleContainer}>
              <TouchableOpacity
                style={[styles.toggleBtn, targetWholeClub && styles.toggleActive]}
                onPress={() => setTargetWholeClub(true)}
              >
                <Text style={styles.toggleText}>Celý klub</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleBtn, !targetWholeClub && styles.toggleActive]}
                onPress={() => {
                  setTargetWholeClub(false);
                  fetchCategories();
                }}
              >
                <Text style={styles.toggleText}>Vybrané kategórie</Text>
              </TouchableOpacity>
            </View>
          </View>
        }
        ListFooterComponent={
          <View style={{ padding: 20 }}>
            <TouchableOpacity
              onPress={createAnnouncement}
              style={styles.saveButton}
              disabled={submitting}
            >
              <Text style={styles.saveButtonText}>
                {submitting ? "Ukladám..." : "Uložiť oznam"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setCreating(false)}
              style={styles.cancelButton}
            >
              <Text style={styles.cancelButtonText}>Zrušiť</Text>
            </TouchableOpacity>
          </View>
        }
      />
    );
  }

// DETAIL VIEW
if (selected) {
  return (
    <FlatList
      data={showReaders ? readers : []}
      keyExtractor={(item) => String(item.id)}
renderItem={({ item }) => (
  <View
    style={[
      styles.readerCard,
      item.read_at ? styles.readerRead : styles.readerUnread,
    ]}
  >
    <View>
      <Text style={styles.readerName}>{item.full_name}</Text>
      {item.read_at && (
        <Text style={styles.readerTime}>
          {new Date(item.read_at).toLocaleString("sk-SK")}
        </Text>
      )}
    </View>
    <Text
      style={[
        styles.readerStatus,
        { color: item.read_at ? "#388e3c" : "#D32F2F" },
      ]}
    >
      {item.read_at ? "🟢 Prečítané" : "🔴 Neprečítané"}
    </Text>
  </View>
)}
      ListHeaderComponent={
  <View style={styles.detailContainer}>
    <View style={styles.detailHeaderRow}>
      <Text style={styles.detailTitle}>{selected.title}</Text>
      <TouchableOpacity
        onPress={() => deleteAnnouncement(selected.id)}
        style={styles.deleteIconBtn}
      >
        <Text style={styles.deleteIconText}>🗑️</Text>
      </TouchableOpacity>
    </View>

    <Text style={styles.detailMeta}>
      {selected.created_by_name} •{" "}
      {new Date(selected.date_created).toLocaleString("sk-SK")}
    </Text>
    <Text style={styles.detailContent}>{selected.content}</Text>

    <TouchableOpacity
      style={styles.readersBtn}
      onPress={() => fetchReaders(selected.id)}
    >
      <Text style={styles.readersBtnText}>
        {showReaders ? "Skryť čitateľov" : "Zobraziť čitateľov"}
      </Text>
    </TouchableOpacity>

    {loadingReaders && (
      <ActivityIndicator
        size="small"
        color="#D32F2F"
        style={{ marginTop: 10 }}
      />
    )}
  </View>
}

      ListFooterComponent={
          <TouchableOpacity
            onPress={() => {
              setSelected(null);
              setShowReaders(false);
            }}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>⬅️ Späť na zoznam</Text>
          </TouchableOpacity>

      }
      />
  );
}


  // LIST VIEW
  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={announcements}
        renderItem={renderItem}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 16 }}
        refreshing={loading}
        onRefresh={fetchAnnouncements}
      />
      <TouchableOpacity
        onPress={() => setCreating(true)}
        style={styles.addButton}
      >
        <Text style={styles.addButtonText}>＋ Nový oznam</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    padding: 16,
    marginBottom: 12,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  title: { fontSize: 18, fontWeight: "bold", marginBottom: 4, color: "#111" },
  meta: { fontSize: 13, color: "#777", marginBottom: 6 },
  readStats: {
    fontSize: 13,
    color: "#444",
    marginBottom: 4,
    fontWeight: "600",
  },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  detailContainer: {
    padding: 20,
    backgroundColor: "#fff",
    borderRadius: 12,
    margin: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
    flex: 1,
  },
  detailTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#111",
  },
  detailMeta: { fontSize: 13, color: "#777", marginBottom: 12 },
  detailContent: {
    fontSize: 16,
    lineHeight: 22,
    color: "#333",
    marginBottom: 16,
  },

  backButton: {
    marginTop: 20,
    padding: 12,
    backgroundColor: "#D32F2F",
    borderRadius: 8,
    alignItems: "center",
  },
  backButtonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },

  addButton: {
    backgroundColor: "#D32F2F",
    padding: 16,
    alignItems: "center",
  },
  addButtonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },

  formContainer: { padding: 20, backgroundColor: "#fff" },
  input: {
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: "#D32F2F",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 10,
  },
  saveButtonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  cancelButton: {
    backgroundColor: "#ccc",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButtonText: { color: "#111", fontWeight: "bold", fontSize: 16 },

  toggleContainer: { flexDirection: "row", marginVertical: 12 },
  toggleBtn: {
    flex: 1,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#",
    borderRadius: 8,
    marginHorizontal: 4,
  },
  toggleActive: { backgroundColor: "#D32F2F", borderColor: "#D32F2F" },
  toggleText: { color: "#000", fontWeight: "bold" },

  categoryItem: {
    flexDirection: "row",
    padding: 10,
    backgroundColor: "#fafafa",
    marginVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#ddd",
  },

  readersBtn: {
    marginTop: 20,
    padding: 12,
    backgroundColor: "#1976d2",
    borderRadius: 8,
    alignItems: "center",
  },
  readersBtnText: { color: "#fff", fontWeight: "bold", fontSize: 15 },

  readersList: { backgroundColor: "#f9f9f9", borderRadius: 8, padding: 10 },
  readerItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  readerCard: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  backgroundColor: "#fff",
  padding: 12,
  marginBottom: 8,
  marginHorizontal: 15,
  borderRadius: 10,
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.08,
  shadowRadius: 2,
  elevation: 2,
},

readerRead: {
  borderLeftWidth: 4,
  borderLeftColor: "#00ac14ff", // zelená pri prečítanom
},

readerUnread: {
  borderLeftWidth: 4,
  borderLeftColor: "#D32F2F", // červená pri neprečítanom
  backgroundColor: "#fff8f8",
},

readerName: {
  fontSize: 16,
  fontWeight: "600",
  color: "#111",
},

readerTime: {
  fontSize: 12,
  color: "#777",
  marginTop: 2,
},

readerStatus: {
  fontSize: 14,
  fontWeight: "bold",
},

detailHeaderRow: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
},

deleteIconBtn: {
  padding: 6,
  borderRadius: 6,
},

deleteIconText: {
  fontSize: 20,
},

});
