import React, { useEffect, useState, useContext, useRef, useCallback, useMemo } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    StyleSheet,
    Modal,
    Pressable,
    RefreshControl,
} from "react-native";
import { useFetchWithAuth } from "@/hooks/fetchWithAuth";
import { BASE_URL } from "@/hooks/api";
import { readJsonArrayOrThrow } from "@/hooks/readResponse";
import { useRouter } from "expo-router";
import { AuthContext } from "@/context/AuthContext";
import { COLORS } from "@/constants/Colors";

const monthNames = [
    "Jún",
    "Júl",
    "August",
    "September",
    "Október",
    "November",
    "December",
    "Január",
    "Február",
    "Marec",
    "Apríl",
    "Máj",
];

const monthIndexes = [5, 6, 7, 8, 9, 10, 11, 0, 1, 2, 3, 4];

const getSeasonLabel = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return month >= 5 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
};

type TrainingStatus = "present" | "absent" | "unknown";

type Training = {
    id: number;
    description: string;
    date: string;
    location: string;
    category: number;
    category_name: string;
    user_status: TrainingStatus;
};

const STATUS_META: Record<
    TrainingStatus,
    {
        text: string;
        color: string;
        soft: string;
    }
> = {
    present: {
        text: "Zúčastnil si sa",
        color: COLORS.success,
        soft: COLORS.successSoft,
    },
    absent: {
        text: "Nezúčastnil si sa",
        color: COLORS.danger,
        soft: COLORS.dangerSoft,
    },
    unknown: {
        text: "Nezodpovedal si",
        color: COLORS.neutral,
        soft: COLORS.neutralSoft,
    },
};

function getReadableProgressColor(percent: number) {
    if (percent < 40) return COLORS.danger;
    if (percent < 70) return "#F59E0B";
    return COLORS.success;
}

function formatTrainingDate(dateString: string) {
    const dateObj = new Date(dateString);

    return {
        date: dateObj.toLocaleDateString("sk-SK", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
        }),
        time: dateObj.toLocaleTimeString("sk-SK", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
        }),
    };
}

function buildSeasonOptions(trainings: Training[]) {
    const seasonsFromTrainings = Array.from(
        new Set(trainings.map((training) => getSeasonLabel(new Date(training.date))))
    );

    const currentSeason = getSeasonLabel(new Date());
    const nextSeason = getSeasonLabel(new Date(new Date().getFullYear() + 1, 6, 1));

    return Array.from(new Set([currentSeason, nextSeason, ...seasonsFromTrainings])).sort(
        (a, b) => {
            const [aStart] = a.split("/").map(Number);
            const [bStart] = b.split("/").map(Number);
            return bStart - aStart;
        }
    );
}

