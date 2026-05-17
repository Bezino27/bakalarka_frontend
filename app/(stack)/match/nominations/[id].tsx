import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState, useContext } from "react";
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert,
} from "react-native";
import { useFetchWithAuth } from "@/hooks/fetchWithAuth";
import { SafeAreaView } from "react-native-safe-area-context";
import { BASE_URL } from "@/hooks/api";
import {AuthContext} from "@/context/AuthContext";
interface Player {
    user_id: number;
    name: string;
    birth_date?: string;
    status: "starter" | "substitute" | "none";
    vote: "yes" | "no" | "unknown";
}

export default function MatchNominationScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { fetchWithAuth } = useFetchWithAuth();
    const router = useRouter();
    const {userRoles} = useContext(AuthContext);
    const [players, setPlayers] = useState<Player[]>([]);

    const loadData = useCallback(async () => {
        try {
            const [nominationsRes, detailRes] = await Promise.all([
                fetchWithAuth(`${BASE_URL}/match-nominations/${id}/`),
                fetchWithAuth(`${BASE_URL}/match-detail/${id}/`),
            ]);

            const nominationsData = await nominationsRes.json();
            const detailData = await detailRes.json();
            const votedYes = new Set<number>(detailData.players_present?.map((p: any) => p.user_id) || []);
            const votedNo = new Set<number>(detailData.players_absent?.map((p: any) => p.user_id) || []);

            const nominations = Array.isArray(nominationsData.nominations) ? nominationsData.nominations : [];
            const allPlayers: Player[] = nominations.map((p: any) => ({
                user_id: p.user_id,
                name: p.name,
                birth_date: p.birth_date,
                status: typeof p.is_substitute === "boolean"
                    ? (p.is_substitute ? "substitute" : "starter")
                    : "none",
                vote: votedYes.has(p.user_id)
                    ? "yes"
                    : votedNo.has(p.user_id)
                        ? "no"
                        : "unknown",
            }));

            setPlayers(allPlayers);
        } catch {
            Alert.alert("Chyba", "Nepodarilo sa načítať dáta.");
        }
    }, [fetchWithAuth, id]);

    useEffect(() => {
        if (!id) return;
        void loadData();
    }, [id, loadData]);

    const updateStatus = (id: number, newStatus: Player["status"]) => {
        setPlayers((prev) =>
            prev.map((p) =>
                p.user_id === id
                    ? { ...p, status: p.status === newStatus ? "none" : newStatus }
                    : p
            )
        );
    };

    const saveNomination = async () => {
        try {
            const nominations = players
                .filter((p) => p.status !== "none")
                .map((p) => ({
                    user: p.user_id,
                    is_substitute: p.status === "substitute",
                    rating: null,
                    goals: 0,
                    plus_minus: 0,
                }));

            const res = await fetchWithAuth(`${BASE_URL}/match-nominations/${id}/`, {
                method: "POST",
                body: JSON.stringify({ nominations }),
            });

            if (!res.ok) throw new Error();

            Alert.alert("✅ Uložené", "Nominácia bola uložená");

            // 🔍 Zisti, či je používateľ tréner
            const isCoach = userRoles.some(r => r.role === 'coach');

            // 🔀 Presmeruj podľa roly
            if (isCoach) {
                router.replace('/tabs-coach/matches');
            } else {
                router.replace('/tabs-player/matches');
            }

        } catch {
            Alert.alert("Chyba", "Nepodarilo sa uložiť nomináciu");
        }
    };

    const renderSection = (title: string, status: Player["status"], color: string) => {
        const sectionPlayers = players.filter((p) => p.status === status);

        const sortedPlayers = [
            ...sectionPlayers.filter((p) => p.vote === "yes"),
            ...sectionPlayers.filter((p) => p.vote === "no"),
            ...sectionPlayers.filter((p) => p.vote === "unknown"),
        ];

        return (
            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color }]}>{title} ({sectionPlayers.length})</Text>
                {sortedPlayers.map((p) => (
                    <View key={p.user_id} style={styles.playerRow}>
                        <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                            {p.vote === "yes" && <View style={styles.greenDot} />}
                            {p.vote === "no" && <View style={styles.redDot} />}
                            {p.vote === "unknown" && <View style={styles.grayDot} />}
                            <Text style={styles.playerName}>
                                {p.name} {p.birth_date ? `(${p.birth_date.slice(-4)})` : ""}
                            </Text>
                        </View>
                        <View style={styles.btnGroup}>
                            {status !== "starter" && (
                                <TouchableOpacity
                                    onPress={() => updateStatus(p.user_id, "starter")}
                                    style={styles.btn}
                                >
                                    <View style={styles.nominated} />
                                </TouchableOpacity>
                            )}
                            {status !== "substitute" && (
                                <TouchableOpacity
                                    onPress={() => updateStatus(p.user_id, "substitute")}
                                    style={styles.btn}
                                >
                                    <View style={styles.bench} />
                                </TouchableOpacity>
                            )}
                            {status !== "none" && (
                                <TouchableOpacity
                                    onPress={() => updateStatus(p.user_id, "none")}
                                    style={[styles.btn]}
                                >
                                    <View style={styles.nothing} />
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                ))}
            </View>
        );
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: "#e0e0e0" }}>
            <ScrollView contentContainerStyle={{ padding: 20 }}>
                <Text style={styles.title}>📝 Spravovať nomináciu</Text>

                {renderSection("🟢 Základ", "starter", "#388E3C")}
                {renderSection("🟡 Náhradníci", "substitute", "#FBC02D")}
                {renderSection("⚫ Nenominovaní", "none", "#555")}

                <TouchableOpacity style={styles.saveBtn} onPress={saveNomination}>
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
    playerRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderColor: "#eee",
    },
    playerName: {
        fontSize: 16,
        marginLeft: 6,
    },
    greenDot: {
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: "#4CAF50",
        marginRight: 6,
    },
    redDot: {
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: "#D32F2F",
        marginRight: 6,
    },
    grayDot: {
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: "#9E9E9E",
        marginRight: 6,
    },
    btnGroup: {
        flexDirection: "row",
        gap: 8,
    },
    btn: {
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 6,
        marginLeft: 6,
    },
    btnText: {
        color: "#fff",
        fontWeight: "bold",
    },
    saveBtn: {
        backgroundColor: "#4CAF50",
        padding: 14,
        borderRadius: 10,
        alignItems: "center",
        marginTop: 30,
    },
    saveBtnText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "bold",
    },
    nominated: {
        width: 25,
        height: 25,
        borderRadius: 8,
        backgroundColor: "green",
    },
    bench: {
        width: 25,
        height: 25,
        borderRadius: 8,
        backgroundColor: "yellow",
    },
    nothing: {
        width: 25,
        height: 25,
        borderRadius: 8,
        backgroundColor: "#000",
    },
});
