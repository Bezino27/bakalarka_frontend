import React, { useContext, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    LayoutAnimation,
    Platform,
    UIManager,
    TextInput,
    ScrollView,
    Modal,
    Pressable
} from "react-native";
import { useRouter } from "expo-router";
import { AuthContext } from "@/context/AuthContext";
import { useFetchWithAuth } from "@/hooks/fetchWithAuth";
import { BASE_URL } from "@/hooks/api";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function SettingsAdminScreen() {
    const router = useRouter();
    const { logout, userDetails, setUserDetails } = useContext(AuthContext);
    const { fetchWithAuth } = useFetchWithAuth();
    const [trainingLockHours, setTrainingLockHours] = useState<number>(
        userDetails?.club?.training_lock_hours ?? 2
    );
    const [savingTrainingLock, setSavingTrainingLock] = useState(false);
    const [preferred, setPreferred] = useState(userDetails?.preferred_role || "");
    const [showRoleSection, setShowRoleSection] = useState(false);
    const [voteLockModalVisible, setVoteLockModalVisible] = useState(false);
    const [trainingLockModalVisible, setTrainingLockModalVisible] = useState(false);
    const [voteLockDays, setVoteLockDays] = useState<number>(userDetails?.club?.vote_lock_days ?? 2);
    const [savingVoteLock, setSavingVoteLock] = useState(false);

    const handleLogout = () => {
        Alert.alert("Odhlásenie", "Naozaj sa chceš odhlásiť?", [
            { text: "Zrušiť", style: "cancel" },
            { text: "Odhlásiť sa", style: "destructive", onPress: logout },
        ]);
    };
    const handleSaveTrainingLockHours = async () => {
        setSavingTrainingLock(true);
        try {
            const res = await fetchWithAuth(`${BASE_URL}/set-training-lock-hours/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ training_lock_hours: trainingLockHours }),
            });
            if (!res.ok) throw new Error();
            const json = await res.json();

            if (userDetails) {
                setUserDetails({
                ...userDetails,
                club: userDetails.club
                    ? { ...userDetails.club, training_lock_hours: json.training_lock_hours }
                    : { id: 0, name: "Unknown", training_lock_hours: json.training_lock_hours },
                });
            }

            Alert.alert("✅ Uložené", `Lock tréningov nastavený na ${json.training_lock_hours} hodín`);
        } catch {
            Alert.alert("❌ Chyba", "Nepodarilo sa uložiť nastavenie.");
        } finally {
            setSavingTrainingLock(false);
        }
    };
    const handleSavePreferredRole = async () => {
        try {
            const res = await fetchWithAuth(`${BASE_URL}/set-preferred-role/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ preferred_role: preferred }),
            });
            if (!res.ok) throw new Error();

            if (userDetails) {
                setUserDetails({ ...userDetails, preferred_role: preferred });
            }
            Alert.alert("✅ Uložené", "Preferovaná rola bola nastavená.");
        } catch {
            Alert.alert("❌ Chyba", "Nepodarilo sa uložiť rolu.");
        }
    };

    const handleSaveVoteLockDays = async () => {
        if (voteLockDays < 0) {
            Alert.alert("❌ Chyba", "Počet dní musí byť väčší alebo rovný 0.");
            return;
        }

        setSavingVoteLock(true);
        try {
            const res = await fetchWithAuth(`${BASE_URL}/set-vote-lock-days/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ vote_lock_days: voteLockDays }),
            });
            if (!res.ok) throw new Error();

            const json = await res.json();

            if (userDetails) {
                setUserDetails({
                    ...userDetails,
                    club: userDetails.club
                        ? { ...userDetails.club, vote_lock_days: json.vote_lock_days }
                        : { id: 0, name: "", vote_lock_days: json.vote_lock_days }, // fallback, ak by club nebol
                });
            }

            Alert.alert("✅ Uložené", `Lock hlasovania nastavený na ${json.vote_lock_days} dní`);
        } catch {
            Alert.alert("❌ Chyba", "Nepodarilo sa uložiť nastavenie.");
        } finally {
            setSavingVoteLock(false);
        }
    };

    const toggleRoleSection = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setShowRoleSection(!showRoleSection);
    };

    return (
            <ScrollView>
            <TouchableOpacity style={styles.settingItem} onPress={() => router.push("/profile-edit")}>
                <Text style={styles.settingText}>Upraviť profil</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.settingItem} onPress={() => router.push("/change-password")}>
                <Text style={styles.settingText}>Zmeniť heslo</Text>
            </TouchableOpacity>

            {/* Preferovaná rola */}
            <TouchableOpacity style={styles.settingItem} onPress={toggleRoleSection}>
                <Text style={styles.settingText}>Preferovaná rola</Text>
            </TouchableOpacity>

            {showRoleSection && (
                <View style={styles.roleSection}>
                    {["player", "coach", "admin"].map((role) => (
                        <TouchableOpacity
                            key={role}
                            onPress={() => setPreferred(role)}
                            style={[styles.roleButton, preferred === role && styles.roleButtonSelected]}
                        >
                            <Text
                                style={[
                                    styles.roleButtonText,
                                    preferred === role && styles.roleButtonTextSelected,
                                ]}
                            >
                                {role === "player"
                                    ? "Hráč"
                                    : role === "coach"
                                    ? "Tréner"
                                    : role === "admin"
                                    ? "Admin"
                                    : role}
                            </Text>
                        </TouchableOpacity>
                    ))}

                    <TouchableOpacity style={styles.savePrefButton} onPress={handleSavePreferredRole}>
                        <Text style={styles.savePrefText}>Uložiť preferovanú rolu</Text>
                    </TouchableOpacity>
                </View>
            )}

                <TouchableOpacity
                style={styles.settingItem}
                onPress={() => setVoteLockModalVisible(true)}
                >
                <Text style={styles.settingText}>
                    Lock hlasovania: {voteLockDays} dní pred zápasom
                </Text>
                </TouchableOpacity>

                {/* Lock tréningov */}
                <TouchableOpacity
                style={styles.settingItem}
                onPress={() => setTrainingLockModalVisible(true)}
                >
                <Text style={styles.settingText}>
                    Lock tréningov: {trainingLockHours} hodín pred začiatkom
                </Text>
                </TouchableOpacity>

                {/* Modal pre voteLock */}
                <Modal
                visible={voteLockModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setVoteLockModalVisible(false)}
                >
                <Pressable style={styles.modalOverlay} onPress={() => setVoteLockModalVisible(false)}>
                    <Pressable style={styles.modalContent} onPress={() => {}}>
                    <Text style={styles.settingText}>Lock hlasovania (dni)</Text>
                    <TextInput
                        style={styles.input}
                        value={String(voteLockDays)}
                        onChangeText={(t) => setVoteLockDays(Number(t) || 0)}
                        keyboardType="numeric"
                    />
                    <TouchableOpacity
                        style={[styles.savePrefButton, { backgroundColor: "#1976D2" }]}
                        onPress={async () => {
                        await handleSaveVoteLockDays();
                        setVoteLockModalVisible(false);
                        }}
                    >
                        <Text style={styles.savePrefText}>
                        {savingVoteLock ? "Ukladám..." : "Uložiť"}
                        </Text>
                    </TouchableOpacity>
                    </Pressable>
                </Pressable>
                </Modal>

                {/* Modal pre trainingLock */}
                <Modal
                visible={trainingLockModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setTrainingLockModalVisible(false)}
                >
                <Pressable style={styles.modalOverlay} onPress={() => setTrainingLockModalVisible(false)}>
                    <Pressable style={styles.modalContent} onPress={() => {}}>
                    <Text style={styles.settingText}>Lock tréningov (hodiny)</Text>
                    <TextInput
                        style={styles.input}
                        value={String(trainingLockHours)}
                        onChangeText={(t) => setTrainingLockHours(Number(t) || 0)}
                        keyboardType="numeric"
                    />
                    <TouchableOpacity
                        style={[styles.savePrefButton, { backgroundColor: "#FF9800" }]}
                        onPress={async () => {
                        await handleSaveTrainingLockHours();
                        setTrainingLockModalVisible(false);
                        }}
                    >
                        <Text style={styles.savePrefText}>
                        {savingTrainingLock ? "Ukladám..." : "Uložiť"}
                        </Text>
                    </TouchableOpacity>
                    </Pressable>
                </Pressable>
                </Modal>


            <TouchableOpacity style={[styles.settingItem, styles.logout]} onPress={handleLogout}>
                <Text style={[styles.settingText, { color: "#b00020" }]}>Odhlásiť sa</Text>
            </TouchableOpacity>
            </ScrollView>
    
            

    );
    
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#f4f4f8", padding: 20 },
    settingItem: {
        backgroundColor: "#fff",
        padding: 18,
        borderRadius: 12,
        marginBottom: 15,
        borderColor: "#e0e0e0",
        borderWidth: 1,
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: 1 },
        shadowRadius: 5,
    },
    settingText: { fontSize: 16, fontWeight: "600", color: "#222" },
    logout: { backgroundColor: "#fff3f3", borderColor: "#ffcccc" },
    roleSection: {
        marginBottom: 20,
        backgroundColor: "#fff",
        padding: 16,
        borderRadius: 10,
        borderColor: "#ddd",
        borderWidth: 1,
    },
    roleButton: {
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 8,
        backgroundColor: "#e0e0e0",
        marginBottom: 10,
    },
    roleButtonSelected: { backgroundColor: "#D32F2F" },
    roleButtonText: { color: "#000", fontWeight: "600" },
    roleButtonTextSelected: { color: "#fff" },
    savePrefButton: {
        backgroundColor: "#4CAF50",
        padding: 12,
        borderRadius: 8,
        alignItems: "center",
        marginTop: 10,
    },
    savePrefText: { color: "#fff", fontWeight: "600", fontSize: 16 },
    input: {
        backgroundColor: "#f9f9f9",
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 8,
        padding: 10,
        marginTop: 10,
        marginBottom: 10,
        color: "#000",
    },
    modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
    },
    modalContent: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 10,
    width: 280,
    elevation: 5,
    },

});
