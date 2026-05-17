// app/components/ProfileCompletionBanner.tsx
import React, { useContext, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { AuthContext } from '@/context/AuthContext';

const REQUIRED: ('email' | 'birth_date' | 'height' | 'weight' | 'side' | 'number' |'position')[] =
    ['email','birth_date','height','weight','side','number','position'];

export default function ProfileCompletionBanner() {
    const { isLoggedIn, userDetails } = useContext(AuthContext);

    const missing = useMemo(() => {
        if (!userDetails) return REQUIRED;
        return REQUIRED.filter(f => {
            const v = (userDetails as any)[f];
            return v === null || v === undefined || String(v).trim() === '';
        });
    }, [userDetails]);

    if (!isLoggedIn || missing.length === 0) return null;

    return (
        <View style={s.wrap}>
            <View style={s.banner}>
                <View style={{ flex: 1 }}>
                    <Text style={s.title}>Dokončenie profilu</Text>
                    <Text style={s.sub}>Prosíme o doplnenie osobných údajov. Chýba: {missing.length}</Text>
                </View>
                <TouchableOpacity style={s.btn} onPress={() => router.push('/profile-edit')} activeOpacity={0.85}>
                    <Text style={s.btnText}>Doplniť</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const s = StyleSheet.create({
    wrap: { backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee', borderBottomWidth: 1, borderBottomColor: '#f0d6d6' },
    banner: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#fff8f8' },
    title: { color: '#8C1919', fontWeight: '700', fontSize: 15, marginBottom: 2 },
    sub: { color: '#444', fontSize: 13 },
    btn: { backgroundColor: '#D32F2F', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
    btnText: { color: '#fff', fontWeight: '700' },
});
