import React, { useCallback, useEffect, useState, useContext, useRef } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    StyleSheet,
    Modal,
    Pressable,
} from 'react-native';
import { useFetchWithAuth } from '@/hooks/fetchWithAuth';
import { BASE_URL } from '@/hooks/api';
import { readJsonArrayOrThrow } from '@/hooks/readResponse';
import { useRouter } from 'expo-router';
import { AuthContext } from '@/context/AuthContext';
import { useFocusEffect } from '@react-navigation/native';

const monthNames = [
    'Jún', 'Júl', 'August', 'September', 'Október', 'November',
    'December', 'Január', 'Február', 'Marec', 'Apríl', 'Máj'
];
const monthIndexes = [5, 6, 7, 8, 9, 10, 11, 0, 1, 2, 3, 4];

const getSeasonLabel = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth(); // 0–11
    // Sezóna sa začína v júni (5) a končí v máji (4)
    if (month >= 5) {
        // od júna po december ide o sezónu aktuálny/aktuálny+1
        return `${year}/${year + 1}`;
    } else {
        // od januára po máj ide o sezónu predchádzajúci/aktuálny
        return `${year - 1}/${year}`;
    }
};

type Training = {
    id: number;
    description: string;
    date: string;
    location: string;
    category: number;
    category_name: string;
    attendance_summary: {
        present: number;
        goalies: number;
    };
};

export default function TrainingsScreen() {
    const { fetchWithAuth } = useFetchWithAuth();
    const { isLoggedIn, accessToken } = useContext(AuthContext);
    const router = useRouter();

    const [trainings, setTrainings] = useState<Training[]>([]);
    const [loading, setLoading] = useState(true);

    const [selectedSeason, setSelectedSeason] = useState<string>(getSeasonLabel(new Date()));
    const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());

    const [seasonPickerVisible, setSeasonPickerVisible] = useState(false);
    const [monthPickerVisible, setMonthPickerVisible] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    const inflightRef = useRef(false);
    const abortedRef = useRef(false);

