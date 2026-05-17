import React, { useContext, useEffect, useState } from "react";
import { View, Text, Button, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { AuthContext } from "../../../context/AuthContext";

export default function TabsIndex() {
  const { isLoggedIn, logout } = useContext(AuthContext);
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isLoggedIn) {
      router.replace("/login");
    }
  }, [isLoggedIn, mounted, router]);

  if (!isLoggedIn) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Overujem prihlásenie...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text>Stratil si sa</Text>
      <TouchableOpacity
          onPress={() =>
              router.push({ pathname: "/select-role"})
          }
      >
        <Text>TU</Text>
      </TouchableOpacity>
      <Button title="Odhlásiť sa" onPress={logout} />
    </View>
  );
}
