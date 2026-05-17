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
import * as Linking from "expo-linking";
import { SafeAreaView } from "react-native-safe-area-context";

import { useFetchWithAuth } from "@/hooks/fetchWithAuth";
import { BASE_URL } from "@/hooks/api";
import { AuthContext } from "@/context/AuthContext";
import { COLORS } from "@/constants/Colors";

type VoteStatusKey = "players_present" | "players_absent" | "players_unknown";
type NominationStatusKey = "starter" | "substitute";

type PlayerVote = {
    user_id: number;
    name: string;
    number?: number | string | null;
    birth_date?: string | null;
    reason?: string | null;
};

type MatchNomination = {
    user_id: number;
    name: string;
    number?: number | string | null;
    birth_date?: string | null;
    is_substitute: boolean;
    confirmed: boolean | null;
    rating?: number | null;
    plus_minus?: number | null;
    goals?: number | null;
};

type MatchDetail = {
    id: number;
    category_name: string;
    opponent: string;
    date: string;
    location: string;
    description?: string | null;
    video_link?: string | null;
    nominations_created: boolean;
    players_present: PlayerVote[];
    players_absent: PlayerVote[];
    players_unknown: PlayerVote[];
    nominations: MatchNomination[];
};

const VOTE_STATUS_META: Record<
    VoteStatusKey,
    {
        label: string;
        title: string;
        color: string;
        bg: string;
    }
> = {
    players_present: {
        label: "Môžu",
        title: "Môžu prísť",
        color: COLORS.success,
        bg: COLORS.successSoft,
    },
    players_absent: {
        label: "Nemôžu",
        title: "Nemôžu prísť",
        color: COLORS.danger,
        bg: COLORS.dangerSoft,
    },
    players_unknown: {
        label: "Bez odp.",
        title: "Nehlasovali",
        color: COLORS.neutral,
        bg: COLORS.neutralSoft,
    },
};

const NOMINATION_STATUS_META: Record<
    NominationStatusKey,
    {
        label: string;
        title: string;
        color: string;
        bg: string;
    }
