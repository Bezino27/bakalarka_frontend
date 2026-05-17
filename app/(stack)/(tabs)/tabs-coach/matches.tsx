// app/(tabs)/matches.tsx

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    View,
    Text,
    ScrollView,
    ActivityIndicator,
    TouchableOpacity,
    StyleSheet,
    ImageBackground,
    RefreshControl,
} from "react-native";
import { useFetchWithAuth } from "@/hooks/fetchWithAuth";
import { BASE_URL } from "@/hooks/api";
import { router } from "expo-router";
import { COLORS } from "@/constants/Colors";

type MatchFilter = "NEODOHRANÉ" | "ODOHRANÉ";

type Match = {
    id: number;
    club_name: string;
    date: string;
    location: string;
    opponent: string;
    description: string;
    category: number;
    category_name: string;
    user_status: "confirmed" | "declined" | "unknown";
    is_home: boolean;
};

function getFilterParam(filter: MatchFilter) {
    return filter === "ODOHRANÉ" ? "past" : "upcoming";
}

function formatMatchDate(dateString: string) {
    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
        return {
            time: "--:--",
            date: "Neplatný dátum",
        };
    }

    return {
        time: date.toLocaleTimeString("sk-SK", {
            hour: "2-digit",
            minute: "2-digit",
        }),
        date: date.toLocaleDateString("sk-SK", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
        }),
    };
}

