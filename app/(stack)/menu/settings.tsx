import React, { useContext, useEffect, useState } from "react";
import {
    ActivityIndicator,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    LayoutAnimation,
    Platform,
    UIManager,
    Modal,
    TextInput,
    ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { AuthContext } from "@/context/AuthContext";
import { useFetchWithAuth } from "@/hooks/fetchWithAuth";
import { BASE_URL } from "@/hooks/api";

// Aktivuj animácie pre Android
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function SettingsScreen() {
    const router = useRouter();
    const {
        logout,
        userDetails,
        setUserDetails,
        linkedAccounts,
        loadLinkedAccounts,
        addLinkedAccount,
        removeLinkedAccount,
    } = useContext(AuthContext);
    const { fetchWithAuth } = useFetchWithAuth();

    const [preferred, setPreferred] = useState(userDetails?.preferred_role || "");
    const [showRoleSection, setShowRoleSection] = useState(false);
    const [showDeleteSection, setShowDeleteSection] = useState(false);
    const [showLinkedAccountModal, setShowLinkedAccountModal] = useState(false);
    const [linkedUsername, setLinkedUsername] = useState("");
    const [linkedPassword, setLinkedPassword] = useState("");
    const [isAddingLinkedAccount, setIsAddingLinkedAccount] = useState(false);
    const [removingUserId, setRemovingUserId] = useState<number | null>(null);

    useEffect(() => {
        loadLinkedAccounts().catch((error: Error) => {
            console.warn("Nepodarilo sa načítať prepojené účty:", error.message);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleLogout = () => {
        Alert.alert("Odhlásenie", "Naozaj sa chceš odhlásiť?", [
            { text: "Zrušiť", style: "cancel" },
            { text: "Odhlásiť sa", style: "destructive", onPress: logout },
        ]);
    };

    const handleSavePreferredRole = async () => {
        try {
            const res = await fetchWithAuth(`${BASE_URL}/set-preferrd-role/`, {
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

    const toggleRoleSection = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setShowRoleSection(!showRoleSection);
    };

    const toggleDeleteSection = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setShowDeleteSection(!showDeleteSection);
    };

    const handleDeleteAccount = () => {
        Alert.alert(
            "⚠️ Naozaj chcete odstrániť účet?",
            "Tento krok je nevratný. Všetky tvoje údaje, štatistiky a prístupy budú natrvalo zmazané.",
            [
                { text: "Zrušiť", style: "cancel" },
                {
                    text: "Vymazať účet",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const res = await fetchWithAuth(`${BASE_URL}/delete-account/`, {
                                method: "DELETE",
                            });

                            if (!res.ok) throw new Error("Chyba pri mazaní účtu");

                            Alert.alert("✅ Účet bol vymazaný", "Všetky údaje boli natrvalo odstránené.");
                            logout();
                        } catch {
                            Alert.alert("❌ Chyba", "Nepodarilo sa vymazať účet. Skús to znova.");
                        }
                    },
                },
            ]
        );
    };

    const handleAddLinkedAccount = async () => {
        if (!linkedUsername.trim() || !linkedPassword) {
            Alert.alert("Chýbajú údaje", "Zadaj používateľské meno alebo email a heslo.");
            return;
        }

        try {
            setIsAddingLinkedAccount(true);
            await addLinkedAccount(linkedUsername.trim(), linkedPassword);
            setLinkedUsername("");
            setLinkedPassword("");
            setShowLinkedAccountModal(false);
            Alert.alert("Hotovo", "Účet bol úspešne prepojený.");
        } catch (error) {
            const message = error instanceof Error ? error.message : "Nepodarilo sa pridať účet.";
            Alert.alert("Chyba", message);
        } finally {
            setIsAddingLinkedAccount(false);
        }
    };

    const handleRemoveLinkedAccount = (userId: number, name: string) => {
        Alert.alert("Odpojiť účet", `Naozaj chceš odpojiť účet ${name}?`, [
            { text: "Zrušiť", style: "cancel" },
            {
                text: "Odpojiť",
                style: "destructive",
                onPress: async () => {
                    try {
                        setRemovingUserId(userId);
                        await removeLinkedAccount(userId);
                        Alert.alert("Hotovo", "Účet bol odpojený.");
                    } catch (error) {
                        const message = error instanceof Error ? error.message : "Nepodarilo sa odpojiť účet.";
                        Alert.alert("Chyba", message);
                    } finally {
                        setRemovingUserId(null);
                    }
                },
            },
        ]);
    };

    const roleLabel = (role: string) => {
        if (role === "player") return "Hráč";
        if (role === "coach") return "Tréner";
        if (role === "admin") return "Admin";
        return role;
    };

    const roleDescription = (role: string) => {
        if (role === "player") return "Po prihlásení sa otvorí hráčske rozhranie.";
        if (role === "coach") return "Po prihlásení sa otvorí trénerské rozhranie.";
        if (role === "admin") return "Po prihlásení sa otvorí admin rozhranie.";
        return "";
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                <View style={styles.sectionBlock}>
                    <Text style={styles.sectionSmallTitle}>Účet</Text>

                    <TouchableOpacity
                        style={styles.menuItem}
                        activeOpacity={0.85}
                        onPress={() => router.push("/profile-edit")}
                    >
                        <View style={styles.menuLeft}>
                            <View style={styles.menuIconBox}>
                                <Text style={styles.menuIcon}>👤</Text>
                            </View>

                            <View style={styles.menuTextBox}>
                                <Text style={styles.menuTitle}>Upraviť profil</Text>
                                <Text style={styles.menuSubtitle}>
                                    Osobné údaje, číslo, pozícia a kontakty
                                </Text>
                            </View>
                        </View>

                        <Text style={styles.menuArrow}>›</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.menuItem}
                        activeOpacity={0.85}
                        onPress={() => router.push("/change-password")}
                    >
                        <View style={styles.menuLeft}>
                            <View style={styles.menuIconBox}>
                                <Text style={styles.menuIcon}>🔐</Text>
                            </View>

                            <View style={styles.menuTextBox}>
                                <Text style={styles.menuTitle}>Zmeniť heslo</Text>
                                <Text style={styles.menuSubtitle}>
                                    Aktualizácia prihlasovacieho hesla
                                </Text>
                            </View>
                        </View>

                        <Text style={styles.menuArrow}>›</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.sectionBlock}>
                    <Text style={styles.sectionSmallTitle}>Rozhranie aplikácie</Text>

                    <TouchableOpacity
                        style={[styles.menuItem, showRoleSection && styles.menuItemActive]}
                        activeOpacity={0.85}
                        onPress={toggleRoleSection}
                    >
                        <View style={styles.menuLeft}>
                            <View style={styles.menuIconBox}>
                                <Text style={styles.menuIcon}>🎭</Text>
                            </View>

                            <View style={styles.menuTextBox}>
                                <Text style={styles.menuTitle}>Preferovaná rola</Text>
                                <Text style={styles.menuSubtitle}>
                                    Aktuálne: {preferred ? roleLabel(preferred) : "Nie je nastavená"}
                                </Text>
                            </View>
                        </View>

                        <Text style={styles.menuArrow}>{showRoleSection ? "⌃" : "⌄"}</Text>
                    </TouchableOpacity>

                    {showRoleSection && (
                        <View style={styles.roleSection}>
                            <Text style={styles.roleSectionTitle}>Vyber rolu po prihlásení</Text>
                            <Text style={styles.roleSectionDescription}>
                                Táto rola určí, ktoré menu sa ti otvorí ako prvé po prihlásení.
                            </Text>

                            {["player", "coach", "admin"].map((role) => (
                                <TouchableOpacity
                                    key={role}
                                    activeOpacity={0.85}
                                    onPress={() => setPreferred(role)}
                                    style={[
                                        styles.roleButton,
                                        preferred === role && styles.roleButtonSelected,
                                    ]}
                                >
                                    <View style={styles.roleButtonLeft}>
                                        <View
                                            style={[
                                                styles.radioCircle,
                                                preferred === role && styles.radioCircleSelected,
                                            ]}
                                        >
                                            {preferred === role && <View style={styles.radioDot} />}
                                        </View>

                                        <View style={styles.roleTextBox}>
                                            <Text
                                                style={[
                                                    styles.roleButtonText,
                                                    preferred === role && styles.roleButtonTextSelected,
                                                ]}
                                            >
                                                {roleLabel(role)}
                                            </Text>

                                            <Text
                                                style={[
                                                    styles.roleButtonDescription,
                                                    preferred === role && styles.roleButtonDescriptionSelected,
                                                ]}
                                            >
                                                {roleDescription(role)}
                                            </Text>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            ))}

                            <TouchableOpacity
                                style={styles.savePrefButton}
                                activeOpacity={0.9}
                                onPress={handleSavePreferredRole}
                            >
                                <Text style={styles.savePrefText}>Uložiť preferovanú rolu</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                <View style={styles.linkedAccountsSection}>
                    <View style={styles.sectionHeader}>
                        <View>
                            <Text style={styles.sectionTitle}>Prepojené účty</Text>
                            <Text style={styles.sectionSubtitle}>
                                Prepájanie účtov v rámci aplikácie
                            </Text>
                        </View>

                        <TouchableOpacity
                            style={styles.addAccountButton}
                            activeOpacity={0.88}
                            onPress={() => setShowLinkedAccountModal(true)}
                        >
                            <Text style={styles.addAccountText}>+ Pridať</Text>
                        </TouchableOpacity>
                    </View>

                    {linkedAccounts.length === 0 ? (
                        <View style={styles.emptyAccountsBox}>
                            <Text style={styles.emptyAccountsTitle}>Zatiaľ nemáš prepojené účty</Text>
                            <Text style={styles.emptyAccountsText}>
                                Po pridaní účtu sa zobrazí v tomto zozname.
                            </Text>
                        </View>
                    ) : (
                        linkedAccounts.map((account) => (
                            <View
                                key={account.id}
                                style={[
                                    styles.linkedAccountRow,
                                    account.is_current && styles.linkedAccountRowActive,
                                ]}
                            >
                                <View style={styles.accountAvatar}>
                                    <Text style={styles.accountAvatarText}>
                                        {(account.name || account.username || "?").charAt(0).toUpperCase()}
                                    </Text>
                                </View>

                                <View style={styles.linkedAccountInfo}>
                                    <View style={styles.accountNameRow}>
                                        <Text style={styles.linkedAccountName} numberOfLines={1}>
                                            {account.name}
                                        </Text>

                                        {account.is_current && (
                                            <View style={styles.currentBadge}>
                                                <Text style={styles.currentBadgeText}>Aktuálny</Text>
                                            </View>
                                        )}
                                    </View>

                                    <Text style={styles.linkedAccountUsername} numberOfLines={1}>
                                        @{account.username} ·{" "}
                                        {account.type === "main" ? "hlavný účet" : "prepojený účet"}
                                    </Text>
                                </View>

                                {account.type === "linked" && (
                                    <TouchableOpacity
                                        style={styles.removeAccountButton}
                                        activeOpacity={0.8}
                                        onPress={() => handleRemoveLinkedAccount(account.id, account.name)}
                                        disabled={removingUserId === account.id}
                                    >
                                        {removingUserId === account.id ? (
                                            <ActivityIndicator color="#E12525" size="small" />
                                        ) : (
                                            <Text style={styles.removeAccountText}>Odpojiť</Text>
                                        )}
                                    </TouchableOpacity>
                                )}
                            </View>
                        ))
                    )}
                </View>

                <View style={styles.sectionBlock}>
                    <Text style={styles.sectionSmallTitle}>Bezpečnosť</Text>

                    <TouchableOpacity
                        style={[styles.menuItem, styles.dangerMenuItem]}
                        activeOpacity={0.85}
                        onPress={toggleDeleteSection}
                    >
                        <View style={styles.menuLeft}>
                            <View style={[styles.menuIconBox, styles.dangerIconBox]}>
                                <Text style={styles.menuIcon}>⚠️</Text>
                            </View>

                            <View style={styles.menuTextBox}>
                                <Text style={[styles.menuTitle, styles.dangerText]}>
                                    Vymazať účet
                                </Text>
                                <Text style={styles.menuSubtitle}>
                                    Trvalé odstránenie účtu a údajov
                                </Text>
                            </View>
                        </View>

                        <Text style={[styles.menuArrow, styles.dangerText]}>
                            {showDeleteSection ? "⌃" : "⌄"}
                        </Text>
                    </TouchableOpacity>

                    {showDeleteSection && (
                        <View style={styles.deleteSection}>
                            <Text style={styles.deleteTitle}>Nevratná akcia</Text>
                            <Text style={styles.warningText}>
                                Týmto si natrvalo odstránite svoj účet a všetky údaje ako aj štatistiky
                                budú nenávratne vymazané.
                            </Text>

                            <TouchableOpacity
                                style={styles.deleteAccountButton}
                                activeOpacity={0.9}
                                onPress={handleDeleteAccount}
                            >
                                <Text style={styles.deleteAccountText}>Odstrániť účet</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                <TouchableOpacity
                    style={styles.logoutButton}
                    activeOpacity={0.9}
                    onPress={handleLogout}
                >
                    <Text style={styles.logoutIcon}>↪</Text>
                    <Text style={styles.logoutText}>Odhlásiť sa</Text>
                </TouchableOpacity>

                <Text style={styles.footerText}>Ludimus · nastavenia aplikácie</Text>
            </ScrollView>

            <Modal
                visible={showLinkedAccountModal}
                animationType="slide"
                transparent
                onRequestClose={() => setShowLinkedAccountModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <View style={styles.modalHandle} />

                        <Text style={styles.modalTitle}>Pridať prepojený účet</Text>
                        <Text style={styles.modalDescription}>
                            Zadaj prihlasovacie údaje účtu, ktorý chceš prepojiť.
                        </Text>

                        <Text style={styles.inputLabel}>Username alebo email</Text>
                        <TextInput
                            value={linkedUsername}
                            onChangeText={setLinkedUsername}
                            placeholder="napr. meno@email.sk"
                            placeholderTextColor="#999999"
                            autoCapitalize="none"
                            autoCorrect={false}
                            style={styles.input}
                        />

                        <Text style={styles.inputLabel}>Heslo</Text>
                        <TextInput
                            value={linkedPassword}
                            onChangeText={setLinkedPassword}
                            placeholder="Zadaj heslo"
                            placeholderTextColor="#999999"
                            secureTextEntry
                            style={styles.input}
                        />

                        <TouchableOpacity
                            style={[
                                styles.modalPrimaryButton,
                                isAddingLinkedAccount && styles.modalPrimaryButtonDisabled,
                            ]}
                            activeOpacity={0.9}
                            onPress={handleAddLinkedAccount}
                            disabled={isAddingLinkedAccount}
                        >
                            {isAddingLinkedAccount ? (
                                <ActivityIndicator color="#FFFFFF" />
                            ) : (
                                <Text style={styles.modalPrimaryText}>Pridať účet</Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.modalSecondaryButton}
                            activeOpacity={0.8}
                            onPress={() => setShowLinkedAccountModal(false)}
                        >
                            <Text style={styles.modalSecondaryText}>Zrušiť</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const COLORS = {
    background: "#F4F4F8",
    white: "#FFFFFF",
    card: "#FFFFFF",
    text: "#111111",
    textSoft: "#333333",
    muted: "#666666",
    mutedLight: "#888888",
    border: "#E2E2E8",
    borderSoft: "#EFEFF3",
    primary: "#D32F2F",
    primaryDark: "#8C1919",
    primarySoft: "#FFF1F1",
    danger: "#B00020",
    dangerSoft: "#FFF0F3",
    success: "#169C35",
    successSoft: "#EAF7EE",
    shadow: "#000000",
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },

    scrollContent: {
        padding: 18,
        paddingBottom: 36,
    },

    headerCard: {
        backgroundColor: COLORS.primary,
        borderRadius: 24,
        padding: 20,
        marginBottom: 18,
        flexDirection: "row",
        alignItems: "center",
        shadowColor: COLORS.shadow,
        shadowOpacity: 0.16,
        shadowOffset: { width: 0, height: 8 },
        shadowRadius: 18,
        elevation: 5,
    },

    headerIconBox: {
        width: 54,
        height: 54,
        borderRadius: 18,
        backgroundColor: "rgba(255,255,255,0.18)",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 14,
    },

    headerIcon: {
        fontSize: 25,
    },

    headerTextBox: {
        flex: 1,
    },

    headerTitle: {
        color: COLORS.white,
        fontSize: 24,
        fontWeight: "800",
        letterSpacing: -0.4,
    },

    headerSubtitle: {
        color: "rgba(255,255,255,0.86)",
        fontSize: 13,
        lineHeight: 18,
        marginTop: 4,
        fontWeight: "500",
    },

    sectionBlock: {
        marginBottom: 18,
    },

    sectionSmallTitle: {
        color: COLORS.muted,
        fontSize: 12,
        fontWeight: "800",
        textTransform: "uppercase",
        letterSpacing: 0.8,
        marginBottom: 9,
        marginLeft: 4,
    },

    menuItem: {
        backgroundColor: COLORS.card,
        borderRadius: 18,
        padding: 15,
        marginBottom: 10,
        borderColor: COLORS.borderSoft,
        borderWidth: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        shadowColor: COLORS.shadow,
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: 3 },
        shadowRadius: 8,
        elevation: 2,
    },

    menuItemActive: {
        borderColor: COLORS.primary,
        backgroundColor: COLORS.primarySoft,
    },

    menuLeft: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        paddingRight: 12,
    },

    menuIconBox: {
        width: 44,
        height: 44,
        borderRadius: 15,
        backgroundColor: "#F3F3F6",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 12,
    },

    menuIcon: {
        fontSize: 20,
    },

    menuTextBox: {
        flex: 1,
    },

    menuTitle: {
        color: COLORS.text,
        fontSize: 16,
        fontWeight: "800",
    },

    menuSubtitle: {
        color: COLORS.muted,
        fontSize: 12.5,
        lineHeight: 17,
        marginTop: 3,
        fontWeight: "500",
    },

    menuArrow: {
        color: COLORS.mutedLight,
        fontSize: 26,
        fontWeight: "500",
    },

    roleSection: {
        backgroundColor: COLORS.card,
        borderRadius: 20,
        padding: 16,
        marginTop: 2,
        borderColor: COLORS.borderSoft,
        borderWidth: 1,
        shadowColor: COLORS.shadow,
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: 3 },
        shadowRadius: 8,
        elevation: 2,
    },

    roleSectionTitle: {
        color: COLORS.text,
        fontSize: 17,
        fontWeight: "800",
    },

    roleSectionDescription: {
        color: COLORS.muted,
        fontSize: 13,
        lineHeight: 18,
        marginTop: 4,
        marginBottom: 14,
    },

    roleButton: {
        borderRadius: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: "#FAFAFC",
        padding: 13,
        marginBottom: 10,
    },

    roleButtonSelected: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },

    roleButtonLeft: {
        flexDirection: "row",
        alignItems: "center",
    },

    radioCircle: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        borderColor: "#C9C9D1",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 12,
        backgroundColor: COLORS.white,
    },

    radioCircleSelected: {
        borderColor: COLORS.white,
        backgroundColor: COLORS.white,
    },

    radioDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: COLORS.primary,
    },

    roleTextBox: {
        flex: 1,
    },

    roleButtonText: {
        color: COLORS.text,
        fontWeight: "800",
        fontSize: 15,
    },

    roleButtonTextSelected: {
        color: COLORS.white,
    },

    roleButtonDescription: {
        color: COLORS.muted,
        fontSize: 12,
        marginTop: 2,
        lineHeight: 16,
    },

    roleButtonDescriptionSelected: {
        color: "rgba(255,255,255,0.82)",
    },

    savePrefButton: {
        backgroundColor: COLORS.success,
        paddingVertical: 14,
        borderRadius: 16,
        alignItems: "center",
        marginTop: 4,
        shadowColor: COLORS.shadow,
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 8,
        elevation: 2,
    },

    savePrefText: {
        color: COLORS.white,
        fontWeight: "800",
        fontSize: 15,
    },

    linkedAccountsSection: {
        backgroundColor: COLORS.card,
        borderColor: COLORS.borderSoft,
        borderWidth: 1,
        borderRadius: 22,
        padding: 16,
        marginBottom: 18,
        shadowColor: COLORS.shadow,
        shadowOpacity: 0.06,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 12,
        elevation: 2,
    },

    sectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 12,
    },

    sectionTitle: {
        color: COLORS.text,
        fontSize: 18,
        fontWeight: "900",
        letterSpacing: -0.2,
    },

    sectionSubtitle: {
        color: COLORS.muted,
        fontSize: 12.5,
        marginTop: 3,
        fontWeight: "500",
    },

    addAccountButton: {
        backgroundColor: COLORS.primary,
        borderRadius: 14,
        paddingVertical: 10,
        paddingHorizontal: 13,
        shadowColor: COLORS.primary,
        shadowOpacity: 0.2,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 8,
        elevation: 2,
    },

    addAccountText: {
        color: COLORS.white,
        fontWeight: "900",
        fontSize: 13,
    },

    emptyAccountsBox: {
        backgroundColor: "#FAFAFC",
        borderWidth: 1,
        borderColor: COLORS.borderSoft,
        borderRadius: 16,
        padding: 15,
        marginTop: 4,
    },

    emptyAccountsTitle: {
        color: COLORS.text,
        fontSize: 14,
        fontWeight: "800",
    },

    emptyAccountsText: {
        color: COLORS.muted,
        fontSize: 12.5,
        marginTop: 3,
        lineHeight: 17,
    },

    linkedAccountRow: {
        minHeight: 72,
        borderColor: COLORS.borderSoft,
        borderWidth: 1,
        borderRadius: 18,
        padding: 12,
        marginTop: 9,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FAFAFC",
    },

    linkedAccountRowActive: {
        borderColor: COLORS.primary,
        backgroundColor: COLORS.primarySoft,
    },

    accountAvatar: {
        width: 43,
        height: 43,
        borderRadius: 15,
        backgroundColor: COLORS.text,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 11,
    },

    accountAvatarText: {
        color: COLORS.white,
        fontSize: 17,
        fontWeight: "900",
    },

    linkedAccountInfo: {
        flex: 1,
        paddingRight: 8,
    },

    accountNameRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 7,
    },

    linkedAccountName: {
        color: COLORS.text,
        fontSize: 15,
        fontWeight: "900",
        flexShrink: 1,
    },

    currentBadge: {
        backgroundColor: COLORS.successSoft,
        borderColor: "#BFE9C9",
        borderWidth: 1,
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: 999,
    },

    currentBadgeText: {
        color: COLORS.success,
        fontSize: 10.5,
        fontWeight: "900",
    },

    linkedAccountUsername: {
        color: COLORS.muted,
        fontSize: 12.5,
        marginTop: 3,
        fontWeight: "500",
    },

    removeAccountButton: {
        minWidth: 72,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 8,
        paddingHorizontal: 9,
        borderRadius: 12,
        backgroundColor: COLORS.dangerSoft,
    },

    removeAccountText: {
        color: COLORS.danger,
        fontWeight: "900",
        fontSize: 12,
    },

    dangerMenuItem: {
        borderColor: "#FFD4DC",
        backgroundColor: COLORS.white,
    },

    dangerIconBox: {
        backgroundColor: COLORS.dangerSoft,
    },

    dangerText: {
        color: COLORS.danger,
    },

    deleteSection: {
        backgroundColor: COLORS.dangerSoft,
        borderColor: "#FFD4DC",
        borderWidth: 1,
        borderRadius: 18,
        padding: 15,
        marginTop: 2,
    },

    deleteTitle: {
        color: COLORS.danger,
        fontSize: 15,
        fontWeight: "900",
        marginBottom: 5,
    },

    warningText: {
        color: COLORS.danger,
        fontSize: 13,
        lineHeight: 19,
        marginBottom: 12,
        fontWeight: "600",
    },

    deleteAccountButton: {
        backgroundColor: COLORS.danger,
        paddingVertical: 13,
        borderRadius: 15,
        alignItems: "center",
    },

    deleteAccountText: {
        color: COLORS.white,
        fontWeight: "900",
        fontSize: 15,
    },

    logoutButton: {
        backgroundColor: COLORS.white,
        borderColor: "#FFD4DC",
        borderWidth: 1,
        borderRadius: 18,
        paddingVertical: 15,
        paddingHorizontal: 16,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        shadowColor: COLORS.shadow,
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: 3 },
        shadowRadius: 8,
        elevation: 2,
    },

    logoutIcon: {
        color: COLORS.danger,
        fontSize: 19,
        fontWeight: "900",
        marginRight: 8,
    },

    logoutText: {
        color: COLORS.danger,
        fontSize: 16,
        fontWeight: "900",
    },

    footerText: {
        color: COLORS.mutedLight,
        textAlign: "center",
        fontSize: 12,
        marginTop: 18,
        fontWeight: "600",
    },

    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.42)",
        alignItems: "center",
        justifyContent: "flex-end",
        padding: 14,
    },

    modalCard: {
        width: "100%",
        backgroundColor: COLORS.white,
        borderRadius: 26,
        padding: 20,
        paddingBottom: 18,
        shadowColor: COLORS.shadow,
        shadowOpacity: 0.18,
        shadowOffset: { width: 0, height: -6 },
        shadowRadius: 16,
        elevation: 8,
    },

    modalHandle: {
        width: 44,
        height: 5,
        borderRadius: 999,
        backgroundColor: "#D8D8DE",
        alignSelf: "center",
        marginBottom: 16,
    },

    modalTitle: {
        color: COLORS.text,
        fontSize: 21,
        fontWeight: "900",
        letterSpacing: -0.3,
    },

    modalDescription: {
        color: COLORS.muted,
        fontSize: 13,
        lineHeight: 18,
        marginTop: 5,
        marginBottom: 16,
    },

    inputLabel: {
        color: COLORS.textSoft,
        fontSize: 13,
        fontWeight: "800",
        marginBottom: 7,
        marginLeft: 2,
    },

    input: {
        borderColor: COLORS.border,
        borderWidth: 1,
        borderRadius: 15,
        paddingHorizontal: 14,
        paddingVertical: 13,
        marginBottom: 13,
        color: COLORS.text,
        backgroundColor: "#FAFAFC",
        fontSize: 15,
        fontWeight: "600",
    },

    modalPrimaryButton: {
        backgroundColor: COLORS.primary,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 14,
        marginTop: 3,
        minHeight: 50,
        shadowColor: COLORS.primary,
        shadowOpacity: 0.22,
        shadowOffset: { width: 0, height: 5 },
        shadowRadius: 10,
        elevation: 3,
    },

    modalPrimaryButtonDisabled: {
        opacity: 0.75,
    },

    modalPrimaryText: {
        color: COLORS.white,
        fontWeight: "900",
        fontSize: 16,
    },

    modalSecondaryButton: {
        alignItems: "center",
        paddingVertical: 13,
        marginTop: 5,
    },

    modalSecondaryText: {
        color: COLORS.muted,
        fontWeight: "900",
        fontSize: 15,
    },
});