import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { BASE_URL } from '@/hooks/api';
import { useFetchWithAuth } from '@/hooks/fetchWithAuth';

export default function UploadStatementScreen() {
    const { fetchWithAuth } = useFetchWithAuth();
    const [loading, setLoading] = useState(false);
    const [rawResponse, setRawResponse] = useState<string | null>(null);

    const handleUpload = async () => {
        setRawResponse(null);

        const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf' });
        if (result.canceled) return;

        setLoading(true);
        const file = result.assets[0];

        const formData = new FormData();
        formData.append('file', {
            uri: file.uri,
            name: file.name,
            type: 'application/pdf',
        } as any);

        try {
            const res = await fetchWithAuth(`${BASE_URL}/upload-pdf-chatgpt/`, {
                method: 'POST',
                body: formData,
            });

            const data = await res.json().catch(() => null);

            if (!res.ok) {
                const errMsg = data?.error || 'Neznáma chyba';
                const raw = data?.raw_response || null;

                if (raw) setRawResponse(raw);

                throw new Error(errMsg);
            }

            Alert.alert("✅ Hotovo", `${data.message}`);
        } catch (e) {
            Alert.alert("Chyba", (e as Error).message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>📄 Nahranie výpisu z banky</Text>
            <Text style={styles.desc}>Nahráš výpis v PDF a AI spracuje údaje o platbách.</Text>

            {loading ? (
                <ActivityIndicator size="large" color="#D32F2F" />
            ) : (
                <TouchableOpacity style={styles.button} onPress={handleUpload}>
                    <Text style={styles.buttonText}>📎 Vybrať PDF výpis</Text>
                </TouchableOpacity>
            )}

            {rawResponse && (
                <View style={styles.debugBox}>
                    <Text style={styles.debugTitle}>⚠️ Odpoveď AI:</Text>
                    <Text style={styles.debugText}>{rawResponse}</Text>
                </View>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { padding: 20, flexGrow: 1, backgroundColor: '#fff' },
    title: { fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
    desc: { fontSize: 15, marginBottom: 20 },
    button: {
        backgroundColor: '#D32F2F',
        padding: 14,
        borderRadius: 10,
        alignItems: 'center',
    },
    buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    debugBox: {
        marginTop: 20,
        backgroundColor: '#eee',
        padding: 10,
        borderRadius: 10,
    },
    debugTitle: {
        fontWeight: 'bold',
        marginBottom: 5,
        color: '#D32F2F',
    },
    debugText: {
        fontSize: 13,
        color: '#333',
    },
});
