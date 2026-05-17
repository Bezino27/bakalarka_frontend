import React, { useContext, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { AuthContext, LinkedAccount } from "@/context/AuthContext";

export function LinkedAccountsSection() {
  const {
    linkedAccounts,
    loadLinkedAccounts,
    switchLinkedAccount,
  } = useContext(AuthContext);
  const [isLoading, setIsLoading] = useState(false);
  const [switchingUserId, setSwitchingUserId] = useState<number | null>(null);

  useEffect(() => {
    setIsLoading(true);
    loadLinkedAccounts()
      .catch((error: Error) => {
        console.warn("Nepodarilo sa načítať účty:", error.message);
      })
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSwitch = async (account: LinkedAccount) => {
    if (account.is_current) return;

    try {
      setSwitchingUserId(account.id);
      await switchLinkedAccount(account.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Nepodarilo sa prepnúť účet.";
      Alert.alert("Chyba", message);
    } finally {
      setSwitchingUserId(null);
    }
  };

  if (isLoading && linkedAccounts.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Účty</Text>
        <ActivityIndicator color="#D32F2F" />
      </View>
    );
  }

  if (linkedAccounts.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Účty</Text>
      {linkedAccounts.map((account) => {
        const isSwitching = switchingUserId === account.id;
        return (
          <TouchableOpacity
            key={account.id}
            style={[
              styles.accountRow,
              account.is_current && styles.accountRowActive,
            ]}
            onPress={() => handleSwitch(account)}
            disabled={account.is_current || isSwitching}
          >
            <View style={styles.accountTextWrap}>
              <Text style={[styles.accountName, account.is_current && styles.accountNameActive]}>
                {account.name}
              </Text>
              <Text style={styles.accountUsername}>@{account.username}</Text>
            </View>
            {isSwitching ? (
              <ActivityIndicator color="#D32F2F" />
            ) : (
              <Text style={[styles.accountBadge, account.is_current && styles.accountBadgeActive]}>
                {account.is_current ? "Aktuálny" : "Prepnúť"}
              </Text>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 18,
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    width: "100%",
  },
  title: {
    fontWeight: "700",
    marginBottom: 10,
    fontSize: 16,
    color: "#111111",
  },
  accountRow: {
    minHeight: 58,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
  },
  accountRowActive: {
    borderColor: "#D32F2F",
    backgroundColor: "#FFF5F5",
  },
  accountTextWrap: {
    flex: 1,
    paddingRight: 12,
  },
  accountName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111111",
  },
  accountNameActive: {
    color: "#D32F2F",
  },
  accountUsername: {
    marginTop: 2,
    fontSize: 13,
    color: "#555555",
  },
  accountBadge: {
    fontSize: 13,
    fontWeight: "700",
    color: "#D32F2F",
  },
  accountBadgeActive: {
    color: "#555555",
  },
});
