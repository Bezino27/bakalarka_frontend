import React, { useCallback, useEffect, useState } from "react";
import {
    View,
    Text,
    ScrollView,
    ActivityIndicator,
    StyleSheet,
    TouchableOpacity,
    Alert,
    Modal,
    TextInput,
    RefreshControl,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { useFetchWithAuth } from "@/hooks/fetchWithAuth";
import { BASE_URL } from "@/hooks/api";
import { Ionicons } from "@expo/vector-icons";

type Role = {
    role: string;
    category__id: number;
    category__name: string;
};

type UserItem = {
    id: number;
    username: string;
    name: string;
    email: string;
    date_joined: string;
    birth_date: string;
    roles: Role[];
};

type Category = {
    id: number;
    name: string;
};

export default function AdminUsersScreen() {
    const { fetchWithAuth } = useFetchWithAuth();
    const [users, setUsers] = useState<UserItem[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedFilter, setSelectedFilter] = useState<"all" | "none" | "player" | "coach" | "admin">("all");
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
    const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
    const [selectedRole, setSelectedRole] = useState<string>("");
    const [searchQuery, setSearchQuery] = useState(""); 
    const [refreshing, setRefreshing] = useState(false);

    const fetchUsers = useCallback(async () => {
        try {
            const res = await fetchWithAuth(`${BASE_URL}/users-in-club/`);
            const data = await res.json();
            setUsers(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("❌ Chyba pri načítaní používateľov:", err);
        } finally {
            setLoading(false);
        }
    }, [fetchWithAuth]);

    const fetchCategories = useCallback(async () => {
        try {
            const res = await fetchWithAuth(`${BASE_URL}/categories-in-club/`);
            const data = await res.json();
            setCategories(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("❌ Chyba pri načítaní kategórií:", err);
        }
    }, [fetchWithAuth]);

    const handleAddRole = async () => {
        if (!selectedUserId || !selectedCategoryId || !selectedRole) {
            Alert.alert("Vyber kategóriu a rolu");
            return;
        }

        const res = await fetchWithAuth(`${BASE_URL}/assign-role/`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                user_id: selectedUserId,
                category_id: selectedCategoryId,
                role: selectedRole,
            }),
        });

        if (res.ok) {
            Alert.alert("✅ Rola pridaná");
            setModalVisible(false);
            void fetchUsers();
        } else {
            const err = await res.json();
            Alert.alert("❌ Chyba", err.error || "Nepodarilo sa pridať rolu");
        }
    };
    const onRefresh = async () => {
        setRefreshing(true);
        await Promise.all([fetchUsers(), fetchCategories()]);
        setRefreshing(false);
    };
    const handleRemoveRole = async (userId: number, categoryId: number, role: string) => {
        const res = await fetchWithAuth(`${BASE_URL}/remove-role/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: userId, category_id: categoryId, role }),
        });

        if (res.ok) {
            Alert.alert("✅ Rola odstránená");
            void fetchUsers();
        } else {
            Alert.alert("❌ Chyba pri odstraňovaní");
        }
    };

    useEffect(() => {
        void fetchUsers();
        void fetchCategories();
    }, [fetchCategories, fetchUsers]);

    if (loading) return <ActivityIndicator style={{ marginTop: 50 }} />;

    return (
        <ScrollView
            style={styles.container}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D32F2F" />
            }
        > 
        <Text style={styles.header}>Používatelia klubu</Text>
            <TextInput
                style={styles.searchInput}
                placeholder="Hľadaj používateľa podľa mena alebo emailu..."
                placeholderTextColor="#777"
                value={searchQuery}
                onChangeText={setSearchQuery}
            />
            <View style={styles.filterRow}>
                {["all", "none", "player", "coach", "admin"].map((f) => (
                    <TouchableOpacity
                        key={f}
                        style={[
                            styles.filterButton,
                            selectedFilter === f && styles.filterButtonActive,
                        ]}
                        onPress={() => setSelectedFilter(f as any)}
                    >
                        <Text
                            style={[
                                styles.filterButtonText,
                                selectedFilter === f && styles.filterButtonTextActive,
                            ]}
                        >
                            {f === "all"
                                ? "Všetci"
                                : f === "none"
                                ? "Bez roly"
                                : f.charAt(0).toUpperCase() + f.slice(1)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {users
                .filter((user) => {
                    if (selectedFilter === "all") return true;
                    if (selectedFilter === "none") return user.roles.length === 0;
                    return user.roles.some((r) => r.role === selectedFilter);
                })
                .filter((user) => {
                    // 🔍 Filtrovanie podľa searchQuery
                    const q = searchQuery.toLowerCase();
                    return (
                        user.name?.toLowerCase().includes(q) ||
                        user.username?.toLowerCase().includes(q) ||
                        user.email?.toLowerCase().includes(q)
                    );
                })
                .map((user) => {
                    const hasRole = user.roles.length > 0;
                    const isNew =
                        !hasRole &&
                        new Date().getTime() - new Date(user.date_joined).getTime() < 2 * 24 * 60 * 60 * 1000;

                    return (
<View key={user.id} style={[styles.card, isNew && styles.newUserCard]}>
    <View style={styles.cardHeader}>
        <Text style={styles.name}>
            {user.name || user.username} - {user.birth_date?.slice(0,4)} {isNew && "🆕"}
        </Text>
        <TouchableOpacity
            onPress={async () => {
                Alert.alert(
                    "Potvrdenie",
                    `Naozaj chceš vymazať používateľa ${user.name || user.username} z klubu?`,
                    [
                        { text: "Zrušiť", style: "cancel" },
                        {
                            text: "Vymazať",
                            style: "destructive",
                            onPress: async () => {
                                try {
                                    const res = await fetchWithAuth(`${BASE_URL}/delete-user-from-club/${user.id}/`, {
                                        method: "DELETE",
                                    });

                                    if (res.ok) {
                                        Alert.alert("✅ Používateľ vymazaný");
                                        fetchUsers();
                                    } else {
                                        const err = await res.json();
                                        Alert.alert("❌ Chyba", err.detail || "Nepodarilo sa vymazať používateľa.");
                                    }
                                } catch (e) {
                                    console.error("❌ Chyba pri mazaní používateľa:", e);
                                    Alert.alert("Chyba", "Skús znova neskôr.");
                                }
                            },
                        },
                    ]
                );
            }}
            style={styles.deleteIconButton}
        >
            <Ionicons name="trash" size={22} color="#D32F2F" />
        </TouchableOpacity>
    </View>

    <Text style={styles.email}>{user.email}</Text>
    <Text style={styles.joined}>Pridaný: {timeAgo(user.date_joined)}</Text>

                            {user.roles.map((r, idx) => (
                                <View key={idx} style={styles.roleItem}>
                                    <Text style={styles.roleText}>
                                        {r.role.toUpperCase()} – {r.category__name}
                                    </Text>
                                    <TouchableOpacity
                                        onPress={() => handleRemoveRole(user.id, r.category__id, r.role)}
                                    >
                                        <Ionicons name="trash" size={20} color="#D32F2F" />
                                    </TouchableOpacity>
                                </View>
                                
                            ))}

                            <TouchableOpacity
                                style={styles.assignButton}
                                onPress={() => {
                                    setSelectedUserId(user.id);
                                    setSelectedCategoryId(null);
                                    setSelectedRole("");
                                    setModalVisible(true);
                                }}
                            >
                                <Text style={styles.assignButtonText}>+ Pridať rolu</Text>
                            </TouchableOpacity>

                        </View>
                    );
                })}
            <Modal
                visible={modalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Vyber kategóriu a rolu</Text>

                        <View style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 6, marginBottom: 15 }}>
                            <Picker
                                selectedValue={selectedCategoryId}
                                onValueChange={(itemValue) => setSelectedCategoryId(itemValue)}
                                style={{ color: '#000', backgroundColor: '#f2f2f2' }} // dôležité pre iOS
                                dropdownIconColor="#000"
                            >
                                <Picker.Item label="Vyber kategóriu..." value={null} color="#888" />
                                {categories.map((cat) => (
                                    <Picker.Item key={cat.id} label={cat.name} value={cat.id} color="#000" />
                                ))}
                            </Picker>
                        </View>

                        <View style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 6, marginBottom: 15 }}>
                            <Picker
                                selectedValue={selectedRole}
                                onValueChange={(itemValue) => setSelectedRole(itemValue)}
                                style={{ color: '#000', backgroundColor: '#f2f2f2' }}
                                dropdownIconColor="#000"
                            >
                                <Picker.Item label="Vyber rolu..." value="" color="#888" />
                                <Picker.Item label="Hráč" value="player" color="#000" />
                                <Picker.Item label="Tréner" value="coach" color="#000" />
                                <Picker.Item label="Admin" value="admin" color="#000" />
                            </Picker>
                        </View>

                        <TouchableOpacity onPress={handleAddRole} style={styles.modalButton}>
                            <Text style={styles.modalButtonText}>Pridať</Text>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.cancelButton}>
                            <Text style={styles.cancelButtonText}>Zavrieť</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );
}

const timeAgo = (isoDate: string) => {
    const now = new Date();
    const date = new Date(isoDate);
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "dnes";
    if (diffDays === 1) return "včera";
    return `pred ${diffDays} dňami`;
};

const styles = StyleSheet.create({
    container: { padding: 20 },
    header: { fontSize: 24, fontWeight: "bold", marginBottom: 20 },
    card: {
        backgroundColor: "#fff",
        padding: 15,
        borderRadius: 10,
        marginBottom: 20,
        elevation: 3,
    },
    newUserCard: {
        borderColor: "#4CAF50",
        borderWidth: 2,
    },
    name: { fontSize: 18, fontWeight: "bold", color: "#111" },
    email: { fontSize: 14, color: "#555" },
    joined: { fontSize: 12, color: "#999", marginBottom: 8 },
    roleItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        backgroundColor: "#e0e0e0",
        borderRadius: 6,
        padding: 6,
        marginVertical: 4,
    },
    roleText: { fontWeight: "600", color: "#333" },
    assignButton: {
        backgroundColor: "#007AFF",
        marginTop: 10,
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: "center",
    },
    assignButtonText: {
        color: "#fff",
        fontWeight: "600",
        fontSize: 15,
    },
    modalContainer: {
        flex: 1,
        justifyContent: "center",
        backgroundColor: "rgba(0,0,0,0.3)",
    },
    modalContent: {
        backgroundColor: "#fff",
        margin: 20,
        padding: 20,
        borderRadius: 10,
        elevation: 5,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "bold",
        marginBottom: 15,
    },
    modalButton: {
        backgroundColor: "#28a745",
        padding: 12,
        borderRadius: 8,
        marginTop: 10,
        alignItems: "center",
    },
    modalButtonText: {
        color: "#fff",
        fontWeight: "bold",
    },
    cancelButton: {
        padding: 10,
        alignItems: "center",
        marginTop: 10,
    },
    cancelButtonText: {
        color: "#D32F2F",
        fontWeight: "600",
    },
    filterRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        marginBottom: 15,
        gap: 10,
    },
    filterButton: {
        backgroundColor: "#e0e0e0",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
    },
    filterButtonActive: {
        backgroundColor: "#007AFF",
    },
    filterButtonText: {
        color: "#333",
        fontWeight: "500",
    },
    filterButtonTextActive: {
        color: "#fff",
    },
    searchInput: {
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    marginBottom: 15,
    color: "#000",
    },
    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    deleteIconButton: {
        padding: 4,
    },
});
