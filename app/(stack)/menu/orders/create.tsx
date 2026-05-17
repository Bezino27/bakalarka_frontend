import React, { useContext, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { AuthContext } from '@/context/AuthContext';
import { BASE_URL } from '@/hooks/api';
import { useFetchWithAuth } from '@/hooks/fetchWithAuth';
import type { ProductType, OrderItemPayload, OrderPayload } from '@/types/orders';

const TYPE_LABEL: Record<ProductType, string> = {
    stick: 'Hokejka',
    apparel: 'Oblečenie',
    blade: 'Čepeľ',
    other: 'Iné',
};

const typeOrder: ProductType[] = ['stick', 'apparel', 'blade', 'other'];

function TypeTab({
                     value, active, onPress,
                 }: { value: ProductType; active: boolean; onPress: () => void }) {
    return (
        <TouchableOpacity onPress={onPress} style={[styles.tab, active && styles.tabActive]}>
            <Text style={[styles.tabText, active && styles.tabTextActive]}>{TYPE_LABEL[value]}</Text>
        </TouchableOpacity>
    );
}

function ItemFields({
    item, onChange,
    }: {
    item: OrderItemPayload;
    onChange: (patch: Partial<OrderItemPayload>) => void;
}) {
    // dynamické polia podľa typu
    const common = (
        <>
            <Text style={styles.label}>Názov produktu</Text>
            <TextInput
                style={styles.input}
                placeholder="napr. Zone Hyper"
                value={item.product_name || ''}
                onChangeText={(t) => onChange({ product_name: t })}
            />

            {/* kód produktu */}
            <Text style={styles.label}>Kód produktu</Text>
            <TextInput
                style={styles.input}
                placeholder="napr. 42560"
                value={item.product_code || ''}
                onChangeText={(t) => onChange({ product_code: t })}
            />
        </>
    );
    const [quantityText, setQuantityText] = useState(String(item.quantity));


    return (
        <View>
            {common}

            {/* Typovo špecifické polia */}
            {(item.product_type === 'stick' || item.product_type === 'blade') && (
                <>
                    {item.product_type === 'stick' && (
                        <>
                            <Text style={styles.label}>Výška</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="napr. 100 cm"
                                value={item.height || ''}
                                onChangeText={(t) => onChange({ height: t })}
                            />
                        </>
                    )}
                    <Text style={styles.label}>Strana</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="napr. ľavá"
                        value={item.side || ''}
                        onChangeText={(t) => onChange({ side: t })}
                    />
                </>
            )}

            {item.product_type === 'apparel' && (
                <>
                    <Text style={styles.label}>Veľkosť</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="napr. M / 152"
                        value={item.size || ''}
                        onChangeText={(t) => onChange({ size: t })}
                    />
                </>
            )}

            {/* Spoločné: množstvo, poznámka */}
            <Text style={styles.label}>Množstvo</Text>
            <TextInput
                style={styles.input}
                keyboardType="number-pad"
                placeholder="1"
                value={quantityText}
                onChangeText={(t) => {
                setQuantityText(t);
                }}
                onBlur={() => {
                const num = parseInt(quantityText, 10);
                onChange({ quantity: isNaN(num) ? 1 : Math.max(1, num) });
                setQuantityText(String(isNaN(num) ? 1 : Math.max(1, num)));
                }}
            />

            <Text style={styles.label}>Poznámka</Text>
            <TextInput
                style={[styles.input, { height: 70 }]}
                multiline
                placeholder="voliteľné"
                value={item.note || ''}
                onChangeText={(t) => onChange({ note: t })}
            />
        </View>
    );
}

export default function CreateOrderScreen() {
    const router = useRouter();
    const { userClub } = useContext(AuthContext);
    const { fetchWithAuth } = useFetchWithAuth();

    const activeType: ProductType = 'stick';
    const [items, setItems] = useState<OrderItemPayload[]>([
        { product_type: 'stick', product_name: '', product_code: '', side: '', height: '', size: '', quantity: 1, note: '' },
    ]);
    const [orderNote, setOrderNote] = useState('');

    const canSubmit = useMemo(() => userClub && items.length > 0, [userClub, items]);

    const changeItem = (idx: number, patch: Partial<OrderItemPayload>) => {
        setItems(prev => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
    };

    const addItem = () => {
        setItems(prev => [...prev, {
            product_type: activeType, product_name: '', product_code: '', side: '',
            height: '', size: '', quantity: 1, note: '',
        }]);
    };

    const removeItem = (idx: number) => {
        setItems(prev => prev.filter((_, i) => i !== idx));
    };

    const submit = async () => {
        if (!userClub) {
            Alert.alert("Chýba klub", "Nepodarilo sa nájsť klub používateľa.");
            return;
        }
        // jednoduchá validácia: aspoň názov alebo kód
        for (const [i, it] of items.entries()) {
            if (!(it.product_name?.trim() || it.product_code?.trim())) {
                Alert.alert("Chýbajú údaje", `Položka #${i + 1} musí mať aspoň názov alebo kód.`);
                return;
            }
        }

        const payload: OrderPayload = {
            club: userClub.id,
            note: orderNote,
            items: items.map(it => ({
                product_type: it.product_type,
                product_name: it.product_name?.trim() || '',
                product_code: it.product_code?.trim() || '',
                side: it.side?.trim() || '',
                height: it.height?.trim() || '',
                size: it.size?.trim() || '',
                quantity: it.quantity || 1,
                note: it.note?.trim() || '',
            })),
        };

        const res = await fetchWithAuth(`${BASE_URL}/orders/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        if (res.ok) {
            Alert.alert("Objednávka odoslaná", "Tvoja objednávka bola uložená.");
            router.back();
        } else {
            const txt = await res.text();
            Alert.alert("Chyba", `Nepodarilo sa odoslať objednávku.\n${txt}`);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Objednávka</Text>

            {/* TABY */}


            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 120 }}>
                {items.map((item, idx) => (
                    <View key={idx} style={styles.card}>
                        {/* lokálne taby pre každú položku – aby sa dalo zmeniť typ */}
                        <View style={[styles.tabsRow, { marginBottom: 8 }]}>
                            {typeOrder.map(t => (
                                <TypeTab
                                    key={t}
                                    value={t}
                                    active={item.product_type === t}
                                    onPress={() => changeItem(idx, { product_type: t })}
                                />
                            ))}
                        </View>

                        <ItemFields item={item} onChange={(patch) => changeItem(idx, patch)} />

                        <View style={{ height: 10 }} />
                        <View style={styles.line} />
                        <TouchableOpacity onPress={() => removeItem(idx)} style={[styles.removeBtn]}>
                            <Text style={styles.removeBtnText}>Odstrániť položku</Text>
                        </TouchableOpacity>
                    </View>
                ))}

                <TouchableOpacity onPress={addItem} style={styles.addBtn}>
                    <Text style={styles.addBtnText}>Pridať ďalší produkt</Text>
                </TouchableOpacity>

                <View style={styles.card}>
                    <Text style={styles.label}>Poznámka k objednávke (voliteľné)</Text>
                    <TextInput
                        style={[styles.input, { height: 90 }]}
                        multiline
                        value={orderNote}
                        onChangeText={setOrderNote}
                        placeholder="napr. doručiť na tréning v utorok"
                    />
                </View>
            </ScrollView>

            <TouchableOpacity disabled={!canSubmit} onPress={submit} style={[styles.submit, !canSubmit && { opacity: 0.6 }]}>
                <Text style={styles.submitText}>Odoslať objednávku</Text>
            </TouchableOpacity>
        </View>
    );
}

const palette = {
    bg: '#f6f6f6',
    white: '#fff',
    text: '#111',
    sub: '#555',
    border: '#e0e0e0',
    red: '#D32F2F',
    green: '#2e7d32',
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: palette.bg },
    title: { fontSize: 22, fontWeight: '700', margin: 16, color: palette.text },
    tabsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 12 },
    tab: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, backgroundColor: '#eee' },
    tabActive: { backgroundColor: palette.red },
    tabText: { color: palette.sub, fontWeight: '600' },
    tabTextActive: { color: '#fff' },
    card: {
        marginHorizontal: 12, marginBottom: 12, padding: 12,
        backgroundColor: palette.white, borderRadius: 12, borderWidth: 1, borderColor: palette.border,
        shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
    },
    label: { fontWeight: '600', color: palette.sub, marginTop: 8, marginBottom: 4 },
    input: {
        backgroundColor: '#fafafa', borderColor: palette.border, borderWidth: 1, borderRadius: 10,
        paddingHorizontal: 12, height: 42,
    },
    line: { height: 1, backgroundColor: palette.border, marginVertical: 8 },
    addBtn: {
        backgroundColor: palette.red, marginHorizontal: 12, marginBottom: 12, borderRadius: 12, paddingVertical: 14,
        alignItems: 'center',
    },
    addBtnText: { color: '#fff', fontWeight: '700' },
    removeBtn: { alignSelf: 'flex-end', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: '#fbe9e7' },
    removeBtnText: { color: palette.red, fontWeight: '700' },
    submit: {
        position: 'absolute', left: 12, right: 12, bottom: 16,
        backgroundColor: palette.green, borderRadius: 12, paddingVertical: 16, alignItems: 'center',
    },
    submitText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
