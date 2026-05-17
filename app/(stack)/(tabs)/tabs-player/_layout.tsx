// app/(tabs-player)/_layout.tsx
import React, { useCallback, useRef, useState, useContext, useEffect } from 'react';
import { Tabs, useRouter, useSegments } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity, Image, View, Text, StyleSheet, DeviceEventEmitter } from 'react-native';
import { useFetchWithAuth } from '@/hooks/fetchWithAuth';
import { useFocusEffect } from '@react-navigation/native';
import { BASE_URL } from '@/hooks/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthContext } from '@/context/AuthContext';
import { getConversations } from '@/hooks/chatApi';
import * as Notifications from 'expo-notifications';

type AnnouncementPreview = {
    read_at?: string | null;
};

export default function PlayerTabsLayout() {
    const router = useRouter();
    const segments = useSegments();
    const { fetchWithAuth } = useFetchWithAuth();
    const { isLoggedIn, accessToken } = useContext(AuthContext);
    const [unreadCount, setUnreadCount] = useState(0);
    const insets = useSafeAreaInsets();
    const [unreadAnnouncements, setUnreadAnnouncements] = useState(0);
    const inflightRef = useRef(false);
    const abortedRef = useRef(false);
    const inflightAnnouncementsRef = useRef(false);
    const lastAnnouncementsFetchRef = useRef(0);
    const isAnnouncementsRoute = (segments as readonly string[]).includes("announcements");

    const fetchUnread = useCallback(async () => {
        if (isLoggedIn !== true || !accessToken || inflightRef.current) return;
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
            if (!abortedRef.current) console.error("❌ Chyba pri načítaní správ:", e);
        } finally {
            inflightRef.current = false;
        }
    }, [isLoggedIn, accessToken, fetchWithAuth]);
    const fetchUnreadAnnouncements = useCallback(async (force = false) => {
        const now = Date.now();

        if (isLoggedIn !== true || !accessToken || inflightAnnouncementsRef.current) return;

        if (!force && isAnnouncementsRoute) {
            return;
        }

        if (!force && now - lastAnnouncementsFetchRef.current < 15000) {
            return;
        }

        inflightAnnouncementsRef.current = true;
        lastAnnouncementsFetchRef.current = now;

        try {
            const res = await fetchWithAuth(`${BASE_URL}/announcements/`);
            if (!res.ok) {
                console.log("Unread announcements fetch failed:", res.status);
                return;
            }
            const data: AnnouncementPreview[] = await res.json();

            const unreadCount = Array.isArray(data) ? data.filter((a) => !a.read_at).length : 0;
            setUnreadAnnouncements(unreadCount);
        } catch (e) {
            console.log("Unread announcements fetch error:", e);
        } finally {
            inflightAnnouncementsRef.current = false;
        }
    }, [isLoggedIn, accessToken, fetchWithAuth, isAnnouncementsRoute]);

    useFocusEffect(
        useCallback(() => {
            abortedRef.current = false;
            void fetchUnread();
            return () => {
                abortedRef.current = true;
            };
        }, [fetchUnread])
    );
    useFocusEffect(
        useCallback(() => {
            void fetchUnreadAnnouncements();
            return () => {};
        }, [fetchUnreadAnnouncements])
        );

    useEffect(() => {
        const sub = DeviceEventEmitter.addListener("refreshAnnouncements", () => {
            void fetchUnreadAnnouncements(true); // ✅ okamžitý refresh badge
        });
        return () => sub.remove();
        }, [fetchUnreadAnnouncements]);

    useEffect(() => {
        const sub = DeviceEventEmitter.addListener("refreshChatUnread", () => {
            void fetchUnread();
        });
        return () => sub.remove();
    }, [fetchUnread]);

    useEffect(() => {
        if (!isLoggedIn || !accessToken) return;
        const id = setInterval(() => { void fetchUnread(); }, 60000);
        return () => clearInterval(id);
    }, [isLoggedIn, accessToken, fetchUnread]);

    return (
        <View style={{ flex: 1 }}>

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
            name="announcements"
            options={{
                title: "Nástenka",
                headerTitle: () => (
                <Image
                    source={require('@/assets/images/nastenka_head.png')}
                    style={{ width: 140, height: 40, resizeMode: 'contain' }}
                />
                ),
                tabBarIcon: ({ color, size }) => (
                <View>
                    <Image
                    source={require('@/assets/images/nastenka.png')}
                    style={{ width: size, height: size, tintColor: color }}
                    />
                    {unreadAnnouncements > 0 && (
                    <View style={styles.unreadDotSmall} />
                    )}
                </View>
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
                            style={{ width: 160, height: 50, resizeMode: 'contain' }}
                        />
                    ),
                    tabBarIcon: ({ color, size }) => (
                        <Image
                            source={require('@/assets/images/moje_udalosti_ico.png')}
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
                            style={{ width: 180, height: 25, resizeMode: 'contain' }}
                        />
                    ),
                    tabBarIcon: ({ color, size }) => (
                        <Image
                            source={require('@/assets/images/trainings_ico.png')}
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
                            style={{ width: 140, height: 40, resizeMode: 'contain' }}
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
                name="menuScreen"
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
        </View>
);
}

const styles = StyleSheet.create({
    unreadDot: {
        position: 'absolute',
        top: 0,
        right: -6,
        minWidth: 16,
        height: 16,
        paddingHorizontal: 3,
        borderRadius: 8,
        backgroundColor: '#D32F2F',
        justifyContent: 'center',
        alignItems: 'center',
    },
    unreadText: {
        fontSize: 11,
        color: '#fff',
        fontWeight: 'bold',
        textAlign: 'center',
    },
    unreadDotSmall: {
        position: "absolute",
        top: -2,
        right: -5,
        width: 12,
        height: 12,
        borderRadius: 5,
        backgroundColor: "#D32F2F",
    },

});
