import React, { useEffect, useState } from "react";
import {
    View, Text, TextInput, TouchableOpacity,
    StyleSheet, ScrollView, Alert, Image, Dimensions
} from "react-native";
import { useRouter } from "expo-router";
import { BASE_URL } from "@/hooks/api";
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Linking from "expo-linking";

interface Club {
    id: number;
    name: string;
}

export default function RegisterScreen() {
    const router = useRouter();

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [password2, setPassword2] = useState("");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [birthDate, setBirthDate] = useState("");
    const [clubId, setClubId] = useState<number | null>(null);
    const [clubs, setClubs] = useState<Club[]>([]);
    const [consentGiven, setConsentGiven] = useState(false); // ✅ nový stav
    const [email, setEmail] = useState("");
    const [email2, setEmail2] = useState("");

    useEffect(() => {
        fetch(`${BASE_URL}/clubs/`)
            .then(res => res.json())
            .then(data => setClubs(data))
            .catch(err => {
                console.error("Chyba pri načítaní klubov", err);
                Alert.alert("Chyba", "Nepodarilo sa načítať kluby.");
            });
    }, []);

    const handleRegister = async () => {
        if (!consentGiven) {
            Alert.alert(
                "Súhlas potrebný",
                "Pred registráciou je potrebné udeliť súhlas so spracovaním osobných údajov."
            );
            return;
        }

        if (!username || !password || !password2 || !firstName || !lastName || !birthDate || !clubId) {
            Alert.alert("Chyba", "Vyplň všetky polia.");
            return;
        }

        const passwordTooShort = password.length < 8;
        const passwordHasNoDigit = !/\d/.test(password);

        if (passwordTooShort || passwordHasNoDigit) {
            Alert.alert(
                "Slabé heslo",
                "Heslo musí mať aspoň 8 znakov a obsahovať aspoň 1 číslicu."
            );
            return;
        }

        if (password !== password2) {
            Alert.alert("Chyba", "Heslá sa nezhodujú.");
            return;
        }

        const invalidUsername = /[^\w]/.test(username);
        const hasDiacritics = /[áäčďéěíĺľňóôŕšťúýžÁÄČĎÉĚÍĽĹŇÓÔŔŠŤÚÝŽ]/.test(username);
        const formattedDate = convertDateFormat(birthDate);
        if (!formattedDate) {
            Alert.alert("Chyba", "Dátum narodenia musí byť vo formáte DD.MM.RRRR");
            return;
        }
        if (!email.includes("@")) {
            Alert.alert("Chyba", "Zadaj platný email.");
            return;
        }
        if (invalidUsername || hasDiacritics) {
            Alert.alert(
                "Chyba",
                "Používateľské meno nesmie obsahovať medzery, mäkčene, dĺžne ani špeciálne znaky. Povolené sú len písmená, čísla a podčiarkovník (_)."
            );
            return;
        }

        try {
            const response = await fetch(`${BASE_URL}/register/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    username,
                    password,
                    password2,
                    first_name: firstName,
                    last_name: lastName,
                    birth_date: formattedDate,
                    club_id: clubId,
                    email,
                    email_2: email2 || null, // voliteľné
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                Alert.alert("❌ Chyba", data.detail || "Nepodarilo sa registrovať.");
            } else {
                Alert.alert("✅ Registrácia", "Úspešne si sa zaregistroval.");
                router.replace("/login");
            }
        } catch (err) {
            console.error("CHYBA REGISTRÁCIE:", err);
            Alert.alert("Chyba", "Nastala chyba pri registrácii.");
        }
    };

    function convertDateFormat(dateStr: string): string | null {
        const match = dateStr.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
        if (!match) return null;

        let [, day, month, year] = match;
        if (day.length === 1) day = '0' + day;
        if (month.length === 1) month = '0' + month;

        return `${year}-${month}-${day}`;
    }

    return (
        <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
            <ScrollView contentContainerStyle={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.navigate('/login')} style={styles.backButton}>
                        <Image
                            source={require("@/assets/images/spat.png")}
                            style={{ width: 60, height: 22, tintColor: '#D32F2F' }}
                        />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Registrácia</Text>
                </View>

                <View style={styles.infoBox}>
                    <Text style={styles.infoText}>
                        Registráciu je potrebné vykonať s údajmi hráča (dieťaťa) –
                        meno, priezvisko a dátum narodenia patria hráčovi. 
                        Pri deťoch prosím minimálne jeden email uvádzajte email rodiča
                    </Text>
                </View>

                {/* formulár */}
                    <TextInput
                    style={styles.input}
                    placeholder="Meno (hráča)"
                    placeholderTextColor="#555"
                    value={firstName}
                    onChangeText={setFirstName}
                    />
                    <TextInput
                    style={styles.input}
                    placeholder="Priezvisko (hráča)"
                    placeholderTextColor="#555"
                    value={lastName}
                    onChangeText={setLastName}
                    />
                    <TextInput
                    style={styles.input}
                    placeholder="Dátum narodenia (deň.mesiac.rok)"
                    placeholderTextColor="#555"
                    value={birthDate}
                    onChangeText={setBirthDate}
                    />
                    <TextInput
                    style={styles.input}
                    placeholder="Email"
                    placeholderTextColor="#555"
                    value={email}
                    onChangeText={setEmail}
                    />

                    <TextInput
                    style={styles.input}
                    placeholder="Alternatívny email (voliteľné)"
                    placeholderTextColor="#555"
                    value={email2}
                    onChangeText={setEmail2}
                    />

                    <TextInput
                    style={styles.input}
                    placeholder="Používateľské meno"
                    placeholderTextColor="#555"
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                    />
                    <TextInput
                    style={styles.input}
                    placeholder="Heslo"
                    placeholderTextColor="#555"
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                    />
                    <TextInput
                    style={styles.input}
                    placeholder="Zopakuj heslo"
                    placeholderTextColor="#555"
                    secureTextEntry
                    value={password2}
                    onChangeText={setPassword2}
                    />


                <Text style={styles.label}>Vyber klub:</Text>
                {clubs.map(club => (
                    <TouchableOpacity
                        key={club.id}
                        onPress={() => setClubId(club.id)}
                        style={[styles.chip, clubId === club.id && styles.chipSelected]}
                    >
                        <Text style={styles.chipText}>{club.name}</Text>
                    </TouchableOpacity>
                ))}

                {/* ✅ GDPR súhlas */}

                <TouchableOpacity
                    style={styles.checkboxContainer}
                    onPress={() => setConsentGiven(!consentGiven)}
                >
                    <View style={[styles.checkbox, consentGiven && styles.checkboxChecked]} />
                    <Text style={styles.checkboxText}>
                        Súhlasím so spracovaním osobných údajov podľa{" "}
                        <Text
                            style={styles.link}
                            onPress={() =>
                                Linking.openURL("https://ludimus.sk/policy")
                            }
                        >
                            zásad ochrany osobných údajov
                        </Text>.
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={handleRegister} style={styles.button}>
                    <Text style={styles.buttonText}>Zaregistrovať sa</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}



const screenHeight = Dimensions.get("window").height;
const isSmallScreen = screenHeight < 700;

const styles = StyleSheet.create({
    container: {
        paddingTop: isSmallScreen ? 30 : 50,
        padding: isSmallScreen ? 15 : 20,
        backgroundColor: "#e6e6e6",
        flexGrow: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: isSmallScreen ? 10 : 20,
    },
    backButton: {
        marginRight: isSmallScreen ? 8 : 12,
    },
    backImage: {
        width: 28,
        height: 28,
        resizeMode: 'contain',
    },
    headerTitle: {
        fontSize: isSmallScreen ? 22 : 26,
        fontWeight: "bold",
        color: "#000",
    },
    infoBox: {
        backgroundColor: "#fff3cd",
        borderLeftWidth: 6,
        borderLeftColor: "#D32F2F",
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
    },
    infoText: {
        fontSize: 14,
        color: "#333",
        lineHeight: 20,
        fontWeight: "500",
    },
    input: {
        backgroundColor: "#fff",
        padding: isSmallScreen ? 10 : 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#ccc",
        marginBottom: 10,
        fontSize: isSmallScreen ? 14 : 16,
        fontWeight: "600",
        
    },
    label: {
        fontSize: isSmallScreen ? 14 : 16,
        fontWeight: "bold",
        marginVertical: isSmallScreen ? 8 : 10,
        color: "#000"
    },
    chip: {
        backgroundColor: "#ccc",
        padding: isSmallScreen ? 8 : 10,
        borderRadius: 20,
        marginBottom: 8,
    },
    chipSelected: {
        backgroundColor: "#D32F2F",
    },
    chipText: {
        color: "#000",
        textAlign: "center",
        fontWeight: "600",
        fontSize: isSmallScreen ? 14 : 16,
    },
    button: {
        backgroundColor: "#4CAF50",
        padding: isSmallScreen ? 13 : 16,
        borderRadius: 10,
        alignItems: "center",
        marginTop: isSmallScreen ? 15 : 20
    },
    buttonText: {
        color: "#fff",
        fontWeight: "bold",
        fontSize: isSmallScreen ? 15 : 16,
    },
        checkboxContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginVertical: 15,
    },
    checkbox: {
        width: 22,
        height: 22,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: "#D32F2F",
        marginRight: 10,
        backgroundColor: "#fff",
    },
    checkboxChecked: {
        backgroundColor: "#D32F2F",
    },
    checkboxText: {
        flex: 1,
        fontSize: 14,
        color: "#222",
        lineHeight: 20,
    },
    link:{
        color: "#3726d2ff"
    }
});
