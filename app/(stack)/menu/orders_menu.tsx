import React from "react";
import { View, StyleSheet, TouchableOpacity, Image, ScrollView } from "react-native";
import { useRouter } from "expo-router";

export default function OrdersMenuScreen() {
  const router = useRouter();

  const menuItems = [
    {
      title: "FlorbalExpert",
      image: require("@/assets/images/menu/expert.png"),
      route: "/menu/orders",
    },
    {
      title: "Dresy",
      image: require("@/assets/images/menu/dresy_tlacidlo.png"),
      route: "/menu/jersey_order",
    },
    {
      title: "Klubové oblečenie",
      image: require("@/assets/images/menu/supravy.png"),
      route: "/menu/team_clothes",
    },
  ];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.grid}>
        {menuItems.map((item, idx) => (
          <TouchableOpacity
            key={idx}
            style={styles.item}
            onPress={() => router.push(item.route as never)}
          >
            <Image source={item.image} style={styles.icon} />
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: "center",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-around",
  },
  item: {
    width: "90%",
    aspectRatio: 3, // štvorcové karty
    backgroundColor: "#fff",
    borderRadius: 12,
    marginVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    padding: 10,
  },
  icon: {
    width: "100%",
    height: "100%",
    resizeMode: "contain",
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#444",
    textAlign: "center",
  },
});
