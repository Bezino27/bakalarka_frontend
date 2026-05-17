import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity, Image, View, StyleSheet, Text, DeviceEventEmitter } from 'react-native';
import { useFetchWithAuth } from "@/hooks/fetchWithAuth";
import React, { useCallback, useContext, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AuthContext } from "@/context/AuthContext";
import { getConversations } from "@/hooks/chatApi";
import * as Notifications from "expo-notifications";

export default function AdminTabsLayout() {
    const router = useRouter();
    const { fetchWithAuth } = useFetchWithAuth();
    const { isLoggedIn, accessToken } = useContext(AuthContext);
    const [unreadCount, setUnreadCount] = useState(0);
    const insets = useSafeAreaInsets();

    // ochrany proti paralelnému volaniu a zapisovaniu po unmount-e
    const inflightRef = useRef(false);
    const abortedRef = useRef(false);

    const fetchUnread = useCallback(async () => {
        if (!isLoggedIn || !accessToken) return;      // 🔒 nespúšťaj bez tokenu
        if (inflightRef.current) return;              // 🔒 neštartuj paralelne
        inflightRef.current = true;
        try {
            const data = await getConversations(fetchWithAuth);
            if (abortedRef.current) return;
            const count = Array.isArray(data)
                ? data.reduce((sum, conversation) => sum + Math.max(0, conversation.unread_count || 0), 0)
                : 0;
            setUnreadCount(count);
            await Notifications.setBadgeCountAsync(count);
        } catch (e) {
            if (!abortedRef.current) console.error("❌ Chyba pri načítaní neprečítaných správ:", e);
        } finally {
            inflightRef.current = false;
        }
    }, [isLoggedIn, accessToken, fetchWithAuth]);

    // načítaj pri ZAOSTRENÍ tabov
    useFocusEffect(
        useCallback(() => {
            abortedRef.current = false;
            void fetchUnread();
            return () => {
                abortedRef.current = true;
            };
        }, [fetchUnread])
    );

    // (voliteľné) jemný polling každých 60s len keď je user prihlásený
    useEffect(() => {
        if (!isLoggedIn || !accessToken) return;
        const id = setInterval(() => { void fetchUnread(); }, 60000);
        return () => clearInterval(id);
    }, [isLoggedIn, accessToken, fetchUnread]);

    useEffect(() => {
        const sub = DeviceEventEmitter.addListener("refreshChatUnread", () => {
            void fetchUnread();
        });
        return () => sub.remove();
    }, [fetchUnread]);

    return (
        <Tabs
            screenOptions={{
                headerStyle: {
                    height: 40 + insets.top,
                    backgroundColor: "#fff",
                },
                tabBarActiveTintColor: '#D32F2F',     // 🔥 farba aktívnej ikony (napr. červená)
                tabBarInactiveTintColor: '#888888ff',   
                headerTitleAlign: "center",
                headerTitleContainerStyle: {
                    justifyContent: "center",
                    alignItems: "center",
                },
                headerTitle: () => (
                    <Image
                        source={require('@/assets/images/moje udalosti.png')}
                        style={{ width: 150, height: 40, resizeMode: 'contain' }}
                    />
                ),
                headerLeft: () => (
                    <TouchableOpacity
                        onPress={() => router.navigate('/(stack)/training/create_training')}
                        style={{ paddingLeft: 15 }}
                    >
                        <View>
                            <Image
                                source={require('@/assets/images/novaudalost_coach.png')}
                                style={{ width: 30, height: 45, resizeMode: 'contain', tintColor: 'black', }}
                            />
                        </View>
                    </TouchableOpacity>
                ),
                headerRight: () => (
                    <TouchableOpacity
                        onPress={() => router.navigate('/(stack)/chat/chat-users')}
                        style={{ paddingRight: 15 }}
                    >
                        <View>
                            <Image
                                source={require('@/assets/images/spravy_logo.png')}
                                style={{ width: 25, height: 35, resizeMode: 'contain' }}
                            />
                            {unreadCount > 0 && (
                                <View style={styles.unreadDot}>
                                    <Text style={styles.unreadText}>{unreadCount}</Text>
                                </View>
                            )}
                        </View>
                    </TouchableOpacity>
                ),
            }}
        >

            <Tabs.Screen
                name="announcements_coach"
                options={{
                    title: "Nástenka",
                    headerTitle: () => (
                        <Image
                            source={require('@/assets/images/nastenka_head.png')}
                            style={{ width: 140, height: 40, resizeMode: 'contain' }}
                        />
                    ),
                    tabBarIcon: ({ color, size }) => (
                        <Image
                            source={require('@/assets/images/nastenka.png')}
                            style={{ width: size, height: size, tintColor: color }}
                        />
                    ),
                }}
            />

            <Tabs.Screen
                name="news"
                options={{
                    title: "Moje Udalosti",
                    headerTitle: () => (
                        <Image
                            source={require('@/assets/images/moje udalosti.png')}
                            style={{ width: 160, height: 50, resizeMode: 'contain', marginLeft: 0 }}
                        />
                    ),
                    tabBarIcon: ({ color, size }) => (
                        <Image
                            source={require('@/assets/images/coach_MU.png')}
                            style={{ width: size, height: size, tintColor: color }}
                        />
                    ),
                }}
            />

            <Tabs.Screen
                name="trainings"
                options={{
                    title: "Tréningy",
                    headerTitle: () => (
                        <Image
                            source={require('@/assets/images/trainings.png')}
                            style={{ width: 180, height: 30, resizeMode: 'contain' }}
                        />
                    ),
                    tabBarIcon: ({ color, size }) => (
                        <Image
                            source={require('@/assets/images/treningy_coach.png')}
                            style={{ width: size, height: size, tintColor: color }}
                        />
                    ),
                }}
            />


            <Tabs.Screen
                name="matches"
                options={{
                    title: "Zápasy",
                    headerTitle: () => (
                        <Image
                            source={require('@/assets/images/matches.png')}
                            style={{ width: 180, height: 35, resizeMode: 'contain' }}
                        />
                    ),
                    tabBarIcon: ({ color, size }) => (
                        <Image
                            source={require('@/assets/images/zapasy_full.png')}
                            style={{ width: size, height: size, tintColor: color }}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="MenuScreen"
                options={{
                    title: "Menu",
                    headerTitle: () => (
                        <Image
                            source={require('@/assets/images/menu.png')}
                            style={{ width: 120, height: 20, resizeMode: 'contain' }}
                        />
                    ),
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="menu" size={size} color={color} />
                    ),
                }}
            />
        </Tabs>
    );
}

const styles = StyleSheet.create({
    unreadDot: {
        position: "absolute",
        top: 0,
        right: -6,
        minWidth: 16,
        height: 16,
        paddingHorizontal: 3,
        borderRadius: 8,
        backgroundColor: "#D32F2F",
        justifyContent: "center",
        alignItems: "center",
    },
    unreadText: {
        fontSize: 11,
        color: "#fff",
        fontWeight: "bold",
        textAlign: "center",
    },
});