export default function TrainingsScreen() {
    const { fetchWithAuth } = useFetchWithAuth();
    const { isLoggedIn, accessToken } = useContext(AuthContext);
    const router = useRouter();

    const [trainings, setTrainings] = useState<Training[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
    const [selectedSeason, setSelectedSeason] = useState<string>(getSeasonLabel(new Date()));

    const [seasonPickerVisible, setSeasonPickerVisible] = useState(false);
    const [monthPickerVisible, setMonthPickerVisible] = useState(false);

    const inflightRef = useRef(false);
    const abortedRef = useRef(false);

    const loadTrainings = useCallback(
        async (silent = false) => {
            if (!isLoggedIn || !accessToken) {
                setLoading(false);
                return;
            }

            if (inflightRef.current) return;

            abortedRef.current = false;
            inflightRef.current = true;

            if (!silent) {
                setLoading(true);
            }

            try {
                let url = `${BASE_URL}/trainings_optimalization/history/?season=${selectedSeason}`;

                if (selectedMonth !== -1) {
                    url += `&month=${selectedMonth}`;
                }

                const res = await fetchWithAuth(url);

                const data = await readJsonArrayOrThrow<Training>(res, "Nepodarilo sa načítať tréningy.");

                if (abortedRef.current) return;

                const now = new Date();

                const pastTrainings = data.filter((training) => {
                    const trainingDate = new Date(training.date);
                    return trainingDate.getTime() <= now.getTime();
                });

                setTrainings(
                    pastTrainings.sort(
                        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
                    )
                );
            } catch (err) {
                console.error("Chyba pri načítaní tréningov:", err);
            } finally {
                inflightRef.current = false;

                if (!abortedRef.current) {
                    setLoading(false);
                    setRefreshing(false);
                }
            }
        },
        [accessToken, fetchWithAuth, isLoggedIn, selectedMonth, selectedSeason]
    );

    useEffect(() => {
        void loadTrainings();

        return () => {
            abortedRef.current = true;
        };
    }, [loadTrainings]);

    const onRefresh = async () => {
        setRefreshing(true);
        await loadTrainings(true);
    };

    const seasonOptions = useMemo(() => buildSeasonOptions(trainings), [trainings]);

    const allCategories = useMemo(() => {
        return Array.from(new Set(trainings.map((training) => training.category_name)));
    }, [trainings]);

    const trainingsByCategory = useMemo(() => {
        const grouped: Record<string, Training[]> = {};

        for (const category of allCategories) {
            const filtered = trainings.filter((training) => training.category_name === category);

            if (filtered.length > 0) {
                grouped[category] = filtered;
            }
        }

        return grouped;
    }, [allCategories, trainings]);

    const statsByCategory = useMemo(() => {
        return Object.entries(trainingsByCategory).map(([category, items]) => {
            const total = items.length;
            const present = items.filter((training) => training.user_status === "present").length;
            const percent = total > 0 ? Math.round((present / total) * 100) : 0;

            return {
                category,
                total,
                present,
                percent,
            };
        });
    }, [trainingsByCategory]);

    const overallPercent = useMemo(() => {
        if (statsByCategory.length === 0) return 0;

        const sum = statsByCategory.reduce((acc, stat) => acc + stat.percent, 0);
        return Math.round(sum / statsByCategory.length);
    }, [statsByCategory]);

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Načítavam tréningy...</Text>
            </View>
        );
    }

    return (
        <View style={styles.screen}>
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => setSeasonPickerVisible(true)}
                    style={styles.filterItem}
                    activeOpacity={0.85}
                >
                    <Text style={styles.filterLabel}>Sezóna</Text>
                    <Text style={styles.filterValue}>{selectedSeason}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => setMonthPickerVisible(true)}
                    style={styles.filterItem}
                    activeOpacity={0.85}
                >
                    <Text style={styles.filterLabel}>Mesiac</Text>
                    <Text style={styles.filterValue}>
                        {selectedMonth === -1
                            ? "Všetky"
                            : monthNames[monthIndexes.indexOf(selectedMonth)]}
                    </Text>
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.scroll}
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
                {trainings.length === 0 ? (
                    <View style={styles.emptyCard}>
                        <Text style={styles.emptyTitle}>Žiadne tréningy</Text>
                        <Text style={styles.emptyText}>
                            Pre zvolenú sezónu alebo mesiac nemáš žiadne tréningy.
                        </Text>
                    </View>
                ) : (
                    <>
                        {statsByCategory.length > 1 && (
                            <View style={styles.overallBox}>
                                <View style={styles.overallHeader}>
                                    <Text style={styles.overallTitle}>Celkovo</Text>
                                    <Text style={styles.overallPercent}>{overallPercent}%</Text>
                                </View>

                                <View style={styles.progressBarContainer}>
                                    <View
                                        style={[
                                            styles.progressBarFill,
                                            {
                                                width: `${overallPercent}%`,
                                                backgroundColor: getReadableProgressColor(overallPercent),
                                            },
                                        ]}
                                    />
                                </View>
                            </View>
                        )}

                        {Object.entries(trainingsByCategory).map(([category, items]) => {
                            const total = items.length;
                            const present = items.filter(
                                (training) => training.user_status === "present"
                            ).length;
                            const percent = total > 0 ? Math.round((present / total) * 100) : 0;

                            return (
                                <View key={category} style={styles.categoryBlock}>
                                    <View style={styles.categoryHeader}>
                                        <Text style={styles.categoryTitle}>{category}</Text>
                                        <Text style={styles.categoryMeta}>
                                            {present}/{total} • {percent}%
                                        </Text>
                                    </View>

                                    <View style={styles.progressBarContainer}>
                                        <View
                                            style={[
                                                styles.progressBarFill,
                                                {
                                                    width: `${percent}%`,
                                                    backgroundColor: getReadableProgressColor(percent),
                                                },
                                            ]}
                                        />
                                    </View>

                                    {items.map((training) => {
                                        const { date, time } = formatTrainingDate(training.date);
                                        const statusMeta = STATUS_META[training.user_status];

                                        return (
                                            <TouchableOpacity
                                                key={training.id}
                                                style={styles.trainingCard}
                                                activeOpacity={0.88}
                                                onPress={() =>
                                                    router.push({
                                                        pathname: "/training/[id]",
                                                        params: { id: String(training.id) },
                                                    })
                                                }
                                            >
                                                <Text style={styles.trainingTitle}>
                                                    {training.description || "Tréning"}
                                                </Text>

                                                <Text style={styles.trainingDate}>
                                                    {time} • {date}
                                                </Text>

                                                <View style={styles.locationRow}>
                                                    <Text style={styles.locationIcon}>📍</Text>
                                                    <Text style={styles.locationText}>
                                                        {training.location || "Miesto nezadané"}
                                                    </Text>
                                                </View>

                                                <View
                                                    style={[
                                                        styles.statusBox,
                                                        {
                                                            backgroundColor: statusMeta.soft,
                                                            borderColor: statusMeta.color,
                                                        },
                                                    ]}
                                                >
                                                    <View
                                                        style={[
                                                            styles.dot,
                                                            { backgroundColor: statusMeta.color },
                                                        ]}
                                                    />
                                                    <Text
                                                        style={[
                                                            styles.statusText,
                                                            { color: statusMeta.color },
                                                        ]}
                                                    >
                                                        {statusMeta.text}
                                                    </Text>
                                                </View>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            );
                        })}
                    </>
                )}
            </ScrollView>

            <Modal visible={seasonPickerVisible} animationType="fade" transparent>
                <Pressable
                    style={styles.modalOverlay}
                    onPress={() => setSeasonPickerVisible(false)}
                >
                    <Pressable style={styles.pickerModal}>
                        <Text style={styles.modalTitle}>Vyber sezónu</Text>

                        {seasonOptions.map((season) => {
                            const isActive = selectedSeason === season;

                            return (
                                <TouchableOpacity
                                    key={season}
                                    onPress={() => {
                                        setSelectedSeason(season);
                                        setSeasonPickerVisible(false);
                                    }}
                                    style={[
                                        styles.modalOption,
                                        isActive && styles.modalOptionActive,
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.modalOptionText,
                                            isActive && styles.modalOptionTextActive,
                                        ]}
                                    >
                                        {season}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </Pressable>
                </Pressable>
            </Modal>

            <Modal visible={monthPickerVisible} animationType="fade" transparent>
                <Pressable
                    style={styles.modalOverlay}
                    onPress={() => setMonthPickerVisible(false)}
                >
                    <Pressable style={styles.pickerModalSmall}>
                        <Text style={styles.modalTitle}>Vyber mesiac</Text>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <TouchableOpacity
                                onPress={() => {
                                    setSelectedMonth(-1);
                                    setMonthPickerVisible(false);
                                }}
                                style={[
                                    styles.modalOption,
                                    selectedMonth === -1 && styles.modalOptionActive,
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.modalOptionText,
                                        selectedMonth === -1 && styles.modalOptionTextActive,
                                    ]}
                                >
                                    Všetky
                                </Text>
                            </TouchableOpacity>

                            {monthIndexes.map((index, idx) => {
                                const isActive = selectedMonth === index;

                                return (
                                    <TouchableOpacity
                                        key={index}
                                        onPress={() => {
                                            setSelectedMonth(index);
                                            setMonthPickerVisible(false);
                                        }}
                                        style={[
                                            styles.modalOption,
                                            isActive && styles.modalOptionActive,
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.modalOptionText,
                                                isActive && styles.modalOptionTextActive,
                                            ]}
                                        >
                                            {monthNames[idx]}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: COLORS.background,
    },

    scroll: {
        flex: 1,
    },

    content: {
        padding: 16,
        paddingBottom: 28,
    },

    loadingContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: COLORS.background,
    },

    loadingText: {
        marginTop: 10,
        color: COLORS.textMuted,
        fontWeight: "600",
        fontSize: 14,
    },

    header: {
        flexDirection: "row",
        gap: 10,
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: COLORS.card,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },

    filterItem: {
        flex: 1,
        backgroundColor: COLORS.primarySoft,
        borderRadius: 14,
        paddingVertical: 9,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: "#FFD1D1",
    },

    filterLabel: {
        fontSize: 10,
        fontWeight: "900",
        color: COLORS.primary,
        textTransform: "uppercase",
        marginBottom: 2,
    },

    filterValue: {
        fontSize: 14,
        fontWeight: "900",
        color: COLORS.primaryDark,
    },

    emptyCard: {
        backgroundColor: COLORS.card,
        borderRadius: 16,
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

    overallBox: {
        backgroundColor: COLORS.card,
        borderRadius: 16,
        padding: 14,
        marginBottom: 18,
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
    },

    overallHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 8,
    },

    overallTitle: {
        fontSize: 15,
        fontWeight: "900",
        color: COLORS.text,
    },

    overallPercent: {
        fontSize: 15,
        fontWeight: "900",
        color: COLORS.primary,
    },

    categoryBlock: {
        marginBottom: 22,
    },

    categoryHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
    },

    categoryTitle: {
        fontSize: 19,
        fontWeight: "900",
        color: COLORS.text,
    },

    categoryMeta: {
        fontSize: 13,
        fontWeight: "800",
        color: COLORS.textMuted,
    },

    progressBarContainer: {
        height: 9,
        backgroundColor: COLORS.neutralSoft,
        borderRadius: 999,
        marginBottom: 12,
        overflow: "hidden",
    },

    progressBarFill: {
        height: "100%",
        borderRadius: 999,
    },

    trainingCard: {
        backgroundColor: COLORS.card,
        borderRadius: 16,
        padding: 15,
        marginBottom: 13,
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 2,
    },

    trainingTitle: {
        fontSize: 18,
        fontWeight: "900",
        color: COLORS.primaryDark,
        marginBottom: 5,
    },

    trainingDate: {
        color: COLORS.textMuted,
        marginBottom: 6,
        fontSize: 14,
        fontWeight: "700",
        textTransform: "capitalize",
    },

    locationRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 10,
        marginTop: 2,
    },

    locationIcon: {
        fontSize: 14,
        color: COLORS.primary,
        marginRight: 4,
    },

    locationText: {
        flex: 1,
        fontSize: 15,
        color: COLORS.textSecondary,
        fontWeight: "600",
    },

    statusBox: {
        alignSelf: "flex-start",
        flexDirection: "row",
        alignItems: "center",
        gap: 7,
        borderWidth: 1,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 5,
    },

    dot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },

    statusText: {
        fontSize: 13,
        fontWeight: "900",
    },

    modalOverlay: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0,0,0,0.35)",
        padding: 20,
    },

    pickerModal: {
        backgroundColor: COLORS.card,
        padding: 18,
        borderRadius: 18,
        width: "100%",
        maxWidth: 320,
        alignItems: "stretch",
    },

    pickerModalSmall: {
        backgroundColor: COLORS.card,
        padding: 18,
        borderRadius: 18,
        width: "100%",
        maxWidth: 260,
        maxHeight: 620,
        alignItems: "stretch",
    },

    modalTitle: {
        textAlign: "center",
        fontSize: 17,
        fontWeight: "900",
        color: COLORS.text,
        marginBottom: 12,
    },

    modalOption: {
        paddingVertical: 11,
        paddingHorizontal: 14,
        borderRadius: 12,
        backgroundColor: COLORS.neutralSoft,
        marginBottom: 7,
        borderWidth: 1,
        borderColor: COLORS.border,
    },

    modalOptionActive: {
        backgroundColor: COLORS.primarySoft,
        borderColor: COLORS.primary,
    },

    modalOptionText: {
        textAlign: "center",
        fontSize: 15,
        fontWeight: "800",
        color: COLORS.text,
    },

    modalOptionTextActive: {
        color: COLORS.primary,
    },
});
