import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
    View, Text, TextInput, ScrollView, StyleSheet,
    TouchableOpacity, Alert
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFetchWithAuth } from "@/hooks/fetchWithAuth";
import { BASE_URL } from "@/hooks/api";

type Player = {
    user_id: number;
    name: string;
    birth_date?: string;
    is_substitute: boolean | null;
    rating: number | null;
    plus_minus: number;
};

export default function MatchStatsScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { fetchWithAuth } = useFetchWithAuth();
    const router = useRouter();
    const [players, setPlayers] = useState<Player[]>([]);
    const [, setLoading] = useState(true);

    const loadPlayers = useCallback(async () => {
        try {
            const res = await fetchWithAuth(`${BASE_URL}/match-nominations/${id}/`);
            const data = await res.json();
            setPlayers(Array.isArray(data.nominations) ? data.nominations : []);
        } catch {
            Alert.alert("Chyba", "Nepodarilo sa načítať hráčov.");
        } finally {
            setLoading(false);
        }
    }, [fetchWithAuth, id]);

    useEffect(() => {
        if (!id) return;
        void loadPlayers();
    }, [id, loadPlayers]);

    const updatePlayer = (user_id: number, key: keyof Player, value: any) => {
        setPlayers(prev =>
            prev.map(p => p.user_id === user_id ? { ...p, [key]: value } : p)
        );
    };

    const saveStats = async () => {
        try {
            const nominations = players.map(p => ({
                user: p.user_id,
                is_substitute: p.is_substitute ?? false,
                rating: p.rating,
                plus_minus: p.plus_minus,
                goals: 0,
            }));

            const res = await fetchWithAuth(`${BASE_URL}/match-stats/${id}/`, {
                method: "POST",
                body: JSON.stringify({ nominations }),
            });

            if (!res.ok) throw new Error();
            Alert.alert("✅ Uložené", "Štatistiky boli uložené");
            router.back();
        } catch {
            Alert.alert("Chyba", "Nepodarilo sa uložiť štatistiky.");
        }
    };

    const renderSection = (title: string, filter: (p: Player) => boolean) => {
        const sectionPlayers = players.filter(filter);

        return (
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>{title} ({sectionPlayers.length})</Text>
                {sectionPlayers.map(p => (
                    <View key={p.user_id} style={styles.playerCard}>
                        <Text style={styles.playerName}>
                            {p.name} {p.birth_date ? `(${p.birth_date.slice(0, 4)})` : ""}
                        </Text>

                        <View style={styles.inputsRow}>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Rating</Text>
                                <TextInput
                                    keyboardType="numeric"
                                    value={p.rating?.toString() ?? ""}
                                    onChangeText={val =>
                                        updatePlayer(p.user_id, "rating", val === "" ? null : parseInt(val))}
                                    placeholder="0-10"
                                    style={styles.input}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>+/-</Text>
                                <View style={styles.plusMinusRow}>
                                    <TouchableOpacity
                                        style={styles.pmButton}
                                        onPress={() => updatePlayer(p.user_id, "plus_minus", p.plus_minus - 1)}
                                    >
                                        <Text style={styles.pmText}>−</Text>
                                    </TouchableOpacity>
                                    <Text style={styles.pmValue}>{p.plus_minus}</Text>
                                    <TouchableOpacity
                                        style={styles.pmButton}
                                        onPress={() => updatePlayer(p.user_id, "plus_minus", p.plus_minus + 1)}
                                    >
                                        <Text style={styles.pmText}>+</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </View>
                ))}
            </View>
        );
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: "#e0e0e0" }}>
            <ScrollView contentContainerStyle={{ padding: 20 }}>
                <Text style={styles.title}>📊 Štatistiky hráčov</Text>

                {renderSection("🟢 Základ", p => p.is_substitute === false)}
                {renderSection("🟡 Náhradníci", p => p.is_substitute === true)}

                <TouchableOpacity style={styles.saveBtn} onPress={saveStats}>
                    <Text style={styles.saveBtnText}>💾 Uložiť</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    title: { fontSize: 22, fontWeight: "bold", marginBottom: 20 },
    section: {
        marginBottom: 20,
        backgroundColor: "#fff",
        padding: 14,
        borderRadius: 10,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "bold",
        marginBottom: 12,
    },
    playerCard: {
        backgroundColor: "#f9f9f9",
        padding: 12,
        borderRadius: 10,
        marginBottom: 10,
    },
    playerName: {
        fontSize: 16,
        fontWeight: "bold",
        marginBottom: 10,
    },
    inputsRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 12,
    },
    inputGroup: {
        flex: 1,
    },
    label: {
        fontSize: 14,
        marginBottom: 4,
    },
    input: {
        backgroundColor: "#f0f0f0",
        padding: 8,
        borderRadius: 6,
        fontSize: 16,
    },
    plusMinusRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "#f0f0f0",
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 6,
    },
    pmButton: {
        backgroundColor: "#ccc",
        borderRadius: 4,
        paddingHorizontal: 8,
        paddingVertical: 2,
    },
    pmText: {
        fontSize: 18,
        fontWeight: "bold",
    },
    pmValue: {
        fontSize: 16,
        marginHorizontal: 12,
    },
    saveBtn: {
        marginTop: 30,
        backgroundColor: "#4CAF50",
        padding: 14,
        borderRadius: 10,
        alignItems: "center",
    },
    saveBtnText: {
        color: "#fff",
        fontWeight: "bold",
        fontSize: 16,
    },
});