export default function MatchesScreen() {
    const { fetchWithAuth } = useFetchWithAuth();

    const [matches, setMatches] = useState<Match[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState<MatchFilter>("NEODOHRANÉ");

    const fetchMatches = useCallback(
        async (filterParam: "past" | "upcoming", isRefresh = false) => {
            try {
                if (!isRefresh) {
                    setLoading(true);
                }

                const response = await fetchWithAuth(
                    `${BASE_URL}/matches-coach/?filter=${filterParam}`
                );

                if (!response.ok) {
                    console.error("❌ Chyba pri načítaní zápasov:", await response.text());
                    return;
                }

                const data = await response.json();
                const matchesData: Match[] = Array.isArray(data) ? data : [];

                const sorted = matchesData.sort((a, b) => {
                    const aTime = new Date(a.date).getTime();
                    const bTime = new Date(b.date).getTime();

                    if (filterParam === "past") {
                        return bTime - aTime;
                    }

                    return aTime - bTime;
                });

                setMatches(sorted);
            } catch (err) {
                console.error("❌ Fetch error:", err);
            } finally {
                if (!isRefresh) {
                    setLoading(false);
                }

                setRefreshing(false);
            }
        },
        [fetchWithAuth]
    );

    useEffect(() => {
        void fetchMatches(getFilterParam(filter));
    }, [fetchMatches, filter]);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchMatches(getFilterParam(filter), true);
    };

    const groupedMatches = useMemo(() => {
        return matches.reduce<Record<string, Match[]>>((acc, match) => {
            if (!acc[match.category_name]) {
                acc[match.category_name] = [];
            }

            acc[match.category_name].push(match);
            return acc;
        }, {});
    }, [matches]);

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Načítavam zápasy...</Text>
            </View>
        );
    }

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    tintColor={COLORS.primary}
                    colors={[COLORS.primary]}
                />
            }
            showsVerticalScrollIndicator={false}
        >
            <View style={styles.filterRow}>
                {(["NEODOHRANÉ", "ODOHRANÉ"] as MatchFilter[]).map((filterItem) => {
                    const isActive = filter === filterItem;

                    return (
                        <TouchableOpacity
                            key={filterItem}
                            onPress={() => setFilter(filterItem)}
                            activeOpacity={0.85}
                            style={[
                                styles.filterButton,
                                isActive && styles.filterButtonActive,
                            ]}
                        >
                            <Text
                                style={[
                                    styles.filterText,
                                    isActive && styles.filterTextActive,
                                ]}
                            >
                                {filterItem}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {Object.entries(groupedMatches).length === 0 ? (
                <View style={styles.emptyCard}>
                    <Text style={styles.emptyTitle}>Žiadne zápasy</Text>
                    <Text style={styles.emptyText}>
                        Pre zvolený filter momentálne nie sú dostupné žiadne zápasy.
                    </Text>
                </View>
            ) : (
                Object.entries(groupedMatches).map(([category, items]) => (
                    <View key={category} style={styles.categorySection}>
                        <Text style={styles.categoryTitle}>{category}</Text>

                        {items.map((match) => {
                            const formatted = formatMatchDate(match.date);
                            const imageSource = match.is_home
                                ? require("@/assets/images/zapas_doma.png")
                                : require("@/assets/images/zapas_vonku.png");

                            return (
                                <TouchableOpacity
                                    key={match.id}
                                    activeOpacity={0.9}
                                    onPress={() => router.push(`/match/${match.id}`)}
                                    style={styles.touchableCard}
                                >
                                    <ImageBackground
                                        source={imageSource}
                                        imageStyle={styles.cardImage}
                                        style={styles.card}
                                    >
                                        <View style={styles.cardOverlay}>
                                            <View style={styles.cardTopRow}>
                                                <View style={styles.matchTypeBadge}>
                                                    <Text style={styles.matchTypeText}>
                                                        {match.is_home ? "DOMA" : "VONKU"}
                                                    </Text>
                                                </View>

                                                <Text style={styles.timeText}>{formatted.time}</Text>
                                            </View>

                                            <Text style={styles.title} numberOfLines={2}>
                                                {match.opponent || "Súper nezadaný"}
                                            </Text>

                                            <Text style={styles.date} numberOfLines={1}>
                                                {formatted.date}
                                            </Text>

                                            <View style={styles.locationRow}>
                                                <Text style={styles.locationPin}>📍</Text>
                                                <Text style={styles.location} numberOfLines={1}>
                                                    {match.location || "Miesto nezadané"}
                                                </Text>
                                            </View>

                                            {match.description ? (
                                                <Text style={styles.description} numberOfLines={2}>
                                                    {match.description}
                                                </Text>
                                            ) : null}
                                        </View>
                                    </ImageBackground>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                ))
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },

    content: {
        padding: 14,
        paddingBottom: 26,
    },

    loadingContainer: {
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

    filterRow: {
        flexDirection: "row",
        gap: 8,
        marginBottom: 18,
        backgroundColor: COLORS.card,
        borderRadius: 16,
        padding: 6,
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
    },

    filterButton: {
        flex: 1,
        alignItems: "center",
        paddingVertical: 9,
        borderRadius: 12,
        backgroundColor: "transparent",
    },

    filterButtonActive: {
        backgroundColor: COLORS.primary,
    },

    filterText: {
        color: COLORS.textMuted,
        fontWeight: "800",
        fontSize: 12,
    },

    filterTextActive: {
        color: COLORS.white,
        fontWeight: "900",
    },

    emptyCard: {
        backgroundColor: COLORS.card,
        borderRadius: 14,
        padding: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
        alignItems: "center",
        marginTop: 20,
    },

    emptyTitle: {
        fontSize: 18,
        fontWeight: "800",
        color: COLORS.text,
        marginBottom: 6,
    },

    emptyText: {
        fontSize: 14,
        color: COLORS.textMuted,
        textAlign: "center",
        lineHeight: 20,
    },

    categorySection: {
        marginBottom: 22,
    },

    categoryTitle: {
        fontWeight: "800",
        fontSize: 18,
        marginBottom: 12,
        color: COLORS.text,
    },

    touchableCard: {
        marginBottom: 14,
        borderRadius: 14,
    },

    card: {
        borderRadius: 14,
        overflow: "hidden",
        backgroundColor: COLORS.card,
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 5,
        elevation: 3,
    },

    cardImage: {
        borderRadius: 14,
        resizeMode: "cover",
        opacity: 0.92,
    },

    cardOverlay: {
        padding: 14,
        minHeight: 138,
        borderRadius: 14,
        backgroundColor: "rgba(255,255,255,0.62)",
    },

    cardTopRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 8,
    },

    matchTypeBadge: {
        alignSelf: "flex-start",
        backgroundColor: "rgba(255,241,241,0.86)",
        paddingHorizontal: 9,
        paddingVertical: 4,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: "rgba(211,47,47,0.2)",
    },

    matchTypeText: {
        fontSize: 10,
        fontWeight: "900",
        color: COLORS.primary,
        letterSpacing: 0.4,
    },

    timeText: {
        fontSize: 15,
        fontWeight: "900",
        color: COLORS.primaryDark,
        textShadowColor: "rgba(255,255,255,0.7)",
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },

    title: {
        fontSize: 20,
        fontWeight: "900",
        color: COLORS.primaryDark,
        marginBottom: 5,
        textShadowColor: "rgba(255,255,255,0.72)",
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },

    date: {
        color: COLORS.textMuted,
        fontWeight: "700",
        marginBottom: 6,
        fontSize: 14,
        textTransform: "capitalize",
    },

    locationRow: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 2,
    },

    locationPin: {
        fontSize: 14,
        color: COLORS.pin,
        marginRight: 4,
    },

    location: {
        fontSize: 15,
        color: COLORS.textSecondary,
        fontWeight: "600",
        flex: 1,
    },

    description: {
        marginTop: 8,
        fontSize: 13,
        color: COLORS.textMuted,
        fontWeight: "600",
        lineHeight: 18,
    },
});
