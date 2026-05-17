import { AuthContext } from '@/context/AuthContext';
import { useRouter } from 'expo-router';
import { useContext, useEffect } from 'react';
import { ActivityIndicator, Image, StyleSheet, View } from 'react-native';

export default function StartScreen() {
  const router = useRouter();
  const { isLoggedIn, accessToken } = useContext(AuthContext);

  useEffect(() => {
    if (isLoggedIn === null) return;

    if (isLoggedIn && accessToken) {
      router.replace('/select-role');
    } else {
      router.replace('/login');
    }
  }, [isLoggedIn, accessToken, router]);

  return (
    <View style={styles.container}>
      <Image source={require('@/assets/images/splashscreen_logo.png')} style={styles.logo} />
      <ActivityIndicator size="large" color="#D32F2F" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  logo: {
    width: 180,
    height: 180,
    marginBottom: 24,
    resizeMode: 'contain',
  },
});