const fetchTrainings = useCallback(async (season?: string, month?: number) => {
    if (inflightRef.current) return;
    inflightRef.current = true;
    setLoading(true);

    try {
        let url = `${BASE_URL}/coach-trainings-optimalization/?`;
        if (season) url += `season=${season}&`;
        if (month !== undefined) url += `month=${month}`;

        console.log("📡 Fetching:", url);
        const res = await fetchWithAuth(url);
        const trainingsData = await readJsonArrayOrThrow<Training>(res, "Nepodarilo sa načítať tréningy.");
        if (abortedRef.current) return;

        setTrainings(trainingsData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    } catch (err) {
        console.error("Chyba pri načítaní tréningov:", err);
    } finally {
        inflightRef.current = false;
        if (!abortedRef.current) setLoading(false);
    }
}, [fetchWithAuth]);

    
    useEffect(() => {
        if (!isLoggedIn || !accessToken) return;
        abortedRef.current = false;
        void fetchTrainings(selectedSeason, selectedMonth);
        return () => {
            abortedRef.current = true;
        };
    }, [isLoggedIn, accessToken, fetchTrainings, selectedMonth, selectedSeason]);

    useFocusEffect(
    React.useCallback(() => {
        abortedRef.current = false;
        void fetchTrainings(selectedSeason, selectedMonth);
        return () => {
            abortedRef.current = true;
        };
    }, [fetchTrainings, selectedSeason, selectedMonth])
);
    const allCategories = Array.from(new Set(trainings.map(t => t.category_name)));

    const filteredTrainings =
        selectedCategory === null
            ? trainings
            : trainings.filter(t => t.category_name === selectedCategory);

const renderTrainingCard = (t: Training) => {
    const dateObj = new Date(t.date);
    const formattedDate = dateObj.toLocaleDateString('sk-SK', {
        weekday: 'short', day: 'numeric', month: 'numeric'
    });
    const formattedTime = dateObj.toLocaleTimeString('sk-SK', {
        hour: '2-digit', minute: '2-digit', hour12: false,
    });

    return (
        <TouchableOpacity
            key={t.id}
            style={styles.trainingRow}
            onPress={() => router.push({ pathname: '/training/[id]', params: { id: String(t.id) } })}
        >
            <View style={styles.rowLeft}>
                <Text style={styles.trainingTitleSmall}>{t.description || 'Tréning'}</Text>
                <Text style={styles.trainingSubInfo}>
                    {formattedDate} • {formattedTime} • {t.location}
                </Text>
            </View>
            <Text style={styles.countsSmall}>
                {t.attendance_summary.present} + {t.attendance_summary.goalies}
            </Text>
        </TouchableOpacity>
    );
};


    if (loading) return <ActivityIndicator style={{ marginTop: 50 }} />;

    return (
        <View style={{ flex: 1, backgroundColor: '#f4f4f8' }}>
            {/* 🔹 Výber sezóny a mesiaca */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => setSeasonPickerVisible(true)} style={styles.filterItem}>
                    <Text style={styles.season}>{selectedSeason}</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setMonthPickerVisible(true)} style={styles.filterItem}>
                    <Text style={styles.season}>
                        {monthNames[monthIndexes.indexOf(selectedMonth)]}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* 🔹 Filter kategórie */}
            {allCategories.length > 1 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                    <TouchableOpacity
                        onPress={() => setSelectedCategory(null)}
                        style={[styles.filterItem, selectedCategory === null && styles.activeFilter]}
                    >
                        <Text style={styles.season}>Všetky</Text>
                    </TouchableOpacity>
                    {allCategories.map(cat => (
                        <TouchableOpacity
                            key={cat}
                            onPress={() => setSelectedCategory(cat)}
                            style={[styles.filterItem, selectedCategory === cat && styles.activeFilter]}
                        >
                            <Text style={styles.season}>{cat}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            )}

            {/* 🔹 Zoznam tréningov */}
            <ScrollView style={{ padding: 20 }}>
                {selectedCategory === null
                    ? Object.entries(
                        filteredTrainings.reduce<Record<string, Training[]>>((acc, curr) => {
                            if (!acc[curr.category_name]) acc[curr.category_name] = [];
                            acc[curr.category_name].push(curr);
                            return acc;
                        }, {})
                    ).map(([categoryName, trainings]) => (
                        <View key={categoryName} style={{ marginBottom: 20 }}>
                            <Text style={styles.categoryTitle}>{categoryName}</Text>
                            {trainings.map(renderTrainingCard)}
                        </View>
                    ))
                    : filteredTrainings.map(renderTrainingCard)}
            </ScrollView>

{/* 🔹 Modal výber sezóny */}
<Modal visible={seasonPickerVisible} animationType="fade" transparent>
    <Pressable style={styles.modalOverlay} onPress={() => setSeasonPickerVisible(false)}>
        <Pressable style={styles.pickerModal}>
            {(() => {
                // 🔹 Vyrob sezóny dynamicky podľa tréningov z API
                let seasonsFromTrainings = Array.from(
                    new Set(trainings.map(t => getSeasonLabel(new Date(t.date))))
                );

                // 🔹 Pridaj aktuálnu a budúcu sezónu vždy
                const currentSeason = getSeasonLabel(new Date());
                const nextSeason = getSeasonLabel(new Date(new Date().getFullYear() + 1, 6, 1));

                const allSeasons = Array.from(
                    new Set([...seasonsFromTrainings, currentSeason, nextSeason])
                ).sort((a, b) => {
                    const [aStart] = a.split('/').map(Number);
                    const [bStart] = b.split('/').map(Number);
                    return bStart - aStart; // zostupne podľa roku
                });

                // 🔹 Ak nie sú žiadne tréningy, zobraz aspoň aktuálnu sezónu
                const displaySeasons = allSeasons.length > 0 ? allSeasons : [currentSeason];

                // 🔹 Pridaj možnosť „Všetky sezóny“
                const withAllOption = ["Všetky sezóny", ...displaySeasons];

                return withAllOption.map(season => (
                    <TouchableOpacity
                        key={season}
                        onPress={() => {
                            setSelectedSeason(season === "Všetky sezóny" ? "" : season);
                            setSeasonPickerVisible(false);
                            fetchTrainings(season === "Všetky sezóny" ? undefined : season, selectedMonth);
                        }}
                    >
                        <Text
                            style={[
                                styles.drawerText,
                                season === selectedSeason && { fontWeight: "bold" },
                            ]}
                        >
                            {season}
                        </Text>
                    </TouchableOpacity>
                ));
            })()}
        </Pressable>
    </Pressable>
</Modal>


            {/* 🔹 Modal výber mesiaca */}
            <Modal visible={monthPickerVisible} animationType="fade" transparent>
                <Pressable style={styles.modalOverlay} onPress={() => setMonthPickerVisible(false)}>
                    <Pressable style={styles.pickerModal}>
                        <ScrollView>
                            {monthIndexes.map((index, idx) => (
                                <TouchableOpacity
                                    key={index}
                                    onPress={() => {
                                        setSelectedMonth(index);
                                        setMonthPickerVisible(false);
                                        fetchTrainings(selectedSeason, index);
                                    }}
                                >
                                    <Text
                                        style={[
                                            styles.drawerText,
                                            selectedMonth === index && { fontWeight: 'bold' },
                                        ]}
                                    >
                                        {monthNames[idx]}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    categoryScroll: {
        flexGrow: 0,
        backgroundColor: '#fff',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderBottomWidth: 1,
        borderColor: '#ccc',
        height: '7%',
    },
    filterItem: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: '#eee',
        marginRight: 8,
    },
    activeFilter: {
        backgroundColor: '#D32F2F',
    },
    season: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#000',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'center',
        padding: 10,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderColor: '#ccc',
        gap: 10,
    },

    trainingCard: {
        marginBottom: 15,
        padding: 15,
        backgroundColor: '#fff',
        borderRadius: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 3,
    },
    trainingTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#8C1919',
        marginBottom: 6,
    },
    trainingDetail: {
        color: '#555',
        marginBottom: 4,
        fontSize: 17,
        fontWeight: 'bold',
    },
    trainingInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        marginTop: 5,
    },
    trainingIcon: {
        fontSize: 16,
        color: '#D32F2F',
    },
    trainingInfo: {
        fontSize: 16,
        color: '#333',
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    pickerModal: {
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 10,
        width: 300,
        maxHeight: 600,
        alignItems: 'center',
    },
    drawerText: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#000',
        padding: 8,
        alignSelf: 'center',
    },
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    counts: {
        fontSize: 16,
        fontWeight: '600',
        color: '#8C1919',
    },
    trainingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: '#ddd',
},
rowLeft: {
    flex: 1,
    marginRight: 10,
},
trainingTitleSmall: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8C1919',
    marginBottom: 2,
},
trainingSubInfo: {
    fontSize: 13,
    color: '#555',
},
countsSmall: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#8C1919',
},
categoryTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 6,
    marginTop: 10,
},

});
