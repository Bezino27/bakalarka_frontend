import { useCallback, useContext, useState, useEffect, useRef } from 'react';
import {
    View,
    StyleSheet,
    ImageBackground,
    TouchableOpacity,
    Text,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { AuthContext } from '@/context/AuthContext';
import { useRouter } from 'expo-router';
import { useFetchWithAuth } from '@/hooks/fetchWithAuth';
import { BASE_URL } from '@/hooks/api';
import {UserDetails} from "@/hooks/authHelpers";

export default function WaitingRoleScreen() {
    const { setUserRoles, setUserCategories, setUserClub, setUserDetails, logout } = useContext(AuthContext);
    const { fetchWithAuth } = useFetchWithAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const refreshUser = useCallback(async (showAlert = true) => {
        setLoading(true);
        try {
            const res = await fetchWithAuth(`${BASE_URL}/me/`);
            if (!res.ok) throw new Error('Chyba pri načítaní údajov.');

            const data = await res.json();

            await setUserRoles(data.roles ?? []);
            await setUserCategories(data.categories ?? []);
            await setUserClub(data.club ?? null);

// Ak zvyšok údajov sú rovno v data (nie v data.details):
            const details: UserDetails = {
                id: data.id,
                username: data.username,
                name: data.name,
                birth_date: data.birth_date,
                number: data.number,
                email: data.email,
                email_2: data.email_2,
                height: data.height,
                weight: data.weight,
                side: data.side,
                position: data.position,
                preferred_role: data.preferred_role,
            };
            await setUserDetails(details);
            if ((data.roles ?? []).length > 0) {
                // Počkaj jednu "tichú" renderovaciu iteráciu
                setTimeout(() => {
                    router.replace("/select-role");
                }, 100);
            } else if (showAlert) {
                Alert.alert("Ešte čakáš", "Tvoj profil stále nebol schválený.");
            }
        } catch (err) {
            if (showAlert) {
                Alert.alert("Chyba", "Nepodarilo sa obnoviť údaje.");
            }
            console.error("❌ Refresh chyba:", err);
        } finally {
            setLoading(false);
        }
    }, [fetchWithAuth, router, setUserCategories, setUserClub, setUserDetails, setUserRoles]);

    useEffect(() => {
        intervalRef.current = setInterval(() => {
            refreshUser(false); // bez alertu pri auto-refreshi
        }, 300000); // každých 5 minút

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [refreshUser]);

    return (
        <View style={styles.container}>
            {/* Odhlásiť sa v pravom hornom rohu */}
            <TouchableOpacity
                onPress={() =>
                    Alert.alert(
                        "Odhlásenie",
                        "Naozaj sa chceš odhlásiť?",
                        [
                            { text: "Zrušiť", style: "cancel" },
                            { text: "Odhlásiť sa", style: "destructive", onPress: logout },
                        ]
                    )
                }
                style={styles.logoutTopRight}
            >
                <Text style={styles.logoutText}>Odhlásiť sa</Text>
            </TouchableOpacity>

            <ImageBackground
                source={require('@/assets/images/waiting_pozadie.png')}
                style={styles.image}
            >
                <View style={styles.bottomButton}>
                    <TouchableOpacity onPress={() => refreshUser(true)} style={styles.button}>
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.buttonText}>Skontrolovať znovu</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </ImageBackground>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    image: {
        flex: 1,
        resizeMode: 'cover',
        justifyContent: 'flex-end',
    },
    bottomButton: {
        paddingBottom: 60,
        alignItems: 'center',
    },
    button: {
        backgroundColor: '#D32F2F',
        paddingVertical: 12,
        paddingHorizontal: 30,
        borderRadius: 10,
    },
    buttonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    logoutButton: {
        marginTop: 0,
        backgroundColor: '#888',
    },
    logoutTopRight: {
        position: 'absolute',
        top: 50,
        right: 20,
        zIndex: 10,
        backgroundColor: '#eee',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#bbb',
    },

    logoutText: {
        color: '#D32F2F',
        fontWeight: 'bold',
        fontSize: 14,
    },
});
