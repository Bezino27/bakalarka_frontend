import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFetchWithAuth } from "@/hooks/fetchWithAuth";
import { BASE_URL } from "@/hooks/api";

type Category = {
  id: number;
  name: string;
  description: string;
};

export default function CategoriesScreen() {
  const { fetchWithAuth } = useFetchWithAuth();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetchWithAuth(`${BASE_URL}/categories-in-club/`);
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("❌ Chyba pri načítaní kategórií:", err);
    } finally {
      setLoading(false);
    }
  }, [fetchWithAuth]);

  const handleAddCategory = async () => {
    if (!newName.trim()) {
      Alert.alert("Chyba", "Meno kategórie je povinné");
      return;
    }

    try {
      const res = await fetchWithAuth(`${BASE_URL}/categories-admin/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, description: newDesc }),
      });

      if (res.ok) {
        Alert.alert("✅ Kategória vytvorená");
        setModalVisible(false);
        setNewName("");
        setNewDesc("");
        void fetchCategories();
      } else {
        const err = await res.json();
        Alert.alert("❌ Chyba", err.detail || "Nepodarilo sa vytvoriť kategóriu");
      }
    } catch (e) {
      console.error("❌ Chyba pri vytváraní kategórie:", e);
      Alert.alert("Chyba", "Skús to znova neskôr.");
    }
  };

  const handleDeleteCategory = (id: number, name: string) => {
    Alert.alert(
      "Pozor!",
      `Vymazaním kategórie ${name} sa vymažú aj všetky tréningy danej kategórie. Chceš pokračovať?`,
      [
        { text: "Zrušiť", style: "cancel" },
        {
          text: "Vymazať",
          style: "destructive",
          onPress: async () => {
            try {
              const res = await fetchWithAuth(`${BASE_URL}/delete-category/${id}/`, {
                method: "DELETE",
              });
              if (res.ok) {
                Alert.alert("✅ Kategória vymazaná");
                void fetchCategories();
              } else {
                Alert.alert("❌ Chyba", "Nepodarilo sa vymazať kategóriu.");
              }
            } catch (e) {
              console.error("❌ Chyba pri mazaní kategórie:", e);
              Alert.alert("Chyba", "Skús znova neskôr.");
            }
          },
        },
      ]
    );
  };

  useEffect(() => {
    void fetchCategories();
  }, [fetchCategories]);

  if (loading) return <ActivityIndicator style={{ marginTop: 50 }} />;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Kategórie klubu</Text>

      {categories.map((cat) => (
        <View key={cat.id} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.name}>{cat.name}</Text>
            <TouchableOpacity onPress={() => handleDeleteCategory(cat.id, cat.name)}>
              <Ionicons name="trash" size={22} color="#D32F2F" />
            </TouchableOpacity>
          </View>
          {cat.description ? (
            <Text style={styles.desc}>{cat.description}</Text>
          ) : (
            <Text style={styles.descEmpty}>Bez popisu</Text>
          )}
        </View>
      ))}

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.addButtonText}>+ Pridať kategóriu</Text>
      </TouchableOpacity>

      {/* Modal pre vytvorenie kategórie */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Nová kategória</Text>
            <TextInput
              placeholder="Názov kategórie"
              style={styles.input}
              value={newName}
              onChangeText={setNewName}
            />
            <TextInput
              placeholder="Popis (nepovinný)"
              style={[styles.input, { height: 80 }]}
              value={newDesc}
              onChangeText={setNewDesc}
              multiline
            />
            <TouchableOpacity style={styles.modalButton} onPress={handleAddCategory}>
              <Text style={styles.modalButtonText}>Vytvoriť</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}>
              <Text style={styles.cancelButtonText}>Zavrieť</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  header: { fontSize: 22, fontWeight: "bold", marginBottom: 15 },
  card: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  name: { fontSize: 18, fontWeight: "600", color: "#111" },
  desc: { fontSize: 14, color: "#444" },
  descEmpty: { fontSize: 14, color: "#999", fontStyle: "italic" },
  addButton: {
    backgroundColor: "#007AFF",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 20,
  },
  addButtonText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 10,
    width: "85%",
  },
  modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 15 },
  input: {
    backgroundColor: "#f2f2f2",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    marginBottom: 12,
    color: "#000",
  },
  modalButton: {
    backgroundColor: "#28a745",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  modalButtonText: { color: "#fff", fontWeight: "600" },
  cancelButton: {
    padding: 10,
    alignItems: "center",
    marginTop: 10,
  },
  cancelButtonText: { color: "#D32F2F", fontWeight: "600" },
});
