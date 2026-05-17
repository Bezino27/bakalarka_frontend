import React, { useContext } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { AuthContext } from '@/context/AuthContext';
import { LinkedAccountsSection } from '@/components/LinkedAccountsSection';

const menuItems = [
    { label: 'Správa kategórii', image: require('@/assets/images/menu/sprava_kat.png'), route: '/menu/users' },
    { label: 'Dochádzka', image: require('@/assets/images/menu/dochadzka.png'), route: '/menu/attendance' },
    { label: 'Dresy', image: require('@/assets/images/menu/dresy.png'), route: '/menu/jerseys' },
    { label: 'Údaje hráča', image: require('@/assets/images/menu/udaje.png'), route: '/profile' },
    { label: 'Objednávky', image: require('@/assets/images/menu/obj.png'), route: '/menu/orders_menu' },
    { label: 'Platby', image: require('@/assets/images/menu/plat.png'), route: '/menu/payments' },
    { label: 'Dôležité dokumenty', image: require('@/assets/images/menu/dok.png'), route: '/menu/documents' },
    { label: 'Nastavenia', image: require('@/assets/images/menu/sett.png'), route: '/menu/settings' },
    { label: 'Pomoc a podpora', image: require('@/assets/images/menu/cont.png'), route: '/menu/contact' },
    { label: 'O aplikácii', image: require('@/assets/images/menu/about.png'), route: '/menu/about_us' },


];

export default function MenuScreen() {
    const router = useRouter();
    const { userRoles, currentRole, setCurrentRole } = useContext(AuthContext);

    const availableRoles = ['player', 'coach', 'admin'].filter(role =>
        userRoles.some(r => r.role === role)
    );

    const handleRoleSwitch = async (role: string) => {
        const selected = userRoles.find(r => r.role === role);
        if (selected) {
            await setCurrentRole(selected);
            const routeKey =
                role === 'coach' ? 'tabs-coach'
                    : role === 'admin' ? 'tabs-admin'
                        : 'tabs-player';
            router.replace(`/${routeKey}/news`);
        }
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <View style={styles.grid}>
                {menuItems.map((item, index) => (
                    <TouchableOpacity
                        key={index}
                        style={styles.item}
                        onPress={() => router.navigate(item.route as never)}
                    >
                        <Image source={item.image} style={styles.icon} />
                    </TouchableOpacity>
                ))}
            </View>

            {/* Zobraziť len ak má viac ako jednu rolu */}
            {availableRoles.length > 1 && (
                <View style={styles.roleSwitchContainer}>
                    <Text style={styles.roleSwitchLabel}>Aktuálna rola:</Text>
                    <View style={styles.roleButtons}>
                        {availableRoles.map(role => {
                            const isActive = currentRole?.role === role;
                            return (
                                <TouchableOpacity
                                    key={role}
                                    style={[
                                        styles.roleButton,
                                        isActive && styles.roleButtonActive,
                                    ]}
                                    onPress={() => handleRoleSwitch(role)}
                                >
                                    <Text
                                        style={[
                                            styles.roleButtonText,
                                            isActive && styles.roleButtonTextActive,
                                        ]}
                                    >
                                        {role === 'player' ? 'Hráč' : role === 'coach' ? 'Tréner' : 'Admin'}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>
            )}
            <LinkedAccountsSection />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 20,
        alignItems: 'center',
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-around',
    },
    item: {
        width: '45%',
        aspectRatio: 2,
        backgroundColor: '#fff',
        borderRadius: 12,
        marginVertical: 10,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
    },
    icon: {
        width: '100%',
        height: '100%',
        resizeMode: 'contain',
    },
    roleSwitchContainer: {
        marginTop: 30,
        padding: 16,
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#ddd',
        width: '100%',
    },
    roleSwitchLabel: {
        fontWeight: '600',
        marginBottom: 10,
        fontSize: 15,
        color: '#444',
    },
    roleButtons: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    roleButton: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        backgroundColor: '#eee',
        borderRadius: 8,
    },
    roleButtonActive: {
        backgroundColor: '#D32F2F',
    },
    roleButtonText: {
        color: '#333',
        fontWeight: '600',
    },
    roleButtonTextActive: {
        color: '#fff',
    },
});
