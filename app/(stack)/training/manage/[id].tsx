// app/training/manage/[userId].tsx

import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState, useContext } from "react";
import {
    View,
    Text,
    ScrollView,
    ActivityIndicator,
    StyleSheet,
    TouchableOpacity,
    Alert,
} from "react-native";
import { useFetchWithAuth } from "@/hooks/fetchWithAuth";
import { BASE_URL } from "@/hooks/api";
import { SafeAreaView } from "react-native-safe-area-context";
import {AuthContext} from "@/context/AuthContext";

interface Player {
    id: number;
    name: string;
    number?: number;
    birth_date?: string;
    status: "present" | "absent" | "unknown";
}

interface TrainingBasic {
    description: string;
    date: string;
    location: string;
}

export default function ManageTrainingScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { fetchWithAuth } = useFetchWithAuth();

    const [players, setPlayers] = useState<Player[]>([]);
    const [loading, setLoading] = useState(true);
    const [training, setTraining] = useState<TrainingBasic | null>(null);
    const { isLoggedIn, accessToken } = useContext(AuthContext); // ← pridaj toto


    const fetchData = useCallback(async () => {
        if (!id) return;

        try {
            const resPlayers = await fetchWithAuth(`${BASE_URL}/training-attendance/${id}/`);
            const resTraining = await fetchWithAuth(`${BASE_URL}/training-detail/${id}/`);
            if (!resPlayers.ok || !resTraining.ok) {
                throw new Error("Nepodarilo sa načítať tréning.");
            }
            const dataPlayers = await resPlayers.json();
            const dataTraining = await resTraining.json();
            setPlayers(dataPlayers);
            setTraining({
                description: dataTraining.description,
                date: dataTraining.date,
                location: dataTraining.location,
            });
        } catch (err) {
            console.error("❌ Chyba pri načítaní údajov:", err);
        } finally {
            setLoading(false);
        }
    }, [fetchWithAuth, id]);

    const handleUpdate = async (playerId: number, status: Player["status"]) => {
        try {
            const res = await fetchWithAuth(`${BASE_URL}/set-training-attendance/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ training_id: id, user_id: playerId, status }),
            });
            if (!res.ok) throw new Error();
            await fetchData();
        } catch {
            Alert.alert("Chyba", "Nepodarilo sa aktualizovať účasť hráča.");
        }
    };


    useEffect(() => {
        if (id && isLoggedIn && accessToken) {
            void fetchData();
        }
    }, [id, isLoggedIn, accessToken, fetchData]); // ← doplň závislosti

    if (loading) return <ActivityIndicator style={{ marginTop: 50 }} />;

    const statusMap = {
        present: "PRÍDU",
        absent: "NEPRÍDU",
        unknown: "NEZODPOVEDANÉ",
    };

    const cardColor = {
        present: "#e6e6e6",
        absent: "#e6e6e6",
        unknown: "#e6e6e6",
    };
    const highlightColor = {
        present: "#4CAF50",   // zelené
        absent: "#D32F2F",    // červené
        unknown: "#9E9E9E",   // sivé
    };
    return (
        <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
            <ScrollView contentContainerStyle={styles.container}>
                {training && (
                    <View style={styles.trainingCard}>
                        <Text style={styles.trainingTitle}>{training.description || "Tréning"}</Text>
                        <Text style={styles.trainingInfo}>📅 {new Date(training.date).toLocaleString("sk-SK")}</Text>
                        <Text style={styles.trainingInfo}>📍 {training.location}</Text>
                    </View>
                )}

                {(["present", "absent", "unknown"] as const).map((statusKey) => (
                    <View key={statusKey} style={styles.section}>
                        <Text style={styles.sectionTitle}>{statusMap[statusKey]}</Text>

                        {players
                            .filter((p) => p.status === statusKey)
                            .map((p) => (
                                <View
                                    key={p.id}
                                    style={[styles.playerCard, { backgroundColor: cardColor[statusKey] }]}
                                >
                                    <Text style={styles.playerName}>#{p.number ?? "–"} {p.name}{p.birth_date ? ` (${p.birth_date.slice(0, 4)})` : ""}</Text>
                                    <View style={styles.buttons}>
                                        {(["present", "absent", "unknown"] as const).map((status) => (
                                            <TouchableOpacity
                                                key={status}
                                                style={[
                                                    styles.btn,
                                                    p.status === status && { backgroundColor: highlightColor[status] },
                                                ]}
                                                onPress={() => handleUpdate(p.id, status)}
                                            >
                                                <Text style={styles.btnText}>
                                                    {status === "present" ? "✔" : status === "absent" ? "✖" : "?"}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>
                            ))}
                    </View>
                ))}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: "#e0e0e0" },
    container: { padding: 20 },
    trainingCard: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 20,
        marginBottom: 30,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    trainingTitle: {
        fontSize: 22,
        fontWeight: "bold",
        marginBottom: 8,
        color: "#000",
    },
    trainingInfo: {
        fontSize: 16,
        color: "#000",
        marginBottom: 4,
    },
    section: {
        marginBottom: 25,
        borderRadius: 10,
        padding: 12,
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: "#ccc",
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "bold",
        marginBottom: 12,
        color: "#000",
        alignSelf: "center",
        fontStyle: "italic",
    },
    playerCard: {
        borderRadius: 10,
        padding: 8,
        marginBottom: 10,
    },
    playerName: {
        fontSize: 16,
        fontWeight: "600",
        marginBottom: 10,
        color: "#000",
    },
    buttons: {
        flexDirection: "row",
        gap: 8,
        alignItems: "center",
        marginBottom: 8,
    },
    btn: {
        padding: 8,
        borderRadius: 6,
        backgroundColor: "#fff",
        width: "31.5%",
        alignItems: "center",
    },
    btnText: {
        color: "#000",
        fontSize: 18,
        fontWeight: "bold",
    },
    activeBtn: {
        backgroundColor: "green",
    },

});
