import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useFetchWithAuth } from '@/hooks/fetchWithAuth';
import { BASE_URL } from '@/hooks/api';
import { OrderDto } from "@/types/orders";

export default function OrdersList() {
    const router = useRouter();
    const { fetchWithAuth } = useFetchWithAuth();
    const [loading, setLoading] = useState(true);
    const [orders, setOrders] = useState<OrderDto[]>([]);
    const [expanded, setExpanded] = useState<Record<number, boolean>>({}); // ← ktoré ID sú rozbalené

    useEffect(() => {
        (async () => {
            const res = await fetchWithAuth(`${BASE_URL}/my-orders/`);
            if (res.ok) setOrders(await res.json());
            setLoading(false);
        })();
    }, [fetchWithAuth]);
    const formatDateTime = (iso: string) => {
        const d = new Date(iso);
        const day = d.getDate();                 // bez počiatočnej nuly
        const month = d.getMonth() + 1;          // bez počiatočnej nuly
        const year = d.getFullYear();
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        return `${day}.${month}.${year} ${hh}:${mm}`;
    };
    const toggle = (id: number) =>
        setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

    if (loading) return <View style={s.center}><ActivityIndicator /></View>;

    return (
        <View style={s.container}>
            <View style={s.header}>
                <Text style={s.title}>Moje objednávky</Text>
                <TouchableOpacity style={s.createBtn} onPress={() => router.push('/menu/orders/create')}>
                    <Text style={s.createBtnText}>+ Nová</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={orders}
                keyExtractor={(o) => String(o.id)}
                contentContainerStyle={{ padding: 12 }}
                ListEmptyComponent={<Text style={{ textAlign: 'center', color: '#666' }}>Zatiaľ žiadne objednávky.</Text>}
                renderItem={({ item }) => {
                    const isOpen = !!expanded[item.id];
                    return (
                        <TouchableOpacity activeOpacity={0.9} onPress={() => toggle(item.id)} style={s.card}>
                            <View style={s.rowBetween}>
                            <Text style={s.row}>
                                <Text style={s.muted}>#</Text>
                                {item.id} • {formatDateTime(item.created_at)}
                            </Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                <Text style={s.totalInline}>
                                {Number(item.total_amount).toFixed(2)} €
                                </Text>
                                <View style={[s.badge, item.is_paid ? s.badgePaid : s.badgeUnpaid]}>
                                <Text style={s.badgeText}>
                                    {item.is_paid ? 'Zaplatené' : 'Nezaplatené'}
                                </Text>
                                </View>
                            </View>
                            </View>

                            <Text style={s.row}><Text style={s.muted}>Stav: </Text>{item.status}</Text>
                            <Text style={s.row}><Text style={s.muted}>Položky: </Text>{item.items.length}</Text>
                            {item.note ? <Text style={s.note}>{item.note}</Text> : null}
                            {!item.is_paid && (
                            <TouchableOpacity
                                style={s.payBtn}
                                onPress={() => router.push('./payments')}
                            >
                                <Text style={s.payBtnText}>Zaplatiť objednávku</Text>
                            </TouchableOpacity>
                            )}
                            {item.is_paid && (
                            <View style={s.paidBox}>
                                <Text style={s.paidText}>Objednávka uhradená</Text>
                            </View>
                            )}


                            {/* Rozbalený detail */}
                            {isOpen && (
                                <View style={s.detailBox}>
                                {item.items.map((it, idx) => {
                                return (
                                    <View key={idx} style={s.itemRow}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={s.itemTitle}>
                                        {it.product_name || it.product_code || 'Položka'} • {it.product_type}
                                        </Text>
                                        {!!it.product_code && <Text style={s.itemSub}>Kód: {it.product_code}</Text>}
                                        {!!it.size && <Text style={s.itemSub}>Veľkosť: {it.size}</Text>}
                                        {!!it.height && <Text style={s.itemSub}>Výška: {it.height}</Text>}
                                        {!!it.side && <Text style={s.itemSub}>Strana: {it.side}</Text>}
                                        {!!it.note && <Text style={s.itemSub}>Pozn.: {it.note}</Text>}
                                    </View>
                                    <View style={s.itemMoney}>
                                        <Text style={s.itemQty}>x{it.quantity}</Text>
                                    </View>
                                    </View>
                                );
                                })}
                                <View style={s.totalRow}>
                                <Text style={s.totalLabel}>Spolu</Text>
                                <Text style={s.totalValue}>
                                    {(() => {
                                    const total = Number(item.total_amount ?? 0);
                                    return (isFinite(total) ? total : 0).toFixed(2);
                                    })()} €
                                </Text>
                                </View>
                                </View>
                            )}
                        </TouchableOpacity>
                    );
                }}
            />
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f6f6f6' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12 },
    title: { fontSize: 22, fontWeight: '700', color: '#111' },
    createBtn: { backgroundColor: '#D32F2F', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
    createBtnText: { color: '#fff', fontWeight: '800' },
    card: { backgroundColor: '#fff', borderRadius: 12, borderColor: '#e0e0e0', borderWidth: 1, padding: 12, marginBottom: 10 },
    row: { color: '#111', marginBottom: 4 },
    rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    muted: { color: '#555' },
    note: { marginTop: 6, color: '#444' },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
    badgePaid: { backgroundColor: '#2e7d32' },
    badgeUnpaid: { backgroundColor: '#b71c1c' },
    badgeText: { color: '#fff', fontWeight: '700', fontSize: 12 },

    detailBox: { marginTop: 10, borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 10 },
    itemRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 6 },
    itemTitle: { fontWeight: '700', color: '#111' },
    itemSub: { color: '#666', marginTop: 2 },
    itemMoney: { minWidth: 90, alignItems: 'flex-end' },
    itemQty: { color: '#444' },
    itemPrice: { color: '#444' },
    itemLine: { color: '#111', fontWeight: '700' },
    totalRow: { marginTop: 10, borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 10, flexDirection: 'row', justifyContent: 'space-between' },
    totalLabel: { fontSize: 16, fontWeight: '700', color: '#111' },
    totalValue: { fontSize: 16, fontWeight: '800', color: '#111' },
    canceledText: {
    textDecorationLine: 'line-through',
    color: '#999',
},
canceledLabel: {
    marginTop: 4,
    color: '#b71c1c',
    fontWeight: '700',
    fontSize: 12,
},
totalInline: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
},

paymentBox: {
  marginTop: 15,
  alignItems: 'center',
},

payBtn: {
  backgroundColor: '#D32F2F',
  paddingVertical: 14,
  paddingHorizontal: 20,
  borderRadius: 12,
  width: '100%',
  alignItems: 'center',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.15,
  shadowRadius: 3,
  elevation: 3,
},
payBtnText: {
  color: '#fff',
  fontWeight: '700',
  fontSize: 15,
},

paidBox: {
  backgroundColor: '#2e7d32',
  paddingVertical: 12,
  paddingHorizontal: 20,
  borderRadius: 12,
  width: '100%',
  alignItems: 'center',
},
paidText: {
  color: '#fff',
  fontWeight: '700',
  fontSize: 16,
},
});
