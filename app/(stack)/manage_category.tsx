import React, { useCallback, useEffect, useState, useContext } from 'react';
import {
    View, Text, TouchableOpacity, ScrollView,
    StyleSheet, Alert, ActivityIndicator
} from 'react-native';
import { useFetchWithAuth } from '@/hooks/fetchWithAuth';
import { AuthContext } from '@/context/AuthContext';
import { BASE_URL } from '@/hooks/api';

type Player = {
    id: number;
    name: string;
    birth_date: string;
    categories: string[];  // napr. ['U15', 'U17']
};

type Category = {
    id: number;
    name: string;
};

export default function ManageCategoryScreen() {
    const { fetchWithAuth } = useFetchWithAuth();
    const { userRoles } = useContext(AuthContext);

    const coachCategories = userRoles
        .filter(r => r.role === 'coach')
        .map(r => r.category);

    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
    const [players, setPlayers] = useState<Player[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedInCategory, setSelectedInCategory] = useState<number[]>([]);

    const fetchPlayers = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetchWithAuth(`${BASE_URL}/users-in-club/`);
            const data = await res.json();

            const users = Array.isArray(data) ? data : [];
            const onlyPlayers: Player[] = users
                .filter((u: any) => u.roles.some((r: any) => r.role === 'player'))
                .map((u: any) => ({
                    id: u.id,
                    name: u.name || u.username,
                    birth_date: u.birth_date,
                    categories: u.roles
                        .filter((r: any) => r.role === 'player')
                        .map((r: any) => r.category__name),
                }));

            setPlayers(onlyPlayers);
        } catch {
            Alert.alert("Chyba", "Nepodarilo sa načítať hráčov.");
        } finally {
            setLoading(false);
        }
    }, [fetchWithAuth]);

    const handleSelectCategory = (cat: Category) => {
        setSelectedCategory(cat);
        const inCategory = players
            .filter(p => p.categories.includes(cat.name))
            .map(p => p.id);
        setSelectedInCategory(inCategory);
    };

    const togglePlayer = (playerId: number) => {
        setSelectedInCategory(prev =>
            prev.includes(playerId) ? prev.filter(id => id !== playerId) : [...prev, playerId]
        );
    };

    const handleSave = async () => {
        if (!selectedCategory) return;
        try {
            const res = await fetchWithAuth(`${BASE_URL}/assign-players-to-category/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    category_id: selectedCategory.id,
                    player_ids: selectedInCategory,
                }),
            });

            if (!res.ok) throw new Error();
            Alert.alert("✅ Uložené", "Hráči boli priradení.");
        } catch {
            Alert.alert("❌ Chyba", "Nepodarilo sa uložiť zmeny.");
        }
    };

    useEffect(() => {
        void fetchPlayers();
    }, [fetchPlayers]);

    const sortedPlayers = [...players].sort(
        (a, b) => new Date(a.birth_date).getTime() - new Date(b.birth_date).getTime()
    );

    if (loading) return <ActivityIndicator style={{ marginTop: 50 }} />;

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.heading}>🏷️ Vyber kategóriu</Text>
            <View style={styles.chipRow}>
                {coachCategories.map(cat => (
                    <TouchableOpacity
                        key={cat.id}
                        onPress={() => handleSelectCategory(cat)}
                        style={[
                            styles.chip,
                            selectedCategory?.id === cat.id && styles.chipSelected,
                        ]}
                    >
                        <Text
                            style={[
                                styles.chipText,
                                selectedCategory?.id === cat.id && { color: '#fff' },
                            ]}
                        >
                            {cat.name}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {selectedCategory && (
                <>
                    <Text style={styles.subheading}>👥 Hráči v kategórii {selectedCategory.name}</Text>

                    {sortedPlayers.map(p => {
                        const isInCategory = selectedInCategory.includes(p.id);
                        return (
                            <TouchableOpacity
                                key={p.id}
                                onPress={() => togglePlayer(p.id)}
                                style={[
                                    styles.playerCard,
                                    isInCategory ? styles.inCategory : styles.notInCategory,
                                ]}
                            >
                                <Text style={styles.playerName}>{p.name}</Text>
                                <Text style={styles.playerBirth}>{p.birth_date}</Text>
                                <Text style={styles.statusText}>
                                    {isInCategory ? "✅ V kategórii" : "➕ Mimo kategórie"}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}

                    <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                        <Text style={styles.saveButtonText}>💾 Uložiť zmeny</Text>
                    </TouchableOpacity>
                </>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { padding: 20, backgroundColor: '#f9f9f9' },
    heading: { fontSize: 22, fontWeight: 'bold', marginBottom: 10, color: '#000' },
    subheading: { fontSize: 18, fontWeight: 'bold', marginVertical: 15, color: '#D32F2F' },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    chip: {
        backgroundColor: '#ccc',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    chipSelected: { backgroundColor: '#D32F2F' },
    chipText: { fontWeight: '600', color: '#000' },
    playerCard: {
        borderWidth: 1,
        borderRadius: 10,
        padding: 10,
        marginBottom: 10,
    },
    inCategory: { borderColor: '#4CAF50', backgroundColor: '#eaffea' },
    notInCategory: { borderColor: '#aaa', backgroundColor: '#f2f2f2' },
    playerName: { fontSize: 16, fontWeight: 'bold', color: '#111' },
    playerBirth: { fontSize: 14, color: '#666' },
    statusText: { marginTop: 6, color: '#D32F2F', fontWeight: 'bold' },
    saveButton: {
        backgroundColor: '#4CAF50',
        padding: 14,
        borderRadius: 10,
        marginTop: 20,
        alignItems: 'center',
    },
    saveButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
});
