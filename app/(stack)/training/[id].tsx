import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState, useContext, useMemo, useCallback } from "react";
import {
    View,
    Text,
    ScrollView,
    ActivityIndicator,
    StyleSheet,
    TouchableOpacity,
    Alert,
    RefreshControl,
} from "react-native";
import { useFetchWithAuth } from "@/hooks/fetchWithAuth";
import { BASE_URL } from "@/hooks/api";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthContext } from "@/context/AuthContext";
import { COLORS } from "@/constants/Colors";

type StatusKey = "present" | "absent" | "unknown";

type Player = {
    id: number;
    name: string;
    number?: number | string | null;
    birth_date?: string | null;
    position?: string | null;
    reason?: string | null;
    responded_at?: string | null;
};

type TrainingDetail = {
    id: number;
    description: string;
    date: string;
    location: string;
    created_by: string;
    category_id: number;
    category_name: string;
    players: {
        present: Player[];
        absent: Player[];
        unknown: Player[];
    };
};

const STATUS_META: Record<
    StatusKey,
    {
        label: string;
        color: string;
        bg: string;
    }
> = {
    present: {
        label: "Prídu",
        color: COLORS.success,
        bg: COLORS.successSoft,
    },
    absent: {
        label: "Neprídu",
        color: COLORS.danger,
        bg: COLORS.dangerSoft,
    },
    unknown: {
        label: "Bez odp.",
        color: COLORS.neutral,
        bg: COLORS.neutralSoft,
    },
};

