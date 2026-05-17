import React, { useEffect, useState, useContext, useCallback } from 'react';
import {
    View,
    Alert,
    Text,
    ScrollView,
    ActivityIndicator,
    TouchableOpacity,
    StyleSheet,
    RefreshControl,
    ImageBackground
} from 'react-native';
import { AuthContext } from '@/context/AuthContext';
import { BASE_URL } from '@/hooks/api';
import { useFetchWithAuth } from '@/hooks/fetchWithAuth';
import { readJsonArrayOrThrow } from '@/hooks/readResponse';
import { useRouter } from 'expo-router';



type Training = {
    id: number;
    description: string;
    date: string;
    category: number;
    category_name: string;
    location: string;
    attendance_summary: {
        goalies: number;
        present: number;
        absent: number;
        unknown: number;
    };
};

export default function TreningyCoachScreen() {
    const { isLoggedIn, userRoles, accessToken,setUserRoles, setUserCategories, } = useContext(AuthContext);
    const { fetchWithAuth } = useFetchWithAuth();
    const router = useRouter();

    const [trainings, setTrainings] = useState<Training[]>([]);
    const [loading, setLoading] = useState(true);

    const coachCategories = userRoles
        .filter(r => r.role.toLowerCase() === 'coach' || r.role.toLowerCase() === 'tréner')
        .map(r => r.category.name);

    const [refreshing, setRefreshing] = useState(false);

    const onRefresh = async () => {
        setRefreshing(true);
        try {
            await fetchTrainings();

            const meRes = await fetchWithAuth(`${BASE_URL}/me/`);
            if (meRes.ok) {
                const meData = await meRes.json();

                if (meData.roles && Array.isArray(meData.roles)) {
                    await setUserRoles(meData.roles);
                }

                if (meData.categories && Array.isArray(meData.categories)) {
                    await setUserCategories(meData.categories);
                }

            } else {
                console.warn("Nepodarilo sa načítať /me počas refreshu");
            }
        } catch (error) {
            console.error("Chyba počas refreshu:", error);
        }
        setRefreshing(false);
    };


    const fetchTrainings = useCallback(async () => {
        try {
            const res = await fetchWithAuth(`${BASE_URL}/player-trainings/`);
            const data = await readJsonArrayOrThrow<Training>(res, 'Nepodarilo sa načítať tréningy.');
            setTrainings(data);
        } catch (error) {
            console.error("fetchTrainings error:", error);
        } finally {
            setLoading(false);
        }
    }, [fetchWithAuth]);

    useEffect(() => {
        if (!isLoggedIn || !accessToken) {
            console.log("⏸ Skipping fetchNews – user not logged in yet");
            return;
        }
        void fetchTrainings();
    }, [isLoggedIn, accessToken, fetchTrainings]);

    const groupedTrainings = coachCategories
        .filter((v, i, a) => a.indexOf(v) === i)
        .reduce((acc, category) => {
            const filtered = trainings.filter((t) => t.category_name === category);
            if (filtered.length > 0) acc[category] = filtered;
            return acc;
        }, {} as Record<string, Training[]>);

    if (!isLoggedIn || loading) return <ActivityIndicator style={{ marginTop: 50 }} />;

    return (
        <ScrollView
            style={{ padding: 20 }}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
        >
            {Object.entries(groupedTrainings).map(([category, trainings]) => (
                <View key={category} style={{ marginBottom: 30 }}>
                    <Text style={{ fontWeight: 'bold', fontSize: 22, marginBottom: 15 }}>{category}</Text>
                    {trainings.map((t) => {
                        const dateObj = new Date(t.date);
                        const formattedDate = dateObj.toLocaleDateString("sk-SK", {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                        });
                        const formattedTime = dateObj.toLocaleTimeString("sk-SK", {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: false,
                        });

                        return (
                            <ImageBackground
                                key={t.id}
                                source={require('@/assets/images/tgpozadie.png')}
                                imageStyle={{
                                    borderRadius: 10,
                                    resizeMode: 'cover', // alebo 'cover'
                                }}
                                style={{
                                    marginBottom: 15,
                                    padding: 15,
                                    backgroundColor: '#fff',
                                    borderRadius: 10,
                                    shadowColor: '#000',
                                    shadowOffset: { width: 0, height: 2 },
                                    shadowOpacity: 0.1,
                                    shadowRadius: 5,
                                    elevation: 3,
                                }}
                            >
                            <TouchableOpacity
                                key={t.id}
                                onPress={async () => {
                                    try {
                                        const res = await fetchWithAuth(`${BASE_URL}/training-detail/${t.id}/`);
                                        if (!res.ok) throw new Error("Nepodarilo sa načítať tréning.");

                                        // Ak potrebuješ dáta posunúť do detailu cez params, urob to tu
                                        router.push({ pathname: "/(stack)/training/[id]", params: { id: String(t.id) } });
                                    } catch (error) {
                                        console.error("Chyba pri načítaní tréningu:", error);
                                        Alert.alert("Chyba", "Nepodarilo sa načítať tréning.");
                                    }
                                }}
                            >
                                <TouchableOpacity
                                    onPress={() =>
                                        router.push({ pathname: "/(stack)/training/[id]", params: { id: String(t.id) } })
                                    }
                                >
                                    <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#8C1919', marginBottom: 6 }}>
                                        {t.description || "Tréning"}
                                    </Text>
                                </TouchableOpacity>

                                {/* Dátum a čas */}
                                <Text style={{ color: '#555', marginBottom: 4, fontSize: 17, fontWeight: 'bold', }}>
                                    {formattedTime} • {formattedDate}
                                </Text>

                                {/* Miesto */}
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, marginTop:5 }}>
                                    <Text style={{ fontSize: 16, color: '#D32F2F'}}>📍</Text>
                                    <Text style={{ fontSize: 16, color: '#333' }}>{t.location}</Text>
                                </View>

                                <Text style={styles.attendance_present}>
                                    🟢 PRÍDE: {t.attendance_summary.present}+{t.attendance_summary.goalies}
                                </Text>
                                <Text style={styles.attendance_absent}>🔴 NEPRÍDE: {t.attendance_summary.absent}</Text>
                                <Text style={styles.attendance_unknown}>⚫️ NEHLASOVALO: {t.attendance_summary.unknown}</Text>
                            </TouchableOpacity>
                            </ImageBackground>
                        );
                    })}

                </View>
            ))}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    attendance_present: {
        fontSize: 15,
        lineHeight: 20,       // väčší vertikálny odstup medzi riadkami textu
        marginBottom: 6, // medzera medzi jednotlivými Text komponentami
        color: 'green',
    },
    attendance_absent: {
        fontSize: 15,
        lineHeight: 20,       // väčší vertikálny odstup medzi riadkami textu
        marginBottom: 6,      // medzera medzi jednotlivými Text komponentami
        color: 'red',

    },
    attendance_unknown: {
        fontSize: 15,
        lineHeight: 20,       // väčší vertikálny odstup medzi riadkami textu
        marginBottom: 6,      // medzera medzi jednotlivými Text komponentami
        color: 'grey',

    }
});
