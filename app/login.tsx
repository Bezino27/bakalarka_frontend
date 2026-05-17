// app/login.tsx
import { useRouter } from 'expo-router';
import React, { useContext, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
  Platform,
  Dimensions,
  Keyboard,
  TouchableWithoutFeedback,
  BackHandler,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { AuthContext } from '@/context/AuthContext';
import { loginWithCredentials } from '@/hooks/authHelpers';


export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { login, isLoggedIn, accessToken } = useContext(AuthContext);

  const screenHeight = Dimensions.get('window').height;
  const isSmallScreen = screenHeight < 700;

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ⚠️ Ak je používateľ už prihlásený, presmeruj
  useEffect(() => {
    if (isLoggedIn && accessToken) {
      // presmeruj len ak máme token
      router.replace('/select-role');
    }
    const backHandler = BackHandler.addEventListener("hardwareBackPress", () => true); // zakáže späť
    return () => backHandler.remove(); // cleanup
  }, [isLoggedIn, accessToken, router]);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await loginWithCredentials(username, password);
      const club = result.club ?? null;

      await login(
          result.access,
          result.refresh,
          club,
          result.roles,
          result.categories,
          result.details
      );

    } catch (e: any) {
      setError(e.message || 'Chyba pri prihlasovaní');
    } finally {
      setLoading(false);
    }
  };

  if (isLoggedIn === null || (isLoggedIn && accessToken)) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Image source={require('@/assets/images/splashscreen_logo.png')} style={styles.loadingLogo} />
        <ActivityIndicator size="large" color="#D32F2F" />
      </SafeAreaView>
    );
  }

  return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#e0e0e0' }}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <KeyboardAwareScrollView
              contentContainerStyle={[
                styles.container,
                {
                  paddingHorizontal: isSmallScreen ? 20 : 30,
                  paddingBottom: insets.bottom + 32,
                },
              ]}
              enableOnAndroid
              extraScrollHeight={24}
              extraHeight={Platform.OS === 'android' ? 80 : 0}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
          >
            <View style={[styles.logoContainer, { marginBottom: isSmallScreen ? 16 : 32 }]}>
              <Image
                  source={require('@/assets/images/nazov-black.png')}
                  style={{
                    width: Math.min(260, Dimensions.get('window').width - 80),
                    height: isSmallScreen ? 70 : 110,
                    resizeMode: 'contain',
                  }}
              />
              <Image
                  source={require('@/assets/images/ludimus.png')}
                  style={{
                    width: 250,
                    height: 250,
                    resizeMode: 'contain',
                    marginTop: isSmallScreen ? 4 : 8,
                  }}
              />
            </View>

            <Text style={[styles.title, { fontSize: isSmallScreen ? 24 : 28 }]}>
              Vitaj späť 👋
            </Text>
            <Text style={[styles.subtitle, { fontSize: isSmallScreen ? 14 : 16 }]}>
              Prihlás sa do systému
            </Text>

            <TextInput
                placeholder="Používateľské meno"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                placeholderTextColor="#999"
                style={[
                  styles.input,
                  {
                    padding: isSmallScreen ? 10 : 14,
                    fontSize: isSmallScreen ? 13 : 16,
                  },
                ]}
                returnKeyType="next"
                blurOnSubmit={false}
            />
            <TextInput
                placeholder="Heslo"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholderTextColor="#999"
                style={[
                  styles.input,
                  {
                    padding: isSmallScreen ? 10 : 14,
                    fontSize: isSmallScreen ? 13 : 16,
                  },
                ]}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
            />

            {error ? (
                <Text style={[styles.error, { fontSize: isSmallScreen ? 12 : 15 }]}>{error}</Text>
            ) : null}

            {loading ? (
                <ActivityIndicator size="large" color="#000" style={{ marginTop: 10 }} />
            ) : (
                <TouchableOpacity
                    onPress={handleLogin}
                    style={[styles.button, { paddingVertical: isSmallScreen ? 12 : 15 }]}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={[styles.buttonText, { fontSize: isSmallScreen ? 14 : 17 }]}>
                    Prihlásiť sa
                  </Text>
                </TouchableOpacity>
            )}

            <View style={{ height: 8 }} />
            <TouchableOpacity onPress={() => router.push('./forgot_password')}>
              <Text style={{ color: '#D32F2F', marginTop: 15, textAlign: 'center' }}>
                Zabudol si heslo?
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/register')} activeOpacity={0.8}>
              <Text style={[styles.registerLink, { fontSize: isSmallScreen ? 13 : 15 }]}>
                Nemáš účet? <Text style={styles.registerBold}>Zaregistruj sa</Text>
              </Text>
            </TouchableOpacity>

            <View style={{ height: insets.bottom + 8 }} />
          </KeyboardAwareScrollView>
        </TouchableWithoutFeedback>
      </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    backgroundColor: '#e0e0e0',
  },
  title: {
    color: '#111',
    fontWeight: 'bold',
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    color: '#444',
    marginBottom: 16,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  button: {
    backgroundColor: '#D32F2F',
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  error: {
    color: '#D32F2F',
    marginBottom: 8,
    textAlign: 'center',
  },
  registerLink: {
    marginTop: 10,
    textAlign: 'center',
    color: '#555',
  },
  registerBold: {
    color: '#D32F2F',
    fontWeight: 'bold',
  },
  logoContainer: {
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  loadingLogo: {
    width: 180,
    height: 180,
    marginBottom: 24,
    resizeMode: 'contain',
  },
});
