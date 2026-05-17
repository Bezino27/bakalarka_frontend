import React, { useCallback, useEffect, useState } from "react";
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
} from "react-native";
import { useFetchWithAuth } from "@/hooks/fetchWithAuth";
import { BASE_URL } from "@/hooks/api";

type Payment = {
    id: number;
    amount: string;
    due_date: string;
    variable_symbol: string;
    is_paid: boolean;
    description: string;
    user: {
        id: number;
        name: string;
        username: string;
    };
};

export default function PaymentsAdminScreen() {
    const { fetchWithAuth } = useFetchWithAuth();
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchPayments = useCallback(async () => {
        try {
            const res = await fetchWithAuth(`${BASE_URL}/admin-member-payments/`);
            const data = await res.json();
            setPayments(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error("❌ Chyba pri načítaní platieb", e);
            Alert.alert("Chyba", "Nepodarilo sa načítať platby.");
        } finally {
            setLoading(false);
        }
    }, [fetchWithAuth]);

    const togglePaymentStatus = async (paymentId: number, currentStatus: boolean) => {
        try {
            const res = await fetchWithAuth(`${BASE_URL}/admin-member-payments/`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: paymentId, is_paid: !currentStatus }),
            });

            if (!res.ok) throw new Error();

            setPayments((prev) =>
                prev.map((p) =>
                    p.id === paymentId ? { ...p, is_paid: !currentStatus } : p
                )
            );
        } catch {
            Alert.alert("❌ Chyba", "Nepodarilo sa zmeniť stav platby.");
        }
    };

    useEffect(() => {
        void fetchPayments();
    }, [fetchPayments]);

    if (loading) return <ActivityIndicator style={{ marginTop: 50 }} />;

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.title}>💼 Kontrola platieb členov</Text>

            {payments.map((p) => (
                <View key={p.id} style={styles.card}>
                    <Text style={styles.name}>
                        {p.user.name || p.user.username}
                    </Text>
                    <Text>{p.amount} € – do {new Date(p.due_date).toLocaleDateString("sk-SK")}</Text>
                    <Text style={styles.description}>{p.description}</Text>
                    <Text style={{ fontWeight: "600" }}>
                        VS: {p.variable_symbol}
                    </Text>
                    <TouchableOpacity
                        style={[
                            styles.statusButton,
                            { backgroundColor: p.is_paid ? "#4CAF50" : "#D32F2F" },
                        ]}
                        onPress={() => togglePaymentStatus(p.id, p.is_paid)}
                    >
                        <Text style={styles.statusText}>
                            {p.is_paid ? "✅ Uhradené (klikni pre zmenu)" : "❌ Neuhradené (klikni pre zmenu)"}
                        </Text>
                    </TouchableOpacity>
                </View>
            ))}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { padding: 20 },
    title: { fontSize: 22, fontWeight: "bold", marginBottom: 20 },
    card: {
        backgroundColor: "#fff",
        padding: 15,
        marginBottom: 15,
        borderRadius: 10,
        elevation: 2,
    },
    name: {
        fontWeight: "bold",
        fontSize: 16,
        marginBottom: 4,
    },
    description: {
        fontStyle: "italic",
        color: "#666",
        marginBottom: 4,
    },
    statusButton: {
        marginTop: 8,
        padding: 10,
        borderRadius: 8,
    },
    statusText: {
        color: "#fff",
        fontWeight: "600",
        textAlign: "center",
    },
});