function formatDate(dateString: string) {
    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
        return "Neplatný dátum";
    }

    return date.toLocaleString("sk-SK", {
        weekday: "short",
        day: "numeric",
        month: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function formatRespondedAt(dateString?: string | null) {
    if (!dateString) return null;

    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return date.toLocaleString("sk-SK", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function isGoalie(player: Player) {
    return player.position?.toLowerCase().includes("brankár") ?? false;
}

function sortByRespondedAtDesc(players: Player[]) {
    return [...players].sort((a, b) => {
        const aTime = a.responded_at ? new Date(a.responded_at).getTime() : 0;
        const bTime = b.responded_at ? new Date(b.responded_at).getTime() : 0;
        return bTime - aTime;
    });
}

export default function TrainingDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { fetchWithAuth } = useFetchWithAuth();
    const router = useRouter();

    const [training, setTraining] = useState<TrainingDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeStatus, setActiveStatus] = useState<StatusKey>("present");

    const { currentRole } = useContext(AuthContext);
    const isCoachOfCategory = currentRole?.role === "coach";

    const loadTraining = useCallback(
        async (silent = false) => {
            if (!id) return;

            if (!silent) {
                setLoading(true);
            }

            try {
                const res = await fetchWithAuth(`${BASE_URL}/training-detail/${id}/`);

                if (!res.ok) {
                    throw new Error("Nepodarilo sa načítať tréning.");
                }

                const data: TrainingDetail = await res.json();
                setTraining(data);
            } catch (err) {
                console.error("❌ Chyba pri načítaní detailu tréningu:", err);
                Alert.alert("Chyba", "Nepodarilo sa načítať detail tréningu.");
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        },
        [fetchWithAuth, id]
    );

    useEffect(() => {
        void loadTraining();
    }, [loadTraining]);

    const onRefresh = () => {
        setRefreshing(true);
        void loadTraining(true);
    };

    const stats = useMemo(() => {
        if (!training) {
            return {
                present: 0,
                absent: 0,
                unknown: 0,
                total: 0,
                goalies: 0,
                fieldPlayers: 0,
                attendancePercent: 0,
            };
        }

        const present = training.players.present.length;
        const absent = training.players.absent.length;
        const unknown = training.players.unknown.length;
        const total = present + absent + unknown;
        const goalies = training.players.present.filter(isGoalie).length;
        const fieldPlayers = present - goalies;
        const attendancePercent = total > 0 ? Math.round((present / total) * 100) : 0;

        return {
            present,
            absent,
            unknown,
            total,
            goalies,
            fieldPlayers,
            attendancePercent,
        };
    }, [training]);

    const sortedPlayers = useMemo(() => {
        if (!training) return [];

        if (activeStatus === "unknown") {
            return [...training.players.unknown].sort((a, b) =>
                a.name.localeCompare(b.name)
            );
        }

        return sortByRespondedAtDesc(training.players[activeStatus]);
    }, [activeStatus, training]);

    const isPastTraining = training ? new Date(training.date) < new Date() : false;
    const activeMeta = STATUS_META[activeStatus];

    const handleDeleteTraining = () => {
        if (!training) return;

        Alert.alert("Zmazať tréning?", "Naozaj chceš zmazať tento tréning?", [
            { text: "Zrušiť", style: "cancel" },
            {
                text: "Zmazať",
                style: "destructive",
                onPress: async () => {
                    try {
                        const res = await fetchWithAuth(`${BASE_URL}/training/${training.id}/`, {
                            method: "DELETE",
                        });

                        if (!res.ok) {
                            throw new Error("Chyba pri mazaní");
                        }

                        Alert.alert("Zmazané", "Tréning bol úspešne zmazaný.");
                        router.back();
                    } catch (err) {
                        console.error("❌ Chyba pri mazaní tréningu:", err);
                        Alert.alert("Chyba", "Nepodarilo sa zmazať tréning.");
                    }
                },
            },
        ]);
    };

    const handleRemindUnknownPlayers = async () => {
        if (!training) return;

        try {
            const players = training.players.unknown;

            const res = await fetchWithAuth(`${BASE_URL}/remind-attendance/`, {
                method: "POST",
                body: JSON.stringify({
                    training_id: training.id,
                    user_ids: players.map((p) => p.id),
                }),
            });

            if (!res.ok) {
                throw new Error("Chyba pri odosielaní pripomienky");
            }

            Alert.alert("Odoslané", "Pripomienka bola odoslaná hráčom.");
        } catch (e) {
            console.error("❌ Pripomienka sa nepodarila:", e);
            Alert.alert("Chyba", "Nepodarilo sa odoslať pripomienku.");
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.loadingWrap}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={styles.loadingText}>Načítavam tréning...</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (!training) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>Tréning nebol nájdený.</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea} edges={["left", "right", "bottom"]}>
            <ScrollView
                contentContainerStyle={styles.container}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={COLORS.primary}
                        colors={[COLORS.primary]}
                    />
                }
            >
                <View style={styles.infoCard}>
                    <View style={styles.infoTopRow}>
                        <View style={styles.infoMain}>
                            <Text style={styles.category}>{training.category_name}</Text>
                            <Text style={styles.title}>{training.description || "Tréning"}</Text>
                            <Text style={styles.detail}>📅 {formatDate(training.date)}</Text>
                            <Text style={styles.detail}>📍 {training.location || "Miesto nezadané"}</Text>
                        </View>

                        <View style={styles.percentBox}>
                            <Text style={styles.percentValue}>{stats.attendancePercent}%</Text>
                            <Text style={styles.percentLabel}>účasť</Text>
                        </View>
                    </View>

                    <View style={styles.progressTrack}>
                        <View
                            style={[
                                styles.progressFill,
                                { width: `${Math.min(stats.attendancePercent, 100)}%` },
                            ]}
                        />
                    </View>

                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Text style={[styles.statValue, { color: COLORS.success }]}>
                                {stats.fieldPlayers}+{stats.goalies}
                            </Text>
                            <Text style={styles.statLabel}>prídu</Text>
                        </View>

                        <View style={styles.statItem}>
                            <Text style={[styles.statValue, { color: COLORS.danger }]}>
                                {stats.absent}
                            </Text>
                            <Text style={styles.statLabel}>neprídu</Text>
                        </View>

                        <View style={styles.statItem}>
                            <Text style={[styles.statValue, { color: COLORS.neutral }]}>
                                {stats.unknown}
                            </Text>
                            <Text style={styles.statLabel}>bez odp.</Text>
                        </View>
                    </View>
                </View>

                {isCoachOfCategory && (
                    <View style={styles.coachCard}>
                        <TouchableOpacity
                            style={[styles.smallActionButton, styles.blueButton]}
                            onPress={() =>
                                router.push({
                                    pathname: "/formations_overview/[trainingId]",
                                    params: {
                                        trainingId: training.id.toString(),
                                        categoryId: training.category_id.toString(),
                                    },
                                })
                            }
                        >
                            <Text style={styles.smallActionText}>Formácie</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.smallActionButton, styles.orangeButton]}
                            onPress={() => router.push(`/training/edit/${training.id}`)}
                        >
                            <Text style={styles.smallActionText}>Upraviť</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.smallActionButton, styles.darkButton]}
                            onPress={() => router.push(`/training/manage/${training.id}`)}
                        >
                            <Text style={styles.smallActionText}>Účasť</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.smallActionButton, styles.redButton]}
                            onPress={handleDeleteTraining}
                        >
                            <Text style={styles.smallActionText}>Zmazať</Text>
                        </TouchableOpacity>
                    </View>
                )}

                <View style={styles.segmentCard}>
                    {(["present", "absent", "unknown"] as StatusKey[]).map((status) => {
                        const meta = STATUS_META[status];
                        const count = training.players[status].length;
                        const isActive = activeStatus === status;

                        return (
                            <TouchableOpacity
                                key={status}
                                style={[
                                    styles.segmentButton,
                                    isActive && {
                                        backgroundColor: meta.bg,
                                        borderColor: meta.color,
                                    },
                                ]}
                                onPress={() => setActiveStatus(status)}
                                activeOpacity={0.85}
                            >
                                <Text
                                    style={[
                                        styles.segmentValue,
                                        isActive && { color: meta.color },
                                    ]}
                                >
                                    {count}
                                </Text>
                                <Text
                                    style={[
                                        styles.segmentLabel,
                                        isActive && { color: meta.color },
                                    ]}
                                >
                                    {meta.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                <View style={styles.playersCard}>
                    <View style={styles.playersHeader}>
                        <View>
                            <Text style={styles.playersTitle}>{activeMeta.label}</Text>
                        </View>

                        {activeStatus === "unknown" &&
                            sortedPlayers.length > 0 &&
                            isCoachOfCategory &&
                            !isPastTraining && (
                                <TouchableOpacity
                                    style={styles.remindButton}
                                    onPress={handleRemindUnknownPlayers}
                                >
                                    <Text style={styles.remindButtonText}>🔔</Text>
                                </TouchableOpacity>
                            )}
                    </View>

                    {sortedPlayers.length === 0 ? (
                        <Text style={styles.emptyText}>– nikto –</Text>
                    ) : (
                        sortedPlayers.map((player) => {
                            const respondedAt = formatRespondedAt(player.responded_at);
                            const number = player.number ? String(player.number) : "–";

                            return (
                                <View key={player.id} style={styles.playerRow}>
                                    <View
                                        style={[
                                            styles.playerNumberBox,
                                            {
                                                backgroundColor: activeMeta.bg,
                                                borderColor: activeMeta.color,
                                            },
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.playerNumberText,
                                                { color: activeMeta.color },
                                            ]}
                                        >
                                            {number}
                                        </Text>
                                    </View>

                                    <View style={styles.playerContent}>
                                        <Text style={styles.playerName} numberOfLines={1}>
                                            {player.name}
                                            {activeStatus === "present" && player.position
                                                ? ` - ${player.position}`
                                                : ""}
                                        </Text>

                                        {respondedAt && (
                                            <Text style={styles.playerSubText}>
                                                hlasoval {respondedAt}
                                            </Text>
                                        )}

                                        {activeStatus === "absent" &&
                                            player.reason &&
                                            isCoachOfCategory && (
                                                <View style={styles.reasonBox}>
                                                    <Text style={styles.reasonLabel}>
                                                        Dôvod neúčasti - {player.reason}
                                                    </Text>
                                                </View>
                                            )}
                                    </View>
                                </View>
                            );
                        })
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: COLORS.background,
    },

    container: {
        flexGrow: 1,
        padding: 14,
        paddingBottom: 26,
        backgroundColor: COLORS.background,
    },

    loadingWrap: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: COLORS.background,
    },

    loadingText: {
        marginTop: 10,
        fontSize: 14,
        color: COLORS.textMuted,
        fontWeight: "600",
    },

    errorContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },

    errorText: {
        fontSize: 16,
        color: COLORS.danger,
        fontWeight: "700",
    },

    infoCard: {
        backgroundColor: COLORS.card,
        borderRadius: 18,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
    },

    infoTopRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 10,
    },

    infoMain: {
        flex: 1,
    },

    category: {
        alignSelf: "flex-start",
        fontSize: 11,
        fontWeight: "900",
        color: COLORS.primary,
        backgroundColor: COLORS.primarySoft,
        paddingHorizontal: 9,
        paddingVertical: 4,
        borderRadius: 999,
        marginBottom: 7,
        overflow: "hidden",
    },

    title: {
        fontSize: 20,
        fontWeight: "900",
        color: COLORS.text,
        marginBottom: 7,
    },

    detail: {
        fontSize: 13,
        color: COLORS.textMuted,
        fontWeight: "600",
        marginBottom: 4,
    },

    percentBox: {
        alignItems: "center",
        backgroundColor: COLORS.neutralSoft,
        borderRadius: 14,
        paddingVertical: 8,
        paddingHorizontal: 10,
        minWidth: 62,
    },

    percentValue: {
        fontSize: 18,
        fontWeight: "900",
        color: COLORS.primary,
    },

    percentLabel: {
        fontSize: 10,
        color: COLORS.textMuted,
        fontWeight: "700",
    },

    progressTrack: {
        height: 6,
        backgroundColor: COLORS.neutralSoft,
        borderRadius: 999,
        overflow: "hidden",
        marginTop: 12,
    },

    progressFill: {
        height: "100%",
        backgroundColor: COLORS.primary,
        borderRadius: 999,
    },

    statsRow: {
        flexDirection: "row",
        marginTop: 12,
        gap: 8,
    },

    statItem: {
        flex: 1,
        backgroundColor: COLORS.neutralSoft,
        borderRadius: 12,
        paddingVertical: 8,
        alignItems: "center",
        borderWidth: 1,
        borderColor: COLORS.border,
    },

    statValue: {
        fontSize: 17,
        fontWeight: "900",
    },

    statLabel: {
        fontSize: 11,
        color: COLORS.textMuted,
        fontWeight: "700",
        marginTop: 1,
    },

    coachCard: {
        backgroundColor: COLORS.card,
        borderRadius: 16,
        padding: 10,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: COLORS.border,
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },

    smallActionButton: {
        flexGrow: 1,
        flexBasis: "47%",
        paddingVertical: 10,
        borderRadius: 12,
        alignItems: "center",
    },

    smallActionText: {
        color: COLORS.white,
        fontSize: 13,
        fontWeight: "900",
    },

    blueButton: {
        backgroundColor: COLORS.primaryDark,
    },

    orangeButton: {
        backgroundColor: COLORS.primary,
    },

    darkButton: {
        backgroundColor: COLORS.neutral,
    },

    redButton: {
        backgroundColor: COLORS.danger,
    },

    segmentCard: {
        backgroundColor: COLORS.card,
        borderRadius: 16,
        padding: 6,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: COLORS.border,
        flexDirection: "row",
        gap: 6,
    },

    segmentButton: {
        flex: 1,
        alignItems: "center",
        paddingVertical: 8,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "transparent",
        backgroundColor: COLORS.neutralSoft,
    },

    segmentValue: {
        fontSize: 16,
        fontWeight: "900",
        color: COLORS.text,
    },

    segmentLabel: {
        fontSize: 11,
        fontWeight: "800",
        color: COLORS.textMuted,
        marginTop: 1,
    },

    playersCard: {
        backgroundColor: COLORS.card,
        borderRadius: 18,
        padding: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },

    playersHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
    },

    playersTitle: {
        fontSize: 17,
        fontWeight: "900",
        color: COLORS.text,
    },

    playersSubtitle: {
        fontSize: 11,
        color: COLORS.textMuted,
        fontWeight: "600",
        marginTop: 1,
    },

    remindButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: COLORS.primarySoft,
        borderWidth: 1,
        borderColor: COLORS.primary,
    },

    remindButtonText: {
        fontSize: 17,
    },

    emptyText: {
        fontSize: 15,
        color: COLORS.textLight,
        fontStyle: "italic",
        paddingVertical: 12,
        textAlign: "center",
    },

    playerRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },

    playerNumberBox: {
        width: 42,
        height: 42,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 10,
        borderWidth: 1,
    },

    playerNumberText: {
        fontSize: 16,
        fontWeight: "900",
    },

    playerContent: {
        flex: 1,
        paddingTop: 1,
    },

    playerName: {
        fontSize: 15,
        fontWeight: "900",
        color: COLORS.text,
        lineHeight: 19,
    },

    playerSubText: {
        fontSize: 12,
        color: COLORS.textMuted,
        fontWeight: "600",
        marginTop: 3,
        lineHeight: 16,
    },

    reasonBox: {
        marginTop: 8,
        backgroundColor: COLORS.dangerSoft,
        borderWidth: 1,
        borderColor: COLORS.danger,
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 8,
    },

    reasonLabel: {
        fontSize: 10,
        fontWeight: "900",
        color: COLORS.danger,
        textTransform: "uppercase",
        marginBottom: 3,
    },

    reasonText: {
        fontSize: 13,
        color: COLORS.primaryDark,
        fontWeight: "700",
        lineHeight: 17,
    },
});