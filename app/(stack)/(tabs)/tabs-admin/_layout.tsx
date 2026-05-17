import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity, Image, View, Text, StyleSheet, DeviceEventEmitter } from 'react-native';
import React, { useState, useCallback, useContext, useEffect, useRef } from 'react';
import { useFetchWithAuth } from '@/hooks/fetchWithAuth';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AuthContext } from '@/context/AuthContext';
import { getConversations } from '@/hooks/chatApi';
import * as Notifications from 'expo-notifications';

export default function AdminTabsLayout() {
    const router = useRouter();
    const { fetchWithAuth } = useFetchWithAuth();
    const { isLoggedIn, accessToken } = useContext(AuthContext);
    const [unreadCount, setUnreadCount] = useState(0);
    const inflightRef = useRef(false);
    const abortedRef = useRef(false);

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
            if (!abortedRef.current) console.error("❌ Chyba pri načítaní neprečítaných správ:", e);
        } finally {
            inflightRef.current = false;
        }
    }, [isLoggedIn, accessToken, fetchWithAuth]);

    useFocusEffect(
        useCallback(() => {
            abortedRef.current = false;
            void fetchUnread();
            return () => {
                abortedRef.current = true;
            };
        }, [fetchUnread])
    );

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

    const insets = useSafeAreaInsets();


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
                        style={{ width: 150, height: 40, resizeMode: 'contain', }}
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
                name="news"
                options={{
                    title: "Nástenka",
                    headerTitle: () => (
                        <Image
                            source={require('@/assets/images/nastenka_head.png')}
                            style={{ width: 180, height: 50, resizeMode: 'contain' }}
                        />
                    ),
                    tabBarIcon: ({ color, size }) => (
                        <Image
                            source={require('@/assets/images/nastenka.png')}
                            style={{
                                width: size,
                                height: size,
                                tintColor: color, // umožní automatickú zmenu farby podľa aktívnosti tabu
                            }}
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
                            source={require('@/assets/images/trainings_ico.png')}
                            style={{
                                width: size,
                                height: size,
                                tintColor: color, // umožní automatickú zmenu farby podľa aktívnosti tabu
                            }}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="users"
                options={{
                    title: "Uživatelia",
                    headerTitle: () => (
                        <Image
                            source={require('@/assets/images/nazov-black.png')}
                            style={{ width: 180, height: 30, resizeMode: 'contain' }}
                        />
                    ),
                    tabBarIcon: ({ color, size }) => (
                        <Image
                            source={require('@/assets/images/kategorie.png')}
                            style={{
                                width: size,
                                height: size,
                                tintColor: color, // umožní automatickú zmenu farby podľa aktívnosti tabu
                            }}
                        />
                    ),
                }}
            />

            <Tabs.Screen
                name="index"
                options={{
                    title: "Kategorie",
                    headerTitle: () => (
                        <Image
                            source={require('@/assets/images/nazov-black.png')}
                            style={{ width: 180, height: 50, resizeMode: 'contain' }}
                        />
                    ),
                    tabBarIcon: ({ color, size }) => (
                        <Image
                            source={require('@/assets/images/match_ico.png')}
                            style={{
                                width: size,
                                height: size,
                                tintColor: color, // umožní automatickú zmenu farby podľa aktívnosti tabu
                            }}
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
                            style={{ width: 180, height: 25, resizeMode: 'contain' }}
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
