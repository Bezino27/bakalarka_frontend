// app/(stack)/upload.tsx
import React, { useContext, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { WebView } from 'react-native-webview';
import { AuthContext } from '@/context/AuthContext';
import { BASE_URL } from '@/hooks/api';
import { useRouter } from 'expo-router';

export default function UploadDocumentScreen() {
    const router = useRouter();
    const { accessToken, currentRole, refreshAccessToken } = useContext(AuthContext);
    const [webViewToken, setWebViewToken] = useState(accessToken || '');

    const isAdmin = useMemo(
        () => currentRole?.role?.toLowerCase() === 'admin',
        [currentRole]
    );

    useEffect(() => {
        let mounted = true;

        const loadFreshToken = async () => {
            const token = await refreshAccessToken();
            if (mounted) {
                setWebViewToken(token || accessToken || '');
            }
        };

        if (isAdmin) {
            void loadFreshToken();
        }

        return () => {
            mounted = false;
        };
    }, [accessToken, isAdmin, refreshAccessToken]);

    // UI pre ne‑adminov (nič neumožníme)
    if (!isAdmin) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 24 }]}>
                <Text style={{ fontSize: 16, color: '#333', textAlign: 'center', marginBottom: 12 }}>
                    Na nahrávanie dokumentov nemáš oprávnenie.
                </Text>
                <TouchableOpacity onPress={() => (router.canGoBack() ? router.back() : router.replace('/(stack)/(tabs)/tabs-player/news'))}
                                  style={{ paddingVertical: 10, paddingHorizontal: 16, backgroundColor: '#D32F2F', borderRadius: 8 }}>
                    <Text style={{ color: '#fff', fontWeight: '600' }}>Späť</Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (!webViewToken) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color="#D32F2F" />
            </View>
        );
    }

    // HTML bez tokenu v URL; upload cez fetch s Authorization headerom
    const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
          body { margin: 20px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
          input, button { font-size: 16px; }
          .row { margin: 10px 0; }
          .btn { background: #4CAF50; color: white; border: 0; padding: 10px 14px; border-radius: 8px; }
          .note { color: #555; font-size: 14px; }
        </style>
      </head>
      <body>
        <h2>Vyber PDF dokument</h2>
        <form id="uploadForm">
          <div class="row">
            <input type="file" name="file" accept="application/pdf" required />
          </div>
          <div class="row">
            <input type="text" name="title" placeholder="Názov dokumentu" required />
          </div>
          <div class="row">
            <button class="btn" type="submit">Nahrať dokument</button>
          </div>
          <div id="msg" class="note"></div>
        </form>

        <script>
          (function(){
            const ACCESS_TOKEN = ${JSON.stringify(webViewToken)};
            const BASE_URL = ${JSON.stringify(BASE_URL)};
            const form = document.getElementById('uploadForm');
            const msg = document.getElementById('msg');

            form.addEventListener('submit', async function(e) {
              e.preventDefault();
              msg.textContent = 'Nahrávam...';

              try {
                const fd = new FormData(form);
                const res = await fetch(BASE_URL + '/upload-document/', {
                  method: 'POST',
                  headers: {
                    'Authorization': 'Bearer ' + ACCESS_TOKEN
                  },
                  body: fd
                });

                const text = await res.text();
                if (!res.ok) {
                  msg.textContent = '❌ Chyba pri nahrávaní (' + res.status + '): ' + text;
                } else {
                  msg.textContent = '✅ Dokument nahratý.';
                }
              } catch (err) {
                msg.textContent = '❌ Chyba pripojenia: ' + (err?.message || err);
              }
            });
          })();
        </script>
      </body>
    </html>
  `;

    return (
        <View style={styles.container}>
            <WebView
                originWhitelist={['*']}
                source={{ html }}
                style={styles.webview}
                javaScriptEnabled
                domStorageEnabled
                mixedContentMode="always"
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    centered: { justifyContent: 'center', alignItems: 'center' },
    webview: { flex: 1 },
});