> = {
    starter: {
        label: "Základ",
        title: "Základná zostava",
        color: COLORS.success,
        bg: COLORS.successSoft,
    },
    substitute: {
        label: "Náhradníci",
        title: "Náhradníci",
        color: COLORS.primaryDark,
        bg: COLORS.primarySoft,
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

function getBirthYear(birthDate?: string | null) {
    if (!birthDate) return "";

    if (birthDate.includes(".")) {
        const parts = birthDate.split(".");
        return parts[2] ? ` (${parts[2]})` : "";
    }

    return birthDate.length >= 4 ? ` (${birthDate.slice(0, 4)})` : "";
}

function sortPlayersByNumber<T extends { number?: number | string | null; name: string }>(players: T[]) {
    return [...players].sort((a, b) => {
        const aNumber = Number(a.number);
        const bNumber = Number(b.number);

        const aValid = !Number.isNaN(aNumber);
        const bValid = !Number.isNaN(bNumber);

        if (aValid && bValid) return aNumber - bNumber;
        if (aValid) return -1;
        if (bValid) return 1;

        return a.name.localeCompare(b.name);
    });
}

function getConfirmationMeta(confirmed: boolean | null) {
    if (confirmed === true) {
        return {
            label: "Príde",
            color: COLORS.success,
            bg: COLORS.successSoft,
        };
    }

    if (confirmed === false) {
        return {
            label: "Nepríde",
            color: COLORS.danger,
            bg: COLORS.dangerSoft,
        };
    }

    return {
        label: "Čaká",
        color: COLORS.neutral,
        bg: COLORS.neutralSoft,
    };
}

export default function MatchDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { fetchWithAuth } = useFetchWithAuth();
    const router = useRouter();

    const [match, setMatch] = useState<MatchDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [reminding, setReminding] = useState(false);

    const [activeVoteStatus, setActiveVoteStatus] = useState<VoteStatusKey>("players_present");
    const [activeNominationStatus, setActiveNominationStatus] =
        useState<NominationStatusKey>("starter");

    const { currentRole } = useContext(AuthContext);
    const currentRoleName = currentRole?.role?.toLowerCase();
    const isCoach = currentRoleName === "coach" || currentRoleName === "tréner";

    const loadMatch = useCallback(
        async (silent = false) => {
            if (!id) return;

            if (!silent) {
                setLoading(true);
            }

            try {
                const res = await fetchWithAuth(`${BASE_URL}/match-detail/${id}/`);

                if (!res.ok) {
                    throw new Error("Nepodarilo sa načítať detail zápasu.");
                }

                const data: MatchDetail = await res.json();

                setMatch({
                    ...data,
                    nominations_created: Boolean(data.nominations_created),
                    players_present: Array.isArray(data.players_present) ? data.players_present : [],
                    players_absent: Array.isArray(data.players_absent) ? data.players_absent : [],
                    players_unknown: Array.isArray(data.players_unknown) ? data.players_unknown : [],
                    nominations: Array.isArray(data.nominations) ? data.nominations : [],
                });
            } catch (err) {
                console.error("❌ Chyba pri načítaní zápasu:", err);
                Alert.alert("Chyba", "Nepodarilo sa načítať detail zápasu.");
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        },
        [fetchWithAuth, id]
    );

    useEffect(() => {
        void loadMatch();
    }, [loadMatch]);

    const onRefresh = () => {
        setRefreshing(true);
        void loadMatch(true);
    };

    const stats = useMemo(() => {
        if (!match) {
            return {
                present: 0,
                absent: 0,
                unknown: 0,
                totalVotes: 0,
                starters: 0,
                substitutes: 0,
                totalNominated: 0,
                confirmed: 0,
                declined: 0,
                waiting: 0,
                responsePercent: 0,
                confirmationPercent: 0,
            };
        }

        const present = match.players_present.length;
        const absent = match.players_absent.length;
        const unknown = match.players_unknown.length;
        const totalVotes = present + absent + unknown;

        const starters = match.nominations.filter((p) => !p.is_substitute).length;
        const substitutes = match.nominations.filter((p) => p.is_substitute).length;
        const totalNominated = starters + substitutes;

        const confirmed = match.nominations.filter((p) => p.confirmed === true).length;
        const declined = match.nominations.filter((p) => p.confirmed === false).length;
        const waiting = match.nominations.filter((p) => p.confirmed === null).length;

        const responsePercent =
            totalVotes > 0 ? Math.round(((present + absent) / totalVotes) * 100) : 0;

        const confirmationPercent =
            totalNominated > 0 ? Math.round((confirmed / totalNominated) * 100) : 0;

        return {
            present,
            absent,
            unknown,
            totalVotes,
            starters,
            substitutes,
            totalNominated,
            confirmed,
            declined,
            waiting,
            responsePercent,
            confirmationPercent,
        };
    }, [match]);

    const isPastMatch = match ? new Date(match.date) < new Date() : false;

    const activeVoteMeta = VOTE_STATUS_META[activeVoteStatus];
    const activeNominationMeta = NOMINATION_STATUS_META[activeNominationStatus];

    const sortedVotePlayers = useMemo(() => {
        if (!match) return [];
        return sortPlayersByNumber(match[activeVoteStatus]);
    }, [activeVoteStatus, match]);

    const sortedNominationPlayers = useMemo(() => {
        if (!match) return [];

        const isSubstitute = activeNominationStatus === "substitute";

        return sortPlayersByNumber(
            match.nominations.filter((p) => p.is_substitute === isSubstitute)
        );
    }, [activeNominationStatus, match]);

    const handleOpenVideo = async () => {
        if (!match?.video_link) return;

        try {
            const link = match.video_link.startsWith("http")
                ? match.video_link
                : `https://${match.video_link}`;

            const canOpen = await Linking.canOpenURL(link);

            if (!canOpen) {
                Alert.alert("Chyba", "Tento odkaz sa nedá otvoriť.");
                return;
            }

            await Linking.openURL(link);
        } catch {
            Alert.alert("Chyba", "Nepodarilo sa otvoriť video.");
        }
    };

    const handleDeleteMatch = () => {
        if (!match) return;

        Alert.alert("Zmazať zápas?", "Naozaj chceš zmazať tento zápas?", [
            { text: "Zrušiť", style: "cancel" },
            {
                text: "Zmazať",
                style: "destructive",
                onPress: async () => {
                    try {
                        const res = await fetchWithAuth(`${BASE_URL}/matches/delete/${match.id}/`, {
                            method: "DELETE",
                        });

                        if (!res.ok) {
                            throw new Error("Chyba pri mazaní");
                        }

                        Alert.alert("Zmazané", "Zápas bol úspešne zmazaný.");
                        router.back();
                    } catch (err) {
                        console.error("❌ Chyba pri mazaní zápasu:", err);
                        Alert.alert("Chyba", "Nepodarilo sa zmazať zápas.");
                    }
                },
            },
        ]);
    };

    const handleRemindUnknownPlayers = async () => {
        if (!match || reminding) return;

        try {
            setReminding(true);

            const players = match.players_unknown;

            const res = await fetchWithAuth(`${BASE_URL}/remind-match-attendance/`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    match_id: match.id,
                    user_ids: players.map((p) => p.user_id),
                }),
            });

            if (!res.ok) {
                throw new Error("Chyba pri odosielaní pripomienky");
            }

            Alert.alert("Odoslané", "Pripomienka bola odoslaná hráčom.");
        } catch (e) {
            console.error("❌ Pripomienka sa nepodarila:", e);
            Alert.alert("Chyba", "Nepodarilo sa odoslať pripomienku.");
        } finally {
            setReminding(false);
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.loadingWrap}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={styles.loadingText}>Načítavam zápas...</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (!match) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>Zápas nebol nájdený.</Text>
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
                            <Text style={styles.category}>{match.category_name}</Text>
                            <Text style={styles.title}>{match.opponent || "Zápas"}</Text>
                            <Text style={styles.detail}>📅 {formatDate(match.date)}</Text>
                            <Text style={styles.detail}>📍 {match.location || "Miesto nezadané"}</Text>

                            {match.description ? (
                                <Text style={styles.descriptionText}>{match.description}</Text>
                            ) : null}
                        </View>

                        <View style={styles.percentBox}>
                            <Text style={styles.percentValue}>
                                {match.nominations_created
                                    ? `${stats.confirmationPercent}%`
                                    : `${stats.responsePercent}%`}
                            </Text>
                            <Text style={styles.percentLabel}>
                                {match.nominations_created ? "potvrdené" : "odpovedí"}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.progressTrack}>
                        <View
                            style={[
                                styles.progressFill,
                                {
                                    width: `${
                                        match.nominations_created
                                            ? Math.min(stats.confirmationPercent, 100)
                                            : Math.min(stats.responsePercent, 100)
                                    }%`,
                                },
                            ]}
                        />
                    </View>

                    {!match.nominations_created ? (
                        <View style={styles.statsRow}>
                            <View style={styles.statItem}>
                                <Text style={[styles.statValue, { color: COLORS.success }]}>
                                    {stats.present}
                                </Text>
                                <Text style={styles.statLabel}>môžu</Text>
                            </View>

                            <View style={styles.statItem}>
                                <Text style={[styles.statValue, { color: COLORS.danger }]}>
                                    {stats.absent}
                                </Text>
                                <Text style={styles.statLabel}>nemôžu</Text>
                            </View>

                            <View style={styles.statItem}>
                                <Text style={[styles.statValue, { color: COLORS.neutral }]}>
                                    {stats.unknown}
                                </Text>
                                <Text style={styles.statLabel}>bez odp.</Text>
                            </View>
                        </View>
                    ) : (
                        <View style={styles.statsRow}>
                            <View style={styles.statItem}>
                                <Text style={[styles.statValue, { color: COLORS.success }]}>
                                    {stats.starters}
                                </Text>
                                <Text style={styles.statLabel}>základ</Text>
                            </View>

                            <View style={styles.statItem}>
                                <Text style={[styles.statValue, { color: COLORS.primaryDark }]}>
                                    {stats.substitutes}
                                </Text>
                                <Text style={styles.statLabel}>náhradníci</Text>
                            </View>

                            <View style={styles.statItem}>
                                <Text style={[styles.statValue, { color: COLORS.neutral }]}>
                                    {stats.waiting}
                                </Text>
                                <Text style={styles.statLabel}>čaká</Text>
                            </View>
                        </View>
                    )}
                </View>

                {isCoach && (
                    <View style={styles.coachCard}>
                        {match.nominations_created && (
                            <TouchableOpacity
                                style={[styles.smallActionButton, styles.greenButton]}
                                onPress={() => router.push(`/match/stats/${match.id}`)}
                                activeOpacity={0.85}
                            >
                                <Text style={styles.smallActionText}>Štatistiky</Text>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity
                            style={[styles.smallActionButton, styles.blueButton]}
                            onPress={() => router.push(`/match/edit/${match.id}`)}
                            activeOpacity={0.85}
                        >
                            <Text style={styles.smallActionText}>Upraviť</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.smallActionButton, styles.darkButton]}
                            onPress={() => router.push(`/match/nominations/${match.id}`)}
                            activeOpacity={0.85}
                        >
                            <Text style={styles.smallActionText}>Nominácia</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.smallActionButton, styles.redButton]}
                            onPress={handleDeleteMatch}
                            activeOpacity={0.85}
                        >
                            <Text style={styles.smallActionText}>Zmazať</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {match.video_link ? (
                    <TouchableOpacity
                        style={styles.videoButton}
                        onPress={handleOpenVideo}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.videoButtonText}>🎥 Video zo zápasu</Text>
                    </TouchableOpacity>
                ) : null}

                {!match.nominations_created ? (
                    <>
                        <View style={styles.segmentCard}>
                            {(["players_present", "players_absent", "players_unknown"] as VoteStatusKey[]).map(
                                (status) => {
                                    const meta = VOTE_STATUS_META[status];
                                    const count = match[status].length;
                                    const isActive = activeVoteStatus === status;

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
                                            onPress={() => setActiveVoteStatus(status)}
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
                                }
                            )}
                        </View>

                        <View style={styles.playersCard}>
                            <View style={styles.playersHeader}>
                                <View>
                                    <Text style={styles.playersTitle}>{activeVoteMeta.title}</Text>
                                    <Text style={styles.playersSubtitle}>
                                        Zápas zatiaľ nemá zverejnenú nomináciu
                                    </Text>
                                </View>

                                {activeVoteStatus === "players_unknown" &&
                                    sortedVotePlayers.length > 0 &&
                                    isCoach &&
                                    !isPastMatch && (
                                        <TouchableOpacity
                                            style={styles.remindButton}
                                            onPress={handleRemindUnknownPlayers}
                                            disabled={reminding}
                                        >
                                            <Text style={styles.remindButtonText}>
                                                {reminding ? "..." : "🔔"}
                                            </Text>
                                        </TouchableOpacity>
                                    )}
                            </View>

                            {sortedVotePlayers.length === 0 ? (
                                <Text style={styles.emptyText}>– nikto –</Text>
                            ) : (
                                sortedVotePlayers.map((player) => {
                                    const number = player.number ? String(player.number) : "–";

                                    return (
                                        <View key={player.user_id} style={styles.playerRow}>
                                            <View
                                                style={[
                                                    styles.playerNumberBox,
                                                    {
                                                        backgroundColor: activeVoteMeta.bg,
                                                        borderColor: activeVoteMeta.color,
                                                    },
                                                ]}
                                            >
                                                <Text
                                                    style={[
                                                        styles.playerNumberText,
                                                        { color: activeVoteMeta.color },
                                                    ]}
                                                >
                                                    {number}
                                                </Text>
                                            </View>

                                            <View style={styles.playerContent}>
                                                <Text style={styles.playerName} numberOfLines={1}>
                                                    {player.name}
                                                    {getBirthYear(player.birth_date)}
                                                </Text>

                                                {activeVoteStatus === "players_absent" &&
                                                    player.reason &&
                                                    isCoach && (
                                                        <View style={styles.reasonBox}>
                                                            <Text style={styles.reasonLabel}>
                                                                Dôvod neúčasti
                                                            </Text>
                                                            <Text style={styles.reasonText}>
                                                                {player.reason}
                                                            </Text>
                                                        </View>
                                                    )}
                                            </View>
                                        </View>
                                    );
                                })
                            )}
                        </View>
                    </>
                ) : (
                    <>
                        <View style={styles.segmentCard}>
                            {(["starter", "substitute"] as NominationStatusKey[]).map((status) => {
                                const meta = NOMINATION_STATUS_META[status];
                                const count =
                                    status === "starter" ? stats.starters : stats.substitutes;
                                const isActive = activeNominationStatus === status;

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
                                        onPress={() => setActiveNominationStatus(status)}
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
                                    <Text style={styles.playersTitle}>{activeNominationMeta.title}</Text>
                                    <Text style={styles.playersSubtitle}>
                                        Zverejnená nominácia na zápas
                                    </Text>
                                </View>
                            </View>

                            {sortedNominationPlayers.length === 0 ? (
                                <Text style={styles.emptyText}>– nikto –</Text>
                            ) : (
                                sortedNominationPlayers.map((player) => {
                                    const number = player.number ? String(player.number) : "–";
                                    const confirmation = getConfirmationMeta(player.confirmed);

                                    return (
                                        <View key={player.user_id} style={styles.playerRow}>
                                            <View
                                                style={[
                                                    styles.playerNumberBox,
                                                    {
                                                        backgroundColor: activeNominationMeta.bg,
                                                        borderColor: activeNominationMeta.color,
                                                    },
                                                ]}
                                            >
                                                <Text
                                                    style={[
                                                        styles.playerNumberText,
                                                        { color: activeNominationMeta.color },
                                                    ]}
                                                >
                                                    {number}
                                                </Text>
                                            </View>

                                            <View style={styles.playerContent}>
                                                <Text style={styles.playerName} numberOfLines={1}>
                                                    {player.name}
                                                    {getBirthYear(player.birth_date)}
                                                </Text>
                                            </View>

                                            <View
                                                style={[
                                                    styles.confirmationBadge,
                                                    {
                                                        backgroundColor: confirmation.bg,
                                                        borderColor: confirmation.color,
                                                    },
                                                ]}
                                            >
                                                <Text
                                                    style={[
                                                        styles.confirmationText,
                                                        { color: confirmation.color },
                                                    ]}
                                                >
                                                    {confirmation.label}
                                                </Text>
                                            </View>
                                        </View>
                                    );
                                })
                            )}
                        </View>
                    </>
                )}
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

    descriptionText: {
        fontSize: 13,
        color: COLORS.text,
        fontWeight: "600",
        lineHeight: 18,
        marginTop: 4,
    },

    percentBox: {
        alignItems: "center",
        backgroundColor: COLORS.neutralSoft,
        borderRadius: 14,
        paddingVertical: 8,
        paddingHorizontal: 10,
        minWidth: 72,
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

    greenButton: {
        backgroundColor: COLORS.success,
    },

    blueButton: {
        backgroundColor: COLORS.primaryDark,
    },

    darkButton: {
        backgroundColor: COLORS.neutral,
    },

    redButton: {
        backgroundColor: COLORS.danger,
    },

    videoButton: {
        backgroundColor: COLORS.card,
        borderRadius: 16,
        paddingVertical: 12,
        paddingHorizontal: 12,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: COLORS.border,
        alignItems: "center",
    },

    videoButtonText: {
        color: COLORS.primaryDark,
        fontSize: 14,
        fontWeight: "900",
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
        fontWeight: "900",
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

    statsMiniRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 6,
        marginTop: 6,
    },

    statsMiniChip: {
        fontSize: 11,
        color: COLORS.textMuted,
        fontWeight: "800",
        backgroundColor: COLORS.card,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 999,
        paddingHorizontal: 7,
        paddingVertical: 3,
    },

    confirmationBadge: {
        minWidth: 62,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 8,
        paddingVertical: 6,
        borderRadius: 999,
        borderWidth: 1,
        marginLeft: 8,
    },

    confirmationText: {
        fontSize: 11,
        fontWeight: "900",
    },
});